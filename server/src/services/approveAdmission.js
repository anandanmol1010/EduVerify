import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { AdmissionLetter } from '../models/AdmissionLetter.js';
import { Application } from '../models/Application.js';
import { Course } from '../models/Course.js';
import { Notification } from '../models/Notification.js';
import { generateAdmissionLetterPdf } from '../utils/admissionLetterGenerator.js';

export class AdmissionError extends Error {
  constructor(message, status = 422, evaluation) {
    super(message);
    this.status = status;
    this.evaluation = evaluation;
  }
}

export const runAdmissionTransaction = async (work) => {
  const session = await mongoose.startSession();
  const files = [];
  let fileToKeep;
  try {
    const result = await session.withTransaction(() => work(session, (file) => files.push(file)));
    fileToKeep = files.at(-1);
    return result;
  } catch (error) {
    if (error.hasErrorLabel?.('UnknownTransactionCommitResult')) fileToKeep = files.at(-1);
    throw error;
  } finally {
    await session.endSession();
    await Promise.all(files.filter((file) => file !== fileToKeep).map((file) => rm(file, { force: true }).catch(console.error)));
  }
};

export const approveAdmission = async ({ application, course, actor, automatic, remarks, session, trackFile }) => {
  const updatedCourse = await Course.findOneAndUpdate({
    _id: course._id,
    $expr: { $lt: ['$allocatedSeats', '$totalSeats'] },
    ...(automatic ? { status: 'open' } : {}),
  }, { $inc: { allocatedSeats: 1 } }, { session });
  if (!updatedCourse) throw new AdmissionError('This course has no available seats or has closed.');

  const now = new Date();
  application.status = 'Accepted';
  application.decidedAt = now;
  application.officerRemarks = remarks || (automatic
    ? 'Automatically approved after document and academic verification.'
    : 'All mandatory documents verified and criteria satisfied.');
  if (!automatic) application.assignedOfficer = actor._id;
  application.statusHistory.push({
    status: 'Accepted',
    changedBy: actor._id,
    changedByRole: automatic ? 'system' : actor.role,
    remarks: application.officerRemarks,
    timestamp: now,
  });
  await application.save({ session });

  const admissionId = `SJ-${now.getFullYear()}-ADM-${randomBytes(8).toString('hex').toUpperCase()}`;
  const verificationToken = randomBytes(32).toString('hex');
  const publicUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-admission/${admissionId}?token=${verificationToken}`;
  const filename = `admission-letter-${admissionId}.pdf`;
  const outputPath = path.join(process.cwd(), 'uploads', 'letters', filename);
  trackFile(outputPath);
  await generateAdmissionLetterPdf({
    admissionId, studentName: application.personalSnapshot?.fullName || actor.name,
    applicationNumber: application.applicationNumber, courseTitle: course.title, courseCode: course.code,
    departmentName: course.department, academicSession: '2026-2027', issueDate: now,
    verificationUrl: publicUrl, outputPath,
  });

  const admissionLetter = new AdmissionLetter({
    admissionId, application: application._id, student: application.student, course: course._id,
    issuedDate: now, pdfPath: `/uploads/letters/${filename}`, qrCodeData: publicUrl, verificationToken,
  });
  await admissionLetter.save({ session });
  await new Notification({
    recipient: application.student, title: 'Admission Approved',
    message: `Your admission to ${course.title} was ${automatic ? 'automatically ' : ''}approved. Your admission letter is ready.`,
    type: 'success', relatedApplication: application._id, link: '/student/letters',
  }).save({ session });
  return admissionLetter;
};
