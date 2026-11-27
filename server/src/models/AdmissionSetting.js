import mongoose from 'mongoose';
import { institution } from '../config/institution.js';

const admissionSettingSchema = new mongoose.Schema(
  {
    institutionName: {
      type: String,
      default: institution.name,
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
      default: institution.email,
    },
    contactPhone: {
      type: String,
      default: institution.phone,
    },
    termsAndConditions: {
      type: String,
      default: 'All admissions are subject to physical verification of original credentials.',
    },
  },
  { timestamps: true }
);

export const AdmissionSetting = mongoose.model('AdmissionSetting', admissionSettingSchema);
