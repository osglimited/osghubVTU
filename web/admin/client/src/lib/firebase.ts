
// Mock Firebase Service for Prototype
// This file mimics the Firebase SDK structure but operates on in-memory data for the prototype phase.

// Simple observer pattern for auth state
let currentUser = localStorage.getItem('mockUser') ? JSON.parse(localStorage.getItem('mockUser')!) : null;
const authListeners: Array<(user: any) => void> = [];

export const auth = {
  get currentUser() { return currentUser; },
  
  onAuthStateChanged: (callback: any) => {
    authListeners.push(callback);
    // Immediately invoke with current state
    callback(currentUser);
    // Return unsubscribe function
    return () => {
      const index = authListeners.indexOf(callback);
      if (index > -1) authListeners.splice(index, 1);
    };
  },
  
  signInWithEmailAndPassword: async (email: string, password: string) => {
    if (email === 'admin@osghub.com' && password === 'admin123') {
      const user = { uid: 'admin-123', email, displayName: 'OSGHUB Admin', role: 'admin' };
      localStorage.setItem('mockUser', JSON.stringify(user));
      currentUser = user;
      
      // Notify all listeners
      authListeners.forEach(listener => listener(user));
      
      return { user };
    }
    throw new Error('Invalid email or password');
  },
  
  signOut: async () => {
    localStorage.removeItem('mockUser');
    currentUser = null;
    
    // Notify all listeners
    authListeners.forEach(listener => listener(null));
  }
};

export const db = {
  collection: (name: string) => ({
    get: async () => {
      // Return mock data based on collection name
      if (name === 'users') return { docs: mockUsers.map(u => ({ data: () => u, id: u.id })) };
      if (name === 'transactions') return { docs: mockTransactions.map(t => ({ data: () => t, id: t.id })) };
      if (name === 'wallet_requests') return { docs: mockWalletRequests.map(w => ({ data: () => w, id: w.id })) };
      return { docs: [] };
    }
  })
};

// Mock Data
export const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '08012345678', balance: 5000, status: 'active', joinDate: '2025-01-15' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '09087654321', balance: 1200, status: 'suspended', joinDate: '2025-02-10' },
  { id: '3', name: 'Michael Brown', email: 'michael@example.com', phone: '07055555555', balance: 25000, status: 'active', joinDate: '2024-12-05' },
  { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', phone: '08122223333', balance: 50, status: 'active', joinDate: '2025-03-01' },
];

export const mockTransactions = [
  { id: 'TXN-001', user: 'John Doe', type: 'Airtime', amount: 500, status: 'success', date: '2025-03-10T10:30:00', details: 'MTN 500 Airtime' },
  { id: 'TXN-002', user: 'Jane Smith', type: 'Data', amount: 2500, status: 'failed', date: '2025-03-09T14:15:00', details: 'Glo 5GB Data' },
  { id: 'TXN-003', user: 'Michael Brown', type: 'Electricity', amount: 10000, status: 'success', date: '2025-03-08T09:00:00', details: 'AEDC Bill Payment' },
  { id: 'TXN-004', user: 'John Doe', type: 'Cable', amount: 4500, status: 'pending', date: '2025-03-10T11:00:00', details: 'GOTV Jolli' },
];

export const mockWalletRequests = [
  { id: 'WR-001', user: 'Sarah Wilson', amount: 5000, status: 'pending', date: '2025-03-10T08:00:00', method: 'Bank Transfer' },
  { id: 'WR-002', user: 'John Doe', amount: 10000, status: 'approved', date: '2025-03-09T16:20:00', method: 'Card' },
];

export const mockStats = {
  totalUsers: 1250,
  walletBalance: 4500000,
  totalTransactions: 8543,
  todaySales: 125000,
  pendingRequests: 5,
};
