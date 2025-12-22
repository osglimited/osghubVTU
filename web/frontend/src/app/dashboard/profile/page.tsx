'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { User, Phone, Mail, AtSign } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName,
        phone,
        updatedAt: new Date().toISOString()
      });
      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error: any) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-[#0A1F44]">Profile Settings</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0A1F44]">Personal Information</h2>
          <button 
            onClick={() => {
              if (editing) handleUpdate();
              else setEditing(true);
            }}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              editing 
                ? 'bg-[#0A1F44] text-white hover:bg-[#0A1F44]/90' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {loading ? 'Saving...' : editing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-500 flex items-center gap-2">
              <User size={16} /> Full Name
            </label>
            {editing ? (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
              />
            ) : (
              <p className="font-medium text-gray-900 text-lg">{user?.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500 flex items-center gap-2">
              <AtSign size={16} /> Username
            </label>
            <p className="font-medium text-gray-900 text-lg bg-gray-50 p-2 rounded border border-transparent">
              @{user?.username}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500 flex items-center gap-2">
              <Mail size={16} /> Email Address
            </label>
            <p className="font-medium text-gray-900 text-lg bg-gray-50 p-2 rounded border border-transparent">
              {user?.email}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500 flex items-center gap-2">
              <Phone size={16} /> Phone Number
            </label>
            {editing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
              />
            ) : (
              <p className="font-medium text-gray-900 text-lg">{user?.phone || 'Not set'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
