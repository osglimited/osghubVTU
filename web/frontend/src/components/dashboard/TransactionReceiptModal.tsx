import React, { useRef, useState } from 'react';
import { X, Share2, Download, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';

interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}

export default function TransactionReceiptModal({
  isOpen,
  onClose,
  transaction,
}: TransactionReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen || !transaction) return null;

  const isSuccess = transaction.status === 'success' || transaction.type === 'credit'; // Basic success check
  const date = new Date(transaction.createdAt?.seconds ? transaction.createdAt.seconds * 1000 : transaction.createdAt).toLocaleString();

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `OSGHub-Receipt-${transaction.id || 'tx'}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to download receipt:', err);
      alert('Failed to generate receipt image');
    }
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;
    setIsSharing(true);

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        if (navigator.share) {
          const file = new File([blob], `receipt-${transaction.id}.png`, { type: 'image/png' });
          try {
            await navigator.share({
              title: 'Transaction Receipt',
              text: `Transaction Receipt for ${transaction.amount}`,
              files: [file],
            });
          } catch (err) {
             console.error('Error sharing:', err);
             // Fallback if files sharing not supported or cancelled
             if ((err as Error).name !== 'AbortError') {
                alert('Sharing failed, try downloading instead.');
             }
          }
        } else {
          alert('Web Share API not supported on this browser. Downloading instead.');
          handleDownload();
        }
        setIsSharing(false);
      }, 'image/png');
    } catch (err) {
      console.error('Share generation failed:', err);
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        {/* Header Actions */}
        <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Transaction Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Receipt Content - This part gets captured */}
        <div ref={receiptRef} className="p-8 bg-white text-center relative">
            {/* Watermark/Background decoration could go here */}
            
            <div className="mb-6 flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center mb-4 shadow-lg">
                   <span className="text-white font-bold text-xl">OSG</span>
                </div>
                <h2 className="text-2xl font-bold text-[#0A1F44]">OSGHUB VTU</h2>
                <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Transaction Receipt</p>
            </div>

            <div className="border-t border-dashed border-gray-300 my-6"></div>

            <div className="mb-8">
                <p className="text-gray-500 text-sm mb-1">Total Amount</p>
                <h1 className="text-4xl font-bold text-[#0A1F44]">
                    ₦{transaction.amount?.toLocaleString()}
                </h1>
                <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                    isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                    {isSuccess ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {transaction.status?.toUpperCase() || (transaction.type === 'credit' ? 'SUCCESS' : 'PENDING')}
                </div>
            </div>

            <div className="space-y-4 text-left text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Transaction Date</span>
                    <span className="font-medium text-gray-900">{date}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Service Type</span>
                    <span className="font-medium text-gray-900 capitalize">{transaction.type}</span>
                </div>
                 {transaction.network && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Network</span>
                        <span className="font-medium text-gray-900">{transaction.network}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-medium text-gray-900 font-mono text-xs">{transaction.reference || transaction.id}</span>
                </div>
                 {transaction.description && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Description</span>
                        <span className="font-medium text-gray-900 text-right max-w-[200px]">{transaction.description}</span>
                    </div>
                )}
            </div>

            <div className="border-t border-dashed border-gray-300 my-6"></div>

            <div className="text-xs text-gray-400">
                <p>Support: support@osghub.com</p>
                <p className="mt-1">Thank you for using OSGHUB VTU</p>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleDownload} className="w-full gap-2">
            <Download size={16} />
            Download
          </Button>
          <Button onClick={handleShare} className="w-full gap-2 bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white">
            <Share2 size={16} />
            {isSharing ? 'Sharing...' : 'Share Receipt'}
          </Button>
        </div>
      </div>
    </div>
  );
}
