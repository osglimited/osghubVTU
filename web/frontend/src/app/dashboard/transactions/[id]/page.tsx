'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getWalletHistory } from '@/lib/services';
import { ArrowLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TransactionReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<any | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        const items = await getWalletHistory();
        const found = items.find((i) => String(i.id) === String(params?.id));
        setTx(found || null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, params?.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const balances = useMemo(() => {
    const before = Number(tx?.balanceBefore || 0);
    const after = Number(tx?.balanceAfter || 0);
    const amount = Number(tx?.amount || 0);
    const isDebit = String(tx?.type) === 'debit';
    return { before, after, amount, isDebit };
  }, [tx]);

  const createdMs = useMemo(() => {
    if (!tx?.createdAt) return undefined;
    return tx.createdAt._seconds ? tx.createdAt._seconds * 1000 : new Date(tx.createdAt).getTime();
  }, [tx]);

  const timeAgo = useMemo(() => {
    if (!createdMs) return '-';
    const diff = Math.max(0, now - createdMs);
    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${sec}s ago`;
    if (h > 0) return `${h}h ${m}m ${sec}s ago`;
    if (m > 0) return `${m}m ${sec}s ago`;
    return `${sec}s ago`;
  }, [createdMs, now]);

  if (loading) {
    return <div className="p-8 text-center">Loading receipt...</div>;
  }
  if (!tx) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/transactions')} className="px-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Receipt</h1>
        </div>
        <Card className="p-6">
          <p className="text-gray-600">Transaction not found</p>
        </Card>
      </div>
    );
  }

  const statusOk = String(tx.status) === 'success';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push('/dashboard/transactions')} className="px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Transaction Receipt</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusOk ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {statusOk ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className={`font-semibold ${statusOk ? 'text-green-700' : 'text-red-700'}`}>{tx.status}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">{balances.isDebit ? 'Debited' : 'Credited'}</div>
            <div className={`text-2xl font-bold ${balances.isDebit ? 'text-red-600' : 'text-green-600'}`}>
              ₦{balances.amount.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="text-xs text-gray-500">Balance Before</div>
            <div className="text-lg font-semibold">₦{balances.before.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="text-xs text-gray-500">{balances.isDebit ? 'Debited Amount' : 'Credited Amount'}</div>
            <div className="text-lg font-semibold">₦{balances.amount.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="text-xs text-gray-500">Balance After</div>
            <div className="text-lg font-semibold">₦{balances.after.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Description</div>
            <div className="font-medium text-gray-900">{tx.description || tx.serviceType || 'Wallet transaction'}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Reference</div>
            <div className="font-mono text-sm text-gray-900 break-all">{tx.reference}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            {createdMs
              ? new Date(createdMs).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })
              : '-'}
          </div>
          <div className="text-sm text-gray-600">
            {timeAgo}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => window.print()} className="bg-gray-900 hover:bg-black text-white">Print</Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/transactions')}>Close</Button>
        </div>
      </Card>
    </div>
  );
}
