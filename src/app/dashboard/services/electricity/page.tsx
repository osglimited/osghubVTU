'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { Zap, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { purchaseElectricity } from '@/lib/vtu';

export default function DashboardElectricityPage() {
  const { user, refreshUser } = useAuth();
  const [disco, setDisco] = useState('Ikeja Electric');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = !!user && disco && meterNumber && amount > 0 && pin.length >= 4;

  const onSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await purchaseElectricity({ userId: user.uid, disco, meterNumber, amount, pin });
      await refreshUser();
      setMeterNumber('');
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
            <Zap size={40} className="text-[#F97316]" />
            Electricity
          </h1>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Disco</label>
              <select className="input-field" value={disco} onChange={(e) => setDisco(e.target.value)}>
                <option>Ikeja Electric</option>
                <option>Eko Electric</option>
                <option>Abuja Electric</option>
                <option>Port Harcourt Electric</option>
                <option>Ibadan Electric</option>
                <option>Jos Electric</option>
                <option>Enugu Electric</option>
                <option>Kano Electric</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meter Number</label>
              <input className="input-field" value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} placeholder="Enter meter number" />
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
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Buy Electricity
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
