
// Placeholder admin client bindings (no mock data; connect to real backend)

// Simple observer pattern for auth state
let currentUser = localStorage.getItem('mockUser') ? JSON.parse(localStorage.getItem('mockUser')!) : null;
const authListeners: Array<(user: any) => void> = [];

export const auth = {
  get currentUser() { return currentUser; },
  onAuthStateChanged: (callback: any) => {
    authListeners.push(callback);
    callback(currentUser);
    return () => {
      const index = authListeners.indexOf(callback);
      if (index > -1) authListeners.splice(index, 1);
    };
  },
  signInWithEmailAndPassword: async (_email: string, _password: string) => {
    throw new Error('Admin auth not configured. Connect to real auth.');
  },
  signOut: async () => {
    localStorage.removeItem('mockUser');
    currentUser = null;
    authListeners.forEach(listener => listener(null));
  }
};

export const db = {
  collection: (_name: string) => ({
    get: async () => ({ docs: [] })
  })
};

export const mockUsers = [];
export const mockTransactions = [];
export const mockWalletRequests = [];
export const mockStats = {
  totalUsers: 0,
  walletBalance: 0,
  totalTransactions: 0,
  todaySales: 0,
  pendingRequests: 0,
};
