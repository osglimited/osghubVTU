'use client';

import { useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import { useService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { processTransaction, getServicePlans } from '@/lib/services';
import TransactionPinModal from '@/components/dashboard/TransactionPinModal';

type CablePlan = { name: string; variation_id: string; priceUser: number };

export default function CablePage() {
  const { user } = useAuth();
  const { service, loading, error } = useService('tv');
  const [providers, setProviders] = useState<{ label: string; value: string }[]>([]);
  const [plansByProvider, setPlansByProvider] = useState<Record<string, CablePlan[]>>({});
  const [provider, setProvider] = useState('');
  const [planId, setPlanId] = useState('');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      const rows = await getServicePlans();
      if (!mounted) return;
      const cable = rows.filter(r => (r as any).type === 'cable' && r.metadata && r.metadata.variation_id && r.metadata.service_id);
      const byProv: Record<string, CablePlan[]> = {};
      const provs: { label: string; value: string }[] = [];
      for (const r of cable) {
        const sid = String(r.metadata?.service_id || '').toLowerCase();
        const label = r.network || sid;
        if (!provs.find(p => p.value === sid)) provs.push({ label, value: sid });
        const varId = String(r.metadata?.variation_id || '');
        const item = { name: r.name || varId, variation_id: varId, priceUser: Number(r.priceUser || 0) };
        byProv[sid] = byProv[sid] ? [...byProv[sid], item] : [item];
      }
      setProviders(provs);
      setPlansByProvider(byProv);
      const firstProv = provs[0]?.value || '';
      setProvider(firstProv);
      const firstPlan = (byProv[firstProv] || [])[0];
      setPlanId(firstPlan?.variation_id || '');
      setAmount(firstPlan ? String(firstPlan.priceUser || '') : '');
    };
    loadPlans();
    return () => { mounted = false; };
  }, []);

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartcardNumber || !amount || !planId || !provider) return;
    setShowPinModal(true);
  };

  const onPinSuccess = async () => {
    if (!user || !service) return;
    
    setProcessing(true);
    try {
      const result = await processTransaction(
        user.uid,
        Number(amount),
        'cable',
        {
          serviceId: provider,
          customerId: smartcardNumber,
          variationId: planId
        }
      );

      if (result.success) {
        alert('Cable subscription successful!');
        setSmartcardNumber('');
        setAmount('');
      } else {
        alert(`Transaction failed: ${result.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="card text-center py-12">Loading service...</div>
          ) : error ? (
            <div className="card text-center py-12 text-destructive">Error loading service: {error}</div>
          ) : !service ? (
            <div className="card text-center py-12">Service not available</div>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-[#0A1F44] mb-4 flex items-center gap-3">
                <Tv size={40} className="text-[#F97316]" />
                {service.name}
              </h1>
              <p className="text-gray-600 text-lg mb-8">{service.description || 'Subscribe to your favorite cable TV channels.'}</p>

              <form onSubmit={handlePurchase} className="card space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Provider</label>
                  <select 
                    className="input-field"
                    value={provider}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProvider(val);
                      const firstPlan = (plansByProvider[val] || [])[0];
                      setPlanId(firstPlan?.variation_id || '');
                      setAmount(firstPlan ? String(firstPlan.priceUser || '') : '');
                    }}
                  >
                    {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Package</label>
                  <select
                    className="input-field"
                    value={planId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPlanId(v);
                      const plan = (plansByProvider[provider] || []).find(pl => pl.variation_id === v);
                      setAmount(plan ? String(plan.priceUser || '') : amount);
                    }}
                  >
                    {(plansByProvider[provider] || []).map(pl => (
                      <option key={pl.variation_id} value={pl.variation_id}>
                        {pl.name} - ₦{Number(pl.priceUser || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Smartcard / IUC Number</label>
                  <input 
                    type="text" 
                    placeholder="Enter number" 
                    className="input-field"
                    value={smartcardNumber}
                    onChange={(e) => setSmartcardNumber(e.target.value.replace(/\D/g, ''))}
                    required
                    minLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₦)</label>
                  <input 
                    type="number" 
                    className="input-field"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1000"
                    required
                    placeholder="Plan amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter plan amount (e.g. 3500)</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center text-sm text-blue-900">
                    <span>Wallet Balance:</span>
                    <span className="font-bold">₦{user?.walletBalance?.toLocaleString() ?? '0.00'}</span>
                </div>

                <button 
                    type="submit" 
                    className="btn-accent w-full" 
                    disabled={!service.enabled || processing}
                >
                  {processing ? 'Processing...' : service.enabled ? 'Subscribe' : 'Coming soon'}
                </button>
              </form>
            </>
          )}

          <TransactionPinModal 
            isOpen={showPinModal} 
            onClose={() => setShowPinModal(false)} 
            onSuccess={onPinSuccess}
          />
        </div>
  );
}
