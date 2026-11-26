import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import { Bell, CheckCircle2 } from 'lucide-react';

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.success) setNotifications(res.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout roleTitle="STUDENT">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
              In-App Notifications
            </h1>
            <p className="text-xs text-[#6B716C] mt-1">
              Real-time updates regarding application scrutiny, document corrections, and seat decisions.
            </p>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-[#254D3C] font-semibold hover:underline flex items-center"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark all as read
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-[#6B716C]">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center bg-white border border-[#DDDCD5] rounded">
            <Bell className="w-8 h-8 text-[#DDDCD5] mx-auto mb-2" />
            <p className="text-xs text-[#6B716C]">No notifications recorded in your account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`p-4 rounded border text-xs ${
                  n.isRead
                    ? 'bg-white border-[#DDDCD5]'
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#252824]">{n.title}</span>
                  <span className="text-[10px] text-[#6B716C]">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-[#6B716C] leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
