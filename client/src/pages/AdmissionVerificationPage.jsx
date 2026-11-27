import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle2, XCircle, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AdmissionVerificationPage() {
  const { admissionId: paramAdmissionId } = useParams();
  const [searchParams] = useSearchParams();

  const [inputAdmissionId, setInputAdmissionId] = useState(paramAdmissionId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const performVerification = async (idToVerify) => {
    if (!idToVerify) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.get(`/letters/public-verify/${idToVerify.trim()}`);
      if (res.success && res.isValid) {
        setResult(res.verificationData);
      } else {
        setError(res.message || 'Admission reference could not be verified.');
      }
    } catch (err) {
      setError(err.message || 'Invalid, expired, or unrecognised admission reference number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramAdmissionId) {
      performVerification(paramAdmissionId);
    }
  }, [paramAdmissionId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performVerification(inputAdmissionId);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border border-[#DDDCD5] rounded-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded bg-[#254D3C]/10 text-[#254D3C] flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
            Verify Admission Letter
          </h1>
          <p className="text-xs text-[#6B716C] mt-1 max-w-md mx-auto">
            Scan the QR code on an issued admission letter or enter the Admission Reference Number below to verify whether an admission is authentic and confirmed.
          </p>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-2 mb-8">
          <input
            type="text"
            required
            value={inputAdmissionId}
            onChange={(e) => setInputAdmissionId(e.target.value)}
            placeholder="Enter admission reference number"
            className="flex-1 text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] font-mono focus:outline-none focus:border-[#254D3C]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] transition"
          >
            {loading ? 'Verifying...' : 'Verify Status'}
          </button>
        </form>

        {/* Verification Result Display */}
        {result && (
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3 text-[#2B6E4E]">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <h2 className="font-serif font-bold text-base text-[#254D3C]">
                  Demo Admission Record Confirmed
                </h2>
                <p className="text-xs text-[#2B6E4E]">
                  This admission letter matches the record in EduVerify.
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6B716C] block text-[11px]">Admission Reference ID:</span>
                <span className="font-mono font-bold text-[#254D3C] text-sm">{result.admissionId}</span>
              </div>

              <div>
                <span className="text-[#6B716C] block text-[11px]">Student Name:</span>
                <span className="font-semibold text-[#252824]">{result.candidateNameMasked}</span>
                <span className="text-[10px] text-[#6B716C] block">(Masked for student privacy)</span>
              </div>

              <div>
                <span className="text-[#6B716C] block text-[11px]">Course Allotted:</span>
                <span className="font-semibold text-[#252824]">{result.courseAllotted} ({result.courseCode})</span>
              </div>

              <div>
                <span className="text-[#6B716C] block text-[11px]">Academic Session:</span>
                <span className="font-semibold text-[#252824]">{result.academicSession}</span>
              </div>

              <div>
                <span className="text-[#6B716C] block text-[11px]">Date of Confirmation:</span>
                <span className="font-semibold text-[#252824]">
                  {new Date(result.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span className="text-[#6B716C] block text-[11px]">Institution:</span>
                <span className="font-semibold text-[#252824]">{result.institution}</span>
              </div>
            </div>

            <div className="text-[11px] text-[#6B716C] pt-2 border-t border-emerald-100 flex items-center justify-between">
              <span>Verified in EduVerify</span>
              <span className="font-semibold text-[#2B6E4E]">Status: Confirmed & Active</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="border border-rose-200 bg-rose-50 rounded-lg p-6 text-center space-y-2">
            <XCircle className="w-8 h-8 text-[#9E2A2B] mx-auto" />
            <h2 className="font-serif font-bold text-base text-[#9E2A2B]">
              Verification Unsuccessful
            </h2>
            <p className="text-xs text-[#252824] max-w-sm mx-auto">
              {error}
            </p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-[#ECEBE4] text-center">
          <Link to="/" className="text-xs font-semibold text-[#254D3C] hover:underline inline-flex items-center">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Home Page
          </Link>
        </div>
      </div>
    </div>
  );
}
