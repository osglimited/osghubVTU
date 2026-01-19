import { auth, db } from "./firebase";

function getBaseUrl(): string {
  const prodUrlRaw = import.meta.env.VITE_VTU_BACKEND_URL as string | undefined;
  const localUrlRaw = import.meta.env.VITE_VTU_BACKEND_URL_LOCAL as string | undefined;
  const strip = (s?: string) => (s && typeof s === "string" ? s.trim().replace(/^`|`$/g, "") : "");
  const prodUrl = strip(prodUrlRaw);
  const localUrl = strip(localUrlRaw);
  let origin = "";
  try {
    origin = window.location.origin;
  } catch {}
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  if (isLocal) return localUrl || "http://localhost:5000";
  return prodUrl || "https://osghubvtubackend.onrender.com";
}

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  return user ? await user.getIdToken() : "";
}

async function request<T>(method: string, path: string, data?: unknown): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const token = await getToken();
  const envAdmins = String(import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const fallbackAdminEmail = envAdmins[0] || "";
  const currentEmail = (auth.currentUser?.email || fallbackAdminEmail || "").toLowerCase();

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(currentEmail ? { "X-Admin-Email": currentEmail } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "omit",
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

export async function getAdminStats(): Promise<any> {
  return await request<any>("GET", "/api/admin/stats");
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

export async function getAllPlans(): Promise<any[]> {
  return await request<any[]>("GET", "/api/admin/plans");
}

export async function createPlan(payload: { network: string; name: string; priceUser: number; priceApi: number; active?: boolean; metadata?: Record<string, unknown> }): Promise<any> {
  return await request<any>("POST", "/api/admin/plans", payload);
}

export async function updatePlan(id: string, payload: { network?: string; name?: string; priceUser?: number; priceApi?: number; active?: boolean; metadata?: Record<string, unknown> }): Promise<any> {
  return await request<any>("PUT", `/api/admin/plans/${encodeURIComponent(id)}`, payload);
}

export async function deletePlan(id: string): Promise<{ success: boolean; id: string }> {
  return await request<{ success: boolean; id: string }>("DELETE", `/api/admin/plans/${encodeURIComponent(id)}`);
}

export async function updateAdminProfile(payload: {
  displayName?: string;
  phoneNumber?: string;
}): Promise<{ success: boolean; message: string }> {
  return await request<{ success: boolean; message: string }>("POST", "/api/admin/profile/update", payload);
}

export async function changeAdminPassword(payload: {
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ success: boolean; message: string }> {
  return await request<{ success: boolean; message: string }>("POST", "/api/admin/profile/password", payload);
}

export async function getWalletRequests(): Promise<any[]> {
  return await request<any[]>("GET", "/api/admin/wallet/requests");
}

export async function approveWalletRequest(id: string): Promise<any> {
  return await request<any>("POST", `/api/admin/wallet/requests/${encodeURIComponent(id)}/approve`);
}

export async function rejectWalletRequest(id: string): Promise<any> {
  return await request<any>("POST", `/api/admin/wallet/requests/${encodeURIComponent(id)}/reject`);
}

// Support & Announcements
export async function getTickets(): Promise<any[]> {
  return await request<any[]>("GET", "/api/admin/support/tickets");
}

export async function replyTicket(id: string, message: string): Promise<any> {
  return await request<any>("POST", `/api/admin/support/tickets/${encodeURIComponent(id)}/reply`, { message });
}

export async function getAnnouncements(): Promise<any[]> {
  return await request<any[]>("GET", "/api/admin/announcements");
}

export async function createAnnouncement(payload: { title: string; content: string; type?: string }): Promise<any> {
  return await request<any>("POST", "/api/admin/announcements", payload);
}

export async function deleteAnnouncement(id: string): Promise<any> {
  return await request<any>("DELETE", `/api/admin/announcements/${encodeURIComponent(id)}`);
}

export async function getAdminProfile(): Promise<any> {
  return await request<any>("GET", "/api/admin/profile");
}

export async function getFinanceAnalytics(input?: { uid?: string; email?: string; start?: number; end?: number }): Promise<{
  scope: "system" | "user";
  providerBalanceRequired: number;
  walletBalance?: number;
  daily: { deposits: number; providerCost: number; smsCost: number; netProfit: number };
  weekly: { deposits: number; providerCost: number; smsCost: number; netProfit: number };
  monthly: { deposits: number; providerCost: number; smsCost: number; netProfit: number };
  totals: { depositsTotal: number; providerCostTotal: number; smsCostTotal: number; netProfitTotal: number };
  transactions: Array<{
    id: string;
    userId: string;
    user: string;
    userPrice: number;
    providerCost: number;
    smsCost: number;
    serviceType: string;
    status: string;
    createdAt: number;
    failureSource?: string;
    failureReason?: string;
  }>;
}> {
  const qs = new URLSearchParams({ uid: String(input?.uid || ""), email: String(input?.email || ""), start: input?.start ? String(input.start) : "", end: input?.end ? String(input.end) : "" }).toString();
  return await request("GET", `/api/admin/finance/analytics?${qs}`);
}
export async function getWalletLogs(): Promise<any[]> {
  return await request<any[]>("GET", "/api/admin/wallet/logs");
}

export async function getWalletDeposits(): Promise<any[]> {
  return await request<any[]>("GET", "/api/admin/wallet/deposits");
}

export async function getTransactionById(id: string): Promise<any> {
  return await request<any>("GET", `/api/admin/transactions/${encodeURIComponent(id)}`);
}

export async function createUser(input: { email: string; password: string; displayName?: string; phoneNumber?: string; requireVerification?: boolean; redirectUrl?: string }): Promise<{ success: boolean; uid: string; email: string; verificationLink?: string }> {
  return await request<{ success: boolean; uid: string; email: string; verificationLink?: string }>("POST", "/api/admin/users/create", input);
}

export async function listAdmins(): Promise<any[]> {
  return await request<any[]>("GET", "/api/admin/admins");
}

export async function createAdmin(input: { email: string; password: string; displayName?: string }): Promise<{ success: boolean; uid: string; email: string }> {
  return await request<{ success: boolean; uid: string; email: string }>("POST", "/api/admin/admins", input);
}

export async function generateVerificationLink(input: { email?: string; uid?: string; redirectUrl?: string }): Promise<{ success: boolean; email: string; verificationLink: string }> {
  return await request<{ success: boolean; email: string; verificationLink: string }>("POST", "/api/admin/users/verification-link", input);
}

export async function getFinanceSystem(): Promise<{
  daily: { deposits: number; providerCost: number; smsCost: number; netProfit: number };
  weekly: { deposits: number; providerCost: number; smsCost: number; netProfit: number };
  monthly: { deposits: number; providerCost: number; smsCost: number; netProfit: number };
  requiredProviderBalance: number;
}> {
  return await request("GET", "/api/admin/finance/system");
}

export async function getFinanceUser(input: { uid?: string; email?: string }): Promise<{
  walletBalance: number;
  totalDeposited: number;
  totalSpent: number;
  totalProviderCost: number;
  totalSmsCost: number;
  netProfit: number;
  transactions: any[];
  risk: { providerBalanceRequired: number; smsCost: number; expectedProfit: number };
}> {
  const qs = new URLSearchParams({ uid: String(input.uid || ""), email: String(input.email || "") }).toString();
  return await request("GET", `/api/admin/finance/user?${qs}`);
}

export { db };
