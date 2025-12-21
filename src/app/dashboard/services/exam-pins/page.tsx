'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { purchaseExamPins } from '@/lib/vtu';

export default function DashboardExamPinsPage() {
  const { user, refreshUser } = useAuth();
  const [examType, setExamType] = useState('WAEC');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = !!user && examType && quantity > 0 && amount > 0 && pin.length >= 4;

  const onSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await purchaseExamPins({ userId: user.uid, examType, quantity, amount, pin });
      await refreshUser();
      setQuantity(1);
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
            <FileText size={40} className="text-[#F97316]" />
            Exam PINs
          </h1>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
              <select className="input-field" value={examType} onChange={(e) => setExamType(e.target.value)}>
                <option>WAEC</option>
                <option>NECO</option>
                <option>JAMB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input type="number" min={1} className="input-field" value={quantity || ''} onChange={(e) => setQuantity(Number(e.target.value))} />
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
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Purchase PINs
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
