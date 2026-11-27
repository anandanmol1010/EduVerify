import '../config/db.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  let headers = { ...(options.headers || {}) };
  let body = options.body;

  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runAuditTests() {
  console.log('========================================================================');
  console.log('  EduVerify — Full Workflow Audit & Scenarios A through M Verification');
  console.log('========================================================================\n');

  const timestamp = Date.now();
  const dummyPdfPath = path.join(process.cwd(), `audit_test_doc_${timestamp}.pdf`);
  fs.writeFileSync(dummyPdfPath, '%PDF-1.4 %EduVerify synthetic certificate buffer for test suite');

  // Helper to upload document manually via multipart/form-data
  async function uploadDoc(token, docType, title, filePath, rollNumber = '', appId = null) {
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob, path.basename(filePath));
    formData.append('docType', docType);
    formData.append('title', title);
    if (rollNumber) formData.append('rollNumber', rollNumber);
    if (appId) formData.append('applicationId', appId);

    const res = await req('/documents/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res;
  }

  try {
    // 0. Setup and Auth Context
    console.log('[Setup] Logging in System Admin and Admission Officer...');
    const adminLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'admin@eduverify.ac.in', password: process.env.SEED_ADMIN_PASSWORD },
    });
    assert(adminLogin.ok, 'Admin login failed');
    const adminToken = adminLogin.data.token;

    const officerLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'officer@eduverify.ac.in', password: 'OfficerPassword123!' },
    });
    assert(officerLogin.ok, 'Officer login failed');
    const officerToken = officerLogin.data.token;

    // Fetch Target Course: BTECH-CSE
    const coursesRes = await req('/courses');
    assert(coursesRes.ok, 'Fetch courses failed');
    let cseCourse = coursesRes.data.courses.find((c) => c.code === 'BTECH-CSE');
    assert(cseCourse, 'BTECH-CSE course not found');

    console.log(`✓ Institutional Context: ${cseCourse.title} (${cseCourse.code})\n`);

    // =========================================================================
    // SCENARIO A: Complete DigiLocker Demo Admission
    // =========================================================================
    console.log('--- SCENARIO A: Complete DigiLocker Demo Admission ---');
    // 1. Register student
    const studAReg = await req('/auth/register', {
      method: 'POST',
      body: {
        name: `Student Scenario A ${timestamp}`,
        email: `student_scen_a_${timestamp}@eduverify.ac.in`,
        password: 'Password123!',
        phone: '+91 98111 00001',
      },
    });
    assert(studAReg.ok, 'Student A registration failed');
    const studAToken = studAReg.data.token;

    // 2. Start Application (Initial state: Academic fields empty)
    const draftA = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: { courseId: cseCourse._id, isDraft: true },
    });
    assert(draftA.ok, 'Draft A creation failed');
    const appAId = draftA.data.application._id;
    assert(
      !draftA.data.application.academicSnapshot?.class10?.rollNumber,
      'Academic fields must initially be empty'
    );
    console.log('  1. New application started; academic fields initially empty.');

    // 3. Connect to DigiLocker Demo (OAuth Step 1: Init)
    const oauthInitA = await req('/digilocker/oauth/init', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: { applicationId: appAId },
    });
    assert(oauthInitA.ok, 'OAuth Init failed');
    const sessAId = oauthInitA.data.sessionId;
    assert(sessAId && sessAId.startsWith('dlsess_'), 'Invalid session ID');
    console.log(`  2. DigiLocker Demo session initiated: ${sessAId}`);

    // 4. Authenticate Demo Account (OAuth Step 2: Auth)
    const oauthAuthA = await req('/digilocker/oauth/authenticate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: { sessionId: sessAId, demoAccountId: 'DEMO-001', otp: '123456' },
    });
    assert(oauthAuthA.ok, 'OAuth Authenticate failed');
    assert(oauthAuthA.data.state === 'AUTHENTICATED', 'State should be AUTHENTICATED');
    console.log(`  3. Demo account DEMO-001 authenticated (${oauthAuthA.data.account.fullName}).`);

    // 5. Grant Consent (OAuth Step 3: Consent)
    const oauthConsentA = await req('/digilocker/oauth/consent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: { sessionId: sessAId, decision: 'allow' },
    });
    assert(oauthConsentA.ok, 'OAuth Consent failed');
    const authCodeA = oauthConsentA.data.authCode;
    assert(authCodeA && authCodeA.startsWith('dlauth_'), 'Invalid authCode');
    console.log(`  4. Candidate granted consent; authorization token issued: ${authCodeA}`);

    // 6. Inspect Issued Documents (OAuth Step 4: Documents)
    const oauthDocsA = await req(`/digilocker/oauth/documents?sessionId=${sessAId}`, {
      headers: { Authorization: `Bearer ${studAToken}` },
    });
    assert(oauthDocsA.ok, 'OAuth Documents fetch failed');
    assert(oauthDocsA.data.documents.length >= 3, 'Expected at least 3 issued documents');
    console.log(`  5. Retrieved ${oauthDocsA.data.documents.length} issued documents from repository.`);

    // 7. Select & Exchange Documents (OAuth Step 6: Exchange)
    const selectedDocsA = ['class10_marksheet', 'class12_marksheet', 'passing_certificate'];
    const oauthExchA = await req('/digilocker/oauth/exchange', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: {
        sessionId: sessAId,
        authCode: authCodeA,
        selectedDocTypes: selectedDocsA,
        applicationId: appAId,
      },
    });
    assert(oauthExchA.ok, `OAuth Exchange failed: ${oauthExchA.data.message}`);
    assert(oauthExchA.data.importedDocuments.length === 3, 'Expected 3 imported documents');
    assert(
      oauthExchA.data.importedDocuments.every((d) => d.verificationStatus === 'Pending Verification'),
      'All imported documents must initially have Pending Verification status'
    );
    console.log('  6. Documents exchanged and auto-populated academic details.');

    // 8. Submit Application
    const submitA = await req(`/applications/${appAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: {
        submitNow: true,
        personalSnapshot: { fullName: 'Aarav Sharma', email: `student_scen_a_${timestamp}@eduverify.ac.in` },
        academicSnapshot: {
          class10: oauthExchA.data.importedAcademicDetails.class10,
          class12: oauthExchA.data.importedAcademicDetails.class12,
        },
      },
    });
    assert(submitA.ok, `Submit A failed: ${submitA.data.message}`);
    assert(submitA.data.application.status === 'Pending Verification', 'Status should be Pending Verification');
    console.log(`  7. Application submitted: ${submitA.data.application.applicationNumber} (Status: Pending Verification).`);

    // 9. Officer Review & Individual Verification of each document
    const appDetailA = await req(`/applications/${appAId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(appDetailA.ok, 'Officer fetch application A failed');
    for (const doc of appDetailA.data.application.documents) {
      const vRes = await req(`/documents/${doc._id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerToken}` },
        body: { status: 'Verified', remarks: 'DigiLocker credential verified against board standards.' },
      });
      assert(vRes.ok, `Verify doc ${doc.title} failed`);
    }
    console.log('  8. Admission Officer individually scrutinized and verified all 3 credentials.');

    // 10. Officer Explicit Final Approval
    const acceptA = await req(`/applications/${appAId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: { remarks: 'Admission accepted under general merit quota.' },
    });
    assert(acceptA.ok, `Accept A failed: ${acceptA.data.message}`);
    assert(acceptA.data.application.status === 'Accepted', 'Status should be Accepted');
    assert(acceptA.data.admissionLetter, 'Admission letter must be generated upon acceptance');
    console.log(`  9. Officer granted final acceptance! Admission ID: ${acceptA.data.admissionLetter.admissionId}`);
    console.log('✓ SCENARIO A PASSED.\n');

    // =========================================================================
    // SCENARIO B: Entirely Manual Admission (Zero DigiLocker Connection)
    // =========================================================================
    console.log('--- SCENARIO B: Entirely Manual Admission (Zero DigiLocker) ---');
    const studBReg = await req('/auth/register', {
      method: 'POST',
      body: {
        name: `Student Manual Only ${timestamp}`,
        email: `student_manual_${timestamp}@eduverify.ac.in`,
        password: 'Password123!',
      },
    });
    assert(studBReg.ok, 'Student B registration failed');
    const studBToken = studBReg.data.token;

    // Upload 3 required documents manually
    const upB10 = await uploadDoc(studBToken, 'class10_marksheet', 'Class 10 Marksheet Manual', dummyPdfPath, 'MAN1092');
    const upB12 = await uploadDoc(studBToken, 'class12_marksheet', 'Class 12 Marksheet Manual', dummyPdfPath, 'MAN1292');
    const upBPass = await uploadDoc(studBToken, 'passing_certificate', 'Passing Certificate Manual', dummyPdfPath);
    assert(upB10.ok && upB12.ok && upBPass.ok, 'Manual document uploads failed');

    // Submit application with manually entered academic records
    const submitB = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studBToken}` },
      body: {
        courseId: cseCourse._id,
        isDraft: false,
        personalSnapshot: { fullName: 'Student Manual Only', email: `student_manual_${timestamp}@eduverify.ac.in` },
        academicSnapshot: {
          class10: { board: 'State Board', passingYear: 2022, percentage: 89, rollNumber: 'MAN1092' },
          class12: {
            board: 'State Board',
            passingYear: 2024,
            percentage: 86,
            rollNumber: 'MAN1292',
            subjects: [
              { subjectName: 'Mathematics', marksObtained: 88, maxMarks: 100 },
              { subjectName: 'Physics', marksObtained: 85, maxMarks: 100 },
            ],
          },
        },
      },
    });
    assert(submitB.ok, `Submit B failed: ${submitB.data.message}`);
    const appBId = submitB.data.application._id;
    assert(
      submitB.data.application.status === 'Submitted' || submitB.data.application.status === 'Pending Verification',
      'Status should be Submitted / Pending Verification'
    );
    console.log(`  1. Manual application submitted: ${submitB.data.application.applicationNumber}`);

    // Officer verifies all manual documents
    const appBDetails = await req(`/applications/${appBId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    for (const doc of appBDetails.data.application.documents) {
      assert(doc.source === 'Manual Upload', 'Document source must be Manual Upload');
      await req(`/documents/${doc._id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerToken}` },
        body: { status: 'Verified', remarks: 'Manual certificate verified.' },
      });
    }

    // Officer accepts
    const acceptB = await req(`/applications/${appBId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(acceptB.ok, 'Accept B failed');
    assert(acceptB.data.application.status === 'Accepted', 'Status should be Accepted');
    console.log('  2. Officer verified all manual credentials and confirmed admission.');
    console.log('✓ SCENARIO B PASSED.\n');

    // =========================================================================
    // SCENARIO C: Mixed Document Submission (DigiLocker + Manual Upload)
    // =========================================================================
    console.log('--- SCENARIO C: Mixed Document Submission (Hybrid) ---');
    const studCReg = await req('/auth/register', {
      method: 'POST',
      body: {
        name: `Student Hybrid ${timestamp}`,
        email: `student_hybrid_${timestamp}@eduverify.ac.in`,
        password: 'Password123!',
      },
    });
    assert(studCReg.ok, 'Student C registration failed');
    const studCToken = studCReg.data.token;

    // Import ONLY class10_marksheet from DigiLocker Demo
    const oauthInitC = await req('/digilocker/oauth/init', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studCToken}` },
      body: {},
    });
    const sessCId = oauthInitC.data.sessionId;

    await req('/digilocker/oauth/authenticate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studCToken}` },
      body: { sessionId: sessCId, demoAccountId: 'DEMO-002', otp: '123456' },
    });

    const consentC = await req('/digilocker/oauth/consent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studCToken}` },
      body: { sessionId: sessCId, decision: 'allow' },
    });

    const exchC = await req('/digilocker/oauth/exchange', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studCToken}` },
      body: {
        sessionId: sessCId,
        authCode: consentC.data.authCode,
        selectedDocTypes: ['class10_marksheet'], // Only Class 10th
      },
    });
    assert(exchC.ok, 'Exchange C failed');

    // Upload remaining mandatory docs: class12_marksheet and passing_certificate manually
    await uploadDoc(studCToken, 'class12_marksheet', 'Class 12th Manual Marksheet', dummyPdfPath, 'CBSE2024102');
    await uploadDoc(studCToken, 'passing_certificate', 'Passing Certificate Manual', dummyPdfPath);

    // Submit application
    const submitC = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studCToken}` },
      body: {
        courseId: cseCourse._id,
        isDraft: false,
        personalSnapshot: { fullName: 'Priya Venkatesh', email: `student_hybrid_${timestamp}@eduverify.ac.in` },
        academicSnapshot: {
          class10: exchC.data.importedAcademicDetails.class10,
          class12: {
            board: 'CBSE',
            passingYear: 2024,
            percentage: 87,
            rollNumber: 'CBSE2024102',
            subjects: [
              { subjectName: 'Mathematics', marksObtained: 85, maxMarks: 100 },
              { subjectName: 'Physics', marksObtained: 84, maxMarks: 100 },
            ],
          },
        },
      },
    });
    assert(submitC.ok, `Submit C failed: ${submitC.data.message}`);
    const appCDetails = await req(`/applications/${submitC.data.application._id}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const sourcesC = appCDetails.data.application.documents.map((d) => d.source);
    assert(
      sourcesC.includes('DigiLocker Demo') && sourcesC.includes('Manual Upload'),
      'Application must contain both DigiLocker Demo and Manual Upload documents'
    );
    console.log(`  1. Hybrid application submitted with sources: ${sourcesC.join(', ')}`);
    console.log('✓ SCENARIO C PASSED.\n');

    // =========================================================================
    // SCENARIO D: Consent Denied
    // =========================================================================
    console.log('--- SCENARIO D: Consent Denied ---');
    const oauthInitD = await req('/digilocker/oauth/init', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: {},
    });
    const sessDId = oauthInitD.data.sessionId;

    await req('/digilocker/oauth/authenticate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: { sessionId: sessDId, demoAccountId: 'DEMO-001', otp: '123456' },
    });

    const consentD = await req('/digilocker/oauth/consent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: { sessionId: sessDId, decision: 'deny' },
    });
    assert(consentD.ok, 'Consent Denied request failed');
    assert(consentD.data.state === 'DENIED', "State must be 'DENIED'");

    // Verify exchange fails if consent was denied
    const exchD = await req('/digilocker/oauth/exchange', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: { sessionId: sessDId, authCode: 'fake_code', selectedDocTypes: ['class10_marksheet'] },
    });
    assert(!exchD.ok && exchD.status === 400, 'Exchange must fail when consent was denied');
    console.log('  1. Consent was denied; backend safely rejected document exchange.');
    console.log('✓ SCENARIO D PASSED.\n');

    // =========================================================================
    // SCENARIO E: Invalid or Expired Authorization / Replay Prevention
    // =========================================================================
    console.log('--- SCENARIO E: Invalid / Reused Authorization Code Rejection ---');
    // Attempt to reuse authCodeA from Scenario A
    const replayExch = await req('/digilocker/oauth/exchange', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studAToken}` },
      body: {
        sessionId: sessAId,
        authCode: authCodeA,
        selectedDocTypes: ['class10_marksheet'],
      },
    });
    assert(!replayExch.ok && replayExch.status === 400, 'Replay of authorization code must fail');
    console.log(`  1. Replay attempt rejected: "${replayExch.data.message}"`);
    console.log('✓ SCENARIO E PASSED.\n');

    // =========================================================================
    // SCENARIO F: Incomplete Application (Missing Mandatory Documents)
    // =========================================================================
    console.log('--- SCENARIO F: Submission Blocked When Mandatory Documents Missing ---');
    const studFReg = await req('/auth/register', {
      method: 'POST',
      body: {
        name: `Student Incomplete ${timestamp}`,
        email: `student_incomp_${timestamp}@eduverify.ac.in`,
        password: 'Password123!',
      },
    });
    const studFToken = studFReg.data.token;

    const blockSubmitF = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studFToken}` },
      body: {
        courseId: cseCourse._id,
        isDraft: false,
        personalSnapshot: { fullName: 'Student Incomplete', email: `student_incomp_${timestamp}@eduverify.ac.in` },
        academicSnapshot: {
          class10: { percentage: 90 },
          class12: { percentage: 90 },
        },
      },
    });
    assert(!blockSubmitF.ok && blockSubmitF.status === 400, 'Submission must be blocked when docs missing');
    assert(
      blockSubmitF.data.missingDocuments && blockSubmitF.data.missingDocuments.length > 0,
      'Missing documents list must be returned'
    );
    console.log(`  1. Blocked with missing docs: ${blockSubmitF.data.missingDocuments.map((d) => d.docType).join(', ')}`);
    console.log('✓ SCENARIO F PASSED.\n');

    // =========================================================================
    // SCENARIO G: Eligible but Not Approved (No Auto-Accept)
    // =========================================================================
    console.log('--- SCENARIO G: Eligible Candidate Remains Pending Verification ---');
    // Upload required docs for Student F so submission succeeds
    await uploadDoc(studFToken, 'class10_marksheet', 'Class 10', dummyPdfPath);
    await uploadDoc(studFToken, 'class12_marksheet', 'Class 12', dummyPdfPath);
    await uploadDoc(studFToken, 'passing_certificate', 'Passing Cert', dummyPdfPath);

    const eligibleSubmitG = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studFToken}` },
      body: {
        courseId: cseCourse._id,
        isDraft: false,
        personalSnapshot: { fullName: 'Student Eligible NonApproved', email: `student_incomp_${timestamp}@eduverify.ac.in` },
        academicSnapshot: {
          class10: { percentage: 92, board: 'CBSE' },
          class12: {
            percentage: 91,
            board: 'CBSE',
            subjects: [
              { subjectName: 'Mathematics', marksObtained: 92, maxMarks: 100 },
              { subjectName: 'Physics', marksObtained: 90, maxMarks: 100 },
            ],
          },
        },
      },
    });
    assert(eligibleSubmitG.ok, `Submit G failed: ${eligibleSubmitG.data.message}`);
    const appG = eligibleSubmitG.data.application;
    assert(appG.eligibilityEvaluation.isEligible === true, 'Candidate should be academically eligible');
    assert(
      appG.status === 'Submitted' || appG.status === 'Pending Verification',
      `Expected status 'Submitted' or 'Pending Verification', got '${appG.status}'`
    );
    assert(appG.status !== 'Accepted', 'Candidate must not be auto-accepted');

    // Confirm no letter exists
    const letterG = await req('/letters/my-letters', {
      headers: { Authorization: `Bearer ${studFToken}` },
    });
    assert(letterG.data.letters.length === 0, 'No admission letter should exist for pending application');
    console.log(`  1. Application status is '${appG.status}', eligibility is 'ELIGIBLE', zero letters issued.`);
    console.log('✓ SCENARIO G PASSED.\n');

    // =========================================================================
    // SCENARIO H: Document Correction & Resubmission Workflow
    // =========================================================================
    console.log('--- SCENARIO H: Document Correction & Resubmission Workflow ---');
    const appGId = appG._id;

    // 1. Officer requests correction
    const reqCorrH = await req(`/applications/${appGId}/decision`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: { action: 'request_correction', remarks: 'Class 12th marksheet scan is blurry. Please upload a clear copy.' },
    });
    assert(reqCorrH.ok, 'Request correction failed');
    assert(reqCorrH.data.application.status === 'Correction Required', 'Status must be Correction Required');
    console.log("  1. Officer requested correction; status moved to 'Correction Required'.");

    // 2. Student re-uploads document (replaces blurred doc)
    const replaceH = await uploadDoc(studFToken, 'class12_marksheet', 'Clear Class 12th Marksheet', dummyPdfPath, '', appGId);
    assert(replaceH.ok, 'Replacement upload failed');
    assert(replaceH.data.document.verificationStatus === 'Pending Verification', 'Status must reset to Pending Verification');
    console.log("  2. Student uploaded replacement certificate; status reset to 'Pending Verification'.");

    // 3. Student resubmits application
    const resubmitH = await req(`/applications/${appGId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studFToken}` },
      body: { submitNow: true },
    });
    assert(resubmitH.ok, 'Resubmission failed');
    assert(resubmitH.data.application.status === 'Pending Verification', 'Status must return to Pending Verification');
    console.log("  3. Student resubmitted application; status returned to 'Pending Verification'.");
    console.log('✓ SCENARIO H PASSED.\n');

    // =========================================================================
    // SCENARIO I: Unauthorized Approval (RBAC Security)
    // =========================================================================
    console.log('--- SCENARIO I: Unauthorized Approval Blocked (RBAC) ---');
    const illegalAcceptI = await req(`/applications/${appGId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studFToken}` }, // Student token!
    });
    assert(!illegalAcceptI.ok && illegalAcceptI.status === 403, 'Student cannot accept applications');
    console.log('  1. Direct student API call to /accept blocked with 403 Forbidden.');
    console.log('✓ SCENARIO I PASSED.\n');

    // =========================================================================
    // SCENARIO J: Premature Officer Approval Blocked
    // =========================================================================
    console.log('--- SCENARIO J: Premature Approval Blocked (Unverified Documents) ---');
    // Documents are currently 'Pending Verification', not yet verified
    const prematureJ = await req(`/applications/${appGId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(!prematureJ.ok && prematureJ.status === 400, 'Approval must be blocked before docs are verified');
    console.log(`  1. Premature approval rejected: "${prematureJ.data.message}"`);
    console.log('✓ SCENARIO J PASSED.\n');

    // =========================================================================
    // SCENARIO K: Course Seat Capacity Exhaustion
    // =========================================================================
    console.log('--- SCENARIO K: Course Seat Capacity Exhaustion ---');
    // Create course with 0 available seats
    const fullCourseRes = await req('/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `Full Quota Course ${timestamp}`,
        code: `FQ-${timestamp.toString().slice(-4)}`,
        department: cseCourse.department._id || cseCourse.department,
        level: 'Undergraduate',
        durationYears: 4,
        totalSeats: 1,
        allocatedSeats: 1, // Full!
        annualFee: 120000,
        description: 'Test course with zero available seats.',
        status: 'open',
        eligibilityCriteria: {
          minClass10Percentage: 50,
          minClass12Percentage: 50,
          requiredDocuments: [{ docType: 'class10_marksheet', docName: 'Class 10th', isMandatory: false }],
        },
      },
    });
    assert(fullCourseRes.ok, 'Create full course failed');
    const fullCourseId = fullCourseRes.data.course._id;

    const fullAppRes = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studFToken}` },
      body: {
        courseId: fullCourseId,
        isDraft: false,
        personalSnapshot: { fullName: 'Student Full Quota', email: 'test@full.com' },
        academicSnapshot: { class10: { percentage: 80 }, class12: { percentage: 80 } },
      },
    });
    assert(fullAppRes.ok, 'Create full course app failed');

    const capExceed = await req(`/applications/${fullAppRes.data.application._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(!capExceed.ok && capExceed.status === 400, 'Accepting over capacity must fail');
    assert(
      capExceed.data.message.toLowerCase().includes('seat') || capExceed.data.message.toLowerCase().includes('capacity'),
      'Message should mention seat capacity'
    );
    console.log(`  1. Acceptance blocked when seats full: "${capExceed.data.message}"`);
    console.log('✓ SCENARIO K PASSED.\n');

    // =========================================================================
    // SCENARIO L: Admission Letter Verification (Valid and Invalid)
    // =========================================================================
    console.log('--- SCENARIO L: Admission Letter Verification ---');
    // Verify valid letter from Scenario A
    const validVerify = await req(`/letters/public-verify/${acceptA.data.admissionLetter.admissionId}`);
    assert(validVerify.ok, 'Public verify failed');
    assert(validVerify.data.isValid === true, 'Letter must be valid');
    assert(validVerify.data.verificationData.courseCode === 'BTECH-CSE', 'Course code mismatch');
    assert(validVerify.data.verificationData.candidateNameMasked.includes('*'), 'Name must be masked for privacy');
    console.log(`  1. Valid admission letter verified: ${validVerify.data.verificationData.status} (Candidate: ${validVerify.data.verificationData.candidateNameMasked})`);

    // Verify invalid / fake admission reference
    const invalidVerify = await req('/letters/public-verify/FAKE-REF-99999');
    assert(!invalidVerify.ok && invalidVerify.status === 404, 'Invalid reference must return 404');
    console.log('  2. Fake/unrecognized admission reference returned 404 Not Found.');
    console.log('✓ SCENARIO L PASSED.\n');

    // =========================================================================
    // SCENARIO M: Data Persistence
    // =========================================================================
    console.log('--- SCENARIO M: Data Persistence ---');
    // Query saved records directly to confirm state is persisted
    const appAPersisted = await req(`/applications/${appAId}`, {
      headers: { Authorization: `Bearer ${studAToken}` },
    });
    assert(appAPersisted.ok, 'Fetch persisted application A failed');
    assert(appAPersisted.data.application.status === 'Accepted', 'Persisted status must be Accepted');
    assert(appAPersisted.data.application.documents.length === 3, 'Persisted documents must equal 3');

    const appGPersisted = await req(`/applications/${appGId}`, {
      headers: { Authorization: `Bearer ${studFToken}` },
    });
    assert(appGPersisted.ok, 'Fetch persisted application G failed');
    assert(appGPersisted.data.application.status === 'Pending Verification', 'Persisted status must be Pending Verification');
    console.log('  1. Application statuses, documents, and decisions verified persistent across sessions.');
    console.log('✓ SCENARIO M PASSED.\n');

    // Cleanup temporary file
    if (fs.existsSync(dummyPdfPath)) {
      fs.unlinkSync(dummyPdfPath);
    }

    console.log('========================================================================');
    console.log('🎉 ALL AUDIT SCENARIOS (A THROUGH M) COMPLETED & VERIFIED WITH 100% PASS!');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ Workflow Audit Test Failed:');
    console.error(err.message);
    if (fs.existsSync(dummyPdfPath)) fs.unlinkSync(dummyPdfPath);
    process.exit(1);
  }
}

runAuditTests();
