import express from 'express';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Application } from '../models/Application.js';
import { Course } from '../models/Course.js';
import { Document } from '../models/Document.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { evaluateEligibility } from '../services/eligibilityEngine.js';
import { checkAdmissionReadiness } from '../services/admissionReadiness.js';
import { documentScope, validDocumentScope } from '../services/documentScope.js';
import { AdmissionError, approveAdmission, runAdmissionTransaction } from '../services/approveAdmission.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();

const editableStatuses = ['Draft', 'Correction Required'];
const applicationNumber = () => `EV-${new Date().getFullYear()}-${randomBytes(8).toString('hex').toUpperCase()}`;

const sendError = (res, error) => {
  if (!(error instanceof AdmissionError)) console.error('[Application]', error);
  return res.status(error instanceof AdmissionError ? error.status : 500).json({
    success: false, message: error instanceof AdmissionError ? error.message : 'Unable to process the application.',
    evaluation: error.evaluation,
  });
};

const loadDocuments = async ({ student, appId, workspaceId, ids, session }) => {
  if (!validDocumentScope({ applicationId: appId, workspaceId })) {
    throw new AdmissionError('Invalid application document scope.');
  }
  if (ids !== undefined && (!Array.isArray(ids) || ids.some((id) => !mongoose.isValidObjectId(id)))) {
    throw new AdmissionError('Select valid application documents.');
  }
  const filter = { student, ...documentScope({ applicationId: appId, workspaceId }) };
  // Account locker entries require explicit selection by callers using the legacy API.
  if (!appId && !workspaceId && !ids) return [];
  if (ids) filter._id = { $in: ids };
  const documents = await Document.find(filter).session(session ?? null);
  const otherApplications = documents.length && await Application.exists({
    _id: { $ne: appId || null }, documents: { $in: documents.map((doc) => doc._id) },
  }).session(session ?? null);
  if (otherApplications || (ids && documents.length !== new Set(ids.map(String)).size)) {
    throw new AdmissionError('Some selected documents are unavailable for this application.');
  }
  return documents;
};

router.post('/check-eligibility', protect, authorize('student'), async (req, res) => {
  try {
    const { courseId, academic10th, academic12th, academicOnly, personalSnapshot, documentIds, applicationId, workspaceId } = req.body;
    const current = applicationId ? await Application.findOne({ _id: applicationId, student: req.user._id }) : null;
    if (applicationId && !current) throw new AdmissionError('Application not found.', 404);
    const course = await Course.findById(current?.course || courseId);
    if (!course) throw new AdmissionError('Course not found.', 404);
    const evaluation = await checkAdmissionReadiness({
      course, academic: { class10: academic10th, class12: academic12th }, personal: personalSnapshot,
      student: req.user._id, applicationId, academicOnly: academicOnly === true,
      documents: academicOnly === true ? [] : await loadDocuments({
        student: req.user._id, appId: applicationId, workspaceId, ids: documentIds,
      }),
    });
    return res.json({ success: true, evaluation, course });
  } catch (error) {
    return sendError(res, error);
  }
});

const saveStudentApplication = async (req, res) => {
  const appId = req.params.id;
  const submitting = appId ? req.body.submitNow === true : req.body.isDraft !== true;
  try {
    const { courseId, personalSnapshot, academicSnapshot, documentIds, workspaceId } = req.body;
    const { application, admissionLetter } = await runAdmissionTransaction(async (session, trackFile) => {
      const student = req.user._id;
      const current = appId ? await Application.findOne({ _id: appId, student }).session(session) : null;
      if (appId && !current) throw new AdmissionError('Application not found.', 404);
      if (current && !editableStatuses.includes(current.status)) {
        throw new AdmissionError(`This application cannot be edited while its status is ${current.status}.`, 409);
      }

      const course = await Course.findById(current?.course || courseId).session(session);
      if (!course) throw new AdmissionError('Course not found.', 404);
      if (submitting || !current) await User.updateOne({ _id: student }, { $inc: { __v: 1 } }, { session });
      if (!submitting && !current && await Application.exists({
        student, course: course._id, status: { $ne: 'Rejected' },
      }).session(session)) {
        throw new AdmissionError('You already have an active application for this course.', 409);
      }
      const application = current || new Application({ student, course: course._id, applicationNumber: applicationNumber() });
      if (personalSnapshot) application.personalSnapshot = personalSnapshot;
      if (academicSnapshot) application.academicSnapshot = academicSnapshot;

      const documents = await loadDocuments({ student, appId, workspaceId, ids: documentIds ?? current?.documents, session });
      const evaluation = await checkAdmissionReadiness({
        course, academic: application.academicSnapshot, personal: application.personalSnapshot, documents,
        student, applicationId: appId, session,
      });
      if (submitting && !evaluation.canSubmit) {
        const problems = [...evaluation.rulesFailed, ...evaluation.blockers];
        throw new AdmissionError(problems.join(' '), 422, evaluation);
      }

      application.documents = documents.map((doc) => doc._id);
      application.eligibilityEvaluation = { ...evaluation, evaluatedAt: new Date() };
      await Document.updateMany(
        { _id: { $in: application.documents } },
        { $set: { application: application._id, workspaceId: null }, $inc: { __v: 1 } }, { session }
      );
      if (current) {
        await Document.updateMany(
          { student, application: application._id, _id: { $nin: application.documents } },
          { $set: { application: null }, $inc: { __v: 1 } }, { session }
        );
      }

      if (!submitting) {
        if (!current) application.statusHistory.push({
          status: 'Draft', changedBy: student, changedByRole: 'student', remarks: 'Application saved as draft.',
        });
        await application.save({ session });
        return { application };
      }

      application.submittedAt = new Date();
      application.statusHistory.push({
        status: current?.status === 'Correction Required' ? 'Resubmitted' : 'Submitted',
        changedBy: student, changedByRole: 'student', remarks: 'Application passed submission validation.',
      });
      const admissionLetter = await approveAdmission({
        application, course, actor: req.user, automatic: true, session, trackFile,
      });
      return { application, admissionLetter };
    });

    await application.populate({ path: 'documents', options: { session: null } });
    await logAudit({
      user: req.user, action: submitting ? 'ADMISSION_AUTO_APPROVED' : 'APPLICATION_DRAFTED',
      entityType: 'Application', entityId: application._id,
    });
    return res.status(appId ? 200 : 201).json({ success: true, application, admissionLetter });
  } catch (error) {
    return sendError(res, error);
  }
};

router.post('/', protect, authorize('student'), saveStudentApplication);

// Get student's applications
router.get('/my-applications', protect, authorize('student'), async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('course')
      .populate('documents')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: applications.length, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all applications
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, course, search, page = 1, limit = 20 } = req.query;
    if (status === 'Draft') return res.json({ success: true, total: 0, page: Number(page), pages: 0, applications: [] });
    const query = { status: { $ne: 'Draft' } };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (course && course !== 'all') {
      query.course = course;
    }
    if (search) {
      query.$or = [
        { applicationNumber: new RegExp(search, 'i') },
        { 'personalSnapshot.fullName': new RegExp(search, 'i') },
        { 'personalSnapshot.email': new RegExp(search, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Application.countDocuments(query);

    const applications = await Application.find(query)
      .populate('course')
      .populate('student', 'name email phone')
      .populate('assignedOfficer', 'name email')
      .populate('documents')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      applications,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get single application detail
router.get('/:id', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('course')
      .populate('student', 'name email phone')
      .populate('documents')
      .populate('assignedOfficer', 'name email')
      .populate('statusHistory.changedBy', 'name role');

    if (!application || (req.user.role === 'admin' && application.status === 'Draft')) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Role check: students can only see their own applications
    if (req.user.role === 'student' && String(application.student._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this application' });
    }

    return res.json({ success: true, application });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, authorize('student'), saveStudentApplication);

// Admin: Request Correction or Reject
router.patch('/:id/decision', protect, authorize('admin'), async (req, res) => {
  try {
    const { action, remarks } = req.body; // 'request_correction', 'reject', 'mark_under_review'
    const application = await Application.findById(req.params.id).populate('course');

    if (!application || application.status === 'Draft') {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (['Accepted', 'Rejected'].includes(application.status)) {
      return res.status(409).json({ success: false, message: 'This application already has a final decision.' });
    }

    if (action === 'accept') {
      return res.status(400).json({
        success: false,
        message: 'To accept an application, use the formal Final Admission Approval endpoint.',
      });
    }

    let newStatus = application.status;
    let notifTitle = '';
    let notifMessage = '';
    let notifType = 'info';

    if (action === 'mark_under_review') {
      newStatus = 'Pending Verification';
      application.assignedOfficer = req.user._id;
      notifTitle = 'Application Under Review';
      notifMessage = 'Your application is actively being verified by the admissions committee.';
    } else if (action === 'request_correction') {
      newStatus = 'Correction Required';
      application.correctionRemarks = remarks || 'Please update the requested document(s) or details.';
      notifTitle = 'Document Correction Requested';
      notifMessage = `The admission officer has requested corrections: "${remarks}"`;
      notifType = 'warning';
    } else if (action === 'reject') {
      newStatus = 'Rejected';
      application.rejectionReason = remarks || 'Application does not fulfill admission criteria.';
      application.decidedAt = new Date();
      notifTitle = 'Application Decision: Not Approved';
      notifMessage = `Your application for ${application.course.title} has not been approved. Reason: ${remarks}`;
      notifType = 'danger';
    }

    application.status = newStatus;
    application.statusHistory.push({
      status: newStatus,
      changedBy: req.user._id,
      changedByRole: req.user.role,
      remarks: remarks || '',
      timestamp: new Date(),
    });

    await application.save();

    await Notification.create({
      recipient: application.student,
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      relatedApplication: application._id,
      link: `/student/applications/${application._id}`,
    });

    await logAudit({
      user: req.user,
      action: `APPLICATION_${action.toUpperCase()}`,
      entityType: 'Application',
      entityId: application._id,
      details: { status: newStatus, remarks },
      req,
    });

    return res.json({ success: true, message: `Application status set to ${newStatus}`, application });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin approval for applications already in the review queue.
router.post('/:id/accept', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await runAdmissionTransaction(async (session, trackFile) => {
      const application = await Application.findById(req.params.id).session(session);
      if (!application || application.status === 'Draft') throw new AdmissionError('Application not found.', 404);
      if (!['Submitted', 'Pending Verification', 'Resubmitted'].includes(application.status)) {
        throw new AdmissionError(`Cannot approve an application with status ${application.status}.`, 409);
      }
      const course = await Course.findById(application.course).session(session);
      if (!course) throw new AdmissionError('Course not found.', 404);
      const documents = await loadDocuments({
        student: application.student, appId: String(application._id), ids: application.documents, session,
      });
      const evaluation = evaluateEligibility({
        course, academic10th: application.academicSnapshot?.class10,
        academic12th: application.academicSnapshot?.class12, documents,
      });
      if (!evaluation.isEligible) throw new AdmissionError(evaluation.rulesFailed.join(' '));
      const unverified = (course.eligibilityCriteria?.requiredDocuments || []).filter((required) =>
        required.isMandatory && !documents.some((doc) => doc.docType === required.docType && doc.verificationStatus === 'Verified')
      );
      if (unverified.length) throw new AdmissionError(`Verify required documents first: ${unverified.map((doc) => doc.docName).join(', ')}.`);
      if (documents.some((doc) => doc.extractedData?.isMismatched && doc.verificationStatus !== 'Verified')) {
        throw new AdmissionError('Resolve document mismatches before approving this application.');
      }
      await Document.updateMany({ _id: { $in: application.documents } }, { $inc: { __v: 1 } }, { session });
      application.eligibilityEvaluation = { ...evaluation, evaluatedAt: new Date() };
      const admissionLetter = await approveAdmission({
        application, course, actor: req.user, remarks: req.body.remarks, session, trackFile,
      });
      return { application, admissionLetter };
    });
    await logAudit({ user: req.user, action: 'ADMISSION_ACCEPTED', entityType: 'Application', entityId: result.application._id });
    return res.json({ success: true, message: 'Application accepted. Admission letter generated.', ...result });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
