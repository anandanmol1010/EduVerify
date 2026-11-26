import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import {
  Users,
  FolderOpen,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  XCircle,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await api.get('/admin/dashboard-stats');
        if (res.success) {
          setStats(res.stats);
          setCourses(res.courses || []);
          setRecentApplications(res.recentApplications || []);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const chartData = (courses || []).map((c) => ({
    name: c.code,
    Total: c.totalSeats,
    Allotted: c.allocatedSeats,
    Available: Math.max(0, c.totalSeats - c.allocatedSeats),
  }));

  const pieData = stats
    ? [
        { name: 'Accepted', value: stats.acceptedApplications || stats.acceptedCount || 0, color: '#254D3C' },
        { name: 'Pending Verification', value: stats.pendingApplications || stats.pendingVerificationCount || 0, color: '#B47B1E' },
        { name: 'Correction Required', value: stats.correctionApplications || stats.correctionCount || 0, color: '#B18B56' },
        { name: 'Rejected', value: stats.rejectedApplications || stats.rejectedCount || 0, color: '#9E2A2B' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <DashboardLayout roleTitle="ADMINISTRATOR">
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
              Admission Governance & Operations
            </h1>
            <p className="text-xs text-[#6B716C] mt-1">
              Centralized oversight of course capacity, application scrutiny, document verification, and admission decisions.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/admin/applications"
              className="px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
              Review Applications
            </Link>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded border border-[#DDDCD5] shadow-sm">
            <span className="text-[11px] font-semibold text-[#6B716C] uppercase">Total Applications</span>
            <div className="text-2xl font-bold text-[#254D3C] mt-1">{stats?.totalApplications || 0}</div>
            <span className="text-[10px] text-[#6B716C]">Current Academic Session</span>
          </div>

          <div className="bg-white p-4 rounded border border-[#DDDCD5] shadow-sm">
            <span className="text-[11px] font-semibold text-[#6B716C] uppercase">Pending Verification</span>
            <div className="text-2xl font-bold text-[#B47B1E] mt-1">{stats?.pendingApplications || 0}</div>
            <span className="text-[10px] text-[#6B716C]">Awaiting Scrutiny / Review</span>
          </div>

          <div className="bg-white p-4 rounded border border-[#DDDCD5] shadow-sm">
            <span className="text-[11px] font-semibold text-[#6B716C] uppercase">Accepted Admissions</span>
            <div className="text-2xl font-bold text-[#2B6E4E] mt-1">{stats?.acceptedApplications || 0}</div>
            <span className="text-[10px] text-[#6B716C]">Confirmed & Letters Issued</span>
          </div>

          <div className="bg-white p-4 rounded border border-[#DDDCD5] shadow-sm">
            <span className="text-[11px] font-semibold text-[#6B716C] uppercase">Correction Required</span>
            <div className="text-2xl font-bold text-[#B18B56] mt-1">{stats?.correctionApplications || 0}</div>
            <span className="text-[10px] text-[#6B716C]">Awaiting Student Response</span>
          </div>

          <div className="bg-white p-4 rounded border border-[#DDDCD5] shadow-sm">
            <span className="text-[11px] font-semibold text-[#6B716C] uppercase">Rejected Applications</span>
            <div className="text-2xl font-bold text-[#9E2A2B] mt-1">{stats?.rejectedApplications || 0}</div>
            <span className="text-[10px] text-[#6B716C]">Ineligible or Disqualified</span>
          </div>

          <div className="bg-white p-4 rounded border border-[#DDDCD5] shadow-sm">
            <span className="text-[11px] font-semibold text-[#6B716C] uppercase">Active Courses</span>
            <div className="text-2xl font-bold text-[#252824] mt-1">{stats?.totalCourses || 0}</div>
            <span className="text-[10px] text-[#6B716C]">Academic Programs</span>
          </div>

          <div className="bg-white p-4 rounded border border-[#DDDCD5] shadow-sm">
            <span className="text-[11px] font-semibold text-[#6B716C] uppercase">Total Available Seats</span>
            <div className="text-2xl font-bold text-[#254D3C] mt-1">{stats?.totalAvailableSeats || 0}</div>
            <span className="text-[10px] text-[#6B716C]">Remaining Across Courses</span>
          </div>

          <div className="bg-white p-4 rounded border border-[#DDDCD5] shadow-sm">
            <span className="text-[11px] font-semibold text-[#6B716C] uppercase">Registered Students</span>
            <div className="text-2xl font-bold text-[#252824] mt-1">{stats?.totalStudents || 0}</div>
            <span className="text-[10px] text-[#6B716C]">Verified Candidate Accounts</span>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seat Capacity Bar Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded border border-[#DDDCD5] shadow-sm">
            <h3 className="font-serif font-bold text-sm text-[#252824] mb-4">
              Course Capacity & Seat Allotment Status
            </h3>
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#6B716C" fontSize={11} />
                  <YAxis stroke="#6B716C" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="Allotted" fill="#254D3C" />
                  <Bar dataKey="Available" fill="#DDDCD5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center space-x-6 text-xs text-[#6B716C] mt-2">
              <div className="flex items-center">
                <span className="w-3 h-3 bg-[#254D3C] rounded-sm mr-1.5"></span> Allotted Seats
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-[#DDDCD5] rounded-sm mr-1.5"></span> Available Capacity
              </div>
            </div>
          </div>

          {/* Application Status Distribution */}
          <div className="bg-white p-5 rounded border border-[#DDDCD5] shadow-sm flex flex-col justify-between">
            <h3 className="font-serif font-bold text-sm text-[#252824] mb-2">
              Application Status Distribution
            </h3>
            {pieData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 text-[11px] pt-2 border-t border-[#ECEBE4]">
                  {pieData.map((p) => (
                    <div key={p.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: p.color }}></span>
                        <span>{p.name}</span>
                      </div>
                      <span className="font-bold">{p.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-xs text-[#6B716C]">
                No applications submitted yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Applications Table */}
        <div className="bg-white border border-[#DDDCD5] rounded-lg shadow-sm">
          <div className="p-4 border-b border-[#DDDCD5] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#254D3C]" />
              <h3 className="font-serif font-bold text-sm text-[#252824]">
                Recent Applications
              </h3>
            </div>
            <Link to="/admin/applications" className="text-xs text-[#254D3C] font-semibold hover:underline">
              View All Applications →
            </Link>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#F7F6F2] text-[#6B716C] font-semibold border-b border-[#DDDCD5]">
                <tr>
                  <th className="py-2.5 px-4">Application No.</th>
                  <th className="py-2.5 px-4">Candidate</th>
                  <th className="py-2.5 px-4">Course</th>
                  <th className="py-2.5 px-4">Academic Aggregate</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Submitted Date</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEBE4]">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6B716C]">
                      No applications recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentApplications.map((app) => (
                    <tr key={app._id} className="hover:bg-[#F7F6F2]/50 transition">
                      <td className="py-2.5 px-4 font-mono font-semibold text-[#254D3C]">
                        {app.applicationNumber}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-medium text-[#252824]">
                          {app.personalSnapshot?.fullName || app.student?.name}
                        </span>
                        <div className="text-[10px] text-[#6B716C]">
                          {app.personalSnapshot?.email || app.student?.email}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#252824]">
                        {app.course?.code || 'N/A'}
                      </td>
                      <td className="py-2.5 px-4 text-[#6B716C]">
                        10th: <strong>{app.academicSnapshot?.class10?.percentage || 0}%</strong> • 12th: <strong>{app.academicSnapshot?.class12?.percentage || 0}%</strong>
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-2.5 px-4 text-[#6B716C]">
                        {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Draft'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          to={`/admin/applications/${app._id}`}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#254D3C] text-white rounded hover:bg-[#1c3b2e]"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
