import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import { Award, Download, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';

export default function StudentLettersPage() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLetters = async () => {
      try {
        const res = await api.get('/letters/my-letters');
        if (res.success) setLetters(res.letters);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLetters();
  }, []);

  return (
    <DashboardLayout roleTitle="STUDENT">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
            Demo Admission Letters
          </h1>
          <p className="text-xs text-[#6B716C] mt-1">
            Download your verifiable provisional admission confirmation certificates with embedded QR codes.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-[#6B716C]">Loading admission letters...</div>
        ) : letters.length === 0 ? (
          <div className="p-8 text-center bg-white border border-[#DDDCD5] rounded">
            <Award className="w-10 h-10 text-[#DDDCD5] mx-auto mb-2" />
            <h3 className="font-serif font-bold text-sm text-[#252824]">No Admission Letters Issued Yet</h3>
            <p className="text-xs text-[#6B716C] mt-1 max-w-md mx-auto">
              Your demo admission letter will appear here once EduVerify confirms your application and allocates a seat.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {letters.map((letter) => (
              <div
                key={letter._id}
                className="bg-white border border-[#DDDCD5] rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-[#254D3C] bg-[#F7F6F2] px-2.5 py-0.5 rounded border border-[#DDDCD5]">
                      {letter.admissionId}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#2B6E4E] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Confirmed & Issued
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[#252824] mt-2">
                    {letter.course?.title}
                  </h3>

                  <div className="flex flex-wrap gap-4 text-xs text-[#6B716C] mt-1">
                    <span>Session: {letter.academicSession}</span>
                    <span>•</span>
                    <span>Issued Date: {new Date(letter.issuedDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto">
                  <a
                    href={letter.pdfPath}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 md:flex-none px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center justify-center shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download PDF
                  </a>

                  <Link
                    to={`/verify-admission/${letter.admissionId}`}
                    target="_blank"
                    className="px-3.5 py-2 border border-[#DDDCD5] text-[#252824] text-xs font-semibold rounded hover:bg-[#F7F6F2] flex items-center justify-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1 text-[#B18B56]" />
                    Public Verification
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
