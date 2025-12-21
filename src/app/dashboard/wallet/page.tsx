'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { fundWallet } from '@/lib/wallet';
import { Loader2 } from 'lucide-react';

export default function WalletPage() {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const canSubmit = !!user && amount > 0;

  const onFund = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await fundWallet(user.uid, amount, 'test-provider');
      await refreshUser();
      setAmount(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-[#0A1F44] mb-4">Fund Wallet</h2>
            <div className="space-y-4">
              <input
                type="number"
                min={0}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input-field w-full"
                placeholder="Amount (₦)"
              />
              <button
                onClick={onFund}
                disabled={!canSubmit || loading}
                className="btn-accent w-full flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Fund Wallet
              </button>
              <p className="text-sm text-gray-500">
                This flow is logic-ready and records a funding transaction. Plug your payment provider later.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
