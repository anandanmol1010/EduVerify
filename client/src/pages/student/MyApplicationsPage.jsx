import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import { FolderOpen, ArrowRight, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await api.get('/applications/my-applications');
        if (res.success) setApplications(res.applications);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  return (
    <DashboardLayout roleTitle="STUDENT">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
              My Admission Applications
            </h1>
            <p className="text-xs text-[#6B716C] mt-1">
              Complete status ledger of your course applications and verification progress.
            </p>
          </div>
          <Link
            to="/student/applications/new"
            className="px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Apply for Course
          </Link>
        </div>

        <div className="bg-white border border-[#DDDCD5] rounded-lg shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-xs text-[#6B716C]">Loading records...</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-8 h-8 text-[#DDDCD5] mx-auto mb-2" />
              <p className="text-xs text-[#6B716C] mb-3">No admission applications found.</p>
              <Link
                to="/student/applications/new"
                className="px-4 py-1.5 bg-[#254D3C] text-white text-xs font-semibold rounded"
              >
                Apply Now
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F6F2] text-[#6B716C] font-semibold border-b border-[#DDDCD5]">
                  <tr>
                    <th className="py-2.5 px-4">Application #</th>
                    <th className="py-2.5 px-4">Course</th>
                    <th className="py-2.5 px-4">Eligibility Audit</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Last Updated</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEBE4]">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-[#F7F6F2]/50 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#254D3C]">
                        {app.applicationNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#252824]">{app.course?.title}</div>
                        <div className="text-[10px] text-[#6B716C]">{app.course?.code}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {app.eligibilityEvaluation?.isEligible ? (
                          <span className="text-[#2B6E4E] font-medium flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Eligible ({app.eligibilityEvaluation?.scoreCalculated} pts)
                          </span>
                        ) : (
                          <span className="text-[#9E2A2B] font-medium flex items-center">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Ineligible
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-3.5 px-4 text-[#6B716C]">
                        {new Date(app.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/student/applications/${app._id}`}
                          className="px-3 py-1 bg-[#F7F6F2] hover:bg-[#ECEBE4] text-[#254D3C] font-semibold rounded border border-[#DDDCD5]"
                        >
                          View Details
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
