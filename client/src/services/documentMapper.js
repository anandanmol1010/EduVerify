/**
 * Centralized Document Mapping and Extraction Service
 * Maps imported DigiLocker metadata to application form fields,
 * tracks field provenance (imported vs manual), detects personal detail conflicts,
 * and computes dynamic progress metrics.
 */

export const mapDigiLockerAcademicData = (importedDetails, currentAcademic = {}) => {
  if (!importedDetails) return { academic: currentAcademic, fieldMeta: {} };

  const fieldMeta = { ...(currentAcademic.fieldMeta || {}) };
  const academic = {
    class10: { ...(currentAcademic.class10 || {}) },
    class12: { ...(currentAcademic.class12 || {}) },
  };

  // Map Class 10th details if present in import
  if (importedDetails.class10) {
    const c10 = importedDetails.class10;
    academic.class10.board = importedDetails.board || c10.board || academic.class10.board || '';
    academic.class10.rollNumber = c10.rollNumber || importedDetails.rollNumber || academic.class10.rollNumber || '';
    academic.class10.passingYear = c10.passingYear || academic.class10.passingYear || '';
    academic.class10.percentage = c10.percentage !== undefined ? c10.percentage : academic.class10.percentage || '';
    academic.class10.schoolName = c10.schoolName || academic.class10.schoolName || '';
    academic.class10.isImported = true;

    fieldMeta['class10.board'] = 'imported';
    fieldMeta['class10.rollNumber'] = 'imported';
    fieldMeta['class10.passingYear'] = 'imported';
    fieldMeta['class10.percentage'] = 'imported';
    fieldMeta['class10.schoolName'] = c10.schoolName ? 'imported' : 'manual';

    if (Array.isArray(c10.subjects) && c10.subjects.length > 0) {
      academic.class10.subjects = c10.subjects.map((s) => ({
        subjectName: s.subjectName || '',
        marksObtained: s.marksObtained !== undefined ? s.marksObtained : 0,
        maxMarks: s.maxMarks || 100,
        grade: s.grade || '',
        source: 'imported',
      }));
    }
  }

  // Map Class 12th details if present in import
  if (importedDetails.class12) {
    const c12 = importedDetails.class12;
    academic.class12.board = importedDetails.board || c12.board || academic.class12.board || '';
    academic.class12.rollNumber = c12.rollNumber || importedDetails.rollNumber || academic.class12.rollNumber || '';
    academic.class12.passingYear = c12.passingYear || academic.class12.passingYear || '';
    academic.class12.percentage = c12.percentage !== undefined ? c12.percentage : academic.class12.percentage || '';
    academic.class12.stream = c12.stream || academic.class12.stream || '';
    academic.class12.schoolName = c12.schoolName || academic.class12.schoolName || '';
    academic.class12.isImported = true;

    fieldMeta['class12.board'] = 'imported';
    fieldMeta['class12.rollNumber'] = 'imported';
    fieldMeta['class12.passingYear'] = 'imported';
    fieldMeta['class12.percentage'] = 'imported';
    fieldMeta['class12.schoolName'] = c12.schoolName ? 'imported' : 'manual';

    if (Array.isArray(c12.subjects) && c12.subjects.length > 0) {
      academic.class12.subjects = c12.subjects.map((s) => ({
        subjectName: s.subjectName || '',
        marksObtained: s.marksObtained !== undefined ? s.marksObtained : 0,
        maxMarks: s.maxMarks || 100,
        grade: s.grade || '',
        source: 'imported',
      }));
    }
  }

  return { academic, fieldMeta };
};

/**
 * Identify conflicts between currently filled personal details and imported personal data
 */
export const detectPersonalConflicts = (currentPersonal = {}, importedData = {}) => {
  const conflicts = [];
  if (!importedData) return conflicts;

  const checkField = (fieldKey, label, currentVal, importedVal) => {
    if (!importedVal) return;
    const strCurrent = String(currentVal || '').trim().toLowerCase();
    const strImported = String(importedVal || '').trim().toLowerCase();

    // If current value is empty, it's not a conflict — it's an auto-fill opportunity
    if (!strCurrent) return;

    if (strCurrent !== strImported) {
      conflicts.push({
        field: fieldKey,
        label,
        currentValue: currentVal,
        importedValue: importedVal,
      });
    }
  };

  checkField('fullName', 'Full Legal Name', currentPersonal.fullName, importedData.candidateName);
  checkField('dob', 'Date of Birth', currentPersonal.dob ? currentPersonal.dob.split('T')[0] : '', importedData.dob ? importedData.dob.split('T')[0] : '');
  checkField('gender', 'Gender', currentPersonal.gender, importedData.gender);
  checkField('fatherName', "Father's Full Name", currentPersonal.fatherName, importedData.fatherName);
  checkField('motherName', "Mother's Full Name", currentPersonal.motherName, importedData.motherName);
  checkField('category', 'Category', currentPersonal.category, importedData.category);

  return conflicts;
};

/**
 * Safely merge personal details, populating empty fields and tracking populated count
 */
export const mergePersonalDetails = (currentPersonal = {}, importedData = {}, resolveDecisions = {}) => {
  if (!importedData) return { personal: currentPersonal, newlyPopulated: [] };

  const updated = { ...currentPersonal };
  const newlyPopulated = [];

  const mergeField = (key, importedVal) => {
    if (!importedVal) return;
    const decision = resolveDecisions[key];

    if (decision === 'keep') {
      return; // student explicitly kept current
    }

    if (decision === 'imported' || !updated[key]) {
      updated[key] = importedVal;
      newlyPopulated.push(key);
    }
  };

  mergeField('fullName', importedData.candidateName);
  if (importedData.dob) {
    mergeField('dob', importedData.dob.split('T')[0]);
  }
  mergeField('gender', importedData.gender);
  mergeField('fatherName', importedData.fatherName);
  mergeField('motherName', importedData.motherName);
  mergeField('nationality', importedData.nationality || 'Indian');
  mergeField('category', importedData.category);

  // Address
  if (importedData.permanentAddress && typeof importedData.permanentAddress === 'object') {
    updated.permanentAddress = {
      street: updated.permanentAddress?.street || importedData.permanentAddress.street || '',
      city: updated.permanentAddress?.city || importedData.permanentAddress.city || '',
      district: updated.permanentAddress?.district || importedData.permanentAddress.district || '',
      state: updated.permanentAddress?.state || importedData.permanentAddress.state || '',
      pincode: updated.permanentAddress?.pincode || importedData.permanentAddress.pincode || '',
      country: updated.permanentAddress?.country || importedData.permanentAddress.country || 'India',
    };
  }

  return { personal: updated, newlyPopulated };
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
