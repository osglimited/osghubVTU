import { collection, doc, getDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ServiceDoc {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  config?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionResult {
  success: boolean;
  message: string;
  transactionId?: string;
}

export const processTransaction = async (
  userId: string, 
  amount: number, 
  serviceType: string, 
  details: any
): Promise<TransactionResult> => {
  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const currentBalance = userData.walletBalance || 0;
      
      if (currentBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Calculate 3% cashback
      const cashbackAmount = amount * 0.03;
      
      // Deduct amount from main wallet and add cashback to cashback wallet
      const newBalance = currentBalance - amount;
      const currentCashback = userData.cashbackBalance || 0;
      const newCashback = currentCashback + cashbackAmount;
      
      transaction.update(userRef, {
        walletBalance: newBalance,
        cashbackBalance: newCashback
      });
      
      // Create transaction record
      const transactionRef = doc(collection(db, 'transactions'));
      transaction.set(transactionRef, {
        userId,
        type: serviceType,
        amount,
        cashbackEarned: cashbackAmount,
        details,
        status: 'success',
        createdAt: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'Transaction successful',
        transactionId: transactionRef.id
      };
    });
  } catch (error: any) {
    console.error('Transaction failed:', error);
    return {
      success: false,
      message: error.message || 'Transaction failed'
    };
  }
};

export const getServices = async (): Promise<ServiceDoc[]> => {
  const col = collection(db, 'services');
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ServiceDoc));
};

export const getServiceBySlug = async (slug: string): Promise<ServiceDoc | null> => {
  const q = query(collection(db, 'services'), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) } as ServiceDoc;
};

export const getServiceById = async (id: string): Promise<ServiceDoc | null> => {
  const ref = doc(db, 'services', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as ServiceDoc;
};