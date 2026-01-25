import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransactionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'success' | 'error';
  title: string;
  message: string;
  transactionId?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function TransactionResultModal({
  isOpen,
  onClose,
  status,
  title,
  message,
  transactionId,
  actionLabel = 'Close',
  onAction,
}: TransactionResultModalProps) {
  if (!isOpen) return null;

  const isSuccess = status === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            {isSuccess ? (
              <CheckCircle className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
          </div>
          
          <h3 className={`text-xl font-bold mb-2 ${
            isSuccess ? 'text-green-700' : 'text-red-700'
          }`}>
            {title}
          </h3>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            {message}
          </p>

          {transactionId && (
             <div className="bg-gray-50 px-3 py-2 rounded-md mb-6 w-full">
               <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Transaction ID</span>
               <p className="font-mono text-sm text-gray-800 break-all select-all">{transactionId}</p>
             </div>
          )}
          
          <div className="w-full space-y-3">
            <Button 
              onClick={() => {
                if (onAction) onAction();
                onClose();
              }} 
              className={`w-full ${
                isSuccess 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {actionLabel}
            </Button>
            
            {!isSuccess && (
               <Button variant="ghost" onClick={onClose} className="w-full text-gray-500 hover:text-gray-700">
                 Cancel
               </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
