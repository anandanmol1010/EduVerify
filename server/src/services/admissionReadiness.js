import { MockStudentRecord } from '../models/MockStudentRecord.js';
import { AdmissionSetting } from '../models/AdmissionSetting.js';
import { Application } from '../models/Application.js';
import { evaluateEligibility } from './eligibilityEngine.js';
import { detectDataMismatches } from './ocrService.js';
import { acceptedStatuses, anotherCourseAccepted } from './approveAdmission.js';

const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);
const marksheets = { class10_marksheet: 'class10', class12_marksheet: 'class12' };
const subjectKey = (subject) => JSON.stringify([
  normalize(subject?.subjectName), Number(subject?.marksObtained), Number(subject?.maxMarks ?? 100),
]);

const compareMarksheet = (record, key, entered, issues) => {
  const official = record[key];
  const label = key === 'class10' ? 'Class 10 marksheet' : 'Class 12 marksheet';
  for (const [field, value] of Object.entries({
    board: record.board, rollNumber: official.rollNumber || record.rollNumber,
    passingYear: official.passingYear, percentage: official.percentage,
    schoolName: official.schoolName, stream: official.stream, backlogs: official.backlogs,
  })) {
    if (value != null && value !== '' && normalize(entered?.[field]) !== normalize(value)) {
      issues.add(`${label}: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} differs from DigiLocker.`);
    }
  }
  const subjects = Array.isArray(entered?.subjects) ? entered.subjects : [];
  if (JSON.stringify(subjects.map(subjectKey).sort()) !== JSON.stringify(official.subjects.map(subjectKey).sort())) {
    issues.add(`${label}: subject names or marks differ from DigiLocker.`);
  }
};

const applicationBlockers = async ({ course, student, applicationId, session }) => {
  const issues = [];
  const settings = await AdmissionSetting.findOne().session(session ?? null);
  const today = dateOnly(new Date());
  if (settings?.isPortalOpen === false) issues.push('The admissions portal is closed.');
  if (settings?.admissionStartDate && today < dateOnly(settings.admissionStartDate)) {
    issues.push('The admissions window has not opened yet.');
  }
  if (settings?.admissionEndDate && today > dateOnly(settings.admissionEndDate)) {
    issues.push('The admissions deadline has passed.');
  }
  if (course.status !== 'open') issues.push('This course is closed for applications.');
  if (course.admissionStartDate && today < dateOnly(course.admissionStartDate)) {
    issues.push('Applications for this course have not opened yet.');
  }
  if (course.admissionEndDate && today > dateOnly(course.admissionEndDate)) {
    issues.push('The application deadline for this course has passed.');
  }
  if (course.allocatedSeats >= course.totalSeats) issues.push('This course has no available seats.');

  const otherApplications = { student, ...(applicationId ? { _id: { $ne: applicationId } } : {}) };
  if (await Application.exists({ ...otherApplications, status: { $in: acceptedStatuses } }).session(session ?? null)) {
    issues.push(anotherCourseAccepted);
  }
  if (await Application.exists({ ...otherApplications, course: course._id, status: { $ne: 'Rejected' } }).session(session ?? null)) {
    issues.push('You already have an active application for this course.');
  }
  if (Number.isInteger(settings?.maxApplicationsPerStudent) && settings.maxApplicationsPerStudent >= 0) {
    const active = await Application.countDocuments({
      ...otherApplications, status: { $nin: ['Draft', 'Rejected'] },
    }).session(session ?? null);
    if (active >= settings.maxApplicationsPerStudent) issues.push(
      settings.maxApplicationsPerStudent === 0
        ? 'New applications are disabled by the admissions office.'
        : `You already have the maximum of ${settings.maxApplicationsPerStudent} active applications.`
    );
  }
  return issues;
};

export const checkAdmissionReadiness = async ({
  course, academic, personal, documents = [], student, applicationId, academicOnly = false, reviewing = false, session,
}) => {
  const eligibility = evaluateEligibility({
    course, academic10th: academic?.class10, academic12th: academic?.class12,
  });
  const issues = new Set(reviewing ? [] : await applicationBlockers({ course, student, applicationId, session }));
  if (academicOnly) {
    return { ...eligibility, blockers: [...issues], canContinue: eligibility.isEligible && issues.size === 0 };
  }
  const required = new Map((course.eligibilityCriteria?.requiredDocuments || [])
    .filter((doc) => doc.isMandatory !== false).map((doc) => [doc.docType, doc.docName]));
  for (const [type, title] of [
    ['class10_marksheet', 'Class 10 marksheet'], ['class12_marksheet', 'Class 12 marksheet'],
    ['aadhaar_card', 'Aadhaar Demo Identity Document'],
    ...(personal?.category && personal.category !== 'General' ? [['category_certificate', 'Category certificate']] : []),
    ...(personal?.hasDisability ? [['disability_certificate', 'Disability certificate']] : []),
  ]) {
    if (!required.has(type)) required.set(type, title);
  }

  const imported = documents.filter((doc) => doc.source === 'DigiLocker Demo' && doc.issuerRecord);
  const records = imported.length ? await MockStudentRecord.find({
    _id: { $in: imported.map((doc) => doc.issuerRecord) },
  }).session(session ?? null) : [];
  const identities = new Set();
  let requiresManualReview = false;

  for (const doc of documents) {
    const key = marksheets[doc.docType];
    const entered = academic?.[key];
    if (['Correction Required', 'Rejected'].includes(doc.verificationStatus)) {
      issues.add(`${doc.title}: ${doc.verificationRemarks || 'replace this document before submitting.'}`);
      continue;
    }
    if (doc.source === 'DigiLocker Demo') {
      if (doc.issuerRecord && doc.verificationStatus !== 'Verified') {
        issues.add(`${doc.title}: document verification is pending.`);
        continue;
      }
      const record = records.find((candidate) => candidate._id.equals(doc.issuerRecord) && candidate.availableDocuments.some(
        (file) => file.docType === doc.docType && file.fileUrl === doc.filePath
      ));
      if (!record) {
        issues.add(`${doc.title}: import this document again from DigiLocker.`);
        continue;
      }
      identities.add(String(record._id));
      if (normalize(personal?.fullName) !== normalize(record.fullName)) {
        issues.add('Full legal name differs from the DigiLocker account. Use the name on your documents.');
      }
      if (doc.docType === 'aadhaar_card') {
        for (const field of ['gender', 'category', 'nationality']) {
          if (record[field] && normalize(personal?.[field]) !== normalize(record[field])) {
            issues.add(`Your ${field} differs from the DigiLocker identity document.`);
          }
        }
        if (record.dob && dateOnly(personal?.dob) !== dateOnly(record.dob)) {
          issues.add('Date of birth differs from the DigiLocker identity document.');
        }
      }
      if (key) compareMarksheet(record, key, entered, issues);
      if (key === 'class10') {
        for (const [field, label] of [['fatherName', "Father's name"], ['motherName', "Mother's name"]]) {
          if (record[field] && personal?.[field] && normalize(personal[field]) !== normalize(record[field])) {
            issues.add(`${label} differs from the Class 10 record.`);
          }
        }
      }
      continue;
    }

    const extracted = doc.extractedData || {};
    const mismatches = detectDataMismatches(extracted, {
      candidateName: personal?.fullName, rollNumber: entered?.rollNumber, passingYear: entered?.passingYear,
      percentage: entered?.percentage,
    });
    for (const mismatch of mismatches) issues.add(`${doc.title}: ${mismatch}`);
    requiresManualReview = true;
    if (reviewing && doc.verificationStatus !== 'Verified') {
      issues.add(`${doc.title}: verify this upload before approving admission.`);
    }
  }

  if (identities.size > 1) issues.add('Use documents from a single DigiLocker account.');
  for (const [type, title] of required) {
    if (!documents.some((doc) => doc.docType === type)) issues.add(`Missing required document: ${title}.`);
  }
  return { ...eligibility, blockers: [...issues], requiresManualReview, canSubmit: eligibility.isEligible && issues.size === 0 };
};
