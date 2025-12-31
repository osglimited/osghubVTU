'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Wallet, CreditCard, ArrowRightLeft, Eye, EyeOff, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getWalletBalance, transferWallet, initiateFunding } from '@/lib/services';
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
  const [processing, setProcessing] = useState<'cashback' | 'referral' | null>(null);
  const [fundAmount, setFundAmount] = useState<number>(1000);
  const [funding, setFunding] = useState(false);

  const startFunding = async () => {
    if (!user || funding) return;
    if (!fundAmount || fundAmount <= 0) return alert('Enter a valid amount');
    setFunding(true);
    try {
      const result = await initiateFunding(fundAmount);
      if (result.error) {
        alert(result.error);
      } else if (result.link) {
        window.location.href = result.link;
      } else {
        alert('No checkout link returned');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to start payment');
    } finally {
      setFunding(false);
    }
  };

  const transfer = async (type: 'referral' | 'cashback') => {
    if (!user || processing) return;
    const amount = type === 'referral' ? balances.referralBalance : balances.cashbackBalance;
    if (amount <= 0) return;
    
    setProcessing(type);
    try {
      const result = await transferWallet(amount, type);
      if (result.success) {
        alert(`Transferred ${format(amount)} to main wallet`);
        // Refresh balance
        fetchBalance();
      } else {
        alert(result.message);
      }
    } catch (e: any) {
      alert(e.message || 'Transfer failed');
    } finally {
      setProcessing(null);
    }
  };

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
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={fundAmount}
                  onChange={(e) => setFundAmount(Number(e.target.value))}
                  className="px-3 py-2 rounded-md bg-white/10 text-white placeholder:text-white/50 border border-white/20 w-40"
                  placeholder="Amount"
                />
                <button
                  className="bg-[#F97316] hover:bg-[#F97316]/90 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  onClick={startFunding}
                  disabled={funding}
                  title="Pay via Flutterwave (Card/Bank/USSD)"
                >
                  <CreditCard size={16} /> {funding ? 'Starting...' : 'Pay via Flutterwave'}
                </button>
              </div>
              <p className="text-xs text-blue-200">Payment options: Card • Bank Transfer • USSD</p>
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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-[#0A1F44]">{showCashback ? format(balances.cashbackBalance) : '••••••'}</h2>
            <button className="p-2 rounded-md border" onClick={() => setShowCashback(s => !s)}>
              {showCashback ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          <p className="text-sm text-gray-500">Earned from transactions</p>
          <div className="mt-4">
            <button
              className="bg-[#F97316] hover:bg-[#ea6d0f] text-white px-4 py-2 rounded-md text-sm"
              onClick={() => transfer('cashback')}
              disabled={processing === 'cashback' || balances.cashbackBalance <= 0}
            >
              Transfer to Wallet
            </button>
          </div>
        </div>

        {/* Referral Wallet */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Referral Earnings</h3>
            <div className="p-2 bg-purple-50 rounded-full">
              <ArrowRightLeft className="text-purple-600" size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-[#0A1F44]">{showReferral ? format(balances.referralBalance) : '••••••'}</h2>
            <button className="p-2 rounded-md border" onClick={() => setShowReferral(s => !s)}>
              {showReferral ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          <p className="text-sm text-gray-500">Earned from referrals</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Referral Code:</span>
            <span className="font-mono text-sm">{referralCode}</span>
            <button
              className="p-1 rounded-md border text-gray-700"
              onClick={() => navigator.clipboard.writeText(referralCode)}
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="mt-4">
            <button
              className="bg-[#F97316] hover:bg-[#ea6d0f] text-white px-4 py-2 rounded-md text-sm"
              onClick={() => transfer('referral')}
              disabled={processing === 'referral' || balances.referralBalance <= 0}
            >
              Transfer to Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
