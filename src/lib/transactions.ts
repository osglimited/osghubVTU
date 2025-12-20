import { addDoc, collection, serverTimestamp, query, where, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TransactionType = 'airtime' | 'data' | 'electricity' | 'tv' | 'education' | 'funding';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export const createTransaction = async (
  uid: string,
  type: TransactionType,
  amount: number,
  details: Record<string, any>,
  status: TransactionStatus = 'pending'
): Promise<string> => {
  const col = collection(db, 'transactions');
  const docRef = await addDoc(col, {
    userId: uid,
    type,
    amount,
    status,
    details,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const fetchUserTransactions = async (uid: string) => {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
};

export const processPurchaseWithBatch = async (
  uid: string,
  type: TransactionType,
  amount: number,
  details: Record<string, any>,
  currentBalance: number
) => {
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  if (currentBalance < amount) throw new Error('Insufficient wallet balance');

  const nextBalance = currentBalance - amount;
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', uid);
  const txRef = doc(collection(db, 'transactions'));

  batch.update(userRef, { walletBalance: nextBalance, updatedAt: new Date().toISOString() });
  batch.set(txRef, {
    userId: uid,
    type,
    amount,
    status: 'completed',
    details,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return { transactionId: txRef.id, nextBalance };
};
