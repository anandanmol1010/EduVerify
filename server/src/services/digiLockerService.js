import { MockStudentRecord } from '../models/MockStudentRecord.js';
import { Document } from '../models/Document.js';
import { documentScope } from './documentScope.js';

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
  async importSelectedDocuments({ user, application, workspaceId, recordId, selectedDocTypes, consented = false }) {
    const record = await MockStudentRecord.findById(recordId);
    if (!record) {
      throw new Error('DigiLocker Demo Record not found');
    }

    const createdDocs = [];
    const scope = documentScope({ applicationId: application?._id, workspaceId });

    for (const docMeta of record.availableDocuments) {
      if (selectedDocTypes && !selectedDocTypes.includes(docMeta.docType)) {
        continue;
      }

      const classRecord = docMeta.docType === 'class10_marksheet' ? record.class10 : record.class12;
      const extractedData = {
        candidateName: record.fullName,
        rollNumber: classRecord?.rollNumber || record.rollNumber,
        board: record.board,
        passingYear: String(classRecord?.passingYear || record.passingYear),
        percentage: String(classRecord?.percentage ?? ''),
        confidenceScore: 98,
      };
      const metadata = {
        title: `${docMeta.title} (DigiLocker Demo Archive)`,
        source: 'DigiLocker Demo',
        filePath: docMeta.fileUrl,
        fileType: 'application/pdf',
        fileSize: 124500,
        issuerRecord: consented ? record._id : null,
        verificationStatus: consented ? 'Verified' : 'Pending Verification',
        verifiedBy: null,
        verifiedAt: consented ? new Date() : null,
        verificationRemarks: consented ? 'Verified by the DigiLocker demo provider.' : '',
        extractedData,
      };

      const existingDoc = await Document.findOne({
        ...scope, student: user._id, docType: docMeta.docType,
      }).sort({ createdAt: -1 });

      if (existingDoc) {
        existingDoc.set(metadata);
        await existingDoc.save();
        createdDocs.push(existingDoc);
      } else {
        const newDoc = await Document.create({
          student: user._id,
          ...scope,
          docType: docMeta.docType,
          ...metadata,
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
