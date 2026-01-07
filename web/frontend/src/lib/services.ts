import { collection, doc, getDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import sampleServices from '@/data/services.sample.json';
import app from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/lib/firebase';

const resolveBackendUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_VTU_BACKEND_URL;
  const envUrlLocal = process.env.NEXT_PUBLIC_VTU_BACKEND_URL_LOCAL;
  const isNonLocal = (url?: string) => !!url && !/localhost|127\.0\.0\.1/i.test(url);
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('localhost')) {
      return envUrlLocal || 'http://localhost:5000';
    }
    if (host.includes('osghub.com') || host.includes('osghubvtu.onrender.com')) {
      return 'https://osghubvtubackend.onrender.com';
    }
    if (isNonLocal(envUrl)) {
      return envUrl as string;
    }
  }
  return isNonLocal(envUrl) ? (envUrl as string) : 'https://osghubvtubackend.onrender.com';
};

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
  const backendUrl = resolveBackendUrl();
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


export const getWalletHistory = async (): Promise<any[]> => {
  const backendUrl = resolveBackendUrl();
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
  const backendUrl = resolveBackendUrl();
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
  const backendUrl = resolveBackendUrl();
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
  type: 'cable' | 'electricity' | 'tv',
  details: Record<string, any>
): Promise<TransactionResult> => {
  const backendUrl = resolveBackendUrl();
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  const res = await fetch(`${backendUrl}/api/transactions/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      type,
      amount,
      details,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { success: false, message: (data && (data.error || data.message)) || 'Transaction failed' };
  }
  return { success: true, message: 'Transaction initiated' };
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

export const initiateFunding = async (amount: number): Promise<{ tx_ref?: string; link?: string; error?: string }> => {
  const backendUrl = resolveBackendUrl();
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  try {
    const res = await fetch(`${backendUrl}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { error: (data && (data.error || data.message)) || 'Failed to initiate payment' };
    }
    return { tx_ref: data.tx_ref, link: data.link };
  } catch (e: any) {
    return { error: 'Network error contacting payment service. Please retry shortly.' };
  }
};

export const verifyFunding = async (tx_ref: string): Promise<{ success: boolean; message?: string }> => {
  const backendUrl = resolveBackendUrl();
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  const res = await fetch(`${backendUrl}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ tx_ref }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { success: false, message: (data && (data.error || data.message)) || 'Verification failed' };
  }
  return { success: Boolean(data?.success), message: data?.message || (data?.success ? 'Wallet credited' : 'Not credited') };
};

export const transferWallet = async (amount: number, fromWalletType: 'cashback' | 'referral'): Promise<{ success: boolean; message?: string }> => {
  const backendUrl = resolveBackendUrl();
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  const res = await fetch(`${backendUrl}/api/wallet/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ amount, fromWalletType }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { success: false, message: (data && (data.error || data.message)) || 'Transfer failed' };
  }
  return { success: true, message: 'Transfer successful' };
};
