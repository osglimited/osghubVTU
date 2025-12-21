import { addDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TransactionType = 'fund' | 'airtime' | 'data' | 'electricity' | 'tv' | 'exam';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface TransactionRecord {
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  details?: Record<string, any>;
  createdAt?: string;
}

export const addTransaction = async (tx: TransactionRecord) => {
  await addDoc(collection(db, 'transactions'), {
    ...tx,
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
  });
};

export const getUserTransactions = async (userId: string) => {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
};
