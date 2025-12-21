export interface User {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  isVerified: boolean;
  verificationType?: 'email' | 'phone';
  transactionPinHash: string;
  createdAt: Date;
  referralCode?: string;
  referredBy?: string;
  walletBalance: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'airtime' | 'data' | 'electricity' | 'tv' | 'education';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  details: Record<string, any>;
  createdAt: Date;
}
