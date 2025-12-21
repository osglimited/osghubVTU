'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import toast from 'react-hot-toast';
import type { User } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (!authUser) {
        router.push('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      setUser(userDoc.data() as User);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleChangePassword = async () => {
    try {
      if (auth.currentUser && newPassword.length >= 8) {
        await updatePassword(auth.currentUser, newPassword);
        toast.success('Password changed');
        setNewPassword('');
        setEditing(false);
      } else {
        toast.error('Password must be 8+ characters');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC]"><Navbar /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold text-[#0A1F44]">Profile Settings</h1>

          {/* Profile Info */}
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-[#0A1F44]">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Full Name</label>
                <p className="font-semibold text-[#0A1F44]">{user?.fullName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Username</label>
                <p className="font-semibold text-[#0A1F44]">@{user?.username}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <p className="font-semibold text-[#0A1F44]">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <p className="font-semibold text-[#0A1F44]">{user?.phone}</p>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-[#0A1F44]">Change Password</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-accent">
                Change Password
              </button>
            ) : (
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                />
                <button onClick={handleChangePassword} className="btn-accent w-full">
                  Save Password
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary w-full">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
