import mongoose from 'mongoose';

const applicationStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        'Draft',
        'Submitted',
        'Pending Verification',
        'Correction Required',
        'Resubmitted',
        'Accepted',
        'Rejected',
      ],
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedByRole: {
      type: String,
      enum: ['student', 'officer', 'admin', 'system'],
      default: 'system',
    },
    remarks: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
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
    status: {
      type: String,
      enum: [
        'Draft',
        'Submitted',
        'Pending Verification',
        'Correction Required',
        'Resubmitted',
        'Accepted',
        'Rejected',
      ],
      default: 'Draft',
    },
    personalSnapshot: {
      fullName: String,
      email: String,
      phone: String,
      altPhone: { type: String, default: '' },
      dob: Date,
      gender: { type: String, default: '' },
      category: { type: String, default: '' },
      nationality: { type: String, default: 'Indian' },
      hasDisability: { type: Boolean, default: false },
      disabilityDetails: { type: String, default: '' },
      disabilityCertificateNumber: { type: String, default: '' },
      categoryCertificateNumber: { type: String, default: '' },
      fatherName: { type: String, default: '' },
      motherName: { type: String, default: '' },
      hasGuardian: { type: Boolean, default: false },
      guardianName: { type: String, default: '' },
      guardianPhone: { type: String, default: '' },
      guardianRelationship: { type: String, default: '' },
      permanentAddress: {
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
      isSameAddress: { type: Boolean, default: true },
      address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
      },
    },
    academicSnapshot: {
      class10: {
        board: { type: String, default: '' },
        schoolName: { type: String, default: '' },
        rollNumber: { type: String, default: '' },
        passingYear: { type: Number, default: null },
        totalMarks: { type: Number, default: 0 },
        maxMarks: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        subjects: Array,
      },
      class12: {
        backlogs: { type: Number, min: 0, validate: Number.isInteger },
        board: { type: String, default: '' },
        schoolName: { type: String, default: '' },
        rollNumber: { type: String, default: '' },
        passingYear: { type: Number, default: null },
        stream: { type: String, default: '' },
        totalMarks: { type: Number, default: 0 },
        maxMarks: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        subjects: Array,
      },
      fieldMeta: { type: Object, default: {} },
      discrepancies: [
        {
          field: String,
          enteredValue: String,
          importedValue: String,
          source: String,
          resolved: { type: Boolean, default: false },
        },
      ],
    },
    eligibilityEvaluation: {
      isEligible: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['Not Checked', 'Incomplete', 'Eligible', 'Not Eligible'],
        default: 'Not Checked',
      },
      evaluatedAt: { type: Date, default: null },
      rulesPassed: [String],
      rulesFailed: [String],
      scoreCalculated: { type: Number, default: 0 },
      remarks: { type: String, default: '' },
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    officerRemarks: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    correctionRemarks: {
      type: String,
      default: '',
    },
    meritRank: {
      type: Number,
      default: null,
    },
    statusHistory: [applicationStatusHistorySchema],
    submittedAt: {
      type: Date,
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, optimisticConcurrency: true }
);

applicationSchema.index({ student: 1, createdAt: -1 });
applicationSchema.index({ student: 1, course: 1 });
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ documents: 1 });

export const Application = mongoose.model('Application', applicationSchema);
