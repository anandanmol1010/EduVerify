import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Bell,
  Award,
  Users,
  Settings,
  ShieldCheck,
  BookOpen,
  FileCheck,
  ListOrdered,
  LogOut,
} from 'lucide-react';

export default function DashboardLayout({ children, roleTitle }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const studentNavItems = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/student/applications/new', label: 'Apply for Course', icon: FileText, exact: true },
    { to: '/student/applications', label: 'My Applications', icon: FolderOpen, matchPrefix: '/student/applications' },
    { to: '/student/documents', label: 'My Documents', icon: FileCheck, exact: true },
    { to: '/student/letters', label: 'Admission Letters', icon: Award, exact: true },
    { to: '/student/notifications', label: 'Notifications', icon: Bell, exact: true },
    { to: '/student/profile', label: 'My Profile', icon: Users, exact: true },
  ];

  const adminNavItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/applications', label: 'Applications', icon: FolderOpen, matchPrefix: '/admin/applications' },
    { to: '/admin/courses', label: 'Courses & Eligibility', icon: BookOpen, exact: true },
    { to: '/admin/settings', label: 'Admission Settings', icon: Settings, exact: true },
  ];

  let items = studentNavItems;
  if (user?.role === 'admin') items = adminNavItems;

  const isItemActive = (item) => {
    const currentPath = location.pathname;

    // Special distinction: "Apply for Course" is only active at exactly '/student/applications/new'
    if (item.to === '/student/applications/new') {
      return currentPath === '/student/applications/new';
    }

    // "My Applications" is active on '/student/applications' or viewing an existing application '/student/applications/:id'
    // but NEVER on '/student/applications/new'
    if (item.to === '/student/applications') {
      return currentPath.startsWith('/student/applications') && currentPath !== '/student/applications/new';
    }

    if (item.matchPrefix) {
      return currentPath.startsWith(item.matchPrefix);
    }

    return currentPath === item.to;
  };

  return (
    <div className="min-h-screen flex bg-[#F7F6F2]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#FFFFFF] border-r border-[#DDDCD5] flex flex-col flex-shrink-0">
        {/* Brand header */}
        <div className="p-5 border-b border-[#DDDCD5] flex items-center space-x-3">
          <div className="w-9 h-9 rounded bg-[#254D3C] text-white flex items-center justify-center font-serif text-lg font-bold">
            E
          </div>
          <div>
            <div className="font-serif font-bold text-sm text-[#254D3C]">EduVerify</div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[#6B716C]">
              {roleTitle || user?.role?.toUpperCase()} PORTAL
            </div>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="px-5 py-4 border-b border-[#ECEBE4] bg-[#F7F6F2]/50">
          <div className="text-xs font-semibold text-[#252824] truncate">{user?.name}</div>
          <div className="text-[11px] text-[#6B716C] truncate">{user?.email}</div>
          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-[#ECEBE4] text-[#254D3C]">
            {user?.role}
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center px-3 py-2 text-xs font-medium rounded transition ${
                  active
                    ? 'bg-[#254D3C] text-white'
                    : 'text-[#252824] hover:bg-[#F7F6F2] hover:text-[#254D3C]'
                }`}
              >
                <Icon className="w-4 h-4 mr-2.5 flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer logout */}
        <div className="p-3 border-t border-[#DDDCD5]">
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-xs font-medium text-[#9E2A2B] hover:bg-[#9E2A2B]/10 rounded transition"
          >
            <LogOut className="w-4 h-4 mr-2.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-14 bg-[#FFFFFF] border-b border-[#DDDCD5] px-6 flex items-center justify-between">
          <div className="text-xs text-[#6B716C]">
            Session: <span className="font-semibold text-[#252824]">2026–2027</span> • St. Jude Institute of Higher Sciences
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
