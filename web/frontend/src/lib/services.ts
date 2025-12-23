import { collection, doc, getDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import sampleServices from '@/data/services.sample.json';
import app from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/lib/firebase';

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

export const purchaseAirtimeViaCloud = async (
  userId: string,
  amount: number,
  details: { network: string; phone: string; provider: string }
): Promise<TransactionResult> => {
  const functions = getFunctions(app);
  const fn = httpsCallable(functions, 'purchaseAirtime');
  const res = await fn({ userId, amount, ...details });
  return res.data as TransactionResult;
};

export const purchaseAirtime = async (
  userId: string,
  amount: number,
  details: { network: string; phone: string; provider: string }
): Promise<TransactionResult> => {
  const backendUrl = process.env.NEXT_PUBLIC_VTU_BACKEND_URL;
  if (backendUrl) {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    const res = await fetch(`${backendUrl}/v1/airtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ userId, amount, ...details }),
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {}
    if (!res.ok) {
      return { success: false, message: (data && data.message) || 'Transaction failed' };
    }
    return data as TransactionResult;
  }
  return purchaseAirtimeViaCloud(userId, amount, details);
};

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
  try {
    const col = collection(db, 'services');
    const snap = await getDocs(col);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ServiceDoc));
    }
  } catch (e) {
    // fall through to sample fallback
  }
  return (sampleServices as any[]).map((s) => ({
    id: s.slug,
    ...s,
  })) as ServiceDoc[];
};

export const getServiceBySlug = async (slug: string): Promise<ServiceDoc | null> => {
  try {
    const q = query(collection(db, 'services'), where('slug', '==', slug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...(d.data() as any) } as ServiceDoc;
    }
  } catch (e) {
    // fall through to sample lookup
  }
  const local = (sampleServices as any[]).find((s) => s.slug === slug);
  if (!local) return null;
  return { id: local.slug, ...(local as any) } as ServiceDoc;
};

export const getServiceById = async (id: string): Promise<ServiceDoc | null> => {
  const ref = doc(db, 'services', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as ServiceDoc;
};
