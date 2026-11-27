import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    workspaceId: { type: String, default: null },
    docType: {
      type: String,
      required: true,
      enum: [
        'aadhaar_card',
        'class10_marksheet',
        'class12_marksheet',
        'passing_certificate',
        'migration_certificate',
        'transfer_certificate',
        'student_photo',
        'id_proof',
        'category_certificate',
        'disability_certificate',
        'income_certificate',
        'other',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ['DigiLocker Demo', 'Manual Upload'],
      default: 'Manual Upload',
    },
    filePath: {
      type: String,
      required: true,
    },
    issuerRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockStudentRecord',
      default: null,
    },
    fileType: {
      type: String,
      default: 'application/pdf',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    verificationStatus: {
      type: String,
      enum: [
        'Not Uploaded',
        'Pending Verification',
        'Verified',
        'Correction Required',
        'Rejected',
      ],
      default: 'Pending Verification',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationRemarks: {
      type: String,
      default: '',
    },
    extractedData: {
      candidateName: { type: String, default: '' },
      rollNumber: { type: String, default: '' },
      board: { type: String, default: '' },
      passingYear: { type: String, default: '' },
      percentage: { type: String, default: '' },
      rawText: { type: String, default: '' },
      confidenceScore: { type: Number, default: 0 },
      isMismatched: { type: Boolean, default: false },
      mismatchDetails: [String],
    },
  },
  { timestamps: true, optimisticConcurrency: true }
);

documentSchema.index({ student: 1, createdAt: -1 });
documentSchema.index({ student: 1, application: 1, workspaceId: 1, docType: 1 });
documentSchema.index({ application: 1, docType: 1 });

export const Document = mongoose.model('Document', documentSchema);
