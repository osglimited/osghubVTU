'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { Tv, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { purchaseCable } from '@/lib/vtu';

export default function DashboardCablePage() {
  const { user, refreshUser } = useAuth();
  const [provider, setProvider] = useState('DStv');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [packageId, setPackageId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = !!user && provider && smartcardNumber && packageId && amount > 0 && pin.length >= 4;

  const onSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await purchaseCable({ userId: user.uid, provider, smartcardNumber, packageId, amount, pin });
      await refreshUser();
      setSmartcardNumber('');
      setPackageId('');
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
            <Tv size={40} className="text-[#F97316]" />
            Cable TV
          </h1>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              <select className="input-field" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option>DStv</option>
                <option>GOtv</option>
                <option>Startimes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Smartcard Number</label>
              <input className="input-field" value={smartcardNumber} onChange={(e) => setSmartcardNumber(e.target.value)} placeholder="Enter smartcard number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Package ID</label>
              <input className="input-field" value={packageId} onChange={(e) => setPackageId(e.target.value)} placeholder="Enter package ID" />
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
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Activate Subscription
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
