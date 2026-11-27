import mongoose from 'mongoose';

const admissionSettingSchema = new mongoose.Schema(
  {
    institutionName: {
      type: String,
      default: 'St. Jude Institute of Higher Technology & Sciences',
    },
    academicYear: {
      type: String,
      default: '2026-2027',
    },
    admissionStartDate: {
      type: Date,
      default: () => new Date('2026-05-01'),
    },
    admissionEndDate: {
      type: Date,
      default: () => new Date('2026-12-31'),
    },
    isPortalOpen: {
      type: Boolean,
      default: true,
    },
    maxApplicationsPerStudent: {
      type: Number,
      default: 3,
      min: 0,
      validate: Number.isInteger,
    },
    supportEmail: {
      type: String,
      default: 'admissions@eduverify.ac.in',
    },
    contactPhone: {
      type: String,
      default: '+91 80 2345 6789',
    },
    termsAndConditions: {
      type: String,
      default: 'All admissions are subject to physical verification of original credentials.',
    },
  },
  { timestamps: true }
);

export const AdmissionSetting = mongoose.model('AdmissionSetting', admissionSettingSchema);
