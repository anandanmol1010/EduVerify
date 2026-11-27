import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import DocumentStatusBadge from '../../components/DocumentStatusBadge';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Award,
  ShieldCheck,
} from 'lucide-react';

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchApp = async () => {
    try {
      const res = await api.get(`/applications/${id}`);
      if (res.success) setApplication(res.application);
    } catch (err) {
      setError(err.message || 'Failed to fetch application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApp();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-xs text-[#6B716C]">Loading application records...</div>
      </DashboardLayout>
    );
  }

  if (error || !application) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center bg-white border border-[#DDDCD5] rounded">
          <p className="text-xs text-[#9E2A2B]">{error || 'Application record not found.'}</p>
          <Link to="/student/applications" className="mt-3 inline-block text-xs text-[#254D3C] font-semibold underline">
            Return to My Applications
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const app = application;

  return (
    <DashboardLayout roleTitle="STUDENT">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Link
            to="/student/applications"
            className="text-xs font-semibold text-[#254D3C] hover:underline flex items-center"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Applications
          </Link>
          <StatusBadge status={app.status} />
        </div>

        {/* Header Block */}
        <div className="bg-white p-6 rounded border border-[#DDDCD5] shadow-sm flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-bold text-[#254D3C] block">
              {app.applicationNumber}
            </span>
            <h1 className="font-serif text-2xl font-bold text-[#252824] mt-1">
              {app.course?.title}
            </h1>
            <p className="text-xs text-[#6B716C] mt-0.5">
              Course Code: {app.course?.code} • Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Draft'}
            </p>
            {app.status === 'Accepted' && app.statusHistory?.at(-1)?.changedByRole === 'system' && (
              <p className="mt-2 text-xs font-semibold text-[#254D3C]">Automatically approved after academic and document verification.</p>
            )}
          </div>

          {(app.status === 'Accepted' || app.status === 'Admission Confirmed') && (
            <div className="flex items-center">
              <Link
                to="/student/letters"
                className="px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
              >
                <Award className="w-4 h-4 mr-1.5" />
                Download Admission Letter
              </Link>
            </div>
          )}

          {app.status === 'Draft' && (
            <div className="flex items-center">
              <Link
                to={`/student/applications/new?appId=${app._id}`}
                className="px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
              >
                Continue Editing Application
              </Link>
            </div>
          )}
        </div>

        {/* Correction Action Notice Banner if required */}
        {app.status === 'Correction Required' && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded text-xs space-y-2 text-orange-950">
            <div className="flex items-center font-bold">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-orange-800" />
              Document Scrutiny Feedback / Correction Requested
            </div>
            <p className="leading-relaxed">
              Remarks from Officer: <strong className="font-semibold text-orange-900">"{app.correctionRemarks}"</strong>
            </p>
            <div className="pt-2 flex gap-3">
              <Link
                to={`/student/applications/new?appId=${app._id}`}
                className="px-3 py-1.5 bg-white border border-orange-300 rounded font-semibold text-orange-900 hover:bg-orange-100"
              >
                Correct and review application
              </Link>
            </div>
          </div>
        )}

        {/* Eligibility Results Details */}
        <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-3">
          <h2 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
            Automated Academic Eligibility Evaluation
          </h2>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-semibold text-[#252824]">Status:</span>
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

          <p className="text-xs text-[#6B716C] leading-relaxed">
            {app.eligibilityEvaluation?.remarks}
          </p>

          {app.eligibilityEvaluation?.rulesPassed?.length > 0 && (
            <div className="text-xs text-[#252824]">
              <span className="font-semibold block mb-1">Satisfied Benchmarks:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[#6B716C]">
                {app.eligibilityEvaluation.rulesPassed.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Personal & Academic Profile Snapshot */}
        <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-4">
          <h2 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
            Submitted Profile & Academic Snapshot
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#F7F6F2] p-3 rounded border border-[#DDDCD5] space-y-1">
              <span className="font-bold text-[#254D3C] block mb-1">Personal Details</span>
              <div>Name: <strong>{app.personalSnapshot?.fullName || app.student?.name}</strong></div>
              <div>DOB: <strong>{app.personalSnapshot?.dob ? new Date(app.personalSnapshot.dob).toLocaleDateString() : 'N/A'}</strong></div>
              <div>Gender: <strong>{app.personalSnapshot?.gender || 'N/A'}</strong> • Category: <strong>{app.personalSnapshot?.category || 'General'}</strong></div>
              <div>Parents: <strong>F: {app.personalSnapshot?.fatherName || 'N/A'} • M: {app.personalSnapshot?.motherName || 'N/A'}</strong></div>
              <div>Address: <span className="text-[#6B716C]">{app.personalSnapshot?.permanentAddress?.city ? `${app.personalSnapshot.permanentAddress.city}, ${app.personalSnapshot.permanentAddress.state}` : 'N/A'}</span></div>
            </div>

            <div className="bg-[#F7F6F2] p-3 rounded border border-[#DDDCD5] space-y-1">
              <span className="font-bold text-[#254D3C] block mb-1">Academic Records</span>
              <div>Class 10: <strong>{app.academicSnapshot?.class10?.percentage || 0}%</strong> ({app.academicSnapshot?.class10?.board || 'N/A'}, {app.academicSnapshot?.class10?.passingYear || 'N/A'})</div>
              <div className="text-[11px] text-[#6B716C]">School: {app.academicSnapshot?.class10?.schoolName || 'Not recorded'}</div>
              <div>Class 12: <strong>{app.academicSnapshot?.class12?.percentage || 0}%</strong> ({app.academicSnapshot?.class12?.board || 'N/A'}, {app.academicSnapshot?.class12?.passingYear || 'N/A'})</div>
              <div className="text-[11px] text-[#6B716C]">School: {app.academicSnapshot?.class12?.schoolName || 'Not recorded'}</div>
            </div>
          </div>
        </div>

        {/* Attached Documents */}
        <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-3">
          <h2 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
            Attached Academic Credentials ({app.documents?.length || 0})
          </h2>

          <div className="space-y-2">
            {app.documents?.map((doc) => (
              <div
                key={doc._id}
                className="p-3 bg-[#F7F6F2] border border-[#DDDCD5] rounded flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-[#252824]">{doc.title}</div>
                  <div className="text-[10px] text-[#6B716C]">
                    Source: {doc.source} • Status: <DocumentStatusBadge document={doc} />
                  </div>
                </div>
                <a
                  href={doc.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#254D3C] font-semibold hover:underline"
                >
                  View Document
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Status History Timeline */}
        <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-4">
          <h2 className="font-serif font-bold text-sm text-[#252824] border-b border-[#ECEBE4] pb-2">
            Application Status History & Audit Trail
          </h2>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDDCD5]">
            {app.statusHistory?.map((h, i) => (
              <div key={i} className="relative text-xs">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#254D3C] ring-4 ring-white"></span>
                <div className="font-bold text-[#252824]">{h.status}</div>
                <div className="text-[10px] text-[#6B716C]">
                  {new Date(h.timestamp).toLocaleString()} • Action by: {h.changedBy?.name || h.changedByRole}
                </div>
                {h.remarks && (
                  <p className="mt-1 text-[#6B716C] bg-[#F7F6F2] p-2 rounded border border-[#DDDCD5]">
                    "{h.remarks}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
