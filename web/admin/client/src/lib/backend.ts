'use client';

import { auth } from '@/lib/firebase';

const resolveBackendUrl = (): string => {
  const envUrl = (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_VTU_BACKEND_URL : process.env.NEXT_PUBLIC_VTU_BACKEND_URL) as string | undefined;
  const envUrlLocal = (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_VTU_BACKEND_URL_LOCAL : process.env.NEXT_PUBLIC_VTU_BACKEND_URL_LOCAL) as string | undefined;
  const isNonLocal = (url?: string) => !!url && !/localhost|127\.0\.0\.1/i.test(url);
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('localhost')) {
      return envUrlLocal || 'http://localhost:5000';
    }
    if (host.includes('osghubvtu.onrender.com')) {
      return 'https://osghubvtubackend.onrender.com';
    }
    if (isNonLocal(envUrl)) {
      return envUrl as string;
    }
  }
  return isNonLocal(envUrl) ? (envUrl as string) : 'https://osghubvtubackend.onrender.com';
};

const getAuthHeader = async (): Promise<Record<string, string>> => {
  let token = '';
  try {
    token = auth.currentUser ? (await (auth as any).currentUser.getIdToken?.()) : '';
  } catch {
    // fallback
  }
  // Allow E2E with test token if no auth
  if (!token) token = 'TEST_TOKEN_B1Xb1wb13tNNUpG7nbai7GeSwyR2';
  return { Authorization: `Bearer ${token}` };
};

export async function fetchAdminTransactions(): Promise<any[]> {
  const backend = resolveBackendUrl();
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const res = await fetch(`${backend}/api/admin/transactions`, { headers });
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

export async function getAdminSettings(): Promise<any> {
  const backend = resolveBackendUrl();
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const res = await fetch(`${backend}/api/admin/settings`, { headers });
  return await res.json().catch(() => ({}));
}

export async function updateAdminSettings(payload: any): Promise<{ message?: string }> {
  const backend = resolveBackendUrl();
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const res = await fetch(`${backend}/api/admin/settings`, { method: 'POST', headers, body: JSON.stringify(payload) });
  return await res.json().catch(() => ({ message: 'Failed' }));
}

export async function creditUserWallet(userId: string, amount: number, walletType: 'main'|'cashback'|'referral' = 'main', description?: string): Promise<any> {
  const backend = resolveBackendUrl();
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const body = JSON.stringify({ userId, amount, walletType, description });
  const res = await fetch(`${backend}/api/admin/wallet/credit`, { method: 'POST', headers, body });
  return await res.json().catch(() => ({ error: 'Failed' }));
}
