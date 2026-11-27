import { MockStudentRecord } from '../models/MockStudentRecord.js';
import { evaluateEligibility } from './eligibilityEngine.js';
import { detectDataMismatches } from './ocrService.js';

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
    schoolName: official.schoolName, stream: official.stream,
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

export const checkAdmissionReadiness = async ({ course, academic, personal, documents, session }) => {
  const eligibility = evaluateEligibility({
    course, academic10th: academic?.class10, academic12th: academic?.class12,
  });
  const issues = new Set();
  const required = new Map((course.eligibilityCriteria?.requiredDocuments || [])
    .filter((doc) => doc.isMandatory).map((doc) => [doc.docType, doc.docName]));
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
    if (key) {
      issues.add(`${doc.title}: import this marksheet from DigiLocker so its subject marks can be verified.`);
    } else if (!mismatches.length && doc.verificationStatus !== 'Verified') {
      issues.add(`${doc.title}: this upload needs verification. Import the issuer document from DigiLocker when available, or remove it if optional.`);
    }
  }

  if (identities.size > 1) issues.add('Use documents from a single DigiLocker account.');
  for (const [type, title] of required) {
    if (!documents.some((doc) => doc.docType === type)) issues.add(`Missing required document: ${title}.`);
  }
  if (course.status !== 'open') issues.add('This course is closed for applications.');
  else if (course.allocatedSeats >= course.totalSeats) issues.add('This course has no available seats.');

  return { ...eligibility, blockers: [...issues], canSubmit: eligibility.isEligible && issues.size === 0 };
};
