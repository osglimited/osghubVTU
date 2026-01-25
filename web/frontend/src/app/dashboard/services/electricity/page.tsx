'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useService } from '@/hooks/useServices';
import { processTransaction, getServicePlans } from '@/lib/services';
import TransactionPinModal from '@/components/dashboard/TransactionPinModal';

export default function ElectricityPage() {
  const { user, refreshUser } = useAuth();
  const { service, loading, error } = useService('electricity');
  const [providers, setProviders] = useState<{ label: string; value: string }[]>([]);
  const [plansByProvider, setPlansByProvider] = useState<Record<string, Array<{ name: string; variation_id: string; priceUser: number }>>>({});
  const [provider, setProvider] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [variationId, setVariationId] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      const rows = await getServicePlans();
      if (!mounted) return;
      const electricity = rows.filter(r => (r as any).type === 'electricity' && r.metadata && r.metadata.service_id);
      const byProv: Record<string, Array<{ name: string; variation_id: string; priceUser: number }>> = {};
      const provs: { label: string; value: string }[] = [];
      for (const r of electricity) {
        const sid = String(r.metadata?.service_id || '').toLowerCase();
        const label = r.network || sid;
        if (!provs.find(p => p.value === sid)) provs.push({ label, value: sid });
        const varId = String(r.metadata?.variation_id || '').toLowerCase();
        const item = { name: r.name || varId || 'Plan', variation_id: varId, priceUser: Number(r.priceUser || 0) };
        byProv[sid] = byProv[sid] ? [...byProv[sid], item] : [item];
      }
      setProviders(provs);
      setPlansByProvider(byProv);
      const firstProv = provs[0]?.value || '';
      setProvider(firstProv);
      const firstPlan = (byProv[firstProv] || [])[0];
      setVariationId(firstPlan?.variation_id || '');
      setAmount(firstPlan ? String(firstPlan.priceUser || '') : '');
    };
    loadPlans();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (user.walletBalance < Number(amount)) {
      alert('Insufficient wallet balance');
      return;
    }

    setShowPinModal(true);
  };

  const onPinSuccess = async () => {
    if (!user || !service) return;
    setProcessing(true);
    try {
      const result = await processTransaction(
        user.uid,
        Number(amount),
        'electricity',
        { serviceId: provider, customerId: meterNumber, variationId }
      );
      
      if (result.success) {
        alert('Payment successful!');
        setMeterNumber('');
        setAmount('');
        refreshUser();
      } else {
        alert(`Transaction failed: ${result.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading service...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!service) return <div className="p-8 text-center">Service not available</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-[#0A1F44] mb-6 flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Zap className="text-orange-600" size={24} />
        </div>
        Electricity Bill
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">
            Wallet Balance: <span className="font-bold">₦{user?.walletBalance.toLocaleString()}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Disco</label>
            <select 
              value={provider}
              onChange={(e) => {
                const val = e.target.value;
                setProvider(val);
                const firstPlan = (plansByProvider[val] || [])[0];
                setVariationId(firstPlan?.variation_id || '');
                setAmount(firstPlan ? String(firstPlan.priceUser || '') : '');
              }}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
            >
              {providers.map(p => (<option key={p.value} value={p.value}>{p.label}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
            <select 
              value={variationId}
              onChange={(e) => {
                const v = e.target.value;
                setVariationId(v);
                const plan = (plansByProvider[provider] || []).find(pl => pl.variation_id === v);
                setAmount(plan ? String(plan.priceUser || '') : amount);
              }}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
            >
              {(plansByProvider[provider] || []).map(pl => (
                <option key={pl.variation_id} value={pl.variation_id}>
                  {pl.name || (pl.variation_id === 'prepaid' ? 'Prepaid' : pl.variation_id)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meter Number</label>
            <input 
              type="text" 
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              placeholder="Enter meter number"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₦)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="100"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={!service.enabled || processing}
            className="w-full py-3 px-4 bg-[#0A1F44] text-white rounded-lg font-medium hover:bg-[#0A1F44]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Pay Bill'}
          </button>
        </form>
      </div>

      <TransactionPinModal 
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={onPinSuccess}
      />
    </div>
  );
}
