'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserTransactions } from '@/lib/transactions';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    (async () => {
      if (user?.uid) {
        const txs = await fetchUserTransactions(user.uid);
        setTransactions(txs);
      }
    })();
  }, [user?.uid]);

  const filtered = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.status === filter;
  });

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#0A1F44]">Transactions</h1>
            <div className="flex items-center gap-2">
              {(['all','completed','pending','failed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-blue-50 ring-1 ring-blue-200 text-[#0A1F44] font-semibold' : 'bg-white border border-gray-200 text-gray-700'}`}
                >
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No transactions yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="text-[#0A1F44] font-medium capitalize">{tx.type}</div>
                    <div className="text-gray-600">₦{(tx.amount || 0).toLocaleString()}</div>
                    <div className={`text-sm ${tx.status === 'completed' ? 'text-green-600' : tx.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {tx.status}
                    </div>
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
