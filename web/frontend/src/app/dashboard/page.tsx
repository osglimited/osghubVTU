'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Wifi, Tv, Zap, CreditCard, GraduationCap, Eye, EyeOff, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getWalletHistory } from '@/lib/services';
import { useNotifications } from '@/contexts/NotificationContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [showMain, setShowMain] = useState(false);
  const [showCashback, setShowCashback] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const { addNotification } = useNotifications();
  const [recent, setRecent] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [currentAnnIndex, setCurrentAnnIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextAnnouncement = useCallback(() => {
    setAnnouncements(prev => {
      if (prev.length <= 1) return prev;
      setCurrentAnnIndex(current => (current + 1) % prev.length);
      return prev;
    });
  }, []);

  const prevAnnouncement = useCallback(() => {
    setAnnouncements(prev => {
      if (prev.length <= 1) return prev;
      setCurrentAnnIndex(current => (current - 1 + prev.length) % prev.length);
      return prev;
    });
  }, []);

  useEffect(() => {
    if (announcements.length <= 1 || isPaused) return;
    const timer = setInterval(nextAnnouncement, 6000);
    return () => clearInterval(timer);
  }, [announcements.length, isPaused, nextAnnouncement]);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(3));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filter active announcements manually if flag is missing on old ones, or just show all for now to debug
        setAnnouncements(data.filter((a: any) => a.active !== false));
      } catch (e) {
        console.error('Announcements load failed', e);
      }
    };
    if (user) loadAnnouncements();
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!user.isVerified) {
      router.push('/verify');
    }
    const sm = sessionStorage.getItem('showMainBalance') === 'true';
    const sc = sessionStorage.getItem('showCashbackBalance') === 'true';
    const sr = sessionStorage.getItem('showReferralBalance') === 'true';
    setShowMain(sm);
    setShowCashback(sc);
    setShowReferral(sr);
  }, [user, loading, router]);

  useEffect(() => {
    const loadRecent = async () => {
      if (!user) return;
      try {
        const items = await getWalletHistory();
        setRecent(items.slice(0, 5));
      } catch (e) {
        console.error('Recent history load failed', e);
      }
    };
    loadRecent();
  }, [user]);
  const handleWithdraw = async (type: 'referral' | 'cashback') => {
    if (!user || processingWithdrawal) return;
    
    const amount = type === 'referral' ? (user.referralBalance ?? 0) : (user.cashbackBalance ?? 0);
    if (amount <= 0) {
      addNotification('warning', 'Insufficient balance', 'No funds available to withdraw');
      return;
    }

    if (!confirm(`Are you sure you want to withdraw ₦${amount.toLocaleString()} to your main wallet?`)) {
        return;
    }

    setProcessingWithdrawal(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User does not exist!");

        const userData = userDoc.data();
        const currentBalance = type === 'referral' ? (userData.referralBalance || 0) : (userData.cashbackBalance || 0);
        
        if (currentBalance < amount) {
            throw new Error("Insufficient balance during transaction");
        }

        const newMainBalance = (userData.walletBalance || 0) + amount;
        
        transaction.update(userRef, {
            [type === 'referral' ? 'referralBalance' : 'cashbackBalance']: 0,
            walletBalance: newMainBalance
        });
      });
      addNotification('success', 'Withdrawal successful', `₦${amount.toLocaleString()} moved to main wallet`);
      await refreshUser();
    } catch (error) {
      console.error("Withdrawal failed: ", error);
      addNotification('error', 'Withdrawal failed', 'Please try again');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="py-12">
        <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const actions = [
    { icon: Smartphone, label: 'Airtime', href: '/dashboard/services/airtime' },
    { icon: Wifi, label: 'Data', href: '/dashboard/services/data' },
    { icon: Tv, label: 'Cable TV', href: '/dashboard/services/cable' },
    { icon: Zap, label: 'Electricity', href: '/dashboard/services/electricity' },
    { icon: GraduationCap, label: 'Exam PINs', href: '/dashboard/services/exam-pins' },
  ];

  return (
    <div className="space-y-8">
        {announcements.length > 0 && (
          <div 
            className="relative bg-[#F97316]/10 border-l-4 border-[#F97316] p-4 rounded-r-xl group transition-all duration-500"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-[#0A1F44]">{announcements[currentAnnIndex].title}</h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">
                  {currentAnnIndex + 1} / {announcements.length}
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(announcements[currentAnnIndex].createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-1 min-h-[40px]">{announcements[currentAnnIndex].content}</p>
            
            {announcements.length > 1 && (
              <div className="absolute right-2 bottom-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1 hover:bg-[#F97316]/20 rounded-full text-[#F97316]"
                  title={isPaused ? "Play" : "Pause"}
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button 
                  onClick={prevAnnouncement}
                  className="p-1 hover:bg-[#F97316]/20 rounded-full text-[#F97316]"
                >
                  <ChevronLeft size={14} />
                </button>
                <button 
                  onClick={nextAnnouncement}
                  className="p-1 hover:bg-[#F97316]/20 rounded-full text-[#F97316]"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-r from-[#0A1F44] to-[#020617] text-white rounded-2xl p-8 shadow-lg">
            <p className="text-blue-200 mb-2">Total Balance</p>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-5xl font-bold">{showMain ? `₦${(user.walletBalance || 0).toLocaleString()}` : '••••••'}</h2>
              <button className="p-2 rounded-md bg-white/10" onClick={() => { setShowMain(s => !s); sessionStorage.setItem('showMainBalance', String(!showMain)); }}>
                {showMain ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            <div />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="text-[#F97316]" />
              <h3 className="font-semibold text-[#0A1F44]">Account Status</h3>
            </div>
            <p className="text-sm text-gray-600">Status: <span className="font-medium capitalize">{user.accountStatus}</span></p>
            <p className="text-sm text-gray-600 mt-2">Verified: <span className="font-medium">{user.isVerified ? 'Yes' : 'No'}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-[#0A1F44]">Cashback</h3>
            <p className="text-sm text-gray-500">Disabled pending verified programs.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-[#0A1F44]">Referral</h3>
            <p className="text-sm text-gray-500">Disabled pending verified programs.</p>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-[#0A1F44] mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {actions.map(({ icon: Icon, label, href }) => (
              <Link key={label} href={href}>
                <div className="rounded-xl bg-white border border-gray-200 p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
                  <Icon size={40} className="text-[#F97316] mx-auto mb-3" />
                  <p className="font-semibold text-[#0A1F44]">{label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="text-[#F97316]" />
            <h3 className="text-2xl font-bold text-[#0A1F44]">Recent Transactions</h3>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No transactions yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((tx) => (
                <li key={tx.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#0A1F44]">
                      {tx.description || tx.walletType ? `${tx.type} ${tx.walletType ? `(${tx.walletType})` : ''}` : tx.type}
                    </p>
                    <p className="text-xs text-gray-500">{tx.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₦{(tx.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.createdAt ? new Date(tx.createdAt._seconds ? tx.createdAt._seconds * 1000 : tx.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
    </div>
  );
}
