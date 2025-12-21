'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({ fullName, phone });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-xl">
          <h2 className="text-2xl font-bold text-[#0A1F44] mb-6">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input className="input-field w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input className="input-field w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input className="input-field w-full" value={user?.username || ''} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input className="input-field w-full" value={user?.email || ''} readOnly />
              </div>
            </div>
            <button onClick={onSave} disabled={saving} className="btn-accent w-full">
              Save Changes
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
