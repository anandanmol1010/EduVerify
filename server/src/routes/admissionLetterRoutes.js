import express from 'express';
import { AdmissionLetter } from '../models/AdmissionLetter.js';
import { Application } from '../models/Application.js';
import { protect } from '../middleware/auth.js';
import { institution } from '../config/institution.js';

const router = express.Router();

// Student: Get my admission letters
router.get('/my-letters', protect, async (req, res) => {
  try {
    const letters = await AdmissionLetter.find({ student: req.user._id })
      .populate('course')
      .populate('application')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: letters.length, letters });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Student/Officer: Get single admission letter by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const letter = await AdmissionLetter.findById(req.params.id)
      .populate('course')
      .populate('application')
      .populate('student', 'name email');

    if (!letter) {
      return res.status(404).json({ success: false, message: 'Admission letter not found' });
    }

    if (req.user.role === 'student' && String(letter.student._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    return res.json({ success: true, letter });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Public: QR Code / Public Admission Verification
// Does NOT expose sensitive personal details (e.g. no phone, full address, marks breakdown)
router.get('/public-verify/:admissionId', async (req, res) => {
  try {
    const { admissionId } = req.params;
    const letter = await AdmissionLetter.findOne({ admissionId })
      .populate('course', 'title code level durationYears')
      .populate('student', 'name');

    if (!letter || !letter.isValid) {
      return res.status(404).json({
        success: false,
        isValid: false,
        message: 'Invalid, revoked, or unrecognized admission reference code.',
      });
    }

    // Mask name for privacy: "Johnathan Doe" -> "J******** D**"
    const nameParts = letter.student.name.split(' ');
    const maskedName = nameParts
      .map((part) => (part.length > 2 ? `${part[0]}${'*'.repeat(part.length - 2)}${part.slice(-1)}` : `${part[0]}*`))
      .join(' ');

    return res.json({
      success: true,
      isValid: true,
      verificationData: {
        admissionId: letter.admissionId,
        candidateNameMasked: maskedName,
        courseAllotted: letter.course.title,
        courseCode: letter.course.code,
        academicSession: letter.academicSession,
        issueDate: letter.issuedDate,
        institution: institution.name,
        status: 'Confirmed in EduVerify',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
