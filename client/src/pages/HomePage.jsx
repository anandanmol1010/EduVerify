import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Calendar,
  HelpCircle,
  FileCheck,
  Award,
} from 'lucide-react';

export default function HomePage() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseRes = await api.get('/courses');
        if (courseRes.success) setCourses(courseRes.courses.slice(0, 3));
      } catch (err) {
        console.error('Failed to load courses on home page:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-[#DDDCD5] bg-white rounded-lg p-8 md:p-14 relative overflow-hidden shadow-sm">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#254D3C]/10 text-[#254D3C] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#254D3C]"></span>
              <span>Admissions Open for Academic Year 2026–2027</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#254D3C] tracking-tight leading-tight">
              Begin Your Journey with Simple, Online College Admissions.
            </h1>

            <p className="text-[#6B716C] text-base leading-relaxed">
              Welcome to the official admissions portal of St. Jude Institute of Higher Sciences. Explore available undergraduate programs, automatically retrieve your marks with our demo document locker, verify your eligibility in seconds, and track your application status online.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center px-5 py-2.5 rounded text-sm font-semibold bg-[#254D3C] text-white hover:bg-[#1c3b2e] transition shadow-sm"
              >
                Apply Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                to="/courses"
                className="inline-flex items-center px-5 py-2.5 rounded text-sm font-semibold border border-[#DDDCD5] bg-[#F7F6F2] text-[#252824] hover:bg-white transition"
              >
                View Courses
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-[#ECEBE4] grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-[#6B716C]">
            <div>
              <span className="font-bold text-[#252824] block text-sm">Instant Marks Import</span>
              Fetch scores from your academic records
            </div>
            <div>
              <span className="font-bold text-[#252824] block text-sm">Document Upload</span>
              Upload marksheets and certificates easily
            </div>
            <div>
              <span className="font-bold text-[#252824] block text-sm">Eligibility Check</span>
              Know immediately if you qualify
            </div>
            <div>
              <span className="font-bold text-[#252824] block text-sm">Admission Letters</span>
              Download verified offer letters online
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Process Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold text-[#254D3C]">
            How the Admission Process Works
          </h2>
          <p className="text-xs text-[#6B716C] mt-1">
            Four simple steps from choosing your course to receiving your admission letter.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-[#DDDCD5] rounded">
            <span className="font-mono text-xs font-bold text-[#B18B56] block mb-2">STEP 01</span>
            <h3 className="font-serif font-bold text-sm text-[#252824] mb-1.5">Choose Your Course</h3>
            <p className="text-xs text-[#6B716C] leading-relaxed">
              Explore available degree programs and fill in your basic personal details.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#DDDCD5] rounded">
            <span className="font-mono text-xs font-bold text-[#B18B56] block mb-2">STEP 02</span>
            <h3 className="font-serif font-bold text-sm text-[#252824] mb-1.5">Provide Documents</h3>
            <p className="text-xs text-[#6B716C] leading-relaxed">
              Auto-fill your marks using the demo document locker, or upload your marksheets manually.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#DDDCD5] rounded">
            <span className="font-mono text-xs font-bold text-[#B18B56] block mb-2">STEP 03</span>
            <h3 className="font-serif font-bold text-sm text-[#252824] mb-1.5">Check Eligibility</h3>
            <p className="text-xs text-[#6B716C] leading-relaxed">
              The system automatically checks your scores against course cutoff criteria before submission.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#DDDCD5] rounded">
            <span className="font-mono text-xs font-bold text-[#B18B56] block mb-2">STEP 04</span>
            <h3 className="font-serif font-bold text-sm text-[#252824] mb-1.5">Review & Admission</h3>
            <p className="text-xs text-[#6B716C] leading-relaxed">
              The admissions committee reviews your records and issues your official confirmation letter.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#254D3C]">
              Featured Courses
            </h2>
            <p className="text-xs text-[#6B716C]">
              Explore degree programs accepting applications for the 2026–2027 academic session
            </p>
          </div>
          <Link
            to="/courses"
            className="text-xs font-semibold text-[#254D3C] hover:text-[#1c3b2e] flex items-center"
          >
            All Courses <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white border border-[#DDDCD5] rounded p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#6B716C] mb-2">
                  <span className="font-mono font-bold text-[#254D3C]">{course.code}</span>
                  <span>{course.durationYears} Years • {course.level}</span>
                </div>
                <h3 className="font-serif text-base font-bold text-[#252824] mb-2">
                  {course.title}
                </h3>
                <p className="text-xs text-[#6B716C] line-clamp-3 mb-4 leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#ECEBE4] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#6B716C] block text-[10px]">Annual Fee</span>
                  <span className="font-semibold text-[#252824]">₹{course.annualFee?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[#6B716C] block text-[10px]">Available Seats</span>
                  <span className="font-semibold text-[#2B6E4E]">
                    {course.totalSeats - course.allocatedSeats} / {course.totalSeats}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif text-2xl font-bold text-[#254D3C] mb-4">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-white border border-[#DDDCD5] rounded">
            <h4 className="font-bold text-[#252824] mb-1.5">How does the document import feature work?</h4>
            <p className="text-[#6B716C] leading-relaxed">
              You can import your academic records by entering your exam roll number and board. The system fetches your marksheets and fills your subject scores automatically into the form.
            </p>
          </div>
          <div className="p-4 bg-white border border-[#DDDCD5] rounded">
            <h4 className="font-bold text-[#252824] mb-1.5">What if my certificate is not found in the demo locker?</h4>
            <p className="text-[#6B716C] leading-relaxed">
              You can easily upload your scanned certificates or marksheets (PDF, JPG, or PNG) directly through the document submission page.
            </p>
          </div>
          <div className="p-4 bg-white border border-[#DDDCD5] rounded">
            <h4 className="font-bold text-[#252824] mb-1.5">How do I know if I meet the eligibility criteria?</h4>
            <p className="text-[#6B716C] leading-relaxed">
              When applying, the system checks your 10th and 12th marks against course requirements and gives you a clear breakdown before you submit.
            </p>
          </div>
          <div className="p-4 bg-white border border-[#DDDCD5] rounded">
            <h4 className="font-bold text-[#252824] mb-1.5">When do I receive my Admission Letter?</h4>
            <p className="text-[#6B716C] leading-relaxed">
              Once the admissions administration reviews your application and approves your seat, you can download your official letter with a verification QR code directly from your student dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
