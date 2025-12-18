'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Smartphone, Wifi, Tv, Zap, GraduationCap, CreditCard, Plus, LogOut } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { User } from '@/types';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (!authUser) {
        router.push('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      const userData = userDoc.data() as User | undefined;

      if (!userData?.isVerified) {
        router.push('/verify');
        return;
      }

      setUser(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success('Logged out');
      router.push('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC]"><Navbar /></div>;

  const services = [
    { icon: Smartphone, label: 'Airtime', href: '/services/airtime' },
    { icon: Wifi, label: 'Data', href: '/services/data' },
    { icon: Tv, label: 'Cable TV', href: '/services/tv' },
    { icon: Zap, label: 'Electricity', href: '/services/electricity' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#0A1F44]">Welcome, {user?.fullName}!</h1>
            <p className="text-gray-600">@{user?.username}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-700">
            <LogOut size={20} /> Logout
          </button>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-r from-[#0A1F44] to-[#020617] text-white rounded-2xl p-8 shadow-lg">
          <p className="text-blue-200 mb-2">Total Balance</p>
          <h2 className="text-5xl font-bold mb-8">₦{(user?.walletBalance || 0).toLocaleString()}</h2>
          <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition">
            <Plus size={20} /> Fund Wallet
          </button>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-2xl font-bold text-[#0A1F44] mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Link key={service.label} href={service.href}>
                  <div className="card text-center hover:shadow-lg cursor-pointer">
                    <Icon size={40} className="text-[#F97316] mx-auto mb-3" />
                    <p className="font-semibold text-[#0A1F44]">{service.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h3 className="text-2xl font-bold text-[#0A1F44] mb-6">Recent Transactions</h3>
          <div className="text-center py-12 text-gray-500">
            <p>No transactions yet</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
