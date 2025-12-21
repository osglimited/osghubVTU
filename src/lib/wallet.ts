import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addTransaction } from './transactions';

export const getWalletBalance = async (uid: string): Promise<number> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const data = snap.data() as any;
  return Number(data?.walletBalance || 0);
};

export const fundWallet = async (uid: string, amount: number, providerRef?: string) => {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { walletBalance: increment(amount), updatedAt: new Date().toISOString() });
  await addTransaction({
    userId: uid,
    type: 'fund',
    amount,
    status: 'completed',
    details: { providerRef },
  });
};

export const deductWallet = async (uid: string, amount: number) => {
  const current = await getWalletBalance(uid);
  if (current < amount) {
    throw new Error('Insufficient wallet balance');
  }
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { walletBalance: increment(-amount), updatedAt: new Date().toISOString() });
};
