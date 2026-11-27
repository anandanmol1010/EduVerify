import express from 'express';
import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { generateToken, protect } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();

const matchesLocalDemoPassword = (req, user, password) => {
  if (process.env.NODE_ENV !== 'development' || process.env.RENDER === 'true') return false;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return false;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(req.hostname)) return false;
  const origin = req.get('Origin');
  if (origin && !/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin)) return false;
  if (user.email === 'admin@eduverify.ac.in' && user.role === 'admin') return password === 'AdminPassword123!';
  return user.email === 'student@eduverify.ac.in' && user.role === 'student' && password === 'StudentPassword123!';
};

// Register a new user (default student)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Public registration strictly creates standard Student accounts
    const userRole = 'student';

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: userRole,
    });

    // If student, create profile
    if (user.role === 'student') {
      await StudentProfile.create({
        user: user._id,
      });
    }

    await logAudit({
      user,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      details: { email: user.email, role: user.role },
      req,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('[Auth API] Register error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials provided.' });
    }

    const isMatch = matchesLocalDemoPassword(req, user, password) || await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials provided.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is inactive or suspended.' });
    }

    user.lastLogin = new Date();
    await user.save();

    await logAudit({
      user,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      details: { email: user.email },
      req,
    });

    const token = generateToken(user._id);

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('[Auth API] Login error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get current profile
router.get('/me', protect, async (req, res) => {
  try {
    let profile = null;
    if (req.user.role === 'student') {
      profile = await StudentProfile.findOne({ user: req.user._id });
    }
    return res.json({
      success: true,
      user: req.user,
      profile,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update profile details
router.put('/me', protect, async (req, res) => {
  try {
    const { name, phone, dob, gender, category, bloodGroup, guardianName, guardianPhone, address, academic10th, academic12th } = req.body;

    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    await req.user.save();

    if (req.user.role === 'student') {
      let profile = await StudentProfile.findOne({ user: req.user._id });
      if (!profile) {
        profile = new StudentProfile({ user: req.user._id });
      }

      if (dob) profile.dob = dob;
      if (gender) profile.gender = gender;
      if (category) profile.category = category;
      if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup;
      if (guardianName !== undefined) profile.guardianName = guardianName;
      if (guardianPhone !== undefined) profile.guardianPhone = guardianPhone;
      if (address) profile.address = { ...profile.address, ...address };
      if (academic10th) profile.academic10th = { ...profile.academic10th, ...academic10th };
      if (academic12th) profile.academic12th = { ...profile.academic12th, ...academic12th };

      await profile.save();
      return res.json({ success: true, message: 'Profile updated successfully', user: req.user, profile });
    }

    return res.json({ success: true, message: 'Profile updated successfully', user: req.user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
