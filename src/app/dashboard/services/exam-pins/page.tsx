'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { processPurchaseWithBatch } from '@/lib/transactions';

export default function ExamPinsServicePage() {
  const { user, verifyTransactionPin } = useAuth();
  const [product, setProduct] = useState('WAEC');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const submit = async () => {
    setMessage(null);
    if (!user) return;
    if (!quantity || quantity <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid quantity' });
      return;
    }
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid amount' });
      return;
    }
    const ok = await verifyTransactionPin(pin);
    if (!ok) {
      setMessage({ type: 'error', text: 'Invalid transaction PIN' });
      return;
    }

    setLoading(true);
    try {
      const { nextBalance } = await processPurchaseWithBatch(
        user.uid,
        'education',
        amount,
        { product, quantity },
        user.walletBalance || 0
      );
      setMessage({ type: 'success', text: `Exam PINs purchase completed. New balance: ₦${nextBalance.toLocaleString()}` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Purchase failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="max-w-xl space-y-6">
          <h1 className="text-3xl font-bold text-[#0A1F44]">Exam PINs</h1>
          {message && (
            <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}
          <div className="card space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Product</label>
              <select className="input-field" value={product} onChange={e => setProduct(e.target.value)}>
                <option>WAEC</option>
                <option>NECO</option>
                <option>JAMB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Quantity</label>
              <input type="number" className="input-field" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Amount (₦)</label>
              <input type="number" className="input-field" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Transaction PIN</label>
              <input type="password" className="input-field" value={pin} onChange={e => setPin(e.target.value)} />
            </div>
            <button onClick={submit} disabled={loading} className="btn-primary w-full">
              {loading ? 'Processing...' : 'Buy PINs'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
