'use client';

import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { Smartphone, Wifi, Tv, Zap, CreditCard, GraduationCap, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getUserTransactions } from '@/lib/transactions';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, initialized, loading } = useAuth();
  const router = useRouter();
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const res = await getUserTransactions(user.uid);
      setTxs(res.slice(0, 5));
    };
    load();
  }, [user]);

  const actions = [
    { icon: Smartphone, label: 'Airtime', href: '/dashboard/services/airtime' },
    { icon: Wifi, label: 'Data', href: '/dashboard/services/data' },
    { icon: Tv, label: 'Cable TV', href: '/dashboard/services/cable' },
    { icon: Zap, label: 'Electricity', href: '/dashboard/services/electricity' },
  ];

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-r from-[#0A1F44] to-[#020617] text-white rounded-2xl p-8 shadow-lg">
              <p className="text-blue-200 mb-2">Total Balance</p>
              <h2 className="text-5xl font-bold mb-8">₦{(user?.walletBalance || 0).toLocaleString()}</h2>
              <button onClick={() => router.push('/dashboard/wallet')} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition">
                <Plus size={20} /> Fund Wallet
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="text-[#F97316]" />
                <h3 className="font-semibold text-[#0A1F44]">Account Status</h3>
              </div>
              <p className="text-sm text-gray-600">Status: <span className="font-medium capitalize">{user?.accountStatus}</span></p>
              <p className="text-sm text-gray-600 mt-2">Verified: <span className="font-medium">{user?.isVerified ? 'Yes' : 'No'}</span></p>
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
            {txs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2">Type</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="py-2 capitalize">{t.type}</td>
                        <td className="py-2">₦{Number(t.amount || 0).toLocaleString()}</td>
                        <td className="py-2 capitalize">{t.status}</td>
                        <td className="py-2">{t.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
