'use client';

import { useState } from 'react';
import { Wifi } from 'lucide-react';
import { useService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { purchaseData } from '@/lib/services';
import TransactionPinModal from '@/components/dashboard/TransactionPinModal';
import { DATA_PLANS, DataPlan } from '@/data/dataPlans';

const NETWORKS = [
  { label: 'MTN', value: 'MTN', id: 1 },
  { label: 'Glo', value: 'GLO', id: 2 },
  { label: 'Airtel', value: 'AIRTEL', id: 3 },
  { label: '9mobile', value: '9MOBILE', id: 4 },
];

export default function DataPage() {
  const { user } = useAuth();
  const { service, loading, error } = useService('data');
  const [network, setNetwork] = useState(NETWORKS[0]);
  const [phone, setPhone] = useState('');
  // Initialize with empty or first plan of first network
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | undefined>(
    DATA_PLANS[NETWORKS[0].value]?.[0]
  );
  const [showPinModal, setShowPinModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !selectedPlan) return;
    setShowPinModal(true);
  };

  const onPinSuccess = async () => {
    if (!user || !service || !selectedPlan) return;
    
    setProcessing(true);
    try {
      // Use variation_id as the planId for the backend provider
      const planId = selectedPlan.variation_id;
      const result = await purchaseData(
        user.uid,
        selectedPlan.price,
        {
          planId,
          phone,
          networkId: network.id
        }
      );
      if (result.success) {
        alert('Data purchase successful!');
        setPhone('');
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
                <Wifi size={40} className="text-[#F97316]" />
                {service.name}
              </h1>
              <p className="text-gray-600 text-lg mb-8">{service.description || 'Buy affordable data bundles.'}</p>

              <form onSubmit={handlePurchase} className="card space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Network</label>
                  <select 
                    className="input-field"
                    value={network.value}
                    onChange={(e) => {
                      const n = NETWORKS.find(nn => nn.value === e.target.value) || NETWORKS[0];
                      setNetwork(n);
                      const plans = DATA_PLANS[n.value] || DATA_PLANS[NETWORKS[0].value];
                      setSelectedPlan(plans[0]);
                    }}
                  >
                    {NETWORKS.map(n => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="080..." 
                    className="input-field"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    required
                    minLength={11}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Plan</label>
                  <select 
                    className="input-field"
                    value={selectedPlan?.variation_id || ''}
                    onChange={(e) => {
                        const plans = DATA_PLANS[network.value] || [];
                        const plan = plans.find(p => p.variation_id === e.target.value) || plans[0];
                        setSelectedPlan(plan);
                    }}
                  >
                    {(DATA_PLANS[network.value] || []).map(plan => (
                      <option key={plan.variation_id} value={plan.variation_id}>
                        {plan.name} - ₦{plan.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
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
                  {processing ? 'Processing...' : service.enabled ? `Buy ${selectedPlan.name.split('(')[0]}` : 'Coming soon'}
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
