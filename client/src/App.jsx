import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CoursesCataloguePage from './pages/CoursesCataloguePage';
import GuidelinesPage from './pages/GuidelinesPage';
import AdmissionVerificationPage from './pages/AdmissionVerificationPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import NewApplicationPage from './pages/student/NewApplicationPage';
import MyApplicationsPage from './pages/student/MyApplicationsPage';
import ApplicationDetailPage from './pages/student/ApplicationDetailPage';
import DocumentLockerPage from './pages/student/DocumentLockerPage';
import StudentLettersPage from './pages/student/StudentLettersPage';
import StudentNotificationsPage from './pages/student/StudentNotificationsPage';
import StudentProfilePage from './pages/student/StudentProfilePage';

// Admin Pages (Combined Scrutiny, Verification, Course & System Management)
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApplicationListPage from './pages/admin/AdminApplicationListPage';
import AdminApplicationReviewPage from './pages/admin/AdminApplicationReviewPage';
import CourseManagementPage from './pages/admin/CourseManagementPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

function LayoutWrapper({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LayoutWrapper><HomePage /></LayoutWrapper>} />
        <Route path="/login" element={<LayoutWrapper><LoginPage /></LayoutWrapper>} />
        <Route path="/register" element={<LayoutWrapper><RegisterPage /></LayoutWrapper>} />
        <Route path="/courses" element={<LayoutWrapper><CoursesCataloguePage /></LayoutWrapper>} />
        <Route path="/guidelines" element={<LayoutWrapper><GuidelinesPage /></LayoutWrapper>} />
        <Route path="/verify-admission" element={<LayoutWrapper><AdmissionVerificationPage /></LayoutWrapper>} />
        <Route path="/verify-admission/:admissionId" element={<LayoutWrapper><AdmissionVerificationPage /></LayoutWrapper>} />

        {/* Student Protected Routes */}
        <Route
          path="/student/dashboard"
          element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>}
        />
        <Route
          path="/student/applications/new"
          element={<ProtectedRoute allowedRoles={['student']}><NewApplicationPage /></ProtectedRoute>}
        />
        <Route
          path="/student/applications"
          element={<ProtectedRoute allowedRoles={['student']}><MyApplicationsPage /></ProtectedRoute>}
        />
        <Route
          path="/student/applications/:id"
          element={<ProtectedRoute allowedRoles={['student']}><ApplicationDetailPage /></ProtectedRoute>}
        />
        <Route
          path="/student/documents"
          element={<ProtectedRoute allowedRoles={['student']}><DocumentLockerPage /></ProtectedRoute>}
        />
        <Route
          path="/student/letters"
          element={<ProtectedRoute allowedRoles={['student']}><StudentLettersPage /></ProtectedRoute>}
        />
        <Route
          path="/student/admission-letter/:id"
          element={<ProtectedRoute allowedRoles={['student']}><StudentLettersPage /></ProtectedRoute>}
        />
        <Route
          path="/student/notifications"
          element={<ProtectedRoute allowedRoles={['student']}><StudentNotificationsPage /></ProtectedRoute>}
        />
        <Route
          path="/student/profile"
          element={<ProtectedRoute allowedRoles={['student']}><StudentProfilePage /></ProtectedRoute>}
        />

        {/* Admin Protected Routes (Combining Officer & Institutional Administration) */}
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/applications"
          element={<ProtectedRoute allowedRoles={['admin']}><AdminApplicationListPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/applications/:id"
          element={<ProtectedRoute allowedRoles={['admin']}><AdminApplicationReviewPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/courses"
          element={<ProtectedRoute allowedRoles={['admin']}><CourseManagementPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/settings"
          element={<ProtectedRoute allowedRoles={['admin']}><AdminSettingsPage /></ProtectedRoute>}
        />

        {/* Safe legacy officer route redirects */}
        <Route path="/officer/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/officer/applications" element={<Navigate to="/admin/applications" replace />} />
        <Route path="/officer/applications/:id" element={<Navigate to="/admin/applications" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
