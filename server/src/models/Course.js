import mongoose from 'mongoose';

const eligibilityRulesSchema = new mongoose.Schema(
  {
    minClass10Percentage: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    minClass12Percentage: {
      type: Number,
      default: 55,
      min: 0,
      max: 100,
    },
    requiredSubjects: [
      {
        subjectName: { type: String, required: true },
        minMarks: { type: Number, default: 40 },
        isMandatory: { type: Boolean, default: true },
      },
    ],
    requiredDocuments: [
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
            'student_photo',
            'id_proof',
            'category_certificate',
            'disability_certificate',
            'income_certificate',
            'other',
          ],
          required: true,
        },
        docName: { type: String, required: true },
        isMandatory: { type: Boolean, default: true },
      },
    ],
    maxBacklogsAllowed: {
      type: Number,
      default: 0,
    },
    specialInstructions: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      default: 'Department of Computer Science & Engineering',
      trim: true,
    },
    level: {
      type: String,
      enum: ['Undergraduate', 'Postgraduate', 'Diploma', 'Doctoral'],
      default: 'Undergraduate',
    },
    durationYears: {
      type: Number,
      required: true,
      default: 4,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    allocatedSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    annualFee: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    eligibilityCriteria: {
      type: eligibilityRulesSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'upcoming'],
      default: 'open',
    },
    admissionStartDate: {
      type: Date,
      default: () => new Date(),
    },
    admissionEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

courseSchema.virtual('availableSeats').get(function () {
  return Math.max(0, this.totalSeats - this.allocatedSeats);
});

courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

export const Course = mongoose.model('Course', courseSchema);
