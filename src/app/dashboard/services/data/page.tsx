'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { Wifi, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { purchaseData } from '@/lib/vtu';

export default function DashboardDataPage() {
  const { user, refreshUser } = useAuth();
  const [network, setNetwork] = useState('MTN');
  const [planId, setPlanId] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = !!user && network && planId && phone && amount > 0 && pin.length >= 4;

  const onSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await purchaseData({ userId: user.uid, network, planId, phone, amount, pin });
      await refreshUser();
      setPlanId('');
      setPhone('');
      setAmount(0);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold text-[#0A1F44] mb-4 flex items-center gap-3">
            <Wifi size={40} className="text-[#F97316]" />
            Data
          </h1>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Network</label>
              <select className="input-field" value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option>MTN</option>
                <option>Glo</option>
                <option>Airtel</option>
                <option>9mobile</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan ID</label>
              <input className="input-field" value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder="Enter plan ID" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₦)</label>
              <input type="number" className="input-field" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction PIN</label>
              <input type="password" className="input-field" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter PIN" />
            </div>
            <button className="btn-accent w-full flex items-center justify-center gap-2" disabled={!canSubmit || loading} onClick={onSubmit}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Buy Data
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
