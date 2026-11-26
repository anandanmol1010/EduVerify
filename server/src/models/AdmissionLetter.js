import mongoose from 'mongoose';

const admissionLetterSchema = new mongoose.Schema(
  {
    admissionId: {
      type: String,
      required: true,
      unique: true, // e.g. EDU-2026-ADM-0042
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    academicSession: {
      type: String,
      default: '2026-2027',
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    pdfPath: {
      type: String,
      required: true,
    },
    qrCodeData: {
      type: String,
      required: true,
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
    },
    isValid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const AdmissionLetter = mongoose.model('AdmissionLetter', admissionLetterSchema);
