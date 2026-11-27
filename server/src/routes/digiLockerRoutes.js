import express from 'express';
import crypto from 'crypto';
import { digiLockerService } from '../services/digiLockerService.js';
import { DigiLockerSession } from '../models/DigiLockerSession.js';
import { MockStudentRecord } from '../models/MockStudentRecord.js';
import { Application } from '../models/Application.js';
import { protect } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLogger.js';
import { validDocumentScope } from '../services/documentScope.js';

const router = express.Router();

/**
 * GET /api/digilocker/demo-accounts
 * List all available fictional demo accounts with structured metadata
 */
router.get('/demo-accounts', protect, async (req, res) => {
  try {
    const candidates = await MockStudentRecord.find(
      {},
      'demoAccountId referenceId fullName dob gender rollNumber board passingYear class10.percentage class12.percentage class12.stream availableDocuments demoScenario'
    ).sort({ demoAccountId: 1, passingYear: -1 });

    const accounts = candidates.map((cand, idx) => ({
      demoAccountId: cand.demoAccountId || `DEMO-${String(idx + 1).padStart(3, '0')}`,
      referenceId: cand.referenceId,
      fullName: cand.fullName,
      dob: cand.dob,
      gender: cand.gender,
      rollNumber: cand.rollNumber,
      board: cand.board,
      passingYear: cand.passingYear,
      stream: cand.class12?.stream || 'General',
      class10Percentage: cand.class10?.percentage || 0,
      class12Percentage: cand.class12?.percentage || 0,
      demoScenario: cand.demoScenario,
      availableDocumentsCount: cand.availableDocuments.length,
      availableDocTypes: cand.availableDocuments.map((d) => d.docType),
    }));

    return res.json({ success: true, count: accounts.length, accounts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/digilocker/oauth/init
 * Step 1: Initiate a simulated authorization request session
 */
router.post('/oauth/init', protect, async (req, res) => {
  try {
    const { applicationId, workspaceId } = req.body;
    if (!validDocumentScope({ applicationId, workspaceId })) {
      return res.status(400).json({ success: false, message: 'Invalid application document scope.' });
    }

    // Generate unique authorization session identifier
    const sessionId = `dlsess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    const session = await DigiLockerSession.create({
      sessionId,
      student: req.user._id,
      applicationId: applicationId || null,
      workspaceId: workspaceId || null,
      clientApp: 'EduVerify — Admission Process Automation System',
      purpose: 'Verification of academic certificates and examination marks for college admission',
      state: 'INITIATED',
      otp: '123456',
      expiresAt,
    });

    // Provide sample demo phone numbers for user assistance (1-to-1 account mapping)
    const demoMobiles = [
      { mobile: '0000000001', note: 'Aarav Sharma (CBSE 2024, 92.4% - All Documents)' },
      { mobile: '0000000002', note: 'Priya Venkatesh (CBSE 2024, 96.2% - High Merit)' },
      { mobile: '0000000003', note: 'Rohan Banerjee (ISC 2024, 88.0% - All Documents)' },
      { mobile: '0000000004', note: 'Ananya Deshmukh (MSB 2023, 76.5% - State Board)' },
      { mobile: '0000000005', note: 'Vikramaditya Rao (CBSE 2024, 84.6% - Academic Only)' },
      { mobile: '0000000006', note: 'Meera Kulkarni (KRN 2024, 91.2% - State Board)' },
    ];

    // Fetch demo accounts list for backward compatibility
    const candidates = await MockStudentRecord.find(
      {},
      'demoAccountId demoMobile referenceId fullName rollNumber board passingYear class12.percentage demoScenario availableDocuments'
    ).sort({ demoAccountId: 1 });

    const demoAccounts = candidates.map((c, i) => ({
      demoAccountId: c.demoAccountId || `DEMO-${String(i + 1).padStart(3, '0')}`,
      demoMobile: c.demoMobile || '0000000001',
      fullName: c.fullName,
      board: c.board,
      passingYear: c.passingYear,
      rollNumber: c.rollNumber,
      score: `${c.class12?.percentage || 0}%`,
      demoScenario: c.demoScenario,
      availableDocsCount: c.availableDocuments.length,
    }));

    await logAudit({
      user: req.user,
      action: 'DIGILOCKER_AUTH_SESSION_INITIATED',
      entityType: 'DigiLockerSession',
      entityId: session._id,
      details: { sessionId },
      req,
    });

    return res.json({
      success: true,
      sessionId,
      clientApp: session.clientApp,
      purpose: session.purpose,
      demoMobiles,
      demoAccounts,
      expiresAt,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/digilocker/oauth/mobile-login
 * Screen 1 -> Screen 2: Submit Demo Mobile Number and retrieve associated accounts
 */
router.post('/oauth/mobile-login', protect, async (req, res) => {
  try {
    const { sessionId, demoMobile } = req.body;

    if (!sessionId || !demoMobile) {
      return res.status(400).json({ success: false, message: 'Session ID and Demo Mobile Number are required.' });
    }

    const cleanedMobile = demoMobile.trim().replace(/^(\+91|91)/, '').replace(/[\s-]/g, '');

    const session = await DigiLockerSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Authorization session not found or expired.' });
    }

    if (String(session.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized session access.' });
    }

    if (session.expiresAt < new Date()) {
      session.state = 'EXPIRED';
      await session.save();
      return res.status(400).json({ success: false, message: 'Authorization session has expired. Please restart.' });
    }

    // Query mock records by demo mobile
    const accounts = await MockStudentRecord.find({ demoMobile: cleanedMobile });

    if (!accounts || accounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No fictional demo account found for mobile identifier '${cleanedMobile}'. Please use one of the available demo identifiers (e.g. 0000000001 to 0000000015).`,
      });
    }

    session.demoMobile = cleanedMobile;
    session.state = 'MOBILE_VERIFIED';
    await session.save();

    // Helper for masking name: "Aarav Sharma" -> "A***v S***a"
    const maskName = (name) => {
      return name
        .split(' ')
        .map((part) => {
          if (part.length <= 2) return `${part[0]}*`;
          return `${part[0]}${'*'.repeat(Math.max(part.length - 2, 3))}${part.slice(-1)}`;
        })
        .join(' ');
    };

    // Helper for initials avatar: "Aarav Sharma" -> "AS"
    const getInitials = (name) => {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    };

    const formattedAccounts = accounts.map((acc) => ({
      demoAccountId: acc.demoAccountId,
      initials: getInitials(acc.fullName),
      maskedName: maskName(acc.fullName),
      rawName: acc.fullName, // for demonstration clarity
      status: 'Verified',
      board: acc.board,
      passingYear: acc.passingYear,
      demoScenario: acc.demoScenario,
      hasAadhaar: acc.availableDocuments.some((d) => d.docType === 'aadhaar_card'),
    }));

    return res.json({
      success: true,
      sessionId: session.sessionId,
      demoMobile: cleanedMobile,
      maskedMobile: `******${cleanedMobile.slice(-4)}`,
      accounts: formattedAccounts,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/digilocker/oauth/select-account
 * Screen 2 -> Screen 3: Select one of the associated fictional accounts
 */
router.post('/oauth/select-account', protect, async (req, res) => {
  try {
    const { sessionId, demoAccountId } = req.body;

    if (!sessionId || !demoAccountId) {
      return res.status(400).json({ success: false, message: 'Session ID and Demo Account ID are required.' });
    }

    const session = await DigiLockerSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (String(session.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized session access.' });
    }

    const candidate = await MockStudentRecord.findOne({
      $or: [{ demoAccountId }, { rollNumber: demoAccountId }],
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: `Demo account '${demoAccountId}' not found.` });
    }

    session.demoAccountId = candidate.demoAccountId;
    session.mockStudent = candidate._id;
    session.state = 'ACCOUNT_SELECTED';
    await session.save();

    // Masked email for simulated OTP notification
    const candidateEmail = `${candidate.fullName.toLowerCase().replace(/[^a-z]/g, '')}********@gmail.com`;
    const maskedMobile = session.demoMobile ? `******${session.demoMobile.slice(-4)}` : '******8116';

    return res.json({
      success: true,
      demoAccountId: candidate.demoAccountId,
      candidateName: candidate.fullName,
      maskedMobile,
      maskedEmail: candidateEmail,
      demoOtpNotice: '123456',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/digilocker/oauth/verify-otp
 * Screen 3 -> Screen 4: Verify 6-digit Demo OTP
 */
router.post('/oauth/verify-otp', protect, async (req, res) => {
  try {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({ success: false, message: 'Session ID and 6-digit OTP are required.' });
    }

    const session = await DigiLockerSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Authorization session not found or expired.' });
    }

    if (String(session.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized session access.' });
    }

    if (session.expiresAt < new Date()) {
      session.state = 'EXPIRED';
      await session.save();
      return res.status(400).json({ success: false, message: 'Session expired.' });
    }

    if (otp !== '123456') {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP entered. For this demonstration, please enter the demo OTP: 123456',
      });
    }

    session.state = 'AUTHENTICATED';
    await session.save();

    const candidate = await MockStudentRecord.findById(session.mockStudent);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Authenticated demo account not found.' });
    }

    return res.json({
      success: true,
      state: 'AUTHENTICATED',
      account: {
        demoAccountId: session.demoAccountId,
        fullName: candidate.fullName,
        dob: candidate.dob,
        gender: candidate.gender,
        board: candidate.board,
        passingYear: candidate.passingYear,
        rollNumber: candidate.rollNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/digilocker/oauth/authenticate
 * (Retained for legacy/backward compatibility)
 */
router.post('/oauth/authenticate', protect, async (req, res) => {
  try {
    const { sessionId, demoAccountId, otp } = req.body;

    if (!sessionId || !demoAccountId) {
      return res.status(400).json({ success: false, message: 'Session ID and Demo Account ID are required.' });
    }

    const session = await DigiLockerSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Authorization session not found or expired.' });
    }

    if (String(session.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized session access.' });
    }

    if (session.expiresAt < new Date()) {
      session.state = 'EXPIRED';
      await session.save();
      return res.status(400).json({ success: false, message: 'Authorization session has expired. Please initiate a new connection.' });
    }

    // Validate demo OTP: Demo standard is '123456'
    if (otp !== '123456') {
      return res.status(400).json({
        success: false,
        message: 'Invalid demonstration OTP. For this academic simulation, please use the demo OTP: 123456',
      });
    }

    // Resolve demo account
    const candidate = await MockStudentRecord.findOne({
      $or: [{ demoAccountId }, { rollNumber: demoAccountId }],
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: `Demo account '${demoAccountId}' not found.` });
    }

    session.state = 'AUTHENTICATED';
    session.demoAccountId = candidate.demoAccountId || demoAccountId;
    session.mockStudent = candidate._id;
    await session.save();

    await logAudit({
      user: req.user,
      action: 'DIGILOCKER_DEMO_ACCOUNT_AUTHENTICATED',
      entityType: 'DigiLockerSession',
      entityId: session._id,
      details: { demoAccountId: session.demoAccountId, candidateName: candidate.fullName },
      req,
    });

    return res.json({
      success: true,
      state: 'AUTHENTICATED',
      account: {
        demoAccountId: session.demoAccountId,
        fullName: candidate.fullName,
        dob: candidate.dob,
        gender: candidate.gender,
        board: candidate.board,
        passingYear: candidate.passingYear,
        rollNumber: candidate.rollNumber,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/digilocker/oauth/consent
 * Step 3: Handle explicit user consent decision (Allow or Deny)
 */
router.post('/oauth/consent', protect, async (req, res) => {
  try {
    const { sessionId, decision, selectedDocTypes } = req.body;

    if (!sessionId || !decision) {
      return res.status(400).json({ success: false, message: 'Session ID and consent decision (allow/deny) are required.' });
    }

    const session = await DigiLockerSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or expired.' });
    }

    if (String(session.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized session access.' });
    }

    if (session.expiresAt < new Date()) {
      session.state = 'EXPIRED';
      await session.save();
      return res.status(400).json({ success: false, message: 'Authorization session has expired.' });
    }

    if (session.state !== 'AUTHENTICATED') {
      return res.status(400).json({ success: false, message: `Cannot record consent for session in state: ${session.state}` });
    }

    if (decision === 'deny') {
      session.state = 'DENIED';
      await session.save();

      await logAudit({
        user: req.user,
        action: 'DIGILOCKER_CONSENT_DENIED',
        entityType: 'DigiLockerSession',
        entityId: session._id,
        details: { sessionId },
        req,
      });

      return res.json({
        success: true,
        state: 'DENIED',
        message: 'Authorization denied by candidate. No documents or academic records were shared.',
      });
    }

    if (decision === 'allow') {
      if (selectedDocTypes !== undefined && (!Array.isArray(selectedDocTypes) || !selectedDocTypes.length ||
          selectedDocTypes.some((type) => typeof type !== 'string'))) {
        return res.status(400).json({ success: false, message: 'Select the documents you consent to share.' });
      }
      // Issue short-lived authorization code (valid for 5 minutes)
      const authCode = `dlauth_${crypto.randomBytes(16).toString('hex')}`;
      session.state = 'CONSENTED';
      session.authCode = authCode;
      session.selectedDocTypes = selectedDocTypes || [];
      await session.save();

      await logAudit({
        user: req.user,
        action: 'DIGILOCKER_CONSENT_GRANTED',
        entityType: 'DigiLockerSession',
        entityId: session._id,
        details: { sessionId, authCode },
        req,
      });

      return res.json({
        success: true,
        state: 'CONSENTED',
        authCode,
        message: 'Consent granted successfully.',
      });
    }

    return res.status(400).json({ success: false, message: "Invalid decision. Must be 'allow' or 'deny'." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/digilocker/oauth/documents
 * Step 4: Retrieve issued documents for the authenticated fictional account
 */
router.get('/oauth/documents', protect, async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const session = await DigiLockerSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or expired.' });
    }

    if (String(session.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized session.' });
    }

    if (!['AUTHENTICATED', 'CONSENTED'].includes(session.state)) {
      return res.status(400).json({
        success: false,
        message: `Documents cannot be accessed in state '${session.state}'. Authentication and consent are required.`,
      });
    }

    const candidate = await MockStudentRecord.findById(session.mockStudent);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Demo student record not found.' });
    }

    // Category mapping helper
    const getCategory = (docType) => {
      if (docType === 'aadhaar_card') return 'Identity Document';
      if (docType.includes('marksheet')) return 'Academic Marksheet';
      if (docType.includes('passing')) return 'Passing Certificate';
      if (docType.includes('migration')) return 'Migration Certificate';
      if (docType.includes('transfer')) return 'Transfer Certificate';
      return 'Official Document';
    };

    const documents = candidate.availableDocuments.map((d) => ({
      docType: d.docType,
      title: d.title,
      issuerAuthority: d.issuerAuthority || `${candidate.board} Regional Examination Authority`,
      issueDate: d.issueDate || `15-June-${candidate.passingYear}`,
      fileUrl: d.fileUrl,
      category: getCategory(d.docType),
      isAvailable: true,
      source: 'DigiLocker Demo',
    }));

    // Merge any additional fetched docs in this session
    if (session.fetchedDocs && session.fetchedDocs.length > 0) {
      session.fetchedDocs.forEach((fd) => {
        if (!documents.some((d) => d.docType === fd.docType)) {
          documents.push({
            docType: fd.docType,
            title: fd.title,
            issuerAuthority: fd.issuerAuthority,
            issueDate: fd.issueDate,
            fileUrl: fd.fileUrl,
            category: getCategory(fd.docType),
            isAvailable: true,
            source: 'DigiLocker Demo (Fetched)',
          });
        }
      });
    }

    return res.json({
      success: true,
      accountName: candidate.fullName,
      demoAccountId: session.demoAccountId,
      board: candidate.board,
      passingYear: candidate.passingYear,
      rollNumber: candidate.rollNumber,
      documents,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/digilocker/oauth/fetch-document
 * Step 5: Inside simulated service, fetch additional document by board and roll number
 * Enforces ownership: only returns documents associated with the authenticated demo account
 */
router.post('/oauth/fetch-document', protect, async (req, res) => {
  try {
    const { sessionId, board, docType, passingYear, rollNumber } = req.body;

    if (!sessionId || !docType || !rollNumber) {
      return res.status(400).json({ success: false, message: 'Session ID, Document Type, and Roll Number are required.' });
    }

    const session = await DigiLockerSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (String(session.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized session.' });
    }

    if (!['AUTHENTICATED', 'CONSENTED'].includes(session.state)) {
      return res.status(400).json({ success: false, message: 'Session must be authenticated before fetching documents.' });
    }

    const candidate = await MockStudentRecord.findById(session.mockStudent);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Authenticated demo account not found.' });
    }

    // Ownership check: Prevent student from importing another candidate's document by entering another roll number
    if (candidate.rollNumber.toLowerCase() !== rollNumber.trim().toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: The requested roll number (${rollNumber}) does not belong to the authenticated demo account (${candidate.fullName} • ${candidate.rollNumber}). In DigiLocker, only documents issued to the authenticated account owner may be accessed.`,
      });
    }

    const foundDoc = candidate.availableDocuments.find((d) => d.docType === docType);
    if (!foundDoc) {
      return res.status(404).json({
        success: false,
        message: `The requested document '${docType}' is not available in the demo repository for ${candidate.fullName}. You may upload this document manually in EduVerify.`,
      });
    }

    // Record fetched document in session
    if (!session.fetchedDocs.some((d) => d.docType === foundDoc.docType)) {
      session.fetchedDocs.push({
        docType: foundDoc.docType,
        title: foundDoc.title,
        fileUrl: foundDoc.fileUrl,
        issueDate: foundDoc.issueDate || `15-June-${candidate.passingYear}`,
        issuerAuthority: foundDoc.issuerAuthority || `${candidate.board} Authority`,
      });
      await session.save();
    }

    return res.json({
      success: true,
      message: `Document '${foundDoc.title}' successfully retrieved into your DigiLocker Demo session.`,
      document: {
        docType: foundDoc.docType,
        title: foundDoc.title,
        issuerAuthority: foundDoc.issuerAuthority || `${candidate.board} Authority`,
        issueDate: foundDoc.issueDate || `15-June-${candidate.passingYear}`,
        fileUrl: foundDoc.fileUrl,
        category: foundDoc.docType.includes('marksheet') ? 'Academic Marksheet' : 'Board Certificate',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/digilocker/oauth/exchange
 * Step 6: Validate authorization code, exchange for selected documents, and share with EduVerify
 */
router.post('/oauth/exchange', protect, async (req, res) => {
  try {
    const { sessionId, authCode, selectedDocTypes, applicationId, workspaceId } = req.body;

    if (!sessionId || !authCode) {
      return res.status(400).json({ success: false, message: 'Session ID and Authorization Code are required.' });
    }

    if (!Array.isArray(selectedDocTypes) || selectedDocTypes.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one document to share.' });
    }

    const session = await DigiLockerSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Authorization session not found or expired.' });
    }

    if (String(session.student) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized session exchange.' });
    }

    if (session.expiresAt < new Date()) {
      session.state = 'EXPIRED';
      await session.save();
      return res.status(400).json({ success: false, message: 'Authorization session has expired.' });
    }

    if (session.state !== 'CONSENTED') {
      return res.status(400).json({
        success: false,
        message: `Invalid session state '${session.state}'. User consent must be granted before document exchange.`,
      });
    }

    if (session.authCode !== authCode) {
      return res.status(400).json({ success: false, message: 'Invalid authorization code.' });
    }

    if (session.codeUsed) {
      return res.status(400).json({
        success: false,
        message: 'Security error: Authorization code has already been used and cannot be replayed.',
      });
    }

    let application = null;
    if (!validDocumentScope({ applicationId, workspaceId }) ||
        (applicationId && applicationId !== String(session.applicationId)) ||
        (workspaceId && workspaceId !== session.workspaceId)) {
      return res.status(400).json({ success: false, message: 'Start DigiLocker again for this application.' });
    }
    const targetAppId = session.applicationId;
    if (targetAppId) {
      application = await Application.findOne({
        _id: targetAppId, student: req.user._id, status: { $in: ['Draft', 'Correction Required'] },
      });
      if (!application) {
        return res.status(409).json({ success: false, message: 'This application cannot receive document changes.' });
      }
    }
    if (session.selectedDocTypes.length && selectedDocTypes.some((docType) => !session.selectedDocTypes.includes(docType))) {
      return res.status(400).json({ success: false, message: 'Select only documents authorized during consent.' });
    }
    const consumed = await DigiLockerSession.updateOne(
      { _id: session._id, state: 'CONSENTED', codeUsed: false },
      { $set: { codeUsed: true, state: 'COMPLETED', selectedDocTypes } }
    );
    if (!consumed.modifiedCount) {
      return res.status(409).json({ success: false, message: 'This authorization code has already been used.' });
    }

    // Perform actual document import and attach to application/student
    const result = await digiLockerService.importSelectedDocuments({
      user: req.user,
      application,
      workspaceId: session.workspaceId,
      recordId: session.mockStudent,
      selectedDocTypes,
      consented: true,
    });

    const rec = result.record;

    if (application) {
      const newDocIds = result.importedDocuments.map((d) => d._id);
      application.documents = [...new Set([...application.documents, ...newDocIds].map(String))];
      await application.save();
    }

    await logAudit({
      user: req.user,
      action: 'DIGILOCKER_DOCUMENTS_EXCHANGED_AND_IMPORTED',
      entityType: 'DigiLockerSession',
      entityId: session._id,
      details: {
        demoAccountId: session.demoAccountId,
        candidateRoll: rec.rollNumber,
        selectedDocTypes,
        count: result.importedDocuments.length,
      },
      req,
    });

    // Determine academic details & personal details to populate based on which documents were authorized:
    // 1. If 'aadhaar_card' was authorized, populate candidateName, dob, gender, permanentAddress, nationality, category.
    // 2. If 'class10_marksheet' was authorized, populate Class 10th details (roll, board, year, pct, subjects, parent names).
    // 3. If 'class12_marksheet' was authorized, populate Class 12th details (roll, board, year, stream, pct, dynamic subjects).
    const hasAadhaar = selectedDocTypes.includes('aadhaar_card');
    const hasC10 = selectedDocTypes.includes('class10_marksheet');
    const hasC12 = selectedDocTypes.includes('class12_marksheet');

    const importedAcademicDetails = {
      // Identity / Demographics from Aadhaar Demo
      candidateName: (hasAadhaar || hasC10 || hasC12) ? rec.fullName : null,
      dob: (hasAadhaar || hasC10) ? rec.dob : null,
      gender: hasAadhaar ? rec.gender : null,
      nationality: hasAadhaar ? (rec.nationality || 'Indian') : null,
      category: hasAadhaar ? (rec.category || 'General') : null,
      permanentAddress: hasAadhaar ? (rec.permanentAddress || null) : null,
      
      // Parents from Class 10th
      fatherName: hasC10 ? (rec.fatherName || '') : null,
      motherName: hasC10 ? (rec.motherName || '') : null,
      
      // Basic educational metadata
      rollNumber: rec.rollNumber,
      board: rec.board,
      passingYear: rec.passingYear,
      
      // Academic records
      class10: hasC10 ? rec.class10 : null,
      class12: hasC12 ? rec.class12 : null,
      
      // Document flags
      authorizedDocs: selectedDocTypes,
    };

    return res.json({
      success: true,
      message: `Successfully authorized and imported ${result.importedDocuments.length} document(s) from DigiLocker Demo service.`,
      importedDocuments: result.importedDocuments,
      importedAcademicDetails,
      sessionSummary: {
        sessionId: session.sessionId,
        demoAccountId: session.demoAccountId,
        candidateName: rec.fullName,
        sharedDocTypes: selectedDocTypes,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Legacy / Direct Search (for backward compatibility and direct CLI testing)
 */
router.post('/search', protect, async (req, res) => {
  try {
    const { rollNumber, board, passingYear } = req.body;
    if (!rollNumber) {
      return res.status(400).json({ success: false, message: 'Please provide roll number' });
    }

    const record = await digiLockerService.searchRecords({ rollNumber, board, passingYear });
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No matching records found in the DigiLocker Demo Repository. Please double-check credentials or upload documents manually.',
      });
    }

    return res.json({
      success: true,
      record: {
        id: record._id,
        referenceId: record.referenceId,
        demoAccountId: record.demoAccountId,
        fullName: record.fullName,
        dob: record.dob,
        board: record.board,
        passingYear: record.passingYear,
        rollNumber: record.rollNumber,
        class10: record.class10,
        class12: record.class12,
        availableDocuments: record.availableDocuments,
        demoScenario: record.demoScenario,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Legacy / Direct Import (for backward compatibility and automated test runner)
 */
router.post('/import', protect, async (req, res) => {
  try {
    const { recordId, selectedDocTypes, applicationId } = req.body;
    if (!recordId) {
      return res.status(400).json({ success: false, message: 'Record ID is required for import' });
    }

    let application = null;
    if (applicationId) {
      application = await Application.findOne({
        _id: applicationId, student: req.user._id, status: { $in: ['Draft', 'Correction Required'] },
      });
      if (!application) {
        return res.status(409).json({ success: false, message: 'This application cannot receive document changes.' });
      }
    }

    const result = await digiLockerService.importSelectedDocuments({
      user: req.user,
      application,
      recordId,
      selectedDocTypes,
    });

    const rec = result.record;
    if (application) {
      const newDocIds = result.importedDocuments.map((d) => d._id);
      application.documents = [...new Set([...application.documents, ...newDocIds].map(String))];
      await application.save();
    }

    await logAudit({
      user: req.user,
      action: 'DIGILOCKER_DOCUMENTS_IMPORTED_DIRECT',
      entityType: 'MockStudentRecord',
      entityId: rec._id,
      details: { rollNumber: rec.rollNumber, count: result.importedDocuments.length },
      req,
    });

    return res.json({
      success: true,
      message: `Successfully imported ${result.importedDocuments.length} document(s) from DigiLocker Demo Archive.`,
      importedDocuments: result.importedDocuments,
      importedAcademicDetails: {
        candidateName: rec.fullName,
        dob: rec.dob,
        gender: rec.gender,
        nationality: rec.nationality || 'Indian',
        category: rec.category || 'General',
        fatherName: rec.fatherName || '',
        motherName: rec.motherName || '',
        permanentAddress: rec.permanentAddress || null,
        rollNumber: rec.rollNumber,
        board: rec.board,
        passingYear: rec.passingYear,
        class10: selectedDocTypes ? (selectedDocTypes.includes('class10_marksheet') ? rec.class10 : null) : (rec.class10 || null),
        class12: selectedDocTypes ? (selectedDocTypes.includes('class12_marksheet') ? rec.class12 : null) : (rec.class12 || null),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/digilocker/demo-candidates
 * Quick overview of demo candidates
 */
router.get('/demo-candidates', async (req, res) => {
  try {
    const candidates = await digiLockerService.listDemoCandidates();
    return res.json({ success: true, count: candidates.length, candidates });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
