import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateEligibility } from '../services/eligibilityEngine.js';

const evaluate = ({ subjects, percentage = 85, backlogs, requirements = [
  { subjectName: 'Physics', minMarks: 60, isMandatory: true },
] }) => evaluateEligibility({
  course: {
    eligibilityCriteria: {
      minClass10Percentage: 60, minClass12Percentage: 65, requiredSubjects: requirements, maxBacklogsAllowed: 0,
    },
  },
  academic10th: { percentage: 80 },
  academic12th: { percentage, subjects, backlogs },
});

test('a substring subject and high aggregates cannot satisfy a mandatory subject', () => {
  const result = evaluate({ subjects: [{ subjectName: 'Biophysics', marksObtained: 95 }] });
  assert.equal(result.isEligible, false);
  assert.deepEqual(result.rulesFailed, ['Class 12 Physics is required.']);
});

test('subject thresholds apply to the percentage of available marks', () => {
  const result = evaluate({ subjects: [{ subjectName: 'Physics', marksObtained: 90, maxMarks: 200 }] });
  assert.equal(result.isEligible, false);
  assert.match(result.rulesFailed[0], /45\.00%.*60%/);
});

test('known aliases meet their named requirements and an absent optional subject is allowed', () => {
  const result = evaluate({
    subjects: [{ subjectName: 'English Core', marksObtained: 40, maxMarks: 50 }],
    requirements: [
      { subjectName: 'English', minMarks: 80 },
      { subjectName: 'Chemistry', minMarks: 70, isMandatory: false },
    ],
  });
  assert.equal(result.isEligible, true);
});

test('all failed rules are returned together', () => {
  const result = evaluate({ percentage: 40, subjects: [], backlogs: 1 });
  assert.equal(result.isEligible, false);
  assert.match(result.rulesFailed[0], /Class 12 aggregate/);
  assert.match(result.rulesFailed[1], /Physics is required/);
  assert.match(result.rulesFailed[2], /outstanding backlogs/);
});
