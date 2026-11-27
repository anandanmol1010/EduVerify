/**
 * Centralized Document Mapping and Extraction Service
 * Maps imported DigiLocker metadata to application form fields,
 * tracks field provenance (imported vs manual), detects personal detail conflicts,
 * and computes dynamic progress metrics.
 */

const hasValue = (value) => value != null && String(value).trim() !== '';

export const mergeImportedDocuments = (current, imported) => {
  const importedIds = new Set(imported.map((document) => document._id));
  return [...imported, ...current.filter((document) => !importedIds.has(document._id))];
};

export const mapDigiLockerAcademicData = (importedDetails, currentAcademic = {}) => {
  const fieldMeta = { ...currentAcademic.fieldMeta };
  const academic = {};

  for (const level of ['class10', 'class12']) {
    const record = importedDetails?.[level];
    if (!record) continue;
    const updated = { ...currentAcademic[level] };
    for (const [field, value] of Object.entries({
      board: record.board || importedDetails.board,
      rollNumber: record.rollNumber || importedDetails.rollNumber,
      passingYear: record.passingYear,
      percentage: record.percentage,
      schoolName: record.schoolName,
      stream: record.stream,
      backlogs: record.backlogs,
    })) {
      if (hasValue(value)) {
        updated[field] = value;
        fieldMeta[`${level}.${field}`] = 'imported';
      }
    }
    if (record.subjects?.length) {
      updated.subjects = record.subjects.map((subject) => ({
        subjectName: subject.subjectName || '',
        marksObtained: subject.marksObtained ?? 0,
        maxMarks: subject.maxMarks || 100,
        grade: subject.grade || '',
        source: 'imported',
      }));
      fieldMeta[`${level}.subjects`] = 'imported';
    }
    academic[level] = updated;
  }
  return { academic, fieldMeta };
};

const personalFields = [
  ['fullName', 'Full legal name', 'candidateName'],
  ['dob', 'Date of birth', 'dob'],
  ['gender', 'Gender', 'gender'],
  ['category', 'Category', 'category'],
  ['nationality', 'Nationality', 'nationality'],
  ['fatherName', "Father's name", 'fatherName'],
  ['motherName', "Mother's name", 'motherName'],
];

const addressFields = [
  ['street', 'Street'], ['city', 'City'], ['district', 'District'],
  ['state', 'State'], ['pincode', 'PIN code'], ['country', 'Country'],
];

export const mapDigiLockerPersonalData = (current, details) => {
  const personal = { ...current, permanentAddress: { ...current.permanentAddress } };
  const fieldMeta = {};
  const conflicts = [];

  const applyField = (target, field, label, value, fieldPath) => {
    if (!hasValue(value)) return;
    const currentValue = target[field];
    if (hasValue(currentValue) && String(currentValue).trim().toLowerCase() !== String(value).trim().toLowerCase()) {
      conflicts.push({ field: fieldPath, label, currentValue, importedValue: value });
    }
    target[field] = value;
    fieldMeta[fieldPath] = 'imported';
  };

  for (const [field, label, source] of personalFields) {
    const value = field === 'dob' ? details[source]?.slice(0, 10) : details[source];
    if (field === 'dob' && personal.dob) personal.dob = personal.dob.slice(0, 10);
    applyField(personal, field, label, value, `personal.${field}`);
  }
  for (const [field, label] of addressFields) {
    applyField(personal.permanentAddress, field, label, details.permanentAddress?.[field], `personal.permanentAddress.${field}`);
  }
  if (personal.isSameAddress) personal.correspondenceAddress = { ...personal.permanentAddress };
  return { personal, fieldMeta, conflicts };
};

/**
 * Dynamically calculate academic percentage from subjects
 */
export const calculateAggregatePercentage = (subjects = []) => {
  if (!Array.isArray(subjects) || subjects.length === 0) return 0;
  let totalObtained = 0;
  let totalMax = 0;

  for (const s of subjects) {
    const obt = Number(s.marksObtained);
    const max = Number(s.maxMarks);
    if (!isNaN(obt) && !isNaN(max) && max > 0) {
      totalObtained += obt;
      totalMax += max;
    }
  }

  if (totalMax === 0) return 0;
  return Number(((totalObtained / totalMax) * 100).toFixed(2));
};

/**
 * Compute populated vs manual counts for Stage 2
 */
export const computeAcademicProgress = (academic = {}, fieldMeta = {}) => {
  const c10 = academic.class10 || {};
  const c12 = academic.class12 || {};

  const requiredFields = [
    { key: 'class10.board', label: 'Class 10th Board Name', val: c10.board, source: fieldMeta['class10.board'] },
    { key: 'class10.rollNumber', label: 'Class 10th Roll Number', val: c10.rollNumber, source: fieldMeta['class10.rollNumber'] },
    { key: 'class10.passingYear', label: 'Class 10th Passing Year', val: c10.passingYear, source: fieldMeta['class10.passingYear'] },
    { key: 'class10.percentage', label: 'Class 10th Aggregate Percentage', val: c10.percentage, source: fieldMeta['class10.percentage'] },
    { key: 'class10.schoolName', label: 'Class 10th School Name', val: c10.schoolName, source: fieldMeta['class10.schoolName'] },
    { key: 'class12.board', label: 'Class 12th Board Name', val: c12.board, source: fieldMeta['class12.board'] },
    { key: 'class12.rollNumber', label: 'Class 12th Roll Number', val: c12.rollNumber, source: fieldMeta['class12.rollNumber'] },
    { key: 'class12.passingYear', label: 'Class 12th Passing Year', val: c12.passingYear, source: fieldMeta['class12.passingYear'] },
    { key: 'class12.percentage', label: 'Class 12th Aggregate Percentage', val: c12.percentage, source: fieldMeta['class12.percentage'] },
    { key: 'class12.schoolName', label: 'Class 12th School Name', val: c12.schoolName, source: fieldMeta['class12.schoolName'] },
  ];

  let populatedCount = 0;
  let remainingCount = 0;
  const missingRequired = [];

  for (const item of requiredFields) {
    if (item.source === 'imported' && item.val !== undefined && item.val !== '') {
      populatedCount++;
    } else if (!item.val) {
      remainingCount++;
      missingRequired.push(item.label);
    }
  }

  return {
    populatedCount,
    remainingCount,
    missingRequired,
  };
};
