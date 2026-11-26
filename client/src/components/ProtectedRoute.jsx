import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#254D3C] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-[#6B716C] font-medium">Authenticating credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's appropriate portal
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'officer') return <Navigate to="/officer/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
}
