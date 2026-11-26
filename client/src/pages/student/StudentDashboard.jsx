import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import {
  FileText,
  FolderOpen,
  Award,
  Bell,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function StudentDashboard() {
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [appRes, notifRes, letterRes] = await Promise.all([
          api.get('/applications/my-applications'),
          api.get('/notifications'),
          api.get('/letters/my-letters'),
        ]);

        if (appRes.success) setApplications(appRes.applications);
        if (notifRes.success) setNotifications(notifRes.notifications.slice(0, 4));
        if (letterRes.success) setLetters(letterRes.letters);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const acceptedCount = applications.filter((a) => a.status === 'Accepted').length;

  return (
    <DashboardLayout roleTitle="STUDENT">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-[#DDDCD5] rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
              Applicant Portal
            </h1>
            <p className="text-xs text-[#6B716C] mt-1">
              Apply for courses, upload marksheets, and track your admission verification status.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/student/applications/new"
              className="inline-flex items-center px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Apply for Course
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded border border-[#DDDCD5]">
            <div className="text-[11px] font-semibold text-[#6B716C] uppercase tracking-wider">My Applications</div>
            <div className="text-2xl font-bold text-[#254D3C] mt-1">{applications.length}</div>
            <div className="text-[11px] text-[#6B716C] mt-1">
              {acceptedCount} Accepted • {applications.filter((a) => a.status === 'Pending Verification' || a.status === 'Submitted').length} Pending
            </div>
          </div>

          <div className="bg-white p-5 rounded border border-[#DDDCD5]">
            <div className="text-[11px] font-semibold text-[#6B716C] uppercase tracking-wider">Admission Letters</div>
            <div className="text-2xl font-bold text-[#B18B56] mt-1">{letters.length}</div>
            <div className="text-[11px] text-[#6B716C] mt-1">
              Generated only after final admission acceptance
            </div>
          </div>

          <div className="bg-white p-5 rounded border border-[#DDDCD5]">
            <div className="text-[11px] font-semibold text-[#6B716C] uppercase tracking-wider">Notifications</div>
            <div className="text-2xl font-bold text-[#252824] mt-1">
              {notifications.filter((n) => !n.isRead).length}
            </div>
            <div className="text-[11px] text-[#6B716C] mt-1">
              Officer review remarks and updates
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white border border-[#DDDCD5] rounded-lg shadow-sm">
          <div className="p-4 border-b border-[#DDDCD5] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderOpen className="w-4 h-4 text-[#254D3C]" />
              <h2 className="font-serif font-bold text-sm text-[#252824]">
                My Applications
              </h2>
            </div>
            <Link
              to="/student/applications"
              className="text-xs text-[#254D3C] font-semibold hover:underline flex items-center"
            >
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-[#6B716C]">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-xs text-[#6B716C] mb-3">You haven't submitted any course applications yet.</p>
              <Link
                to="/student/applications/new"
                className="inline-flex items-center px-4 py-1.5 text-xs font-semibold bg-[#254D3C] text-white rounded"
              >
                Apply for Course
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F6F2] text-[#6B716C] font-semibold border-b border-[#DDDCD5]">
                  <tr>
                    <th className="py-2.5 px-4">Application #</th>
                    <th className="py-2.5 px-4">Course</th>
                    <th className="py-2.5 px-4">Eligibility Check</th>
                    <th className="py-2.5 px-4">Application Status</th>
                    <th className="py-2.5 px-4">Submitted Date</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEBE4]">
                  {applications.slice(0, 5).map((app) => (
                    <tr key={app._id} className="hover:bg-[#F7F6F2]/50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-[#254D3C]">
                        {app.applicationNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#252824]">{app.course?.title}</div>
                        <div className="text-[10px] text-[#6B716C]">{app.course?.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        {app.eligibilityEvaluation?.isEligible ? (
                          <span className="inline-flex items-center text-[#2B6E4E] font-medium">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible (Score: {app.eligibilityEvaluation?.scoreCalculated})
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[#9E2A2B] font-medium">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Requirements Incomplete
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-3 px-4 text-[#6B716C]">
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Draft'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/student/applications/${app._id}`}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#F7F6F2] hover:bg-[#ECEBE4] text-[#254D3C] rounded border border-[#DDDCD5]"
                        >
                          View Application
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
