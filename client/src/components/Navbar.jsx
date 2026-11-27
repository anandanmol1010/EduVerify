import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'officer') return '/officer/dashboard';
    return '/student/dashboard';
  };

  return (
    <header className="bg-[#FFFFFF] border-b border-[#DDDCD5] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 text-[#254D3C] hover:opacity-90 transition flex-shrink-0"
          >
            <div className="w-10 h-10 rounded bg-[#254D3C] text-white flex items-center justify-center font-serif text-xl font-bold shadow-sm">
              E
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-[#254D3C] block leading-tight">
                EduVerify
              </span>
              <span className="text-[11px] uppercase tracking-wider text-[#6B716C] font-semibold block">
                ABESEC Ghaziabad
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#252824]">
            <Link to="/" className="hover:text-[#254D3C] transition">
              Home
            </Link>
            <Link to="/courses" className="hover:text-[#254D3C] transition">
              Courses
            </Link>
            <Link to="/guidelines" className="hover:text-[#254D3C] transition">
              Admission Guidelines
            </Link>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
            {user ? (
              <div className="flex items-center space-x-3">
                <Link
                  to={getDashboardLink()}
                  className="inline-flex items-center px-3.5 py-1.5 rounded text-xs font-semibold bg-[#254D3C] text-white hover:bg-[#1c3b2e] transition"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                  Dashboard ({user.role})
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium text-[#6B716C] hover:text-[#252824] hover:bg-[#F7F6F2] transition border border-[#DDDCD5]"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-[#252824] hover:text-[#254D3C] transition"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1.5 text-[#6B716C]" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-1.5 rounded text-xs font-semibold bg-[#254D3C] text-white hover:bg-[#1c3b2e] transition shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Apply Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#252824] hover:text-[#254D3C] hover:bg-[#F7F6F2] rounded focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#ECEBE4] space-y-3">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-[#252824]">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded hover:bg-[#F7F6F2] hover:text-[#254D3C]"
              >
                Home
              </Link>
              <Link
                to="/courses"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded hover:bg-[#F7F6F2] hover:text-[#254D3C]"
              >
                Courses
              </Link>
              <Link
                to="/guidelines"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 rounded hover:bg-[#F7F6F2] hover:text-[#254D3C]"
              >
                Admission Guidelines
              </Link>
            </nav>

            <div className="pt-3 border-t border-[#ECEBE4] flex flex-col space-y-2">
              {user ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded text-xs font-semibold bg-[#254D3C] text-white"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                    Dashboard ({user.role})
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 rounded text-xs font-medium text-[#6B716C] border border-[#DDDCD5] hover:bg-[#F7F6F2]"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded text-xs font-medium text-[#252824] border border-[#DDDCD5] hover:bg-[#F7F6F2]"
                  >
                    <LogIn className="w-3.5 h-3.5 mr-1.5 text-[#6B716C]" />
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded text-xs font-semibold bg-[#254D3C] text-white"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Apply Now
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
