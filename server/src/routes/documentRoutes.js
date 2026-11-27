import express from 'express';
import path from 'path';
import { Document } from '../models/Document.js';
import { Application } from '../models/Application.js';
import { uploadDocument } from '../middleware/upload.js';
import { protect, authorize } from '../middleware/auth.js';
import { extractTextFromPdf, extractTextFromImage, parseExtractedAcademicData, detectDataMismatches } from '../services/ocrService.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();

// Upload document manually
router.post('/upload', protect, uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a document file to upload.' });
    }

    const { docType, title, applicationId, rollNumber, candidateName, passingYear } = req.body;
    const application = applicationId ? await Application.findOne({
      _id: applicationId, student: req.user._id, status: { $in: ['Draft', 'Correction Required'] },
    }) : null;
    if (applicationId && !application) {
      return res.status(409).json({ success: false, message: 'This application cannot receive document changes.' });
    }

    const relativePath = `/uploads/documents/${req.file.filename}`;
    const absolutePath = req.file.path;
    const isPdf = req.file.mimetype === 'application/pdf';

    // Run OCR or PDF parsing
    let extractedText = '';
    let confidence = 80;

    if (isPdf) {
      const pdfRes = await extractTextFromPdf(absolutePath);
      extractedText = pdfRes.text;
    } else {
      const imgRes = await extractTextFromImage(absolutePath);
      extractedText = imgRes.text;
      confidence = imgRes.confidence || 75;
    }

    // Parse structured entities
    const parsedData = parseExtractedAcademicData(extractedText);
    parsedData.confidenceScore = Math.round(confidence);
    parsedData.rawText = extractedText.substring(0, 800); // sample snippet

    // Check for discrepancies against candidate's form input
    const mismatches = detectDataMismatches(parsedData, {
      rollNumber: rollNumber || '',
      candidateName: candidateName || req.user.name,
      passingYear: passingYear || '',
      percentage: req.body.percentage,
    });

    let doc;
    // Check if replacing an existing document of same type for the application or student
    let existingDoc = null;
    if (applicationId) {
      existingDoc = await Document.findOne({
        application: applicationId,
        student: req.user._id,
        docType: docType || 'other',
      });
    } else {
      existingDoc = await Document.findOne({
        student: req.user._id,
        application: null,
        docType: docType || 'other',
      });
    }

    if (existingDoc) {
      existingDoc.title = title || req.file.originalname;
      existingDoc.source = 'Manual Upload';
      existingDoc.issuerRecord = null;
      existingDoc.filePath = relativePath;
      existingDoc.fileType = req.file.mimetype;
      existingDoc.fileSize = req.file.size;
      // When replacing a document, its status must reset to Pending Verification
      existingDoc.verificationStatus = 'Pending Verification';
      existingDoc.verifiedBy = null;
      existingDoc.verifiedAt = null;
      existingDoc.verificationRemarks = '';
      existingDoc.extractedData = {
        ...parsedData,
        isMismatched: mismatches.length > 0,
        mismatchDetails: mismatches,
      };
      await existingDoc.save();
      doc = existingDoc;
    } else {
      doc = await Document.create({
        student: req.user._id,
        application: applicationId || null,
        docType: docType || 'other',
        title: title || req.file.originalname,
        source: 'Manual Upload',
        filePath: relativePath,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        verificationStatus: 'Pending Verification',
        extractedData: {
          ...parsedData,
          isMismatched: mismatches.length > 0,
          mismatchDetails: mismatches,
        },
      });
    }

    // Associate with application if provided
    if (application && !application.documents.includes(doc._id)) {
      application.documents.push(doc._id);
      await application.save();
    }

    await logAudit({
      user: req.user,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: doc._id,
      details: { docType: doc.docType, mismatchesCount: mismatches.length },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and analyzed successfully.',
      document: doc,
      mismatches,
      extractedData: parsedData,
    });
  } catch (error) {
    console.error('[Document Upload Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get user documents
router.get('/my-documents', protect, async (req, res) => {
  try {
    const { applicationId } = req.query;
    const query = { student: req.user._id };
    if (applicationId) {
      query.$or = [{ application: applicationId }, { application: null }];
    }
    const documents = await Document.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Verify or request correction on a document
router.patch('/:id/verify', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, remarks } = req.body; // 'Verified', 'Correction Required', 'Rejected'
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const validStatuses = ['Pending Verification', 'Verified', 'Correction Required', 'Rejected'];
    if (doc.application && await Application.exists({ _id: doc.application, status: 'Accepted' })) {
      return res.status(409).json({ success: false, message: 'An accepted application has finalized documents.' });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }

    doc.verificationStatus = status;
    doc.verificationRemarks = remarks || '';
    doc.verifiedBy = req.user._id;
    doc.verifiedAt = new Date();
    await doc.save();

    await logAudit({
      user: req.user,
      action: 'DOCUMENT_VERIFIED',
      entityType: 'Document',
      entityId: doc._id,
      details: { status, remarks },
      req,
    });

    return res.json({ success: true, message: `Document status updated to ${status}`, document: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Delete document
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (String(doc.student) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this document' });
    }

    // Check if linked to an Accepted application
    if (doc.application) {
      const app = await Application.findById(doc.application);
      if (app && app.status === 'Accepted') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete documents linked to an accepted admission application.',
        });
      }
      if (app) {
        app.documents = app.documents.filter((id) => String(id) !== String(doc._id));
        await app.save();
      }
    }

    const result = await Document.deleteOne({ _id: doc._id, __v: doc.__v });
    if (!result.deletedCount) return res.status(409).json({ success: false, message: 'The document has changed. Refresh and try again.' });
    return res.json({ success: true, message: 'Document removed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
