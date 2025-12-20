'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function WalletPage() {
  const { user } = useAuth();

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-[#0A1F44] to-[#020617] text-white rounded-2xl p-8 shadow-lg">
            <p className="text-blue-200 mb-2">Wallet Balance</p>
            <h2 className="text-5xl font-bold mb-8">₦{(user?.walletBalance || 0).toLocaleString()}</h2>
            <div className="flex gap-3">
              <Link href="/dashboard/transactions" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition">
                View Transactions
              </Link>
              <button className="inline-flex items-center gap-2 bg-white text-[#0A1F44] px-6 py-2 rounded-lg transition opacity-80 cursor-not-allowed">
                Funding Coming Soon
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-2xl font-bold text-[#0A1F44] mb-4">About Wallet</h3>
            <p className="text-gray-600">
              Your wallet stores funds for instant VTU purchases. Funding integration will be added soon.
              For now, you can monitor your balance and transaction history.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
