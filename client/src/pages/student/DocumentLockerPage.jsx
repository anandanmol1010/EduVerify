import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import DigiLockerModal from '../../components/DigiLockerModal';
import DocumentStatusBadge from '../../components/DocumentStatusBadge';
import { mergeImportedDocuments } from '../../services/documentMapper';
import {
  FileText,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Cpu,
} from 'lucide-react';

export default function DocumentLockerPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDigiLockerOpen, setIsDigiLockerOpen] = useState(false);

  // Upload Form State
  const [docType, setDocType] = useState('class12_marksheet');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [candidateRoll, setCandidateRoll] = useState('');

  const fetchDocs = async () => {
    try {
      const res = await api.get('/documents/my-documents');
      if (res.success) setDocuments(res.documents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleManualUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a file to upload');

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      formData.append('title', title || file.name);
      formData.append('rollNumber', candidateRoll);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success) {
        if (res.mismatches?.length) setError(res.mismatches.join(' '));
        else setSuccess('Document uploaded and checked for readable details.');
        setFile(null);
        setTitle('');
        fetchDocs();
      }
    } catch (err) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      fetchDocs();
    } catch (err) {
      alert(err.message || 'Failed to remove document');
    }
  };

  return (
    <DashboardLayout roleTitle="STUDENT">
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
              My Academic Documents
            </h1>
            <p className="text-xs text-[#6B716C] mt-1">
              Upload academic certificates, view verification status, or import directly from the DigiLocker Demo repository.
            </p>
          </div>
          <button
            onClick={() => setIsDigiLockerOpen(true)}
            className="px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            Import via DigiLocker Demo
          </button>
        </div>

        {/* Upload Card */}
        <div className="bg-white p-6 rounded border border-[#DDDCD5] shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-sm text-[#252824] flex items-center">
            <Upload className="w-4 h-4 mr-2 text-[#254D3C]" />
            Manual Document Upload (with OCR text analysis)
          </h2>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" /> {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-[#2B6E4E] text-xs rounded flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" /> {success}
            </div>
          )}

          <form onSubmit={handleManualUpload} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Document Category</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              >
                <option value="class10_marksheet">Class 10th Marksheet</option>
                <option value="class12_marksheet">Class 12th Marksheet</option>
                <option value="passing_certificate">Passing Certificate</option>
                <option value="migration_certificate">Migration Certificate</option>
                <option value="transfer_certificate">Transfer Certificate</option>
                <option value="id_proof">Government ID / Aadhar</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Document Title / Description</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Secondary Marksheet"
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Expected Roll Number (for validation)</label>
              <input
                type="text"
                value={candidateRoll}
                onChange={(e) => setCandidateRoll(e.target.value)}
                placeholder="e.g. CBSE2024101"
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Choose File (PDF, PNG, JPG)</label>
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-xs"
              />
            </div>

            <div className="md:col-span-4 flex justify-end pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-[#254D3C] text-white font-semibold rounded hover:bg-[#1c3b2e] shadow-sm flex items-center"
              >
                {uploading ? 'Processing OCR...' : 'Upload & Analyze Document'}
                <Upload className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Existing Documents Table */}
        <div className="bg-white border border-[#DDDCD5] rounded-lg shadow-sm">
          <div className="p-4 border-b border-[#DDDCD5]">
            <h3 className="font-serif font-bold text-sm text-[#252824]">
              Stored Academic Credentials ({documents.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-[#6B716C]">Loading locker documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#6B716C]">
              No documents stored yet. Upload manually or import using DigiLocker.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F6F2] text-[#6B716C] font-semibold border-b border-[#DDDCD5]">
                  <tr>
                    <th className="py-2.5 px-4">Document Title</th>
                    <th className="py-2.5 px-4">Source</th>
                    <th className="py-2.5 px-4">Verification</th>
                    <th className="py-2.5 px-4">OCR Extracted Data</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEBE4]">
                  {documents.map((doc) => {
                    const ext = doc.extractedData;
                    return (
                      <tr key={doc._id} className="hover:bg-[#F7F6F2]/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#252824]">{doc.title}</div>
                          <div className="text-[10px] text-[#6B716C] uppercase">{doc.docType}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#DDDCD5] text-[#254D3C] font-medium">
                            {doc.source === 'DigiLocker Demo' ? (
                              <ShieldCheck className="w-3 h-3 mr-1 text-[#2B6E4E]" />
                            ) : (
                              <Upload className="w-3 h-3 mr-1 text-[#6B716C]" />
                            )}
                            {doc.source}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <DocumentStatusBadge document={doc} />
                        </td>
                        <td className="py-3 px-4">
                          {ext ? (
                            <div className="text-[11px] space-y-0.5">
                              {ext.candidateName && <div>Name: <span className="font-medium text-[#252824]">{ext.candidateName}</span></div>}
                              {ext.rollNumber && <div>Roll: <span className="font-mono text-[#254D3C]">{ext.rollNumber}</span></div>}
                              {ext.passingYear && <div>Year: {ext.passingYear} ({ext.board || 'State'})</div>}
                              {ext.isMismatched && (
                                <div className="text-[#9E2A2B] font-semibold flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Data discrepancy flagged
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#6B716C]">No extracted text</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <a
                            href={doc.filePath}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#254D3C] hover:underline font-semibold"
                          >
                            Preview
                          </a>
                          <button
                            onClick={() => handleDelete(doc._id)}
                            className="text-[#9E2A2B] hover:text-red-800"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DigiLockerModal
          isOpen={isDigiLockerOpen}
          onClose={() => setIsDigiLockerOpen(false)}
          onImportSuccess={({ importedDocuments }) => {
            setDocuments((current) => mergeImportedDocuments(current, importedDocuments));
          }}
        />
      </div>
    </DashboardLayout>
  );
}
