'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { generateHash } from '@/lib/crypto';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { updatePassword } from 'firebase/auth';

export default function SecurityPage() {
  const { user } = useAuth();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const onChangePin = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const oldHash = await generateHash(oldPin);
      if (oldHash !== user.pinHash) {
        throw new Error('Old PIN is incorrect');
      }
      const newHash = await generateHash(newPin);
      await updateDoc(doc(db, 'users', user.uid), { pinHash: newHash, updatedAt: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (!auth.currentUser) throw new Error('Not signed in');
      await updatePassword(auth.currentUser, password);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-[#0A1F44] mb-4">Change Transaction PIN</h2>
            <div className="space-y-4">
              <input className="input-field" type="password" placeholder="Old PIN" value={oldPin} onChange={(e) => setOldPin(e.target.value)} />
              <input className="input-field" type="password" placeholder="New PIN" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
              <button onClick={onChangePin} disabled={saving} className="btn-accent w-full">Update PIN</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-[#0A1F44] mb-4">Change Password</h2>
            <div className="space-y-4">
              <input className="input-field" type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button onClick={onChangePassword} disabled={saving} className="btn-accent w-full">Update Password</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
