import express from 'express';
import { Course } from '../models/Course.js';
import { protect, authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();

// Public: List all courses with search & filter
router.get('/', async (req, res) => {
  try {
    const { department, level, search, status } = req.query;
    const query = {};

    if (department && department !== 'all') query.department = new RegExp(department, 'i');
    if (level && level !== 'all') query.level = level;
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { department: new RegExp(search, 'i') },
      ];
    }

    const courses = await Course.find(query).sort({ title: 1 });
    return res.json({ success: true, count: courses.length, courses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Public: Get single course details
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    return res.json({ success: true, course });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Create course
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.create(req.body);
    await logAudit({
      user: req.user,
      action: 'COURSE_CREATED',
      entityType: 'Course',
      entityId: course._id,
      details: { code: course.code, title: course.title },
      req,
    });
    return res.status(201).json({ success: true, course });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Admin: Update course
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    await logAudit({
      user: req.user,
      action: 'COURSE_UPDATED',
      entityType: 'Course',
      entityId: course._id,
      details: { code: course.code },
      req,
    });
    return res.json({ success: true, course });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Admin: Delete course
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    await logAudit({
      user: req.user,
      action: 'COURSE_DELETED',
      entityType: 'Course',
      entityId: req.params.id,
      details: { code: course.code },
      req,
    });
    return res.json({ success: true, message: 'Course removed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
