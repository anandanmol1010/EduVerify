import React from 'react';
import { Link } from 'react-router-dom';
import { institution } from '../config/institution';

export default function Footer() {
  return (
    <footer className="bg-[#FFFFFF] border-t border-[#DDDCD5] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Institution Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2 text-[#254D3C]">
              <div className="w-7 h-7 rounded bg-[#254D3C] text-white flex items-center justify-center font-serif text-sm font-bold">
                E
              </div>
              <span className="font-serif text-base font-bold text-[#254D3C]">EduVerify</span>
            </div>
            <p className="text-xs text-[#6B716C] leading-relaxed max-w-sm">
              EduVerify admissions demo for {institution.name}.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-[#252824] uppercase tracking-wider mb-3">Admissions</h4>
            <ul className="space-y-2 text-xs text-[#6B716C]">
              <li><Link to="/courses" className="hover:text-[#254D3C] transition">Courses</Link></li>
              <li><Link to="/guidelines" className="hover:text-[#254D3C] transition">Admission Guidelines</Link></li>
              <li><Link to="/register" className="hover:text-[#254D3C] transition">Apply Now</Link></li>
              <li>
                <Link to="/verify-admission" className="text-[#B18B56] hover:text-[#987544] font-medium transition">
                  Verify Admission Letter
                </Link>
              </li>
            </ul>
          </div>

          {/* Institutional Contact */}
          <div>
            <h4 className="text-xs font-bold text-[#252824] uppercase tracking-wider mb-3">College Contact</h4>
            <div className="space-y-1.5 text-xs text-[#6B716C]">
              <p>{institution.address}</p>
              <p><a className="hover:underline" href={`mailto:${institution.email}`}>{institution.email}</a></p>
              <p>{institution.phone}</p>
              <p><a className="hover:underline" href={institution.website}>ABES Engineering College website</a></p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#ECEBE4] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#6B716C]">
          <p>© 2026 EduVerify</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <Link to="/guidelines" className="hover:text-[#254D3C]">Admissions Help</Link>
            <span>•</span>
            <Link to="/verify-admission" className="hover:text-[#254D3C]">Verify Admission Letter</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
