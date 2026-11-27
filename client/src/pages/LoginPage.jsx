import React, { useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordInput = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        if (res.user.role === 'admin') navigate('/admin/dashboard');
        else navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('');
    setError('');
    passwordInput.current?.focus();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#DDDCD5] rounded-lg p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded bg-[#254D3C] text-white flex items-center justify-center font-serif text-2xl font-bold mx-auto mb-3">
            E
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#254D3C]">
            Portal Sign In
          </h2>
          <p className="text-xs text-[#6B716C] mt-1">
            Access your student or administrative admission portal
          </p>
        </div>

        {isExpired && (
          <div className="mb-4 p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            Your previous session expired. Please sign in again.
          </div>
        )}

        {error && (
          <div className="mb-4 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#252824] mb-1">
              Registered Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@eduverify.ac.in"
              className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#252824] mb-1">
              Account Password
            </label>
            <input
              type="password"
              required
              ref={passwordInput}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] transition flex items-center justify-center shadow-sm"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <LogIn className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </form>

        {import.meta.env.DEV && (
          <div className="mt-6 pt-5 border-t border-[#ECEBE4] text-xs">
            <p className="mb-2 text-[#6B716C]">
              For local demo accounts, enter the matching <code>SEED_STUDENT_PASSWORD</code> or <code>SEED_ADMIN_PASSWORD</code> from <code>server/.env</code>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectDemoAccount('student@eduverify.ac.in')}
                className="px-3 py-2 bg-[#F7F6F2] hover:bg-[#ECEBE4] border border-[#DDDCD5] rounded text-xs text-[#254D3C] font-semibold"
              >
                Demo Student
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemoAccount('admin@eduverify.ac.in')}
                className="px-3 py-2 bg-[#F7F6F2] hover:bg-[#ECEBE4] border border-[#DDDCD5] rounded text-xs text-[#254D3C] font-semibold"
              >
                Demo Administrator
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 text-center text-xs text-[#6B716C]">
          Don't have a student account?{' '}
          <Link to="/register" className="font-semibold text-[#254D3C] hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
