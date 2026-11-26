import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    setLoading(true);

    try {
      const res = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: 'student',
      });

      if (res.success) {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to create student account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#DDDCD5] rounded-lg p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded bg-[#254D3C] text-white flex items-center justify-center font-serif text-2xl font-bold mx-auto mb-3">
            E
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#254D3C]">
            Student Registration
          </h2>
          <p className="text-xs text-[#6B716C] mt-1">
            Create an applicant profile to begin your admission application
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#252824] mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Aarav Sharma"
              className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#252824] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. candidate@example.com"
              className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#252824] mb-1">
              Contact Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#252824] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
                className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#252824] mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] transition flex items-center justify-center shadow-sm mt-2"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
            <UserPlus className="w-3.5 h-3.5 ml-1.5" />
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-[#6B716C]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#254D3C] hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
