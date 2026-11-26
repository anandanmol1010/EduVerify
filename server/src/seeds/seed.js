import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { MockStudentRecord } from '../models/MockStudentRecord.js';
import { AdmissionSetting } from '../models/AdmissionSetting.js';
import { mockCandidatesSeedData } from './mockData.js';
import { generateSamplePdf } from '../utils/pdfGenerator.js';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Starting simplified database seeding process...');

    // 1. Create Default Admission Settings
    await AdmissionSetting.deleteMany({});
    await AdmissionSetting.create({
      institutionName: 'St. Jude Institute of Higher Technology & Sciences',
      academicYear: '2026-2027',
      admissionStartDate: new Date('2026-04-01'),
      admissionEndDate: new Date('2026-11-30'),
      isPortalOpen: true,
      maxApplicationsPerStudent: 3,
      supportEmail: 'admissions@eduverify.ac.in',
      contactPhone: '+91 80 2345 6789',
    });
    console.log('[Seed] Default Admission Settings configured.');

    // 2. Clear and Create Users (2 Roles: Student and Admin)
    await User.deleteMany({});

    // Administrator (Combined Institutional & Scrutiny Authority)
    const adminUser = await User.create({
      name: 'Dr. Alistair Vance',
      email: 'admin@eduverify.ac.in',
      password: 'AdminPassword123!',
      role: 'admin',
      phone: '+91 98765 43210',
    });
    console.log('[Seed] Administrator account created: admin@eduverify.ac.in');

    // Demo Student User
    const studentUser = await User.create({
      name: 'Aarav Sharma',
      email: 'student@eduverify.ac.in',
      password: 'StudentPassword123!',
      role: 'student',
      phone: '+91 98112 33445',
    });
    console.log('[Seed] Demo student account created: student@eduverify.ac.in');

    // 3. Create Academic Courses with Embedded Department Names
    await Course.deleteMany({});
    const coursesData = [
      {
        title: 'B.Tech in Computer Science & Engineering',
        code: 'BTECH-CSE',
        department: 'Department of Computer Science & Engineering',
        level: 'Undergraduate',
        durationYears: 4,
        totalSeats: 60,
        allocatedSeats: 12,
        annualFee: 185000,
        description: 'Comprehensive program covering Algorithms, Distributed Systems, Machine Learning and Cloud Computing.',
        status: 'open',
        eligibilityCriteria: {
          minClass10Percentage: 60,
          minClass12Percentage: 65,
          requiredSubjects: [
            { subjectName: 'Mathematics', minMarks: 60, isMandatory: true },
            { subjectName: 'Physics', minMarks: 55, isMandatory: true },
            { subjectName: 'Chemistry', minMarks: 50, isMandatory: false },
          ],
          requiredDocuments: [
            { docType: 'aadhaar_card', docName: 'Aadhaar Demo Identity Document', isMandatory: true },
            { docType: 'class10_marksheet', docName: 'Class 10th Marksheet', isMandatory: true },
            { docType: 'class12_marksheet', docName: 'Class 12th Marksheet', isMandatory: true },
            { docType: 'passing_certificate', docName: 'Passing Certificate', isMandatory: true },
            { docType: 'student_photo', docName: 'Passport Photograph', isMandatory: false },
          ],
          specialInstructions: 'PCM combination in Class 12 is mandatory for engineering accreditation.',
        },
      },
      {
        title: 'B.Tech in Artificial Intelligence & Data Science',
        code: 'BTECH-AIDS',
        department: 'Department of Computer Science & Engineering',
        level: 'Undergraduate',
        durationYears: 4,
        totalSeats: 45,
        allocatedSeats: 8,
        annualFee: 195000,
        description: 'Specialized track in Neural Networks, Deep Learning, Statistical Modeling and Large Language Models.',
        status: 'open',
        eligibilityCriteria: {
          minClass10Percentage: 65,
          minClass12Percentage: 70,
          requiredSubjects: [
            { subjectName: 'Mathematics', minMarks: 65, isMandatory: true },
            { subjectName: 'Physics', minMarks: 60, isMandatory: true },
          ],
          requiredDocuments: [
            { docType: 'aadhaar_card', docName: 'Aadhaar Demo Identity Document', isMandatory: true },
            { docType: 'class10_marksheet', docName: 'Class 10th Marksheet', isMandatory: true },
            { docType: 'class12_marksheet', docName: 'Class 12th Marksheet', isMandatory: true },
          ],
        },
      },
      {
        title: 'B.Tech in Electronics & Communication',
        code: 'BTECH-ECE',
        department: 'Department of Electronics & Communication',
        level: 'Undergraduate',
        durationYears: 4,
        totalSeats: 50,
        allocatedSeats: 6,
        annualFee: 165000,
        description: 'State of the art coursework in semiconductor physics, IoT, 5G wireless networks, and robotics.',
        status: 'open',
        eligibilityCriteria: {
          minClass10Percentage: 55,
          minClass12Percentage: 60,
          requiredSubjects: [
            { subjectName: 'Mathematics', minMarks: 50, isMandatory: true },
            { subjectName: 'Physics', minMarks: 50, isMandatory: true },
          ],
          requiredDocuments: [
            { docType: 'aadhaar_card', docName: 'Aadhaar Demo Identity Document', isMandatory: true },
            { docType: 'class10_marksheet', docName: 'Class 10th Marksheet', isMandatory: true },
            { docType: 'class12_marksheet', docName: 'Class 12th Marksheet', isMandatory: true },
          ],
        },
      },
      {
        title: 'Bachelor of Business Administration (BBA Honours)',
        code: 'BBA-HONS',
        department: 'Department of Management Studies',
        level: 'Undergraduate',
        durationYears: 3,
        totalSeats: 80,
        allocatedSeats: 22,
        annualFee: 130000,
        description: 'Modern business administration, corporate finance, digital marketing, and entrepreneurship.',
        status: 'open',
        eligibilityCriteria: {
          minClass10Percentage: 50,
          minClass12Percentage: 55,
          requiredSubjects: [
            { subjectName: 'English', minMarks: 50, isMandatory: true },
          ],
          requiredDocuments: [
            { docType: 'aadhaar_card', docName: 'Aadhaar Demo Identity Document', isMandatory: true },
            { docType: 'class10_marksheet', docName: 'Class 10th Marksheet', isMandatory: true },
            { docType: 'class12_marksheet', docName: 'Class 12th Marksheet', isMandatory: true },
          ],
        },
      },
      {
        title: 'B.Sc in Biotechnology & Bioinformatics',
        code: 'BSC-BIOTECH',
        department: 'Department of Applied Sciences & Biotechnology',
        level: 'Undergraduate',
        durationYears: 3,
        totalSeats: 40,
        allocatedSeats: 5,
        annualFee: 110000,
        description: 'Genomics, computational biology, recombinant DNA technology and pharmaceutical biotechnology.',
        status: 'open',
        eligibilityCriteria: {
          minClass10Percentage: 55,
          minClass12Percentage: 60,
          requiredSubjects: [
            { subjectName: 'Biology', minMarks: 55, isMandatory: false },
            { subjectName: 'Chemistry', minMarks: 55, isMandatory: true },
          ],
          requiredDocuments: [
            { docType: 'aadhaar_card', docName: 'Aadhaar Demo Identity Document', isMandatory: true },
            { docType: 'class10_marksheet', docName: 'Class 10th Marksheet', isMandatory: true },
            { docType: 'class12_marksheet', docName: 'Class 12th Marksheet', isMandatory: true },
          ],
        },
      },
    ];

    await Course.insertMany(coursesData);
    console.log('[Seed] 5 Academic Courses configured.');
    console.log('[Seed] 5 Academic Courses configured.');

    // 4. Generate Mock PDF Files & Seed MockStudentRecord Collection
    await MockStudentRecord.deleteMany({});
    const uploadsDir = path.join(process.cwd(), 'uploads', 'mock_documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    console.log(`[Seed] Generating PDF credentials for ${mockCandidatesSeedData.length} mock candidate profiles...`);

    for (let i = 0; i < mockCandidatesSeedData.length; i++) {
      const cand = mockCandidatesSeedData[i];
      const demoAccountId = cand.demoAccountId || `DEMO-${String(i + 1).padStart(3, '0')}`;
      const generatedDocs = [];

      for (const docType of cand.docsToGenerate) {
        const fileName = `${cand.rollNumber}_${docType}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        const webUrl = `/uploads/mock_documents/${fileName}`;

        let title = '';
        let marks = null;
        let total = cand.class12.totalMarks;
        let pct = cand.class12.percentage;

        if (docType === 'aadhaar_card') {
          title = 'Fictional Demo Identity Document (Simulated UID)';
        } else if (docType === 'class10_marksheet') {
          title = 'Secondary School Examination (Class X) Certificate & Marksheet';
          marks = cand.class10.subjects;
          total = cand.class10.totalMarks;
          pct = cand.class10.percentage;
        } else if (docType === 'class12_marksheet') {
          title = 'Senior School Certificate Examination (Class XII) Marksheet';
          marks = cand.class12.subjects;
          total = cand.class12.totalMarks;
          pct = cand.class12.percentage;
        } else if (docType === 'passing_certificate') {
          title = 'Official Senior Secondary School Passing Certificate';
        } else if (docType === 'migration_certificate') {
          title = 'Formal Board Migration Certificate';
        } else if (docType === 'transfer_certificate') {
          title = 'Institutional Transfer & Character Certificate';
        }

        // Generate the PDF file
        await generateSamplePdf({
          title,
          candidateName: cand.fullName,
          rollNumber: cand.rollNumber,
          board: cand.board,
          passingYear: cand.passingYear,
          marksList: marks,
          totalMarks: total,
          percentage: pct,
          docType,
          outputPath: filePath,
          extraMeta: {
            dob: cand.dob,
            gender: cand.gender,
            address: cand.permanentAddress,
          },
        });

        generatedDocs.push({
          docType,
          title,
          fileUrl: webUrl,
          issueDate: `15-June-${cand.passingYear}`,
          issuerAuthority: `${cand.board} Regional Office`,
        });
      }

      await MockStudentRecord.create({
        referenceId: cand.referenceId,
        demoAccountId,
        demoMobile: cand.demoMobile || '0000000001',
        fullName: cand.fullName,
        dob: cand.dob,
        gender: cand.gender,
        fatherName: cand.fatherName || 'Rajesh Sharma',
        motherName: cand.motherName || 'Sunita Sharma',
        nationality: cand.nationality || 'Indian',
        category: cand.category || 'General',
        permanentAddress: cand.permanentAddress || {
          street: '12 Green Park Extension',
          city: 'New Delhi',
          district: 'South Delhi',
          state: 'Delhi',
          pincode: '110016',
          country: 'India',
        },
        rollNumber: cand.rollNumber,
        board: cand.board,
        passingYear: cand.passingYear,
        class10: cand.class10,
        class12: cand.class12,
        availableDocuments: generatedDocs,
        demoScenario: cand.demoScenario,
      });
    }

    console.log(`[Seed] Seeded ${mockCandidatesSeedData.length} DigiLocker Demo Student Records with generated PDFs.`);
    console.log('[Seed] Seeding completed successfully!');
  } catch (error) {
    console.error('[Seed Error]:', error);
  }
};

// If run directly: node src/seeds/seed.js
if (process.argv[1] && process.argv[1].includes('seed.js')) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await disconnectDB();
    process.exit(0);
  })();
}
