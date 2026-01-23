'use client';

import { GraduationCap } from 'lucide-react';
import { useService } from '@/hooks/useServices';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { processTransaction } from '@/lib/services';
import TransactionResultModal from '@/components/dashboard/TransactionResultModal';
import TransactionPinModal from '@/components/dashboard/TransactionPinModal';

export default function ExamPinsPage() {
  const { service, loading, error } = useService('exam-pins');
  const { user } = useAuth();
  
  const [selectedExam, setSelectedExam] = useState('WAEC');
  const [quantity, setQuantity] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    status: 'success' | 'error';
    title: string;
    message: string;
    transactionId?: string;
    smsInfo?: {
      cost: number;
      status: string;
      balanceCode?: string;
    };
  }>({
    open: false,
    status: 'success',
    title: '',
    message: ''
  });

  const getPrice = () => {
    // Ideally this comes from service config or backend plans
    if (selectedExam === 'WAEC') return 3500;
    if (selectedExam === 'NECO') return 1200;
    if (selectedExam === 'NABTEB') return 1000;
    return 3500;
  };

  const amount = getPrice() * quantity;

  const handlePurchase = () => {
    setPinModalOpen(true);
  };

  const onPinSuccess = async () => {
    if (!user) return;
    
    setProcessing(true);
    try {
      const result = await processTransaction(
        user.uid,
        amount,
        'exam',
        {
          examType: selectedExam,
          quantity,
          phone: user.phoneNumber || '' // Fallback if needed, though backend should have user phone
        }
      );

      if (result.success) {
        setResultModal({
          open: true,
          status: 'success',
          title: 'Purchase Successful',
          message: result.message || `Successfully purchased ${quantity} ${selectedExam} PIN(s).`,
          transactionId: result.transactionId,
          smsInfo: result.smsInfo
        });
      } else {
        setResultModal({
          open: true,
          status: 'error',
          title: 'Transaction Failed',
          message: result.message || 'Transaction failed',
          transactionId: result.transactionId
        });
      }
    } catch (err: any) {
      setResultModal({
        open: true,
        status: 'error',
        title: 'Error',
        message: err.message || 'An unexpected error occurred',
      });
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
            <GraduationCap size={40} className="text-[#F97316]" />
            {service.name}
          </h1>
          <p className="text-gray-600 text-lg mb-8">{service.description || 'Purchase exam result checker PINs instantly.'}</p>

          <div className="card space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
              <select 
                className="input-field"
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
              >
                <option value="WAEC">WAEC</option>
                <option value="NECO">NECO</option>
                <option value="NABTEB">NABTEB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <select 
                className="input-field"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <div className="input-field bg-gray-50 flex items-center font-bold text-lg">
                ₦{amount.toLocaleString()}
              </div>
            </div>

            <button 
              className="btn-accent w-full" 
              disabled={!service.enabled || processing}
              onClick={handlePurchase}
            >
              {processing ? 'Processing...' : (service.enabled ? 'Purchase PINs' : 'Coming soon')}
            </button>
          </div>
        </>
      )}

      <TransactionPinModal 
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSuccess={onPinSuccess}
      />

      <TransactionResultModal
        isOpen={resultModal.open}
        onClose={() => setResultModal(prev => ({ ...prev, open: false }))}
        status={resultModal.status}
        title={resultModal.title}
        message={resultModal.message}
        transactionId={resultModal.transactionId}
        smsInfo={resultModal.smsInfo}
        actionLabel="Done"
      />
    </div>
  );
}
