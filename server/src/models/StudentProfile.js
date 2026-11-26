import mongoose from 'mongoose';

const subjectScoreSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true },
    theoryMarks: { type: Number, default: 0 },
    practicalMarks: { type: Number, default: 0 },
    marksObtained: { type: Number, required: true },
    maxMarks: { type: Number, default: 100 },
    grade: { type: String, default: '' },
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    dob: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
      default: 'Prefer not to say',
    },
    category: {
      type: String,
      enum: ['General', 'OBC', 'SC', 'ST', 'EWS'],
      default: 'General',
    },
    categoryCertificateNumber: {
      type: String,
      default: '',
    },
    nationality: {
      type: String,
      default: 'Indian',
    },
    hasDisability: {
      type: Boolean,
      default: false,
    },
    disabilityDetails: {
      type: String,
      default: '',
    },
    disabilityCertificateNumber: {
      type: String,
      default: '',
    },
    fatherName: {
      type: String,
      default: '',
    },
    motherName: {
      type: String,
      default: '',
    },
    hasGuardian: {
      type: Boolean,
      default: false,
    },
    guardianRelationship: {
      type: String,
      default: '',
    },
    altPhone: {
      type: String,
      default: '',
    },
    bloodGroup: {
      type: String,
      default: '',
    },
    guardianName: {
      type: String,
      default: '',
    },
    guardianPhone: {
      type: String,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    correspondenceAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    isSameAddress: {
      type: Boolean,
      default: true,
    },
    // Academic details (populated manually or via DigiLocker / OCR)
    academic10th: {
      board: { type: String, default: '' },
      rollNumber: { type: String, default: '' },
      schoolName: { type: String, default: '' },
      passingYear: { type: Number, default: null },
      totalMarks: { type: Number, default: 0 },
      maxMarks: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      subjects: [subjectScoreSchema],
      isImported: { type: Boolean, default: false },
      source: { type: String, default: 'Manual' },
    },
    academic12th: {
      board: { type: String, default: '' },
      rollNumber: { type: String, default: '' },
      schoolName: { type: String, default: '' },
      passingYear: { type: Number, default: null },
      stream: { type: String, default: '' },
      totalMarks: { type: Number, default: 0 },
      maxMarks: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      subjects: [subjectScoreSchema],
      isImported: { type: Boolean, default: false },
      source: { type: String, default: 'Manual' },
    },
    digiLockerLinked: {
      type: Boolean,
      default: false,
    },
    digiLockerRollNo: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
