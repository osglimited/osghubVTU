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

export const getWalletBalance = async (token?: string): Promise<{ mainBalance: number; cashbackBalance: number; referralBalance: number } | null> => {
  const backendUrl =
    process.env.NEXT_PUBLIC_VTU_BACKEND_URL ||
    (typeof window !== 'undefined' && window.location.hostname.includes('osghub.com')
      ? 'https://osghubvtubackend.onrender.com'
      : '');
  if (!backendUrl) return null;

  try {
    const idToken = token || (auth.currentUser ? await auth.currentUser.getIdToken() : '');
    const res = await fetch(`${backendUrl}/api/wallet`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
    });

    if (!res.ok) throw new Error('Failed to fetch balance');
    return await res.json();
  } catch (error) {
    console.error('Get Balance Error:', error);
    return null;
  }
};

export const transferWallet = async (amount: number, fromWallet: 'cashback' | 'referral'): Promise<TransactionResult> => {
    const backendUrl =
      process.env.NEXT_PUBLIC_VTU_BACKEND_URL ||
      (typeof window !== 'undefined' && window.location.hostname.includes('osghub.com')
        ? 'https://osghubvtubackend.onrender.com'
        : '');
    if (!backendUrl) return { success: false, message: 'Backend URL not configured' };

    try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        const res = await fetch(`${backendUrl}/api/wallet/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ amount, fromWallet }),
        });

        const data = await res.json();
        if (!res.ok) {
            return { success: false, message: data.error || 'Transfer failed' };
        }
        return { success: true, message: data.message };
    } catch (error: any) {
        return { success: false, message: error.message || 'Transfer failed' };
    }
};

export const getWalletHistory = async (): Promise<any[]> => {
  const backendUrl =
    process.env.NEXT_PUBLIC_VTU_BACKEND_URL ||
    (typeof window !== 'undefined' && window.location.hostname.includes('osghub.com')
      ? 'https://osghubvtubackend.onrender.com'
      : '');
  if (!backendUrl) return [];

  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    const res = await fetch(`${backendUrl}/api/wallet/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error('Failed to fetch wallet history');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Get Wallet History Error:', error);
    return [];
  }
};

export const purchaseAirtime = async (
  userId: string,
  amount: number,
  details: { network?: string; networkId?: number | string; phone: string }
): Promise<TransactionResult> => {
  const backendUrl =
    process.env.NEXT_PUBLIC_VTU_BACKEND_URL ||
    (typeof window !== 'undefined' && window.location.hostname.includes('osghub.com')
      ? 'https://osghubvtubackend.onrender.com'
      : '');
  if (!backendUrl) {
    return { success: false, message: 'Backend URL not configured' };
  }
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  const res = await fetch(`${backendUrl}/api/transactions/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      type: 'airtime',
      amount,
      details: {
        phone: details.phone,
        ...(details.networkId !== undefined ? { networkId: details.networkId } : {}),
        ...(details.network ? { network: details.network } : {}),
      },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { success: false, message: (data && (data.error || data.message)) || 'Transaction failed' };
  }
  return { success: true, message: 'Airtime initiated' };
};

export const purchaseData = async (
  userId: string,
  amount: number,
  details: { planId: string; phone: string; network?: string; networkId?: number | string }
): Promise<TransactionResult> => {
  const backendUrl =
    process.env.NEXT_PUBLIC_VTU_BACKEND_URL ||
    (typeof window !== 'undefined' && window.location.hostname.includes('osghub.com')
      ? 'https://osghubvtubackend.onrender.com'
      : '');
  if (!backendUrl) {
    return { success: false, message: 'Backend URL not configured' };
  }
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  const res = await fetch(`${backendUrl}/api/transactions/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      type: 'data',
      amount,
      details: {
        planId: details.planId,
        phone: details.phone,
        ...(details.networkId !== undefined ? { networkId: details.networkId } : {}),
        ...(details.network ? { network: details.network } : {}),
      },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { success: false, message: (data && (data.error || data.message)) || 'Transaction failed' };
  }
  return { success: true, message: 'Data initiated' };
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
