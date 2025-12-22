'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Wallet, CreditCard, ArrowRightLeft } from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-[#0A1F44]">My Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Wallet */}
        <div className="bg-[#0A1F44] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-200 mb-2">Available Balance</p>
            <h2 className="text-4xl font-bold mb-6">₦{user?.walletBalance?.toLocaleString() ?? '0.00'}</h2>
            <div className="flex gap-3">
              <button className="bg-[#F97316] hover:bg-[#F97316]/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                <CreditCard size={16} /> Fund Wallet
              </button>
            </div>
          </div>
          <Wallet className="absolute right-4 bottom-4 text-white/10" size={120} />
        </div>

        {/* Bonus Wallet */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Cashback Balance</h3>
            <div className="p-2 bg-green-50 rounded-full">
              <ArrowRightLeft className="text-green-600" size={20} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#0A1F44] mb-2">₦{user?.cashbackBalance?.toLocaleString() ?? '0.00'}</h2>
          <p className="text-sm text-gray-500">Earned from transactions</p>
        </div>

        {/* Referral Wallet */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Referral Earnings</h3>
            <div className="p-2 bg-purple-50 rounded-full">
              <ArrowRightLeft className="text-purple-600" size={20} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#0A1F44] mb-2">₦{user?.referralBalance?.toLocaleString() ?? '0.00'}</h2>
          <p className="text-sm text-gray-500">Earned from referrals</p>
        </div>
      </div>
    </div>
  );
}
