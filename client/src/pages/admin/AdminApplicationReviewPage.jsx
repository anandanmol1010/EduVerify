import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import DocumentStatusBadge from '../../components/DocumentStatusBadge';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ExternalLink,
  ShieldCheck,
  Award,
  ArrowLeft,
  Check,
  RefreshCw,
} from 'lucide-react';

export default function AdminApplicationReviewPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/applications/${id}`);
      if (res.success) {
        setApplication(res.application);
      }
    } catch (err) {
      setError(err.message || 'Error loading application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  // Handle Individual Document Verification
  const handleVerifyDoc = async (docId, newStatus) => {
    const inputRemarks = prompt(`Enter remarks for setting document to "${newStatus}":`, '');
    if (inputRemarks === null) return;

    try {
      const res = await api.patch(`/documents/${docId}/verify`, {
        status: newStatus,
        remarks: inputRemarks,
      });

      if (res.success) {
        fetchApplication();
      }
    } catch (err) {
      alert(err.message || 'Error updating document status');
    }
  };

  // Handle Application Level Decision (Reject or Request Correction)
  const handleAppDecision = async (action) => {
    if (!remarks) {
      return alert(`Please provide remarks/justification for ${action}`);
    }

    if (!window.confirm(`Are you sure you want to perform action: ${action}?`)) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.patch(`/applications/${id}/decision`, {
        action,
        remarks,
      });

      if (res.success) {
        setSuccess(`Application status successfully updated to: ${res.application.status}`);
        setRemarks('');
        fetchApplication();
      }
    } catch (err) {
      setError(err.message || 'Error processing application action');
    } finally {
      setActionLoading(false);
    }
  };

  // Final Formal Admission Approval
  const handleFinalApproval = async () => {
    if (!window.confirm('Accept this application, allocate an admission seat, and generate the official Admission Letter?')) return;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/applications/${id}/accept`, {
        remarks: remarks || 'All mandatory documents verified and criteria satisfied.',
      });

      if (res.success) {
        setSuccess('Application accepted! Admission confirmed, seat allocated, and letter generated.');
        fetchApplication();
      }
    } catch (err) {
      setError(err.message || 'Failed to accept application.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout roleTitle="ADMINISTRATOR">
        <div className="text-center py-16 text-xs text-[#6B716C]">Loading application file...</div>
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout roleTitle="ADMINISTRATOR">
        <div className="p-8 text-center bg-white border border-[#DDDCD5] rounded">
          <p className="text-xs text-[#9E2A2B]">{error || 'Application not found'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const app = application;
  const course = app.course;
  const docs = app.documents || [];
  const reqDocConfigs = course?.eligibilityCriteria?.requiredDocuments || [];

  // Evaluate conditions for Final Acceptance button
  const missingMandatoryDocs = reqDocConfigs.filter(
    (rd) => rd.isMandatory && !docs.some((d) => d.docType === rd.docType)
  );

  const unverifiedMandatoryDocs = docs.filter((d) => {
    const isMandatory = reqDocConfigs.some((rd) => rd.docType === d.docType && rd.isMandatory);
    return isMandatory && d.verificationStatus !== 'Verified';
  });

  const unresolvedDiscrepancies = docs.filter(
    (d) => d.extractedData?.isMismatched && d.verificationStatus !== 'Verified'
  );

  const isEligible = app.eligibilityEvaluation?.isEligible;
  const hasAvailableSeats = (course?.totalSeats - course?.allocatedSeats) > 0;

  const canAccept =
    ['Submitted', 'Pending Verification', 'Resubmitted'].includes(app.status) &&
    isEligible &&
    missingMandatoryDocs.length === 0 &&
    unverifiedMandatoryDocs.length === 0 &&
    unresolvedDiscrepancies.length === 0 &&
    hasAvailableSeats;

  return (
    <DashboardLayout roleTitle="ADMINISTRATOR">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/applications"
            className="text-xs font-semibold text-[#254D3C] hover:underline flex items-center"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Applications List
          </Link>
          <StatusBadge status={app.status} />
        </div>

        {/* Header Summary */}
        <div className="bg-white p-6 rounded-lg border border-[#DDDCD5] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-[#254D3C] bg-[#F7F6F2] px-2.5 py-0.5 rounded border border-[#DDDCD5]">
                {app.applicationNumber}
              </span>
              <span className="text-xs font-semibold text-[#6B716C]">
                {course?.code} — {course?.title}
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#252824] mt-1">
              {app.personalSnapshot?.fullName || app.student?.name}
            </h1>
            <p className="text-xs text-[#6B716C]">
              Email: {app.personalSnapshot?.email || app.student?.email} • Phone: {app.personalSnapshot?.phone || app.student?.phone || 'Not provided'}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {app.status === 'Accepted' ? (
              <span className="inline-flex items-center text-xs font-bold text-[#2B6E4E] bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Admission Accepted & Seat Allotted
              </span>
            ) : (
              <button
                onClick={handleFinalApproval}
                disabled={!canAccept || actionLoading}
                className="px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                title={!canAccept ? 'All mandatory documents must be individually verified and criteria met before accepting' : ''}
              >
                <Award className="w-4 h-4 mr-1.5" />
                {actionLoading ? 'Processing...' : 'Accept Application (Final Approval)'}
              </button>
            )}
          </div>
        </div>

        {/* Action Messages */}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#2B6E4E] text-xs rounded flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2" /> {success}
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" /> {error}
          </div>
        )}

        {/* Final Approval Prerequisites Warning Box (if not ready) */}
        {app.status !== 'Accepted' && !canAccept && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-950 rounded text-xs space-y-1">
            <strong className="font-semibold block text-amber-900">
              Prerequisites for Final Admission Approval:
            </strong>
            <ul className="list-disc list-inside space-y-0.5 text-[#6B716C]">
              {missingMandatoryDocs.length > 0 && (
                <li className="text-rose-900">Missing mandatory documents: {missingMandatoryDocs.map((m) => m.docName).join(', ')}</li>
              )}
              {unverifiedMandatoryDocs.length > 0 && (
                <li className="text-amber-900">Mandatory documents awaiting verification: {unverifiedMandatoryDocs.map((d) => d.title).join(', ')}</li>
              )}
              {!isEligible && (
                <li className="text-rose-900">Candidate does not satisfy academic eligibility criteria.</li>
              )}
              {unresolvedDiscrepancies.length > 0 && (
                <li className="text-amber-900">Unresolved discrepancies on submitted certificates.</li>
              )}
              {!hasAvailableSeats && (
                <li className="text-rose-900">Course seat capacity has been exhausted.</li>
              )}
            </ul>
          </div>
        )}

        {/* 2-Column Review Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Academic Record & Eligibility Audit */}
          <div className="space-y-6">
            {/* Candidate Demographic & Personal Profile */}
            <div className="bg-white p-5 rounded border border-[#DDDCD5] space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
                Candidate Personal & Demographic Profile
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>DOB: <strong>{app.personalSnapshot?.dob ? new Date(app.personalSnapshot.dob).toLocaleDateString() : 'N/A'}</strong></div>
                <div>Gender: <strong>{app.personalSnapshot?.gender || 'N/A'}</strong></div>
                <div>Category: <strong>{app.personalSnapshot?.category || 'General'}</strong> {app.personalSnapshot?.categoryCertificateNumber && <span className="text-[10px] text-[#6B716C]">({app.personalSnapshot.categoryCertificateNumber})</span>}</div>
                <div>Nationality: <strong>{app.personalSnapshot?.nationality || 'Indian'}</strong></div>
                <div>Father: <strong>{app.personalSnapshot?.fatherName || 'N/A'}</strong></div>
                <div>Mother: <strong>{app.personalSnapshot?.motherName || 'N/A'}</strong></div>
                {app.personalSnapshot?.hasDisability && (
                  <div className="col-span-2 text-rose-900 bg-rose-50 p-1.5 rounded border border-rose-200">
                    PwD Candidate: {app.personalSnapshot.disabilityDetails} (Cert: {app.personalSnapshot.disabilityCertificateNumber})
                  </div>
                )}
                {app.personalSnapshot?.hasGuardian && (
                  <div className="col-span-2 text-[#6B716C]">
                    Guardian: <strong>{app.personalSnapshot.guardianName}</strong> ({app.personalSnapshot.guardianRelationship}) • {app.personalSnapshot.guardianPhone}
                  </div>
                )}
                <div className="col-span-2 text-[11px] text-[#6B716C] pt-1 border-t border-[#ECEBE4]">
                  Address: {app.personalSnapshot?.permanentAddress ? `${app.personalSnapshot.permanentAddress.street}, ${app.personalSnapshot.permanentAddress.city}, ${app.personalSnapshot.permanentAddress.district}, ${app.personalSnapshot.permanentAddress.state} - ${app.personalSnapshot.permanentAddress.pincode}` : 'N/A'}
                </div>
              </div>

              {app.academicSnapshot?.discrepancies?.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs space-y-1.5">
                  <span className="font-bold text-amber-900 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-700" />
                    Applicant Discrepancy Scrutiny Notice
                  </span>
                  <p className="text-[11px] text-[#6B716C]">
                    The applicant resolved the following demographic differences during DigiLocker import:
                  </p>
                  <div className="space-y-1">
                    {app.academicSnapshot.discrepancies.map((disc, idx) => (
                      <div key={idx} className="text-[11px] bg-white p-1.5 rounded border border-amber-200">
                        <strong>{disc.label || disc.field}:</strong> User entered <em>"{disc.userValue}"</em> vs DigiLocker <em>"{disc.importedValue}"</em> → Chosen: <strong>"{disc.chosenValue}"</strong> ({disc.resolvedSource})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded border border-[#DDDCD5] space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
                Candidate Academic Details
              </h3>

              <div className="text-xs space-y-2">
                <div className="bg-[#F7F6F2] p-2.5 rounded border border-[#DDDCD5]">
                  <span className="font-bold text-[#254D3C] block">Class 10th Record</span>
                  <div className="grid grid-cols-2 gap-1 mt-1 text-[#6B716C]">
                    <div>Board: <strong className="text-[#252824]">{app.academicSnapshot?.class10?.board || 'Manual Entry'}</strong></div>
                    <div>Roll: <strong className="text-[#252824]">{app.academicSnapshot?.class10?.rollNumber || 'N/A'}</strong></div>
                    <div>Year: <strong className="text-[#252824]">{app.academicSnapshot?.class10?.passingYear || 'N/A'}</strong></div>
                    <div>Percentage: <strong className="text-[#254D3C]">{app.academicSnapshot?.class10?.percentage || 0}%</strong></div>
                    <div className="col-span-2">School: <strong className="text-[#252824]">{app.academicSnapshot?.class10?.schoolName || 'Not recorded'}</strong></div>
                  </div>
                </div>

                <div className="bg-[#F7F6F2] p-2.5 rounded border border-[#DDDCD5]">
                  <span className="font-bold text-[#254D3C] block">Class 12th Record</span>
                  <div className="grid grid-cols-2 gap-1 mt-1 text-[#6B716C]">
                    <div>Board: <strong className="text-[#252824]">{app.academicSnapshot?.class12?.board || 'Manual Entry'}</strong></div>
                    <div>Roll: <strong className="text-[#252824]">{app.academicSnapshot?.class12?.rollNumber || 'N/A'}</strong></div>
                    <div>Year: <strong className="text-[#252824]">{app.academicSnapshot?.class12?.passingYear || 'N/A'}</strong></div>
                    <div>Percentage: <strong className="text-[#254D3C]">{app.academicSnapshot?.class12?.percentage || 0}%</strong></div>
                    <div className="col-span-2">School: <strong className="text-[#252824]">{app.academicSnapshot?.class12?.schoolName || 'Not recorded'}</strong></div>
                  </div>

                  {app.academicSnapshot?.class12?.subjects?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#DDDCD5]">
                      <span className="font-semibold block text-[11px] text-[#252824] mb-1">Subject Breakdown:</span>
                      <div className="space-y-1">
                        {app.academicSnapshot.class12.subjects.map((s, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span>{s.subjectName || `Subject ${idx + 1}`}</span>
                            <span className="font-mono font-semibold">{s.marksObtained} / {s.maxMarks || 100}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Eligibility Check Results */}
            <div className="bg-white p-5 rounded border border-[#DDDCD5] space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
                Eligibility Evaluation Result
              </h3>

              <div className="flex items-center space-x-2 text-xs">
                <span className="font-semibold">Verdict:</span>
                {app.eligibilityEvaluation?.status === 'Incomplete' ? (
                  <span className="text-amber-900 font-bold flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-700" /> Information Incomplete
                  </span>
                ) : app.eligibilityEvaluation?.isEligible ? (
                  <span className="text-[#2B6E4E] font-bold flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Eligible (Score: {app.eligibilityEvaluation.scoreCalculated})
                  </span>
                ) : (
                  <span className="text-[#9E2A2B] font-bold flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Requirements Incomplete / Ineligible
                  </span>
                )}
              </div>

              <p className="text-xs text-[#6B716C]">{app.eligibilityEvaluation?.remarks}</p>

              {app.eligibilityEvaluation?.rulesPassed?.length > 0 && (
                <div className="text-xs">
                  <span className="font-semibold text-[#252824] block mb-1">Passed Conditions:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[#6B716C]">
                    {app.eligibilityEvaluation.rulesPassed.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {app.eligibilityEvaluation?.rulesFailed?.length > 0 && (
                <div className="text-xs text-[#9E2A2B]">
                  <span className="font-semibold block mb-1">Failed / Missing Conditions:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {app.eligibilityEvaluation.rulesFailed.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Individual Document Verification & Decision */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded border border-[#DDDCD5] space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
                Submitted Documents Checklist ({docs.length})
              </h3>

              <div className="space-y-3">
                {docs.length === 0 ? (
                  <div className="text-xs text-[#6B716C]">No documents attached to this application file.</div>
                ) : (
                  docs.map((doc) => (
                    <div
                      key={doc._id}
                      className="p-3 border border-[#DDDCD5] rounded bg-[#F7F6F2] space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-[#252824]">{doc.title}</div>
                          <div className="text-[10px] text-[#6B716C]">
                            Source: <strong>{doc.source}</strong> • Type: {doc.docType}
                          </div>
                        </div>
                        <DocumentStatusBadge document={doc} />
                      </div>

                      {doc.extractedData?.candidateName && (
                        <div className="bg-white p-2 rounded border border-[#DDDCD5] text-[11px] space-y-0.5">
                          <span className="font-semibold block text-[#254D3C]">Extracted Document Details:</span>
                          <div>Name: {doc.extractedData.candidateName} | Roll: {doc.extractedData.rollNumber}</div>
                          <div>Year: {doc.extractedData.passingYear} | Board: {doc.extractedData.board}</div>
                        </div>
                      )}

                      {doc.verificationRemarks && (
                        <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                          Verification Remark: "{doc.verificationRemarks}"
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-[#DDDCD5]/60">
                        <a
                          href={doc.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#254D3C] font-semibold hover:underline flex items-center text-[11px]"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" /> Open File Preview
                        </a>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleVerifyDoc(doc._id, 'Verified')}
                            className="px-2 py-1 bg-[#254D3C] text-white rounded font-semibold text-[10px] hover:bg-[#1c3b2e]"
                          >
                            Mark Verified
                          </button>
                          <button
                            onClick={() => handleVerifyDoc(doc._id, 'Correction Required')}
                            className="px-2 py-1 bg-amber-700 text-white rounded font-semibold text-[10px] hover:bg-amber-800"
                          >
                            Request Correction
                          </button>
                          <button
                            onClick={() => handleVerifyDoc(doc._id, 'Rejected')}
                            className="px-2 py-1 bg-[#9E2A2B] text-white rounded font-semibold text-[10px] hover:bg-red-800"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Application Level Action Box */}
            <div className="bg-white p-5 rounded border border-[#DDDCD5] space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
                Scrutiny Action & Decisions
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#252824] mb-1">
                  Officer Remarks / Reason for Decision
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter specific feedback for correction request or rejection reason..."
                  className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                ></textarea>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => handleAppDecision('request_correction')}
                  disabled={actionLoading || app.status === 'Accepted'}
                  className="px-3.5 py-2 bg-amber-800 text-white text-xs font-semibold rounded hover:bg-amber-900 shadow-sm disabled:opacity-40"
                >
                  Request Application Correction
                </button>
                <button
                  onClick={() => handleAppDecision('reject')}
                  disabled={actionLoading || app.status === 'Accepted'}
                  className="px-3.5 py-2 bg-[#9E2A2B] text-white text-xs font-semibold rounded hover:bg-red-900 shadow-sm disabled:opacity-40"
                >
                  Reject Application
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
