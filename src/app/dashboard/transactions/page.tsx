'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTransactions } from '@/lib/transactions';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const res = await getUserTransactions(user.uid);
      if (mounted) {
        setTxs(res);
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  return (
    <DashboardGuard>
      <DashboardLayout>
        <h2 className="text-2xl font-bold text-[#0A1F44] mb-4">Transaction History</h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {loading ? (
            <div>Loading...</div>
          ) : txs.length === 0 ? (
            <div className="text-gray-500">No transactions yet</div>
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
      </DashboardLayout>
    </DashboardGuard>
  );
}
