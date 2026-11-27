import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { connectDB, pingDB } from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import digiLockerRoutes from './routes/digiLockerRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import admissionLetterRoutes from './routes/admissionLetterRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure upload folders exist
const uploadsPath = path.join(process.cwd(), 'uploads');
const subfolders = ['documents', 'mock_documents', 'letters'];
subfolders.forEach((sub) => {
  const fPath = path.join(uploadsPath, sub);
  if (!fs.existsSync(fPath)) {
    fs.mkdirSync(fPath, { recursive: true });
  }
});

// Serve uploads as static resources
app.use('/uploads', express.static(uploadsPath));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/digilocker', digiLockerRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/letters', admissionLetterRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pingDB();
  } catch {
    return res.status(503).json({ status: 'unavailable', database: 'unavailable' });
  }
  res.json({
    status: 'healthy',
    database: 'connected',
    system: 'EduVerify Admission Automation API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('Set JWT_SECRET in server/.env before starting the API.');
    }
    await connectDB();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  EduVerify Admission API Server active on PORT: ${PORT}`);
      console.log(`  REST API URL: http://localhost:${PORT}/api`);
      console.log(`  Uploads Directory: ${uploadsPath}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
