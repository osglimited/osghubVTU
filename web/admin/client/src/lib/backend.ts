const resolveBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_VTU_BACKEND_URL;
  const envUrlLocal = import.meta.env.VITE_VTU_BACKEND_URL_LOCAL;
  const isNonLocal = (url?: string) => !!url && !/localhost|127\.0\.0\.1/i.test(String(url));
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('localhost')) {
      return envUrlLocal || 'http://localhost:5000';
    }
    if (host.includes('osghubvtu.onrender.com')) {
      return 'https://osghubvtubackend.onrender.com';
    }
    if (isNonLocal(envUrl)) {
      return String(envUrl);
    }
  }
  return isNonLocal(envUrl) ? String(envUrl) : 'https://osghubvtubackend.onrender.com';
};

const backendUrl = resolveBackendUrl();

const withAuth = async (headers: HeadersInit = {}): Promise<HeadersInit> => {
  const { auth } = await import('./firebase');
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
};

export const getAdminSettings = async (): Promise<any> => {
  const res = await fetch(`${backendUrl}/api/admin/settings`, {
    headers: await withAuth(),
  });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
};

export const updateAdminSettings = async (payload: any): Promise<any> => {
  const res = await fetch(`${backendUrl}/api/admin/settings`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
};

export const getAllTransactions = async (): Promise<any[]> => {
  const res = await fetch(`${backendUrl}/api/admin/transactions`, {
    headers: await withAuth(),
  });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const creditUserWallet = async (userId: string, amount: number, walletType: 'main'|'cashback'|'referral' = 'main', description?: string): Promise<any> => {
  const res = await fetch(`${backendUrl}/api/admin/wallet/credit`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify({ userId, amount, walletType, description }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && (data.error || data.message)) || 'Failed to credit wallet');
  return data;
};

export const listUsers = async (limit = 100): Promise<any[]> => {
  const res = await fetch(`${backendUrl}/api/admin/users?limit=${limit}`, {
    headers: await withAuth(),
  });
  if (!res.ok) throw new Error('Failed to list users');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const promoteAdmin = async (uid?: string, email?: string): Promise<any> => {
  const res = await fetch(`${backendUrl}/api/admin/users/promote`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify({ uid, email }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && (data.error || data.message)) || 'Failed to promote admin');
  return data;
};
