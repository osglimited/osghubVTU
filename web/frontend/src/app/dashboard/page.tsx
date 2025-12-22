'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Wifi, Tv, Zap, Plus, LogOut, CreditCard, GraduationCap, Eye, EyeOff, Wallet, ArrowRightLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [showMain, setShowMain] = useState(false);
  const [showCashback, setShowCashback] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!user.isVerified) {
      router.push('/verify');
    }
    const sm = sessionStorage.getItem('showMainBalance') === 'true';
    const sc = sessionStorage.getItem('showCashbackBalance') === 'true';
    const sr = sessionStorage.getItem('showReferralBalance') === 'true';
    setShowMain(sm);
    setShowCashback(sc);
    setShowReferral(sr);
  }, [user, loading, router]);

  const handleWithdraw = async (type: 'referral' | 'cashback') => {
    if (!user || processingWithdrawal) return;
    
    const amount = type === 'referral' ? (user.referralBalance ?? 0) : (user.cashbackBalance ?? 0);
    if (amount <= 0) {
      alert('Insufficient balance to withdraw');
      return;
    }

    if (!confirm(`Are you sure you want to withdraw ₦${amount.toLocaleString()} to your main wallet?`)) {
        return;
    }

    setProcessingWithdrawal(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User does not exist!");

        const userData = userDoc.data();
        const currentBalance = type === 'referral' ? (userData.referralBalance || 0) : (userData.cashbackBalance || 0);
        
        if (currentBalance < amount) {
            throw new Error("Insufficient balance during transaction");
        }

        const newMainBalance = (userData.walletBalance || 0) + amount;
        
        transaction.update(userRef, {
            [type === 'referral' ? 'referralBalance' : 'cashbackBalance']: 0,
            walletBalance: newMainBalance
        });
      });
      alert(`Successfully withdrew ₦${amount.toLocaleString()} to main wallet!`);
    } catch (error) {
      console.error("Withdrawal failed: ", error);
      alert("Withdrawal failed. Please try again.");
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="py-12">
        <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const actions = [
    { icon: Smartphone, label: 'Airtime', href: '/dashboard/services/airtime' },
    { icon: Wifi, label: 'Data', href: '/dashboard/services/data' },
    { icon: Tv, label: 'Cable TV', href: '/dashboard/services/cable' },
    { icon: Zap, label: 'Electricity', href: '/dashboard/services/electricity' },
    { icon: GraduationCap, label: 'Exam PINs', href: '/dashboard/services/exam-pins' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0A1F44]">Welcome, {user.fullName}!</h1>
            <p className="text-gray-600">@{user.username}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push('/');
            }}
            className="flex items-center gap-2 text-red-500 hover:text-red-700"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-r from-[#0A1F44] to-[#020617] text-white rounded-2xl p-8 shadow-lg">
            <p className="text-blue-200 mb-2">Total Balance</p>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-5xl font-bold">{showMain ? `₦${(user.walletBalance || 0).toLocaleString()}` : '••••••'}</h2>
              <button className="p-2 rounded-md bg-white/10" onClick={() => { setShowMain(s => !s); sessionStorage.setItem('showMainBalance', String(!showMain)); }}>
                {showMain ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition">
              <Plus size={20} /> Fund Wallet
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="text-[#F97316]" />
              <h3 className="font-semibold text-[#0A1F44]">Account Status</h3>
            </div>
            <p className="text-sm text-gray-600">Status: <span className="font-medium capitalize">{user.accountStatus}</span></p>
            <p className="text-sm text-gray-600 mt-2">Verified: <span className="font-medium">{user.isVerified ? 'Yes' : 'No'}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-[#0A1F44]">Cashback Balance</h3>
              <button className="p-2 rounded-md border" onClick={() => { setShowCashback(s => !s); sessionStorage.setItem('showCashbackBalance', String(!showCashback)); }}>
                {showCashback ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <div className="text-3xl font-bold text-[#0A1F44] mb-2">{showCashback ? `₦${(user.cashbackBalance || 0).toLocaleString()}` : '••••••'}</div>
            <p className="text-sm text-gray-500">Earned from transactions (3% per transaction)</p>
            <div className="mt-3">
              <button
                className="bg-[#F97316] hover:bg-[#ea6d0f] text-white px-4 py-2 rounded-md text-sm"
                onClick={() => handleWithdraw('cashback')}
                disabled={processingWithdrawal || (user.cashbackBalance || 0) <= 0}
              >
                Transfer to Wallet
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-[#0A1F44]">Referral Balance</h3>
              <button className="p-2 rounded-md border" onClick={() => { setShowReferral(s => !s); sessionStorage.setItem('showReferralBalance', String(!showReferral)); }}>
                {showReferral ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <div className="text-3xl font-bold text-[#0A1F44] mb-2">{showReferral ? `₦${(user.referralBalance || 0).toLocaleString()}` : '••••••'}</div>
            <p className="text-sm text-gray-500">Earned from referrals</p>
            <div className="mt-3">
              <button
                className="bg-[#F97316] hover:bg-[#ea6d0f] text-white px-4 py-2 rounded-md text-sm"
                onClick={() => handleWithdraw('referral')}
                disabled={processingWithdrawal || (user.referralBalance || 0) <= 0}
              >
                Transfer to Wallet
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-[#0A1F44] mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {actions.map(({ icon: Icon, label, href }) => (
              <Link key={label} href={href}>
                <div className="rounded-xl bg-white border border-gray-200 p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
                  <Icon size={40} className="text-[#F97316] mx-auto mb-3" />
                  <p className="font-semibold text-[#0A1F44]">{label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="text-[#F97316]" />
            <h3 className="text-2xl font-bold text-[#0A1F44]">Recent Transactions</h3>
          </div>
          <div className="text-center py-12 text-gray-500">
            <p>No transactions yet</p>
          </div>
        </div>
    </div>
  );
}
