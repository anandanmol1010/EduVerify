import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import { Search, Filter, FolderOpen, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AdminApplicationListPage() {
  const [applications, setApplications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState('all');
  const [course, setCourse] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications', {
        params: { status, course, search },
      });
      if (res.success) setApplications(res.applications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/courses').then((r) => {
      if (r.success) setCourses(r.courses);
    });
  }, []);

  useEffect(() => {
    fetchApps();
  }, [status, course]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApps();
  };

  return (
    <DashboardLayout roleTitle="ADMINISTRATOR">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
            Application Scrutiny & Document Verification Ledger
          </h1>
          <p className="text-xs text-[#6B716C] mt-1">
            Review submitted applications, inspect imported and uploaded credentials, and record admission decisions.
          </p>
        </div>

        {/* Filter controls */}
        <div className="bg-white p-4 rounded border border-[#DDDCD5] flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm text-xs">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6B716C]" />
            <input
              type="text"
              placeholder="Search by application number, candidate name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
            />
          </form>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#6B716C]" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2] text-xs focus:outline-none focus:border-[#254D3C]"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Correction Required">Correction Required</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2] text-xs focus:outline-none focus:border-[#254D3C]"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Applications Ledger Table */}
        <div className="bg-white border border-[#DDDCD5] rounded-lg shadow-sm overflow-hidden text-xs">
          {loading ? (
            <div className="text-center py-16 text-[#6B716C]">Loading applications ledger...</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16 text-[#6B716C]">
              <FolderOpen className="w-8 h-8 mx-auto text-[#DDDCD5] mb-2" />
              No applications found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F7F6F2] text-[#6B716C] font-semibold border-b border-[#DDDCD5]">
                  <tr>
                    <th className="py-3 px-4">Application No.</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Marks (10th / 12th)</th>
                    <th className="py-3 px-4">Eligibility</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEBE4]">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-[#F7F6F2]/50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-[#254D3C]">
                        {app.applicationNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#252824]">
                          {app.personalSnapshot?.fullName || app.student?.name}
                        </div>
                        <div className="text-[10px] text-[#6B716C]">
                          {app.personalSnapshot?.email || app.student?.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#252824]">{app.course?.code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>10th: <strong>{app.academicSnapshot?.class10?.percentage || 0}%</strong></div>
                        <div>12th: <strong>{app.academicSnapshot?.class12?.percentage || 0}%</strong></div>
                      </td>
                      <td className="py-3 px-4">
                        {app.eligibilityEvaluation?.isEligible ? (
                          <span className="text-[#2B6E4E] font-semibold flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Eligible ({app.eligibilityEvaluation.scoreCalculated})
                          </span>
                        ) : (
                          <span className="text-[#9E2A2B] font-semibold flex items-center">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Fail
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/applications/${app._id}`}
                          className="px-3 py-1 bg-[#254D3C] text-white rounded font-semibold hover:bg-[#1c3b2e]"
                        >
                          Review & Verify
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
