import express from 'express';
import { Application } from '../models/Application.js';
import { Course } from '../models/Course.js';
import { Document } from '../models/Document.js';
import { Notification } from '../models/Notification.js';
import { AdmissionLetter } from '../models/AdmissionLetter.js';
import { protect, authorize } from '../middleware/auth.js';
import { evaluateEligibility } from '../services/eligibilityEngine.js';
import { generateAdmissionLetterPdf } from '../utils/admissionLetterGenerator.js';
import { logAudit } from '../utils/auditLogger.js';
import path from 'path';

const router = express.Router();

// Helper to generate readable application number: EV-2026-XXXX
const generateApplicationNumber = async () => {
  const count = await Application.countDocuments();
  const num = String(count + 1001).padStart(5, '0');
  return `EV-2026-${num}`;
};

// Check Eligibility (Evaluates academic qualifications against course requirements)
// Eligibility != Accepted Application
router.post('/check-eligibility', protect, async (req, res) => {
  try {
    const { courseId, academic10th, academic12th } = req.body;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const documents = await Document.find({ student: req.user._id });

    const result = evaluateEligibility({
      course,
      academic10th,
      academic12th,
      documents,
    });

    return res.json({ success: true, evaluation: result, course });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Create Application (Draft or Initial Submission)
router.post('/', protect, authorize('student'), async (req, res) => {
  try {
    const { courseId, personalSnapshot, academicSnapshot, documentIds, isDraft } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check duplicate applications for the same course (excluding Rejected)
    const existing = await Application.findOne({
      student: req.user._id,
      course: courseId,
      status: { $ne: 'Rejected' },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active application for this course.',
      });
    }

    // Determine documents to link
    let attachedDocIds = [];
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      attachedDocIds = documentIds;
    } else {
      const studentDocs = await Document.find({ student: req.user._id });
      attachedDocIds = studentDocs.map((d) => d._id);
    }

    const attachedDocs = await Document.find({ _id: { $in: attachedDocIds } });

    // Validate mandatory documents if submitting (non-draft)
    if (!isDraft && course.eligibilityCriteria?.requiredDocuments) {
      const presentDocTypes = attachedDocs.map((d) => d.docType);
      const missingMandatory = course.eligibilityCriteria.requiredDocuments.filter(
        (rd) => rd.isMandatory && !presentDocTypes.includes(rd.docType)
      );

      if (missingMandatory.length > 0) {
        return res.status(400).json({
          success: false,
          missingDocuments: missingMandatory,
          message: `Cannot submit application. Missing required document(s): ${missingMandatory
            .map((m) => m.docName)
            .join(', ')}. Please upload or import all required documents before submitting.`,
        });
      }
    }

    // Evaluate eligibility
    const evalResult = evaluateEligibility({
      course,
      academic10th: academicSnapshot?.class10,
      academic12th: academicSnapshot?.class12,
      documents: attachedDocs,
    });

    const appNumber = await generateApplicationNumber();
    const initialStatus = isDraft ? 'Draft' : 'Submitted';

    const application = new Application({
      applicationNumber: appNumber,
      student: req.user._id,
      course: courseId,
      status: initialStatus,
      personalSnapshot: personalSnapshot || {},
      academicSnapshot: academicSnapshot || {},
      eligibilityEvaluation: {
        isEligible: evalResult.isEligible,
        status: evalResult.status || (evalResult.isEligible ? 'Eligible' : 'Not Eligible'),
        evaluatedAt: new Date(),
        rulesPassed: evalResult.rulesPassed,
        rulesFailed: evalResult.rulesFailed,
        scoreCalculated: evalResult.scoreCalculated,
        remarks: evalResult.remarks,
      },
      documents: attachedDocIds,
      submittedAt: isDraft ? null : new Date(),
      statusHistory: [
        {
          status: initialStatus,
          changedBy: req.user._id,
          changedByRole: 'student',
          remarks: isDraft ? 'Application saved as draft' : 'Application submitted for officer verification',
          timestamp: new Date(),
        },
      ],
    });

    await application.save();

    // Link application to documents
    await Document.updateMany({ _id: { $in: attachedDocIds } }, { application: application._id });

    // Send notification to student
    if (!isDraft) {
      await Notification.create({
        recipient: req.user._id,
        title: 'Application Submitted',
        message: `Your application (${appNumber}) for ${course.title} has been submitted and is pending officer verification.`,
        type: 'info',
        relatedApplication: application._id,
        link: `/student/applications/${application._id}`,
      });
    }

    await logAudit({
      user: req.user,
      action: isDraft ? 'APPLICATION_DRAFTED' : 'APPLICATION_SUBMITTED',
      entityType: 'Application',
      entityId: application._id,
      details: { applicationNumber: appNumber, course: course.code },
      req,
    });

    await application.populate('documents');
    return res.status(201).json({ success: true, application });
  } catch (error) {
    console.error('[Application POST error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

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
    const query = {};

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

    if (!application) {
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

// Student: Update/Resubmit application or correct documents
router.put('/:id', protect, authorize('student'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (String(application.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Block changes if already Accepted or Rejected
    if (['Accepted', 'Rejected'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be modified once it is ${application.status}.`,
      });
    }

    const { personalSnapshot, academicSnapshot, documentIds, submitNow } = req.body;

    if (personalSnapshot) application.personalSnapshot = personalSnapshot;
    if (academicSnapshot) application.academicSnapshot = academicSnapshot;

    if (Array.isArray(documentIds)) {
      application.documents = documentIds;
    }

    const studentDocs = await Document.find({ _id: { $in: application.documents } });
    const course = await Course.findById(application.course);

    // If submitting/resubmitting, enforce mandatory document presence
    if (submitNow && course.eligibilityCriteria?.requiredDocuments) {
      const presentDocTypes = studentDocs.map((d) => d.docType);
      const missingMandatory = course.eligibilityCriteria.requiredDocuments.filter(
        (rd) => rd.isMandatory && !presentDocTypes.includes(rd.docType)
      );

      if (missingMandatory.length > 0) {
        return res.status(400).json({
          success: false,
          missingDocuments: missingMandatory,
          message: `Cannot submit application. Missing required document(s): ${missingMandatory
            .map((m) => m.docName)
            .join(', ')}.`,
        });
      }
    }

    // Re-evaluate eligibility
    const evalResult = evaluateEligibility({
      course,
      academic10th: application.academicSnapshot?.class10,
      academic12th: application.academicSnapshot?.class12,
      documents: studentDocs,
    });

    application.eligibilityEvaluation = {
      isEligible: evalResult.isEligible,
      status: evalResult.status || (evalResult.isEligible ? 'Eligible' : 'Not Eligible'),
      evaluatedAt: new Date(),
      rulesPassed: evalResult.rulesPassed,
      rulesFailed: evalResult.rulesFailed,
      scoreCalculated: evalResult.scoreCalculated,
      remarks: evalResult.remarks,
    };

    if (submitNow) {
      // After student resubmission, status returns to Pending Verification
      const nextStatus = 'Pending Verification';
      application.status = nextStatus;
      application.submittedAt = new Date();
      application.statusHistory.push({
        status: nextStatus,
        changedBy: req.user._id,
        changedByRole: 'student',
        remarks: 'Applicant submitted updated information and documents for verification.',
        timestamp: new Date(),
      });

      await Notification.create({
        recipient: req.user._id,
        title: 'Application Resubmitted',
        message: `Your application (${application.applicationNumber}) has been resubmitted and is pending verification.`,
        type: 'info',
        relatedApplication: application._id,
      });
    }

    await application.save();
    await application.populate('documents');
    return res.json({ success: true, message: 'Application updated successfully', application });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Request Correction or Reject
router.patch('/:id/decision', protect, authorize('admin'), async (req, res) => {
  try {
    const { action, remarks } = req.body; // 'request_correction', 'reject', 'mark_under_review'
    const application = await Application.findById(req.params.id).populate('course');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
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

// Final Admin Admission Approval
// Enforces:
// 1. All mandatory documents submitted
// 2. All mandatory documents manually verified (status === 'Verified')
// 3. Student satisfies configured eligibility requirements (isEligible === true)
// 4. No unresolved discrepancies
// 5. Course seat available
// 6. Safe atomic seat allocation & Admission Letter generation
router.post('/:id/accept', protect, authorize('admin'), async (req, res) => {
  try {
    const { remarks } = req.body;
    const application = await Application.findById(req.params.id)
      .populate('course')
      .populate('student')
      .populate('documents');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status === 'Accepted') {
      return res.status(400).json({
        success: false,
        message: 'This application has already been accepted.',
      });
    }

    const course = await Course.findById(application.course._id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Associated course not found' });
    }

    // 1. Check Course Seat Capacity
    if (course.allocatedSeats >= course.totalSeats) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept application. Course capacity (${course.totalSeats} seats) is fully exhausted.`,
      });
    }

    // 2. Check Eligibility Engine Result
    const studentDocs = application.documents || [];
    const evalResult = evaluateEligibility({
      course,
      academic10th: application.academicSnapshot?.class10,
      academic12th: application.academicSnapshot?.class12,
      documents: studentDocs,
    });

    if (!evalResult.isEligible) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept application. Candidate fails eligibility requirements: ${evalResult.rulesFailed.join(
          '; '
        )}`,
      });
    }

    // 3. Check All Mandatory Documents are Present & Verified
    const reqDocConfigs = course.eligibilityCriteria?.requiredDocuments || [];
    const missingMandatoryDocs = [];
    const unverifiedMandatoryDocs = [];

    for (const reqDoc of reqDocConfigs) {
      if (reqDoc.isMandatory) {
        const found = studentDocs.find((d) => d.docType === reqDoc.docType);
        if (!found) {
          missingMandatoryDocs.push(reqDoc.docName);
        } else if (found.verificationStatus !== 'Verified') {
          unverifiedMandatoryDocs.push(`${reqDoc.docName} (Current Status: ${found.verificationStatus})`);
        }
      }
    }

    if (missingMandatoryDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept application. Missing mandatory documents: ${missingMandatoryDocs.join(', ')}`,
      });
    }

    if (unverifiedMandatoryDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept application. All mandatory documents must be individually verified by an officer first. Pending: ${unverifiedMandatoryDocs.join(
          ', '
        )}`,
      });
    }

    // 4. Check for Unresolved Discrepancies on Attached Documents
    const unresolvedDiscrepancyDocs = studentDocs.filter(
      (d) => d.extractedData?.isMismatched && d.verificationStatus !== 'Verified'
    );
    if (unresolvedDiscrepancyDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept application. Unresolved discrepancies flagged on: ${unresolvedDiscrepancyDocs
          .map((d) => d.title)
          .join(', ')}`,
      });
    }

    // Atomic seat allocation
    course.allocatedSeats += 1;
    await course.save();

    // Update Application Status to Accepted
    application.status = 'Accepted';
    application.officerRemarks = remarks || 'All mandatory documents verified and criteria satisfied.';
    application.assignedOfficer = req.user._id;
    application.decidedAt = new Date();
    application.statusHistory.push({
      status: 'Accepted',
      changedBy: req.user._id,
      changedByRole: req.user.role,
      remarks: remarks || 'Final admission approved. Seat reserved and Admission Letter generated.',
      timestamp: new Date(),
    });
    await application.save();

    // Generate Unique Admission Reference ID
    const countLetters = await AdmissionLetter.countDocuments();
    const admissionId = `SJ-2026-ADM-${String(countLetters + 101).padStart(4, '0')}`;
    const verificationToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const publicUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-admission/${admissionId}?token=${verificationToken}`;

    const pdfFilename = `admission-letter-${admissionId}.pdf`;
    const pdfOutputPath = path.join(process.cwd(), 'uploads', 'letters', pdfFilename);

    await generateAdmissionLetterPdf({
      admissionId,
      studentName: application.personalSnapshot?.fullName || application.student.name,
      applicationNumber: application.applicationNumber,
      courseTitle: course.title,
      courseCode: course.code,
      departmentName: 'Department of Computing & Advanced Sciences',
      academicSession: '2026-2027',
      issueDate: new Date(),
      verificationUrl: publicUrl,
      outputPath: pdfOutputPath,
    });

    const admissionLetter = await AdmissionLetter.create({
      admissionId,
      application: application._id,
      student: application.student._id,
      course: course._id,
      academicSession: '2026-2027',
      issuedDate: new Date(),
      pdfPath: `/uploads/letters/${pdfFilename}`,
      qrCodeData: publicUrl,
      verificationToken,
      isValid: true,
    });

    // Notify student of final decision
    await Notification.create({
      recipient: application.student._id,
      title: 'Admission Offer Accepted!',
      message: `Congratulations! Your admission to ${course.title} has been accepted. Your Admission Letter (${admissionId}) is ready for download.`,
      type: 'success',
      relatedApplication: application._id,
      link: `/student/letters`,
    });

    await logAudit({
      user: req.user,
      action: 'ADMISSION_ACCEPTED',
      entityType: 'Application',
      entityId: application._id,
      details: { admissionId, course: course.code, student: application.student.email },
      req,
    });

    return res.json({
      success: true,
      message: 'Application accepted! Seat allocated and admission letter generated.',
      application,
      admissionLetter,
    });
  } catch (error) {
    console.error('[Accept Application Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
