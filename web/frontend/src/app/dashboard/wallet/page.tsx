'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getWalletBalance } from '@/lib/services';
import { useToast } from '@/components/ui/toast'; // Assuming we have toast, otherwise use alert

export default function WalletPage() {
  const { user } = useAuth();
  const [showMain, setShowMain] = useState(false);
  const [showCashback, setShowCashback] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  
  // Local state for balance to reflect backend source of truth
  const [balances, setBalances] = useState({
    mainBalance: user?.walletBalance || 0,
    cashbackBalance: user?.cashbackBalance || 0,
    referralBalance: user?.referralBalance || 0
  });
  
  // Initial fetch from backend
  const fetchBalance = async () => {
    try {
      const data = await getWalletBalance();
      if (data) {
        setBalances(data);
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
    }
  };

  useEffect(() => {
    // Update balances from context if available (optimistic/fallback)
    if (user) {
      setBalances(prev => ({
        ...prev,
        mainBalance: user.walletBalance ?? prev.mainBalance,
        cashbackBalance: user.cashbackBalance ?? prev.cashbackBalance,
        referralBalance: user.referralBalance ?? prev.referralBalance
      }));
    }
    
    // Fetch fresh data from backend
    fetchBalance();
  }, [user]);

  useEffect(() => {
    setShowMain(sessionStorage.getItem('showMainBalance') === 'true');
    setShowCashback(sessionStorage.getItem('showCashbackBalance') === 'true');
    setShowReferral(sessionStorage.getItem('showReferralBalance') === 'true');
  }, []);
  useEffect(() => {
    sessionStorage.setItem('showMainBalance', String(showMain));
  }, [showMain]);
  useEffect(() => {
    sessionStorage.setItem('showCashbackBalance', String(showCashback));
  }, [showCashback]);
  useEffect(() => {
    sessionStorage.setItem('showReferralBalance', String(showReferral));
  }, [showReferral]);
  
  const format = (n?: number) => `₦${(n || 0).toLocaleString()}`;
  const referralCode = user?.referral || user?.username || user?.uid || 'N/A';

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-[#0A1F44]">My Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Wallet */}
        <div className="bg-[#0A1F44] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-200 mb-2">Available Balance</p>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-4xl font-bold">{showMain ? format(balances.mainBalance) : '••••••'}</h2>
              <button className="p-2 rounded-md bg-white/10" onClick={() => setShowMain(s => !s)}>
                {showMain ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <div className="flex gap-3"></div>
          </div>
          <Wallet className="absolute right-4 bottom-4 text-white/10" size={120} />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700">Wallet</h3>
          <p className="text-sm text-gray-500">Transactions are limited to verified deposits.</p>
        </div>
      </div>
    </div>
  );
}
