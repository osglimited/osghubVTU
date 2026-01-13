import { auth } from "./firebase";

function getBaseUrl(): string {
  const prodUrl = import.meta.env.VITE_VTU_BACKEND_URL as string | undefined;
  const localUrl = import.meta.env.VITE_VTU_BACKEND_URL_LOCAL as string | undefined;
  const pick = (s?: string) => (s && typeof s === "string" ? s.trim().replace(/^`|`$/g, "") : "");
  const chosen = pick(prodUrl) || pick(localUrl);
  if (chosen) return chosen;
  try {
    const origin = window.location.origin;
    return origin;
  } catch {
    return "";
  }
}

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  return user ? await user.getIdToken() : "";
}

async function request<T>(method: string, path: string, data?: unknown): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const token = await getToken();

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!token && auth.currentUser?.email ? { "X-Admin-Email": String(auth.currentUser.email) } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as unknown as T;
  }
}

export async function getAdminSettings(): Promise<any> {
  return await request<any>("GET", "/api/admin/settings");
}

export async function updateAdminSettings(payload: {
  dailyReferralBudget?: number;
  cashbackEnabled?: boolean;
  pricing?: Record<string, unknown>;
}): Promise<{ message: string }> {
  return await request<{ message: string }>("POST", "/api/admin/settings", payload);
}

export async function getAllTransactions(): Promise<any[]> {
  return await request<any[]>("GET", "/api/admin/transactions");
}

export async function listUsers(limit = 100): Promise<any[]> {
  const qs = new URLSearchParams({ limit: String(limit) }).toString();
  return await request<any[]>("GET", `/api/admin/users?${qs}`);
}

export async function promoteAdmin(input: { uid?: string; email?: string }): Promise<{ success: boolean; uid: string; email: string }> {
  return await request<{ success: boolean; uid: string; email: string }>("POST", "/api/admin/users/promote", input);
}

export async function creditWallet(payload: { userId: string; amount: number; walletType?: "main" | "cashback" | "referral"; description?: string }): Promise<{ success: boolean; userId: string; newBalance: number; walletType: string }> {
  return await request<{ success: boolean; userId: string; newBalance: number; walletType: string }>("POST", "/api/admin/wallet/credit", payload);
}

export async function debitWallet(payload: { userId: string; amount: number; walletType?: "main" | "cashback" | "referral"; description?: string }): Promise<{ success: boolean; userId: string; newBalance: number; walletType: string }> {
  return await request<{ success: boolean; userId: string; newBalance: number; walletType: string }>("POST", "/api/admin/wallet/debit", payload);
}

export async function suspendUser(input: { uid?: string; email?: string; suspend: boolean }): Promise<{ success: boolean; uid: string; email: string; disabled: boolean }> {
  return await request<{ success: boolean; uid: string; email: string; disabled: boolean }>("POST", "/api/admin/users/suspend", input);
}

export async function deleteUser(input: { uid?: string; email?: string }): Promise<{ success: boolean; uid?: string; email?: string }> {
  return await request<{ success: boolean; uid?: string; email?: string }>("POST", "/api/admin/users/delete", input);
}

export async function updateUserPassword(input: { uid?: string; email?: string; password: string }): Promise<{ success: boolean; uid: string; email: string }> {
  return await request<{ success: boolean; uid: string; email: string }>("POST", "/api/admin/users/password", input);
}

export async function getUserTransactions(input: { uid?: string; email?: string }): Promise<any[]> {
  const qs = new URLSearchParams({ uid: String(input.uid || ""), email: String(input.email || "") }).toString();
  return await request<any[]>("GET", `/api/admin/users/transactions?${qs}`);
}
