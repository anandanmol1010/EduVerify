import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ShieldCheck, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

export default function GuidelinesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#254D3C]">
          Admission Guidelines
        </h1>
        <p className="text-xs text-[#6B716C] mt-1">
          Everything you need to know about eligibility requirements, document submission, and the application process.
        </p>
      </div>

      {/* Guidelines Sections */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#252824] flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-[#254D3C]" />
            1. Eligibility & Minimum Academic Scores
          </h2>
          <p className="text-xs text-[#6B716C] leading-relaxed">
            Every course has specific eligibility criteria set by the admissions board. Before you submit your application, our portal automatically checks your marks to confirm whether you qualify.
          </p>
          <ul className="text-xs text-[#252824] space-y-1.5 list-disc list-inside">
            <li>Minimum percentage cutoffs in Class 10 and Class 12 must be satisfied.</li>
            <li>Technical and engineering courses require specific qualifying subjects such as Mathematics and Physics.</li>
            <li>You can check your eligibility for any course without submitting the form or locking your account.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#252824] flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-[#254D3C]" />
            2. Document Locker & Auto-Fill
          </h2>
          <p className="text-xs text-[#6B716C] leading-relaxed">
            Import both marksheets from DigiLocker Demo so the portal can verify your aggregate and subject marks.
          </p>
          <div className="p-3 bg-[#F7F6F2] rounded border border-[#DDDCD5] text-xs text-[#6B716C] space-y-1">
            <p><strong>Step 1:</strong> On the application form, click "Auto-Fill via DigiLocker Demo".</p>
            <p><strong>Step 2:</strong> Choose your demo account and verify the demo OTP.</p>
            <p><strong>Step 3:</strong> Select the required documents and grant consent. Your subject marks will fill in automatically.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#252824] flex items-center">
            <FileText className="w-5 h-5 mr-2 text-[#B18B56]" />
            3. Manual Document Uploads & Review
          </h2>
          <p className="text-xs text-[#6B716C] leading-relaxed">
            If your marksheet or certificate is not available through the demo document locker, you can upload clear scanned copies or photos in PDF, JPG, or PNG format.
          </p>
          <p className="text-xs text-[#6B716C] leading-relaxed">
            The upload check shows any readable details that differ from your application. Correct the form or replace the file before submitting. Uploaded marksheets need a DigiLocker import for automatic approval.
          </p>
        </div>

        <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#252824] flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 text-[#2B6E4E]" />
            4. Review Decisions & Admission Letters
          </h2>
          <p className="text-xs text-[#6B716C] leading-relaxed">
            The portal checks course eligibility before you reach the document step. Final submission opens when your documents and academic details pass verification.
          </p>
          <ul className="text-xs text-[#252824] space-y-1.5 list-disc list-inside">
            <li>Resolve any issues listed during review before submitting.</li>
            <li>When you submit a verified application, the portal reserves an available seat, approves your admission, and issues your letter.</li>
            <li>Your letter includes a scannable QR code that allows anyone to verify your admission status online without exposing your private marks.</li>
          </ul>
        </div>
      </div>

      <div className="pt-4 text-center">
        <Link
          to="/courses"
          className="inline-flex items-center px-5 py-2.5 rounded text-xs font-semibold bg-[#254D3C] text-white hover:bg-[#1c3b2e] transition shadow-sm"
        >
          View Available Courses
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Link>
      </div>
    </div>
  );
}
