const normalizeSubject = (name) => String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const subjectAliases = new Map([
  ['english', new Set(['english core', 'english elective', 'english language & literature', 'english language and literature'])],
  ['mathematics', new Set(['math', 'maths'])],
]);

const matchesSubject = (required, recorded) => {
  const name = normalizeSubject(recorded);
  const canonical = ['math', 'maths'].includes(required) ? 'mathematics' : required;
  return name === canonical || subjectAliases.get(canonical)?.has(name) === true;
};

const numberOrNaN = (value) => {
  if (typeof value === 'number') return value;
  return typeof value === 'string' && value.trim() ? Number(value) : NaN;
};

export const evaluateEligibility = ({ course, academic10th, academic12th, documents }) => {
  const criteria = course.eligibilityCriteria;
  const passedRules = [];
  const failedRules = [];
  let scoreCalculated = 0;

  if (!criteria) {
    return {
      isEligible: false,
      status: 'Incomplete',
      rulesPassed: [],
      rulesFailed: ['Eligibility rules are unavailable for this course. Contact admissions.'],
      scoreCalculated: 0,
      remarks: 'Course eligibility could not be confirmed.',
    };
  }

  // Check if academic details are present
  const class10Pct = numberOrNaN(academic10th?.percentage);
  const class12Pct = numberOrNaN(academic12th?.percentage);
  const has10th = Number.isFinite(class10Pct);
  const has12th = Number.isFinite(class12Pct);

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
  if (!has10th) {
    failedRules.push('Enter the Class 10 aggregate percentage.');
  } else if (class10Pct >= criteria.minClass10Percentage && class10Pct <= 100) {
    passedRules.push(`Class 10th aggregate score: ${class10Pct}% (Min required: ${criteria.minClass10Percentage}%)`);
  } else {
    failedRules.push(`Class 10 aggregate must be between ${criteria.minClass10Percentage}% and 100% (entered ${class10Pct}%).`);
  }

  // 2. Class 12 Percentage Check
  if (!has12th) {
    failedRules.push('Enter the Class 12 aggregate percentage.');
  } else if (class12Pct >= criteria.minClass12Percentage && class12Pct <= 100) {
    passedRules.push(`Class 12th aggregate score: ${class12Pct}% (Min required: ${criteria.minClass12Percentage}%)`);
  } else {
    failedRules.push(`Class 12 aggregate must be between ${criteria.minClass12Percentage}% and 100% (entered ${class12Pct}%).`);
  }

  if (has10th && has12th) scoreCalculated = (class12Pct * 0.7) + (class10Pct * 0.3);

  // 3. Subject-wise Evaluation (Class 12)
  if (criteria.requiredSubjects && criteria.requiredSubjects.length > 0) {
    const studentSubjects = Array.isArray(academic12th?.subjects) ? academic12th.subjects : [];
    
    criteria.requiredSubjects.forEach((reqSub) => {
      const required = normalizeSubject(reqSub.subjectName);
      const matches = studentSubjects.filter((subject) => required && matchesSubject(required, subject?.subjectName));

      if (!required) {
        failedRules.push('The course has a subject requirement with no subject name. Contact admissions.');
        return;
      }
      if (matches.length === 0) {
        if (reqSub.isMandatory !== false) failedRules.push(`Class 12 ${reqSub.subjectName} is required.`);
        return;
      }
      if (matches.length > 1) {
        failedRules.push(`Multiple Class 12 results match ${reqSub.subjectName}. Check your subject record.`);
        return;
      }
      const [subject] = matches;
      const marks = numberOrNaN(subject.marksObtained);
      const maximum = numberOrNaN(subject.maxMarks ?? 100);
      if (!Number.isFinite(marks) || !Number.isFinite(maximum) || maximum <= 0 || marks < 0 || marks > maximum) {
        failedRules.push(`Enter valid Class 12 marks for ${subject.subjectName}.`);
        return;
      }
      const percentage = (marks / maximum) * 100;
      if (percentage >= reqSub.minMarks) {
        passedRules.push(`${subject.subjectName}: ${marks}/${maximum} (minimum ${reqSub.minMarks}%).`);
      } else {
        failedRules.push(`${subject.subjectName}: ${marks}/${maximum} (${percentage.toFixed(2)}%) is below the required ${reqSub.minMarks}%.`);
      }
    });
  }

  if (academic12th?.backlogs != null && criteria.maxBacklogsAllowed != null) {
    const backlogs = numberOrNaN(academic12th.backlogs);
    if (!Number.isInteger(backlogs) || backlogs < 0) {
      failedRules.push('The Class 12 backlog count is invalid.');
    } else if (backlogs > criteria.maxBacklogsAllowed) {
      failedRules.push(`Class 12 reports ${backlogs} outstanding backlogs. This course allows at most ${criteria.maxBacklogsAllowed}.`);
    }
  }

  // 4. Required Documents Presence Check
  if (criteria.requiredDocuments && criteria.requiredDocuments.length > 0 && documents) {
    const presentDocTypes = documents.map((d) => d.docType || d);
    criteria.requiredDocuments.forEach((reqDoc) => {
      if (reqDoc.isMandatory !== false) {
        if (presentDocTypes.includes(reqDoc.docType)) {
          passedRules.push(`Mandatory document present: ${reqDoc.docName}`);
        } else {
          failedRules.push(`Missing mandatory document: ${reqDoc.docName}`);
        }
      }
    });
  }

  const isIncomplete = !has10th || !has12th;
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
