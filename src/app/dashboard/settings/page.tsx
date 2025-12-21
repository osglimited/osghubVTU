'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [notificationsEmailEnabled, setNotificationsEmailEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({ notificationsEmailEnabled });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-xl">
          <h2 className="text-2xl font-bold text-[#0A1F44] mb-6">Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Email Notifications</span>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationsEmailEnabled}
                  onChange={(e) => setNotificationsEmailEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#F97316] transition-colors"></div>
              </label>
            </div>
            <button onClick={onSave} disabled={saving} className="btn-accent w-full">
              Save Settings
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
