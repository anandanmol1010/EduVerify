import mongoose from 'mongoose';

const mockSubjectMarksSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true },
    marksObtained: { type: Number, required: true },
    maxMarks: { type: Number, default: 100 },
    grade: { type: String, default: 'A' },
  },
  { _id: false }
);

const mockStudentRecordSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
    },
    demoAccountId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    demoMobile: {
      type: String,
      default: '0000000001',
      index: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      default: 'Male',
    },
    fatherName: {
      type: String,
      default: '',
    },
    motherName: {
      type: String,
      default: '',
    },
    nationality: {
      type: String,
      default: 'Indian',
    },
    category: {
      type: String,
      default: 'General',
    },
    permanentAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    rollNumber: {
      type: String,
      required: true,
      index: true,
    },
    board: {
      type: String,
      required: true,
      enum: ['CBSE', 'ICSE/ISC', 'Maharashtra State Board', 'Karnataka State Board', 'UP State Board'],
    },
    passingYear: {
      type: Number,
      required: true,
    },
    // Academic breakdowns
    class10: {
      schoolName: { type: String, default: '' },
      rollNumber: String,
      passingYear: Number,
      subjects: [mockSubjectMarksSchema],
      totalMarks: Number,
      maxMarks: Number,
      percentage: Number,
    },
    class12: {
      backlogs: { type: Number, min: 0, validate: Number.isInteger },
      schoolName: { type: String, default: '' },
      rollNumber: String,
      passingYear: Number,
      stream: String,
      subjects: [mockSubjectMarksSchema],
      totalMarks: Number,
      maxMarks: Number,
      percentage: Number,
    },
    availableDocuments: [
      {
        docType: {
          type: String,
          enum: [
            'aadhaar_card',
            'class10_marksheet',
            'class12_marksheet',
            'passing_certificate',
            'migration_certificate',
            'transfer_certificate',
          ],
        },
        title: String,
        fileUrl: String,
        issueDate: String,
        issuerAuthority: String,
      },
    ],
    demoScenario: {
      type: String,
      default: 'Standard Compliant', // e.g. "Missing Transfer Certificate", "Low Math Score", "Borderline Percentage"
    },
  },
  { timestamps: true }
);

export const MockStudentRecord = mongoose.model('MockStudentRecord', mockStudentRecordSchema);
