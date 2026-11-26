export const evaluateEligibility = ({ course, academic10th, academic12th, documents }) => {
  const criteria = course.eligibilityCriteria;
  const passedRules = [];
  const failedRules = [];
  let scoreCalculated = 0;

  if (!criteria) {
    return {
      isEligible: true,
      status: 'Eligible',
      rulesPassed: ['Standard open admission (no specific criteria configured)'],
      rulesFailed: [],
      scoreCalculated: academic12th?.percentage || 70,
      remarks: 'All requirements satisfied',
    };
  }

  // Check if academic details are present
  const has10th = academic10th && (Number(academic10th.percentage) > 0 || academic10th.rollNumber);
  const has12th = academic12th && (Number(academic12th.percentage) > 0 || academic12th.rollNumber);

  if (!has10th && !has12th) {
    return {
      isEligible: false,
      status: 'Incomplete',
      rulesPassed: [],
      rulesFailed: ['Academic details (Class 10th and 12th) have not yet been provided.'],
      scoreCalculated: 0,
      remarks: 'Academic information is incomplete. Please enter or import academic details to verify eligibility.',
    };
  }

  // 1. Class 10 Percentage Check
  const class10Pct = Number(academic10th?.percentage || 0);
  if (class10Pct >= criteria.minClass10Percentage) {
    passedRules.push(`Class 10th aggregate score: ${class10Pct}% (Min required: ${criteria.minClass10Percentage}%)`);
  } else {
    failedRules.push(`Class 10th aggregate score is ${class10Pct}%, below the required minimum of ${criteria.minClass10Percentage}%.`);
  }

  // 2. Class 12 Percentage Check
  const class12Pct = Number(academic12th?.percentage || 0);
  if (class12Pct >= criteria.minClass12Percentage) {
    passedRules.push(`Class 12th aggregate score: ${class12Pct}% (Min required: ${criteria.minClass12Percentage}%)`);
  } else {
    failedRules.push(`Class 12th aggregate score is ${class12Pct}%, below the required minimum of ${criteria.minClass12Percentage}%.`);
  }

  scoreCalculated = (class12Pct * 0.7) + (class10Pct * 0.3);

  // 3. Subject-wise Evaluation (Class 12)
  if (criteria.requiredSubjects && criteria.requiredSubjects.length > 0) {
    const studentSubjects = academic12th?.subjects || [];
    
    criteria.requiredSubjects.forEach((reqSub) => {
      const found = studentSubjects.find(
        (s) => s.subjectName && s.subjectName.toLowerCase().includes(reqSub.subjectName.toLowerCase())
      );

      if (!found) {
        if (reqSub.isMandatory) {
          failedRules.push(`Mandatory subject '${reqSub.subjectName}' is missing from Class 12 academic record.`);
        }
      } else {
        const marks = Number(found.marksObtained || 0);
        if (marks >= reqSub.minMarks) {
          passedRules.push(`Subject '${found.subjectName}': scored ${marks}/${found.maxMarks || 100} (Min required: ${reqSub.minMarks})`);
        } else {
          failedRules.push(`Subject '${found.subjectName}' score ${marks} is lower than required minimum ${reqSub.minMarks}.`);
        }
      }
    });
  }

  // 4. Required Documents Presence Check
  if (criteria.requiredDocuments && criteria.requiredDocuments.length > 0 && documents) {
    const presentDocTypes = documents.map((d) => d.docType || d);
    criteria.requiredDocuments.forEach((reqDoc) => {
      if (reqDoc.isMandatory) {
        if (presentDocTypes.includes(reqDoc.docType)) {
          passedRules.push(`Mandatory document present: ${reqDoc.docName}`);
        } else {
          failedRules.push(`Missing mandatory document: ${reqDoc.docName}`);
        }
      }
    });
  }

  const isIncomplete = (!class10Pct && criteria.minClass10Percentage > 0) || (!class12Pct && criteria.minClass12Percentage > 0);
  const isEligible = !isIncomplete && failedRules.length === 0;
  const status = isIncomplete ? 'Incomplete' : (isEligible ? 'Eligible' : 'Not Eligible');

  return {
    isEligible,
    status,
    rulesPassed: passedRules,
    rulesFailed: failedRules,
    scoreCalculated: Math.round(scoreCalculated * 100) / 100,
    remarks: isIncomplete
      ? 'Academic records are incomplete. Please ensure both Class 10 and Class 12 scores are recorded.'
      : isEligible
      ? 'Applicant fulfills all prescribed academic eligibility benchmarks.'
      : `Applicant failed to meet ${failedRules.length} eligibility requirement(s).`,
  };
};
