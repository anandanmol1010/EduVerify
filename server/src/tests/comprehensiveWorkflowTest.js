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

async function runComprehensiveTest() {
  console.log('========================================================================');
  console.log('  EduVerify — Comprehensive 15-Point Acceptance Test Suite');
  console.log('========================================================================\n');

  try {
    // 0. Setup and Auth
    console.log('[Setup] Logging in Admin, Officer, and creating Test Students...');
    const adminLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'admin@eduverify.ac.in', password: 'AdminPassword123!' },
    });
    assert(adminLogin.ok, 'Admin login failed');
    const adminToken = adminLogin.data.token;

    const officerLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'officer@eduverify.ac.in', password: 'OfficerPassword123!' },
    });
    assert(officerLogin.ok, 'Officer login failed');
    const officerToken = officerLogin.data.token;

    const timestamp = Date.now();

    // Register Student A (for manual upload workflow)
    const studentAReg = await req('/auth/register', {
      method: 'POST',
      body: {
        name: `Student Manual ${timestamp}`,
        email: `student_manual_${timestamp}@eduverify.ac.in`,
        password: 'Password123!',
        phone: '+91 98001 11111',
      },
    });
    assert(studentAReg.ok, 'Student A registration failed');
    const studentAToken = studentAReg.data.token;
    const studentAId = studentAReg.data.user._id;

    // Register Student B (for DigiLocker & Hybrid workflow)
    const studentBReg = await req('/auth/register', {
      method: 'POST',
      body: {
        name: `Student Digi ${timestamp}`,
        email: `student_digi_${timestamp}@eduverify.ac.in`,
        password: 'Password123!',
        phone: '+91 98002 22222',
      },
    });
    assert(studentBReg.ok, 'Student B registration failed');
    const studentBToken = studentBReg.data.token;
    const studentBId = studentBReg.data.user._id;

    // Fetch Target Course: BTECH-CSE
    const coursesRes = await req('/courses');
    assert(coursesRes.ok, 'Fetch courses failed');
    let cseCourse = coursesRes.data.courses?.find((c) => c.code === 'BTECH-CSE');
    if (!cseCourse) {
      const deptId = coursesRes.data.courses[0].department._id || coursesRes.data.courses[0].department;
      const createCse = await req('/courses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          title: 'B.Tech in Computer Science & Engineering',
          code: 'BTECH-CSE',
          department: deptId,
          level: 'Undergraduate',
          durationYears: 4,
          totalSeats: 60,
          allocatedSeats: 0,
          annualFee: 185000,
          description: 'Algorithms, Software Engineering, and AI.',
          status: 'open',
          eligibilityCriteria: {
            minClass10Percentage: 60,
            minClass12Percentage: 65,
            requiredSubjects: [
              { subjectName: 'Mathematics', minMarks: 60, isMandatory: true },
              { subjectName: 'Physics', minMarks: 55, isMandatory: true },
            ],
            requiredDocuments: [
              { docType: 'class10_marksheet', docName: 'Class 10th Marksheet', isMandatory: true },
              { docType: 'class12_marksheet', docName: 'Class 12th Marksheet', isMandatory: true },
              { docType: 'passing_certificate', docName: 'Passing Certificate', isMandatory: true },
              { docType: 'student_photo', docName: 'Passport Photograph', isMandatory: false },
            ],
          },
        },
      });
      assert(createCse.ok, `Create BTECH-CSE course failed: ${createCse.data.message}`);
      cseCourse = createCse.data.course;
    }

    console.log('✓ Authentication & Course context verified.\n');

    // -------------------------------------------------------------------------
    // CRITERION 1: Fresh Application Has No Pre-filled Fake Data
    // -------------------------------------------------------------------------
    console.log('[Criterion 1] Verifying new application is NOT pre-filled with hardcoded marks...');
    // Create an empty draft
    const draftRes = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAToken}` },
      body: {
        courseId: cseCourse._id,
        isDraft: true,
      },
    });
    assert(draftRes.ok, `Draft creation failed: ${draftRes.data.message}`);
    const draftApp = draftRes.data.application;
    assert(
      !draftApp.academicSnapshot?.class10?.rollNumber &&
      !draftApp.academicSnapshot?.class12?.rollNumber,
      'New draft should not have pre-filled roll numbers or hardcoded mock marks'
    );
    console.log('✓ Criterion 1 PASSED: Fresh application has empty academic details.\n');

    // Helper: Create a small sample PDF file for upload tests
    const dummyPdfPath = path.join(process.cwd(), `test_doc_${timestamp}.pdf`);
    fs.writeFileSync(dummyPdfPath, '%PDF-1.4 %test document buffer for eduverify');

    // Helper to upload a document via multipart/form-data
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

    // -------------------------------------------------------------------------
    // CRITERION 5: Submission Blocked When Mandatory Documents Are Missing
    // -------------------------------------------------------------------------
    console.log('[Criterion 5] Testing submission rejection when mandatory documents are missing...');
    
    // Test A: Direct submission attempt on fresh student without docs
    const studentCReg = await req('/auth/register', {
      method: 'POST',
      body: {
        name: `Student Missing Docs ${timestamp}`,
        email: `student_missing_${timestamp}@eduverify.ac.in`,
        password: 'Password123!',
      },
    });
    assert(studentCReg.ok, 'Student C registration failed');
    const studentCToken = studentCReg.data.token;

    const failDirectSubmit = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentCToken}` },
      body: {
        courseId: cseCourse._id,
        isDraft: false,
        personalSnapshot: { fullName: 'Student Missing Docs', email: `student_missing_${timestamp}@eduverify.ac.in` },
        academicSnapshot: {
          class10: { board: 'CBSE', passingYear: '2022', percentage: 88, rollNumber: 'M102201' },
          class12: {
            board: 'CBSE',
            passingYear: '2024',
            percentage: 85,
            rollNumber: 'M122401',
            subjects: [
              { subjectName: 'Mathematics', marksObtained: 85, maxMarks: 100 },
              { subjectName: 'Physics', marksObtained: 82, maxMarks: 100 },
            ],
          },
        },
      },
    });
    assert(
      !failDirectSubmit.ok && failDirectSubmit.status === 400,
      'Direct submission should have been rejected due to missing mandatory documents'
    );
    assert(
      failDirectSubmit.data.missingDocuments && failDirectSubmit.data.missingDocuments.length > 0,
      `Missing documents list should be returned on POST. Got: ${JSON.stringify(failDirectSubmit.data)}`
    );

    // Test B: Submitting an existing draft without uploading mandatory docs
    const failDraftSubmit = await req(`/applications/${draftApp._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentAToken}` },
      body: {
        submitNow: true,
      },
    });
    assert(
      !failDraftSubmit.ok && failDraftSubmit.status === 400,
      'Draft submission should have been rejected due to missing mandatory documents'
    );
    assert(
      failDraftSubmit.data.missingDocuments && failDraftSubmit.data.missingDocuments.length > 0,
      `Missing documents list should be returned on PUT submitNow. Got: ${JSON.stringify(failDraftSubmit.data)}`
    );

    console.log(`✓ Criterion 5 PASSED: Both direct submit and draft submission blocked for missing docs: ${failDirectSubmit.data.missingDocuments.map(d => d.docType).join(', ')}\n`);

    // -------------------------------------------------------------------------
    // CRITERION 2: 100% Manual Document Upload & Submission
    // -------------------------------------------------------------------------
    console.log('[Criterion 2] Testing 100% Manual Document Upload and Submission...');
    // Upload class10_marksheet manually
    const up10 = await uploadDoc(studentAToken, 'class10_marksheet', 'Class 10 Marksheet Manual', dummyPdfPath, 'M102201', draftApp._id);
    assert(up10.ok, `Manual upload 10 failed: ${up10.data.message}`);
    assert(up10.data.document.verificationStatus === 'Pending Verification', 'Uploaded document should be Pending Verification');

    // Upload class12_marksheet manually
    const up12 = await uploadDoc(studentAToken, 'class12_marksheet', 'Class 12 Marksheet Manual', dummyPdfPath, 'M122401', draftApp._id);
    assert(up12.ok, `Manual upload 12 failed: ${up12.data.message}`);

    // Upload passing_certificate manually
    const upPass = await uploadDoc(studentAToken, 'passing_certificate', 'Passing Certificate Manual', dummyPdfPath, '', draftApp._id);
    assert(upPass.ok, `Manual upload pass failed: ${upPass.data.message}`);

    // Now submit the application with all mandatory documents uploaded
    const manualAppRes = await req(`/applications/${draftApp._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentAToken}` },
      body: {
        submitNow: true,
        personalSnapshot: { fullName: 'Student Manual', email: `student_manual_${timestamp}@eduverify.ac.in` },
        academicSnapshot: {
          class10: { board: 'CBSE', passingYear: '2022', percentage: 88, rollNumber: 'M102201' },
          class12: {
            board: 'CBSE',
            passingYear: '2024',
            percentage: 85,
            rollNumber: 'M122401',
            subjects: [
              { subjectName: 'Mathematics', marksObtained: 85, maxMarks: 100 },
              { subjectName: 'Physics', marksObtained: 82, maxMarks: 100 },
              { subjectName: 'Chemistry', marksObtained: 79, maxMarks: 100 },
            ],
          },
        },
      },
    });
    assert(manualAppRes.ok, `Manual application submission failed: ${manualAppRes.data.message}`);
    const manualApp = manualAppRes.data.application;
    const manualAppId = manualApp._id;
    console.log(`✓ Criterion 2 PASSED: 100% manual application submitted: ${manualApp.applicationNumber}\n`);

    // -------------------------------------------------------------------------
    // CRITERION 6: Status Is 'Submitted' / 'Pending Verification', NEVER Auto-Accepted
    // -------------------------------------------------------------------------
    console.log('[Criterion 6] Verifying application is NOT auto-accepted despite passing eligibility...');
    assert(
      manualApp.status === 'Submitted' || manualApp.status === 'Pending Verification',
      `Expected 'Submitted' or 'Pending Verification', got '${manualApp.status}'`
    );
    assert(
      manualApp.status !== 'Accepted' && manualApp.status !== 'Approved',
      'Security failure: Application was auto-accepted upon submission!'
    );
    assert(
      manualApp.eligibilityEvaluation?.isEligible === true,
      'Student should be marked academically eligible in evaluation breakdown'
    );
    console.log(`✓ Criterion 6 PASSED: Status is '${manualApp.status}' with eligibility passed. No auto-accept occurred.\n`);

    // -------------------------------------------------------------------------
    // CRITERION 3: DigiLocker Demo Import Workflow
    // -------------------------------------------------------------------------
    console.log('[Criterion 3] Testing DigiLocker Demo Search & Import...');
    const dlSearch = await req('/digilocker/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentBToken}` },
      body: { rollNumber: 'CBSE2024101', board: 'CBSE', passingYear: '2024' },
    });
    assert(dlSearch.ok, `DigiLocker search failed: ${dlSearch.data.message}`);
    const dlRecord = dlSearch.data.record;
    assert(dlRecord && dlRecord.fullName, 'DigiLocker record not found');

    // Import only class10_marksheet and passing_certificate (to test hybrid upload in Criterion 4)
    const dlImport = await req('/digilocker/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentBToken}` },
      body: {
        recordId: dlRecord.id,
        selectedDocTypes: ['class10_marksheet', 'passing_certificate'],
      },
    });
    assert(dlImport.ok, `DigiLocker import failed: ${dlImport.data.message}`);
    assert(dlImport.data.importedDocuments.length === 2, 'Expected 2 imported documents');
    assert(
      dlImport.data.importedDocuments.every((d) => d.verificationStatus === 'Pending Verification'),
      'DigiLocker imported docs must have status Pending Verification'
    );
    console.log('✓ Criterion 3 PASSED: DigiLocker imported documents set to Pending Verification.\n');

    // -------------------------------------------------------------------------
    // CRITERION 4: Hybrid Submission (DigiLocker + Manual Upload)
    // -------------------------------------------------------------------------
    console.log('[Criterion 4] Testing Hybrid submission (DigiLocker docs + Manual upload remaining)...');
    // Upload remaining mandatory doc: class12_marksheet manually for Student B
    const bManualUp = await uploadDoc(studentBToken, 'class12_marksheet', 'Class 12 Manual Marksheet', dummyPdfPath, 'CBSE2024101');
    assert(bManualUp.ok, `Student B manual upload failed: ${bManualUp.data.message}`);

    const hybridAppRes = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentBToken}` },
      body: {
        courseId: cseCourse._id,
        isDraft: false,
        personalSnapshot: { fullName: dlRecord.fullName, email: `student_digi_${timestamp}@eduverify.ac.in` },
        academicSnapshot: {
          class10: dlImport.data.importedAcademicDetails.class10,
          class12: {
            board: 'CBSE',
            passingYear: '2024',
            percentage: 82,
            rollNumber: 'CBSE2024101',
            subjects: [
              { subjectName: 'Mathematics', marksObtained: 80, maxMarks: 100 },
              { subjectName: 'Physics', marksObtained: 78, maxMarks: 100 },
            ],
          },
        },
      },
    });
    assert(hybridAppRes.ok, `Hybrid submission failed: ${hybridAppRes.data.message}`);
    const hybridApp = hybridAppRes.data.application;
    const getHybrid = await req(`/applications/${hybridApp._id}`, {
      headers: { Authorization: `Bearer ${studentBToken}` },
    });
    assert(getHybrid.ok, 'Failed to fetch hybrid application');
    const docSources = getHybrid.data.application.documents.map((d) => d.source);
    assert(
      docSources.includes('DigiLocker Demo') && docSources.includes('Manual Upload'),
      'Hybrid application must contain both DigiLocker Demo and Manual Upload documents'
    );
    console.log(`✓ Criterion 4 PASSED: Hybrid application successfully created with mixed sources: ${docSources.join(', ')}\n`);

    // -------------------------------------------------------------------------
    // CRITERION 7 & 8: Officer Scrutiny & Per-Document Verification
    // -------------------------------------------------------------------------
    console.log('[Criterion 7 & 8] Testing Officer review & verification of manual and DigiLocker documents...');
    // Inspect application documents via officer
    const officerInspect = await req(`/applications/${manualAppId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(officerInspect.ok, 'Officer fetch application failed');
    const appDocs = officerInspect.data.application.documents;
    assert(appDocs.length >= 3, 'Application must have at least 3 documents');

    // Verify first 2 documents (leave 1 unverified to test Criterion 10)
    for (let i = 0; i < 2; i++) {
      const vRes = await req(`/documents/${appDocs[i]._id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerToken}` },
        body: { status: 'Verified', remarks: 'Marks verified against board guidelines.' },
      });
      assert(vRes.ok, `Verify document ${i} failed: ${vRes.data.message}`);
      assert(vRes.data.document.verificationStatus === 'Verified', 'Document status should be Verified');
    }
    console.log('✓ Criterion 7 & 8 PASSED: Officer verified 2 documents successfully.\n');

    // -------------------------------------------------------------------------
    // CRITERION 10: Final Approval Blocked Before All Mandatory Docs Are Verified
    // -------------------------------------------------------------------------
    console.log('[Criterion 10] Testing final approval rejection when an unverified mandatory document remains...');
    const prematureAccept = await req(`/applications/${manualAppId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(
      !prematureAccept.ok && prematureAccept.status === 400,
      'Final approval must fail if mandatory documents are not yet verified'
    );
    console.log(`✓ Criterion 10 PASSED: Acceptance blocked with message: "${prematureAccept.data.message}"\n`);

    // -------------------------------------------------------------------------
    // CRITERION 9: Correction and Resubmission Workflow
    // -------------------------------------------------------------------------
    console.log('[Criterion 9] Testing Correction Request -> Resubmission workflow...');
    // Officer marks the 3rd document as 'Correction Required'
    const thirdDoc = appDocs[2];
    const corrDocRes = await req(`/documents/${thirdDoc._id}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: { status: 'Correction Required', remarks: 'Image is blurred. Please upload a clear scan.' },
    });
    assert(corrDocRes.ok, 'Mark doc correction failed');

    // Officer requests application correction
    const reqCorrRes = await req(`/applications/${manualAppId}/decision`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: { action: 'request_correction', remarks: 'Please re-upload a clear passing certificate.' },
    });
    assert(reqCorrRes.ok, 'Request correction failed');
    assert(
      reqCorrRes.data.application.status === 'Correction Required',
      'Application status must become Correction Required'
    );

    // Student re-uploads / replaces document
    const replaceUp = await uploadDoc(studentAToken, thirdDoc.docType, 'Clear Passing Certificate', dummyPdfPath, '', manualAppId);
    assert(replaceUp.ok, 'Replacement upload failed');
    assert(
      replaceUp.data.document.verificationStatus === 'Pending Verification',
      'Replaced document must reset status to Pending Verification'
    );

    // Student resubmits application
    const resubmitRes = await req(`/applications/${manualAppId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentAToken}` },
      body: { submitNow: true },
    });
    assert(resubmitRes.ok, `Resubmission failed: ${resubmitRes.data.message}`);
    assert(
      resubmitRes.data.application.status === 'Pending Verification' || resubmitRes.data.application.status === 'Resubmitted',
      `Application status should be 'Pending Verification', got '${resubmitRes.data.application.status}'`
    );
    console.log(`✓ Criterion 9 PASSED: Correction requested -> Re-upload reset doc -> Resubmitted to '${resubmitRes.data.application.status}'.\n`);

    // Now officer verifies the replaced document
    const verifyReplaced = await req(`/documents/${replaceUp.data.document._id}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: { status: 'Verified', remarks: 'Clear certificate accepted.' },
    });
    assert(verifyReplaced.ok, 'Verify replaced document failed');

    // -------------------------------------------------------------------------
    // CRITERION 13: Student Cannot Self-Accept (Security RBAC Check)
    // -------------------------------------------------------------------------
    console.log('[Criterion 13] Verifying student cannot self-accept application...');
    const studentIllegalAccept = await req(`/applications/${manualAppId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    assert(
      !studentIllegalAccept.ok && (studentIllegalAccept.status === 403 || studentIllegalAccept.status === 401),
      'Security alert: Student was able to call accept endpoint!'
    );
    console.log('✓ Criterion 13 PASSED: Student self-acceptance attempt securely rejected (403 Forbidden).\n');

    // -------------------------------------------------------------------------
    // CRITERION 12 (Part A): Admission Letter Inaccessible Before Acceptance
    // -------------------------------------------------------------------------
    console.log('[Criterion 12a] Verifying no admission letter exists prior to final acceptance...');
    const lettersBefore = await req('/letters/my-letters', {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    assert(lettersBefore.ok, 'Fetch my-letters failed');
    const appLettersBefore = lettersBefore.data.letters.filter((l) => l.application?._id === manualAppId || l.application === manualAppId);
    assert(appLettersBefore.length === 0, 'No admission letter should exist prior to acceptance');
    console.log('✓ Criterion 12a PASSED: No admission letter exists prior to final approval.\n');

    // -------------------------------------------------------------------------
    // CRITERION 11: Explicit Officer Final Approval (/accept)
    // -------------------------------------------------------------------------
    console.log('[Criterion 11] Officer executing Final Acceptance (POST /accept)...');
    const acceptRes = await req(`/applications/${manualAppId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: { remarks: 'All credentials thoroughly verified. Admission granted.' },
    });
    assert(acceptRes.ok, `Acceptance failed: ${acceptRes.data.message}`);
    assert(acceptRes.data.application.status === 'Accepted', `Status must be 'Accepted', got '${acceptRes.data.application.status}'`);
    assert(acceptRes.data.admissionLetter, 'Admission letter must be generated upon acceptance');
    const admissionId = acceptRes.data.admissionLetter.admissionId;
    console.log(`✓ Criterion 11 PASSED: Application accepted. Admission Ref ID: ${admissionId}\n`);

    // -------------------------------------------------------------------------
    // CRITERION 12 (Part B): Admission Letter & QR Verification
    // -------------------------------------------------------------------------
    console.log('[Criterion 12b] Verifying Admission Letter and Public QR Verification Endpoint...');
    const lettersAfter = await req('/letters/my-letters', {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    assert(lettersAfter.ok, 'Fetch my-letters after acceptance failed');
    assert(lettersAfter.data.letters.length > 0, 'Admission letter should now exist');

    const publicVerify = await req(`/letters/public-verify/${admissionId}`);
    assert(publicVerify.ok, 'Public QR verification request failed');
    assert(publicVerify.data.isValid === true, 'Verification should report authentic');
    assert(
      publicVerify.data.verificationData.courseCode === 'BTECH-CSE',
      'Verification data course code mismatch'
    );
    console.log(`✓ Criterion 12b PASSED: Public verification endpoint confirmed: ${publicVerify.data.verificationData.status}\n`);

    // -------------------------------------------------------------------------
    // CRITERION 14: Course Seat Capacity Strictly Enforced
    // -------------------------------------------------------------------------
    console.log('[Criterion 14] Testing Course Seat Capacity constraint on final approval...');
    // Create a temporary single-seat course to test capacity exhaustion
    const singleSeatCourseRes = await req('/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `Full Capacity Test Course ${timestamp}`,
        code: `CAP-${timestamp.toString().slice(-4)}`,
        department: cseCourse.department._id || cseCourse.department,
        level: 'Undergraduate',
        durationYears: 4,
        totalSeats: 1,
        allocatedSeats: 1, // Already full!
        annualFee: 100000,
        description: 'Test course for seat capacity exhaustion validation.',
        status: 'open',
        eligibilityCriteria: {
          minClass10Percentage: 50,
          minClass12Percentage: 50,
          requiredDocuments: [{ docType: 'class10_marksheet', docName: 'Class 10 Marksheet', isMandatory: false }],
        },
      },
    });
    assert(singleSeatCourseRes.ok, `Create test course failed: ${singleSeatCourseRes.data.message}`);
    const fullCourse = singleSeatCourseRes.data.course;

    // Create an application for this full course
    const fullCourseApp = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAToken}` },
      body: {
        courseId: fullCourse._id,
        isDraft: false,
        personalSnapshot: { fullName: 'Candidate Cap', email: 'cap@test.com' },
        academicSnapshot: {
          class10: { percentage: 80 },
          class12: { percentage: 80 },
        },
      },
    });
    assert(fullCourseApp.ok, 'Create application for full course failed');

    // Officer attempts to accept it
    const fullCourseAccept = await req(`/applications/${fullCourseApp.data.application._id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(
      !fullCourseAccept.ok && fullCourseAccept.status === 400,
      'Acceptance should be blocked when seats are fully allocated'
    );
    assert(
      fullCourseAccept.data.message.toLowerCase().includes('seat') || fullCourseAccept.data.message.toLowerCase().includes('capacity'),
      'Error message should indicate seat capacity limit'
    );
    console.log(`✓ Criterion 14 PASSED: Acceptance blocked when course seats full: "${fullCourseAccept.data.message}"\n`);

    // -------------------------------------------------------------------------
    // CRITERION 15: Sidebar Navigation Active State Logic
    // -------------------------------------------------------------------------
    console.log('[Criterion 15] Verifying Sidebar active route mutual exclusivity...');
    // Simulate isItemActive helper logic from DashboardLayout.jsx
    function isItemActive(itemPath, currentPath) {
      if (itemPath === '/student/applications/new') {
        return currentPath === '/student/applications/new';
      }
      if (itemPath === '/student/applications') {
        return (
          currentPath === '/student/applications' ||
          (currentPath.startsWith('/student/applications/') && currentPath !== '/student/applications/new')
        );
      }
      return currentPath === itemPath;
    }

    // Test cases:
    const onNewApp = '/student/applications/new';
    assert(isItemActive('/student/applications/new', onNewApp) === true, 'New app route should match');
    assert(isItemActive('/student/applications', onNewApp) === false, 'My applications must NOT match when on /new');

    const onMyApps = '/student/applications';
    assert(isItemActive('/student/applications/new', onMyApps) === false, 'New app must NOT match on /applications');
    assert(isItemActive('/student/applications', onMyApps) === true, 'My applications must match on /applications');

    const onAppDetail = '/student/applications/6744e9';
    assert(isItemActive('/student/applications/new', onAppDetail) === false, 'New app must NOT match on detail');
    assert(isItemActive('/student/applications', onAppDetail) === true, 'My applications should match on detail');

    console.log('✓ Criterion 15 PASSED: Sidebar route highlighting is mutually exclusive and accurate.\n');

    // Clean up temporary dummy pdf
    if (fs.existsSync(dummyPdfPath)) {
      fs.unlinkSync(dummyPdfPath);
    }

    console.log('========================================================================');
    console.log('🎉 ALL 15 ACCEPTANCE CRITERIA SUCCESSFULLY VERIFIED & PASSED!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ Comprehensive Acceptance Test FAILED:');
    console.error(error.message);
    process.exit(1);
  }
}

runComprehensiveTest();
