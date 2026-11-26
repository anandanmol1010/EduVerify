import { MockStudentRecord } from '../models/MockStudentRecord.js';
import { Document } from '../models/Document.js';
import { logAudit } from '../utils/auditLogger.js';

class MockDigiLockerProvider {
  /**
   * Search demo repository by roll number, board, and passing year
   */
  async searchRecords({ rollNumber, board, passingYear }) {
    const query = {
      rollNumber: new RegExp(`^${rollNumber.trim()}$`, 'i'),
    };

    if (board) {
      query.board = board;
    }
    if (passingYear) {
      query.passingYear = Number(passingYear);
    }

    const record = await MockStudentRecord.findOne(query);
    return record;
  }

  /**
   * Retrieve list of demo records for presentation/inspection
   */
  async listDemoCandidates() {
    return await MockStudentRecord.find(
      {},
      'referenceId fullName rollNumber board passingYear class12.percentage class12.stream availableDocuments demoScenario'
    ).sort({ passingYear: -1 });
  }

  /**
   * Pull and attach documents to a user application
   */
  async importSelectedDocuments({ user, application, recordId, selectedDocTypes }) {
    const record = await MockStudentRecord.findById(recordId);
    if (!record) {
      throw new Error('DigiLocker Demo Record not found');
    }

    const createdDocs = [];

    for (const docMeta of record.availableDocuments) {
      if (selectedDocTypes && !selectedDocTypes.includes(docMeta.docType)) {
        continue;
      }

      // Check if doc already imported/uploaded for this application
      let existingDoc = null;
      if (application) {
        existingDoc = await Document.findOne({
          application: application._id,
          docType: docMeta.docType,
        });
      } else {
        existingDoc = await Document.findOne({
          student: user._id,
          application: null,
          docType: docMeta.docType,
        });
      }

      if (existingDoc) {
        // Replace existing document record and reset verification status to Pending Verification
        existingDoc.title = `${docMeta.title} (DigiLocker Demo Archive)`;
        existingDoc.source = 'DigiLocker Demo';
        existingDoc.filePath = docMeta.fileUrl;
        existingDoc.fileType = 'application/pdf';
        existingDoc.fileSize = 124500;
        existingDoc.verificationStatus = 'Pending Verification';
        existingDoc.verifiedBy = null;
        existingDoc.verifiedAt = null;
        existingDoc.verificationRemarks = '';
        existingDoc.extractedData = {
          candidateName: record.fullName,
          rollNumber: record.rollNumber,
          board: record.board,
          passingYear: String(record.passingYear),
          percentage: String(record.class12?.percentage || record.class10?.percentage || ''),
          confidenceScore: 98,
          isMismatched: false,
          mismatchDetails: [],
        };
        await existingDoc.save();
        createdDocs.push(existingDoc);
      } else {
        // Create new document with explicit status: Pending Verification
        const newDoc = await Document.create({
          student: user._id,
          application: application ? application._id : null,
          docType: docMeta.docType,
          title: `${docMeta.title} (DigiLocker Demo Archive)`,
          source: 'DigiLocker Demo',
          filePath: docMeta.fileUrl,
          fileType: 'application/pdf',
          fileSize: 124500,
          verificationStatus: 'Pending Verification',
          extractedData: {
            candidateName: record.fullName,
            rollNumber: record.rollNumber,
            board: record.board,
            passingYear: String(record.passingYear),
            percentage: String(record.class12?.percentage || record.class10?.percentage || ''),
            confidenceScore: 98,
            isMismatched: false,
            mismatchDetails: [],
          },
        });
        createdDocs.push(newDoc);
      }
    }

    return {
      record,
      importedDocuments: createdDocs,
    };
  }
}

export const digiLockerService = new MockDigiLockerProvider();
