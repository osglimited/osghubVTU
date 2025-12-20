'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, Wifi, Tv, Zap, Plus } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserTransactions } from '@/lib/transactions';

export default function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (user?.uid) {
        const txs = await fetchUserTransactions(user.uid);
        setTransactions(txs.slice(0, 5));
      }
    })();
  }, [user?.uid]);

  const services = [
    { icon: Smartphone, label: 'Airtime', href: '/dashboard/services/airtime' },
    { icon: Wifi, label: 'Data', href: '/dashboard/services/data' },
    { icon: Tv, label: 'Cable TV', href: '/dashboard/services/cable' },
    { icon: Zap, label: 'Electricity', href: '/dashboard/services/electricity' },
  ];

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-[#0A1F44] to-[#020617] text-white rounded-2xl p-8 shadow-lg">
            <p className="text-blue-200 mb-2">Total Balance</p>
            <h2 className="text-5xl font-bold mb-8">₦{(user?.walletBalance || 0).toLocaleString()}</h2>
            <Link href="/dashboard/wallet" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition">
              <Plus size={20} /> Fund Wallet
            </Link>
          </div>

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

          <div className="card">
            <h3 className="text-2xl font-bold text-[#0A1F44] mb-6">Recent Transactions</h3>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="text-[#0A1F44] font-medium capitalize">{tx.type}</div>
                    <div className="text-gray-600">₦{(tx.amount || 0).toLocaleString()}</div>
                    <div className="text-sm">{tx.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
