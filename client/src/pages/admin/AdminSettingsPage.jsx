import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    institutionName: '',
    academicYear: '',
    isPortalOpen: true,
    maxApplicationsPerStudent: 3,
    supportEmail: '',
    contactPhone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/admin/settings').then((res) => {
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      const res = await api.put('/admin/settings', settings);
      if (res.success) {
        setSuccess('Admission settings updated successfully.');
      }
    } catch (err) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout roleTitle="SYSTEM ADMINISTRATOR">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
            Institutional Admission Settings
          </h1>
          <p className="text-xs text-[#6B716C] mt-1">
            Configure system parameters, academic calendars, and portal operational status.
          </p>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#2B6E4E] text-xs rounded flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded border border-[#DDDCD5] shadow-sm space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-[#252824]">Institution Formal Name</label>
            <input
              type="text"
              value={settings.institutionName}
              onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
              className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Current Academic Year</label>
              <input
                type="text"
                value={settings.academicYear}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Max Applications Allowed per Student</label>
              <input
                type="number"
                value={settings.maxApplicationsPerStudent}
                onChange={(e) => setSettings({ ...settings, maxApplicationsPerStudent: Number(e.target.value) })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Admissions Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#252824]">Helpdesk Phone Number</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isPortalOpen}
                onChange={(e) => setSettings({ ...settings, isPortalOpen: e.target.checked })}
                className="rounded text-[#254D3C] focus:ring-0"
              />
              <span className="font-semibold text-[#252824]">Admission Portal is Open for Submissions</span>
            </label>
          </div>

          <div className="pt-4 border-t border-[#ECEBE4] flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#254D3C] text-white font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
              <Save className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
