import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const getWalletBalance = async (uid: string): Promise<number> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  const data = snap.data() as any;
  return typeof data.walletBalance === 'number' ? data.walletBalance : 0;
};

export const setWalletBalance = async (uid: string, amount: number): Promise<void> => {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { walletBalance: amount, updatedAt: new Date().toISOString() });
};

export const updateWalletBalance = async (uid: string, delta: number): Promise<number> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = snap.exists() && typeof (snap.data() as any).walletBalance === 'number' ? (snap.data() as any).walletBalance : 0;
  const next = Math.max(0, current + delta);
  await updateDoc(ref, { walletBalance: next, updatedAt: new Date().toISOString() });
  return next;
};

export const applyWalletAndTransaction = async (
  uid: string,
  newBalance: number,
  transactionRef: { path: string; data: Record<string, any> }
) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), { walletBalance: newBalance, updatedAt: new Date().toISOString() });
  batch.set(doc(db, transactionRef.path), transactionRef.data);
  await batch.commit();
};
