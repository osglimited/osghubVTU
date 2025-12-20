'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { generateHash } from '@/lib/crypto';

export default function SecurityPage() {
  const { user, updateProfile, verifyTransactionPin, resetPassword, refreshUser } = useAuth();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const changePin = async () => {
    setMessage(null);
    if (!user) return;
    setLoading(true);
    try {
      const ok = await verifyTransactionPin(currentPin);
      if (!ok) {
        setMessage({ type: 'error', text: 'Current PIN is incorrect' });
      } else {
        const pinHash = await generateHash(newPin);
        await updateProfile({ pinHash });
        await refreshUser();
        setMessage({ type: 'success', text: 'Transaction PIN updated' });
        setCurrentPin('');
        setNewPin('');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'PIN update failed' });
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async () => {
    if (!user?.email) return;
    setMessage(null);
    try {
      await resetPassword(user.email);
      setMessage({ type: 'success', text: 'Password reset email sent' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not send reset email' });
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="max-w-xl space-y-6">
          <h1 className="text-3xl font-bold text-[#0A1F44]">Security</h1>
          {message && (
            <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-[#0A1F44]">Change Transaction PIN</h2>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Current PIN</label>
              <input type="password" className="input-field" value={currentPin} onChange={e => setCurrentPin(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">New PIN</label>
              <input type="password" className="input-field" value={newPin} onChange={e => setNewPin(e.target.value)} />
            </div>
            <button onClick={changePin} disabled={loading} className="btn-primary w-full">
              {loading ? 'Updating...' : 'Update PIN'}
            </button>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-[#0A1F44]">Reset Password</h2>
            <p className="text-gray-600">Send a password reset link to your email.</p>
            <button onClick={sendResetEmail} className="btn-primary w-full">Send Reset Email</button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
