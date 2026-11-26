import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== Starting EduVerify End-to-End Workflow Verification ===\n');

  // 1. Student Login
  console.log('[Test 1] Logging in as Student...');
  const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@eduverify.ac.in',
      password: 'StudentPassword123!',
    }),
  });
  const studentLogin = await studentLoginRes.json();
  if (!studentLogin.success) throw new Error(`Student login failed: ${JSON.stringify(studentLogin)}`);
  const studentToken = studentLogin.token;
  console.log('✓ Student authenticated successfully. User:', studentLogin.user.name);

  // 2. Fetch Courses
  console.log('\n[Test 2] Fetching Course Catalog...');
  const coursesRes = await fetch(`${BASE_URL}/courses`);
  const coursesData = await coursesRes.json();
  if (!coursesData.success || coursesData.courses.length === 0) throw new Error('No courses returned');
  const course = coursesData.courses[2] || coursesData.courses[0];
  console.log(`✓ Fetched ${coursesData.courses.length} courses. Selected: ${course.title} (${course.code})`);
  console.log(`  Seats: ${course.totalSeats - course.allocatedSeats}/${course.totalSeats}, Min C10: ${course.eligibilityCriteria.minClass10Percentage}%, Min C12: ${course.eligibilityCriteria.minClass12Percentage}%`);

  // 3. Initiate DigiLocker Demo OAuth Session
  console.log('\n[Test 3] Testing DigiLocker Demo Consent-Based Flow...');
  const initRes = await fetch(`${BASE_URL}/digilocker/oauth/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({}),
  });
  const initData = await initRes.json();
  if (!initData.success) throw new Error(`Init failed: ${JSON.stringify(initData)}`);
  const sessionId = initData.sessionId;
  console.log('✓ DigiLocker session initiated:', sessionId);
  console.log(`  Found ${initData.demoAccounts.length} mock candidate accounts.`);

  // Find DEMO-001 (Aarav Sharma)
  const aaravAcc = initData.demoAccounts.find((a) => a.fullName === 'Aarav Sharma');
  console.log('✓ Selected Demo Candidate:', aaravAcc.fullName, 'Roll:', aaravAcc.rollNumber);

  // 4. Verify OTP & Grant Consent
  const otpRes = await fetch(`${BASE_URL}/digilocker/oauth/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      sessionId,
      demoAccountId: aaravAcc.demoAccountId,
      otp: '123456',
    }),
  });
  const otpData = await otpRes.json();
  if (!otpData.success) throw new Error(`OTP failed: ${JSON.stringify(otpData)}`);
  console.log('✓ OTP Verified. Candidate Identity confirmed:', otpData.account?.fullName);

  const consentRes = await fetch(`${BASE_URL}/digilocker/oauth/consent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      sessionId,
      decision: 'allow',
    }),
  });
  const consentData = await consentRes.json();
  if (!consentData.success) throw new Error(`Consent failed: ${JSON.stringify(consentData)}`);
  const authCode = consentData.authCode;
  console.log('✓ User Consent Granted. Authorization Code received:', authCode);

  // 5. Exchange Authorization Code for Documents & Academic Data
  const exchangeRes = await fetch(`${BASE_URL}/digilocker/oauth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      sessionId,
      authCode,
      selectedDocTypes: ['class10_marksheet', 'class12_marksheet', 'passing_certificate'],
    }),
  });
  const exchangeData = await exchangeRes.json();
  if (!exchangeData.success) throw new Error(`Exchange failed: ${JSON.stringify(exchangeData)}`);
  console.log(`✓ Token Exchanged. Imported ${exchangeData.importedDocuments.length} document(s).`);

  const acDetails = exchangeData.importedAcademicDetails;
  console.log('  Imported Academic Data:');
  console.log(`  - Candidate: ${acDetails.candidateName}, DOB: ${acDetails.dob}, Gender: ${acDetails.gender}`);
  console.log(`  - Father: ${acDetails.fatherName}, Mother: ${acDetails.motherName}, Category: ${acDetails.category}`);
  console.log(`  - Class 10: Board: ${acDetails.board}, Roll: ${acDetails.class10.rollNumber}, Year: ${acDetails.class10.passingYear}, Pct: ${acDetails.class10.percentage}%`);
  console.log(`  - Class 12: Board: ${acDetails.board}, Roll: ${acDetails.class12.rollNumber}, Year: ${acDetails.class12.passingYear}, Pct: ${acDetails.class12.percentage}%`);
  console.log(`  - Class 12 Subjects: ${acDetails.class12.subjects.map((s) => `${s.subjectName} (${s.marksObtained}/${s.maxMarks})`).join(', ')}`);

  // Verify exact match to Aarav Sharma user screenshot
  if (acDetails.class10.rollNumber !== 'CBSE2022091' || acDetails.class10.percentage !== 93) {
    throw new Error('Class 10 data does not match Aarav Sharma seed profile');
  }
  if (acDetails.class12.rollNumber !== 'CBSE2024101' || acDetails.class12.percentage !== 92.4) {
    throw new Error('Class 12 data does not match Aarav Sharma seed profile');
  }
  console.log('✓ Class 10 & 12 records match user screenshot EXACTLY.');

  // 6. Test Draft Application Creation with Expanded Personal & Academic Snapshot
  console.log('\n[Test 4] Creating Draft Admission Application...');
  const draftPayload = {
    courseId: course._id,
    isDraft: true,
    personalSnapshot: {
      fullName: acDetails.candidateName,
      dob: acDetails.dob,
      gender: acDetails.gender,
      category: acDetails.category,
      nationality: acDetails.nationality || 'Indian',
      email: 'student@example.com',
      phone: '+91 98765 43210',
      fatherName: acDetails.fatherName,
      motherName: acDetails.motherName,
      permanentAddress: acDetails.permanentAddress || {
        street: 'B-42, Sector 14, Rohini',
        city: 'New Delhi',
        district: 'North West Delhi',
        state: 'Delhi',
        pincode: '110085',
        country: 'India',
      },
      isSameAddress: true,
    },
    academicSnapshot: {
      class10: {
        board: acDetails.board,
        rollNumber: acDetails.class10.rollNumber,
        schoolName: 'Delhi Public School R.K. Puram', // Manually entered by student as requested
        passingYear: acDetails.class10.passingYear,
        percentage: acDetails.class10.percentage,
        subjects: acDetails.class10.subjects,
      },
      class12: {
        board: acDetails.board,
        rollNumber: acDetails.class12.rollNumber,
        schoolName: 'Delhi Public School R.K. Puram', // Manually entered
        passingYear: acDetails.class12.passingYear,
        percentage: acDetails.class12.percentage,
        subjects: acDetails.class12.subjects,
      },
      fieldMeta: {
        'class10.board': 'imported',
        'class10.rollNumber': 'imported',
        'class10.passingYear': 'imported',
        'class10.percentage': 'imported',
        'class10.schoolName': 'manual',
        'class12.board': 'imported',
        'class12.rollNumber': 'imported',
        'class12.passingYear': 'imported',
        'class12.percentage': 'imported',
        'class12.schoolName': 'manual',
      },
      discrepancies: [],
    },
    documentIds: exchangeData.importedDocuments.map((d) => d._id),
  };

  const draftRes = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify(draftPayload),
  });
  const draftData = await draftRes.json();
  if (!draftData.success) throw new Error(`Draft creation failed: ${JSON.stringify(draftData)}`);
  const appId = draftData.application._id;
  console.log('✓ Draft Application created successfully:', draftData.application.applicationNumber, 'ID:', appId);

  // 7. Verify Draft Persistence & Update
  console.log('\n[Test 5] Verifying Draft Persistence and Submitting Application...');
  const getAppRes = await fetch(`${BASE_URL}/applications/${appId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const getAppData = await getAppRes.json();
  if (!getAppData.success) throw new Error('Failed to retrieve draft');
  console.log('✓ Draft retrieved correctly. Status:', getAppData.application.status);
  console.log('  School Class 10:', getAppData.application.academicSnapshot.class10.schoolName);
  console.log('  School Class 12:', getAppData.application.academicSnapshot.class12.schoolName);

  // Submit the application
  const submitRes = await fetch(`${BASE_URL}/applications/${appId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      submitNow: true,
      documentIds: draftPayload.documentIds,
      personalSnapshot: draftPayload.personalSnapshot,
      academicSnapshot: draftPayload.academicSnapshot,
    }),
  });
  const submitData = await submitRes.json();
  if (!submitData.success) throw new Error(`Submission failed: ${JSON.stringify(submitData)}`);
  console.log('✓ Application submitted successfully. Status:', submitData.application.status);
  console.log('  Eligibility Evaluation Result:', submitData.application.eligibilityEvaluation.status, 'Score:', submitData.application.eligibilityEvaluation.scoreCalculated);

  // 8. Officer Login and Review
  console.log('\n[Test 6] Logging in as Admission Officer to verify documents and approve...');
  const officerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'officer@eduverify.ac.in',
      password: 'OfficerPassword123!',
    }),
  });
  const officerLogin = await officerLoginRes.json();
  if (!officerLogin.success) throw new Error('Officer login failed');
  const officerToken = officerLogin.token;
  console.log('✓ Officer authenticated successfully:', officerLogin.user.name);

  // Verify all mandatory documents
  for (const doc of submitData.application.documents) {
    const verifyDocRes = await fetch(`${BASE_URL}/documents/${doc._id || doc}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: 'Verified',
        remarks: 'Document verified against DigiLocker Demo Archive cryptographic record.',
      }),
    });
    const verifyDocData = await verifyDocRes.json();
    if (!verifyDocData.success) throw new Error(`Doc verify failed: ${JSON.stringify(verifyDocData)}`);
  }
  console.log(`✓ All ${submitData.application.documents.length} documents individually verified by officer.`);

  // Final Acceptance
  const acceptRes = await fetch(`${BASE_URL}/applications/${appId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({
      remarks: 'Candidate satisfies all mandatory academic criteria with exemplary marks.',
    }),
  });
  const acceptData = await acceptRes.json();
  if (!acceptData.success) throw new Error(`Final accept failed: ${JSON.stringify(acceptData)}`);
  console.log('✓ Application approved! Admission Letter generated:', acceptData.admissionLetter?.letterNumber);
  console.log('  Status history updated to:', acceptData.application.status);

  console.log('\n=== All Verification Tests Passed Successfully! ===');
}

runTests().catch((err) => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
