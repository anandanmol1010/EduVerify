import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { User, Save, CheckCircle2 } from 'lucide-react';

export default function StudentProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: 'Prefer not to say',
    category: 'General',
    guardianName: '',
    guardianPhone: '',
    address: { street: '', city: '', state: '', pincode: '' },
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        dob: profile?.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
        gender: profile?.gender || 'Prefer not to say',
        category: profile?.category || 'General',
        guardianName: profile?.guardianName || '',
        guardianPhone: profile?.guardianPhone || '',
        address: profile?.address || prev.address,
      }));
    }
  }, [user, profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      await updateProfile(formData);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      alert(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout roleTitle="STUDENT">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
            Personal & Demographic Profile
          </h1>
          <p className="text-xs text-[#6B716C] mt-1">
            Maintain your primary contact details and guardian information used across admission applications.
          </p>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#2B6E4E] text-xs rounded flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded border border-[#DDDCD5] shadow-sm space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Full Legal Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Social Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              >
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Guardian Name</label>
              <input
                type="text"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Guardian Contact Phone</label>
              <input
                type="text"
                value={formData.guardianPhone}
                onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#ECEBE4] flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#254D3C] text-white font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Profile Details'}
              <Save className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
