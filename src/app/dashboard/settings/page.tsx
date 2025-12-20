'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, updateProfile, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || user?.fullName || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const submit = async () => {
    setMessage(null);
    setLoading(true);
    try {
      await updateProfile({ displayName });
      await refreshUser();
      setMessage({ type: 'success', text: 'Settings updated' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="max-w-xl space-y-6">
          <h1 className="text-3xl font-bold text-[#0A1F44]">Settings</h1>
          {message && (
            <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}
          <div className="card space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Display Name</label>
              <input className="input-field" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <button onClick={submit} disabled={loading} className="btn-primary w-full">
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
