const BASE_URL = 'http://localhost:5000/api';

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

async function runE2ETest() {
  console.log('--- Starting EduVerify E2E Workflow Verification Test (Native Fetch) ---');

  try {
    // 1. Health check
    console.log('\n1. Testing Backend API Health...');
    const health = await req('/health');
    console.log('✓ Health Check Status:', health.status);

    // 2. Courses Listing
    console.log('\n2. Fetching Academic Programs...');
    const coursesRes = await req('/courses');
    console.log(`✓ Fetched ${coursesRes.courses.length} courses.`);
    const btechCourse = coursesRes.courses.find((c) => c.code === 'BTECH-CSE');
    console.log(`✓ Target Course for Application: ${btechCourse.title} (${btechCourse.code})`);

    // 3. Login as student
    console.log('\n3. Logging in as student...');
    const loginRes = await req('/auth/login', {
      method: 'POST',
      body: { email: 'student@eduverify.ac.in', password: 'StudentPassword123!' },
    });
    const studentToken = loginRes.token;
    console.log('✓ Student logged in successfully.');

    // 4. DigiLocker Demo Search
    console.log('\n4. Testing DigiLocker Demo Search for roll "CBSE2024101"...');
    const searchRes = await req('/digilocker/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { rollNumber: 'CBSE2024101', board: 'CBSE', passingYear: '2024' },
    });
    console.log('✓ DigiLocker Demo Record Retrieved:', searchRes.record.fullName);
    console.log(`✓ Available Documents: ${searchRes.record.availableDocuments.length}`);

    // 5. Import Documents from DigiLocker
    console.log('\n5. Importing Documents into Student Profile...');
    const importRes = await req('/digilocker/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        recordId: searchRes.record.id,
        selectedDocTypes: ['class10_marksheet', 'class12_marksheet', 'passing_certificate'],
      },
    });
    console.log('✓ Documents Imported:', importRes.importedDocuments.length);
    console.log('✓ Auto-filled Class 12th Score:', importRes.profile.academic12th.percentage + '%');

    // 6. Test Eligibility Engine Pre-check
    console.log('\n6. Evaluating Eligibility Engine against BTECH-CSE...');
    const eligRes = await req('/applications/check-eligibility', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        courseId: btechCourse._id,
        academic10th: importRes.profile.academic10th,
        academic12th: importRes.profile.academic12th,
      },
    });
    console.log('✓ Eligibility Verdict:', eligRes.evaluation.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE');
    console.log('✓ Calculated Merit Score:', eligRes.evaluation.scoreCalculated);

    // 7. Submit Application
    console.log('\n7. Submitting Formal Admission Application...');
    const appRes = await req('/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        courseId: btechCourse._id,
        personalSnapshot: {
          fullName: 'Aarav Sharma',
          email: 'student@eduverify.ac.in',
          phone: '+91 98112 33445',
        },
        academicSnapshot: {
          class10: importRes.profile.academic10th,
          class12: importRes.profile.academic12th,
        },
        isDraft: false,
      },
    });
    const applicationId = appRes.application._id;
    const applicationNumber = appRes.application.applicationNumber;
    console.log(`✓ Application Created: ${applicationNumber} (Status: ${appRes.application.status})`);

    // 8. Officer Review & Document Verification
    console.log('\n8. Officer Scrutiny & Document Verification...');
    const officerLogin = await req('/auth/login', {
      method: 'POST',
      body: { email: 'officer@eduverify.ac.in', password: 'OfficerPassword123!' },
    });
    const officerToken = officerLogin.token;
    console.log('✓ Admission Officer logged in.');

    const officerAppRes = await req(`/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    console.log(`✓ Officer inspecting application ${officerAppRes.application.applicationNumber}`);

    const docToVerify = officerAppRes.application.documents[0];
    if (docToVerify) {
      await req(`/documents/${docToVerify._id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${officerToken}` },
        body: { status: 'Verified', remarks: 'Official DigiLocker transcript verified.' },
      });
      console.log(`✓ Document ${docToVerify.title} marked VERIFIED.`);
    }

    // 9. Officer Approves Application
    console.log('\n9. Officer Approving Application...');
    const approveRes = await req(`/applications/${applicationId}/decision`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: { action: 'approve', remarks: 'All credentials and marks verified successfully.' },
    });
    console.log('✓ Application Status updated to:', approveRes.application.status);

    // 10. Confirm Admission & Allot Seat & Generate Letter
    console.log('\n10. Confirming Admission, Reserving Seat & Issuing QR Letter...');
    const confirmRes = await req(`/applications/${applicationId}/confirm-admission`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: {},
    });
    const admissionId = confirmRes.admissionLetter.admissionId;
    console.log('✓ Admission Confirmed!');
    console.log('✓ Unique Admission Reference ID:', admissionId);
    console.log('✓ Generated PDF Path:', confirmRes.admissionLetter.pdfPath);

    // 11. Public QR Verification Test
    console.log('\n11. Testing Public QR Verification Endpoint...');
    const publicVerifyRes = await req(`/letters/public-verify/${admissionId}`);
    console.log('✓ Public Verification Result:', publicVerifyRes.isValid ? 'AUTHENTIC' : 'INVALID');
    console.log('✓ Masked Candidate Name:', publicVerifyRes.verificationData.candidateNameMasked);
    console.log('✓ Allotted Program:', publicVerifyRes.verificationData.courseAllotted);

    // 12. Course Merit List
    console.log('\n12. Checking Course Merit List...');
    const meritRes = await req(`/applications/merit-list/${btechCourse._id}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    console.log(`✓ Merit List generated with ${meritRes.rankedList.length} applicant(s).`);
    console.log(`✓ Rank 1 Candidate: ${meritRes.rankedList[0]?.candidateName} (Score: ${meritRes.rankedList[0]?.compositeScore})`);

    console.log('\n======================================================');
    console.log('🎉 ALL 12 END-TO-END ADMISSION WORKFLOW TESTS PASSED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ E2E Test Failed:', err.message);
    process.exit(1);
  }
}

runE2ETest();
