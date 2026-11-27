import express from 'express';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Course } from '../models/Course.js';
import { AdmissionSetting } from '../models/AdmissionSetting.js';
import { protect, authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * GET /api/admin/dashboard-stats
 * Returns database-driven statistics for the combined Admin dashboard:
 * Total, Pending, Accepted, Rejected, Correction Required, Total Active Courses, Available Seats, and Recent Applications
 */
router.get('/dashboard-stats', protect, authorize('admin'), async (req, res) => {
  try {
    const totalApplications = await Application.countDocuments({ status: { $ne: 'Draft' } });
    const pendingCount = await Application.countDocuments({
      status: { $in: ['Submitted', 'Pending Verification', 'Resubmitted', 'Under Review'] },
    });
    const acceptedCount = await Application.countDocuments({
      status: { $in: ['Accepted', 'Approved', 'Admission Confirmed'] },
    });
    const rejectedCount = await Application.countDocuments({ status: 'Rejected' });
    const correctionCount = await Application.countDocuments({ status: 'Correction Required' });

    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCourses = await Course.countDocuments();

    // Aggregated course seat metrics
    const courses = await Course.find({}, 'title code department totalSeats allocatedSeats status');

    const totalSeats = courses.reduce((acc, c) => acc + (c.totalSeats || 0), 0);
    const totalAllocated = courses.reduce((acc, c) => acc + (c.allocatedSeats || 0), 0);
    const totalAvailableSeats = Math.max(0, totalSeats - totalAllocated);

    // Recent 10 applications with candidate details
    const recentApplications = await Application.find({ status: { $ne: 'Draft' } })
      .populate('course', 'title code')
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      stats: {
        totalApplications,
        pendingApplications: pendingCount,
        pendingVerificationCount: pendingCount,
        acceptedApplications: acceptedCount,
        acceptedCount,
        rejectedApplications: rejectedCount,
        rejectedCount,
        correctionApplications: correctionCount,
        correctionCount,
        totalStudents,
        totalCourses,
        totalSeats,
        totalAllocated,
        totalAvailableSeats,
      },
      courses,
      recentApplications,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Manage Students
router.get('/students', protect, authorize('admin'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    return res.json({ success: true, count: students.length, students });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Institutional Admission Settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await AdmissionSetting.findOne();
    if (!settings) {
      settings = await AdmissionSetting.create({});
    }
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', protect, authorize('admin'), async (req, res) => {
  try {
    let settings = await AdmissionSetting.findOne();
    if (!settings) {
      settings = new AdmissionSetting();
    }
    Object.assign(settings, req.body);
    await settings.save();

    await logAudit({
      user: req.user,
      action: 'SETTINGS_UPDATED',
      entityType: 'AdmissionSetting',
      entityId: settings._id,
    });

    return res.json({ success: true, settings, message: 'Settings saved successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
