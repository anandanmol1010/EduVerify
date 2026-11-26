import mongoose from 'mongoose';

const digiLockerSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    clientApp: {
      type: String,
      default: 'EduVerify — Admission Process Automation System',
    },
    purpose: {
      type: String,
      default: 'Verification of academic certificates and examination marks for college admission',
    },
    demoAccountId: {
      type: String,
      default: '',
    },
    demoMobile: {
      type: String,
      default: '',
    },
    mockStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockStudentRecord',
      default: null,
    },
    state: {
      type: String,
      enum: ['INITIATED', 'MOBILE_VERIFIED', 'ACCOUNT_SELECTED', 'AUTHENTICATED', 'CONSENTED', 'DENIED', 'COMPLETED', 'EXPIRED'],
      default: 'INITIATED',
    },
    otp: {
      type: String,
      default: '123456',
    },
    authCode: {
      type: String,
      default: '',
    },
    codeUsed: {
      type: Boolean,
      default: false,
    },
    selectedDocTypes: [String],
    fetchedDocs: [
      {
        docType: String,
        title: String,
        fileUrl: String,
        issueDate: String,
        issuerAuthority: String,
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL auto-cleanup
    },
  },
  { timestamps: true }
);

export const DigiLockerSession = mongoose.model('DigiLockerSession', digiLockerSessionSchema);
