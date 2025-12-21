'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, List, User, Settings, ShieldCheck, LifeBuoy, Smartphone, Wifi, Tv, Zap, FileText, LogOut, Bell } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const primaryItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
    { href: '/dashboard/transactions', label: 'Transactions', icon: List },
  ];

  const serviceItems = [
    { href: '/dashboard/services/airtime', label: 'Airtime', icon: Smartphone },
    { href: '/dashboard/services/data', label: 'Data', icon: Wifi },
    { href: '/dashboard/services/cable', label: 'Cable TV', icon: Tv },
    { href: '/dashboard/services/electricity', label: 'Electricity', icon: Zap },
    { href: '/dashboard/services/exam-pins', label: 'Exam PINs', icon: FileText },
  ];
  
  const accountItems = [
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard/security', label: 'Security', icon: ShieldCheck },
    { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0A1F44]">OSGHUB VTU</span>
          </div>
        </div>
        <nav className="px-2 space-y-1">
          {primaryItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${
                pathname === href ? 'bg-gray-100 text-[#0A1F44] font-semibold' : 'text-gray-700'
              }`}
            >
              <Icon size={18} className="text-[#F97316]" />
              {label}
            </Link>
          ))}
          <div className="px-3 pt-4 text-xs font-semibold text-gray-500">Services</div>
          {serviceItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${
                pathname === href ? 'bg-gray-100 text-[#0A1F44] font-semibold' : 'text-gray-700'
              }`}
            >
              <Icon size={18} className="text-[#F97316]" />
              {label}
            </Link>
          ))}
          <div className="my-3 border-t border-gray-200" />
          <div className="px-3 pt-2 text-xs font-semibold text-gray-400">Account &amp; Support</div>
          {accountItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${
                pathname === href ? 'bg-gray-100 text-[#0A1F44]' : 'text-gray-600'
              } text-sm`}
            >
              <Icon size={16} className={`${pathname === href ? 'text-[#F97316]' : 'text-gray-400'}`} />
              {label}
            </Link>
          ))}
          <button
            onClick={async () => { await signOut(); router.push('/'); }}
            className="flex items-center gap-3 px-3 py-2 mt-4 rounded-md hover:bg-gray-50 text-red-600"
          >
            <LogOut size={18} />
            Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1">
        <header className="bg-white border-b border-gray-200">
          <div className="container-main py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="text-[#F97316]" />
              <div>
                <div className="font-semibold text-[#0A1F44]">{user?.fullName || 'User'}</div>
                <div className="text-sm text-gray-500">@{user?.username}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Wallet Balance</div>
              <div className="text-2xl font-bold">₦{(user?.walletBalance || 0).toLocaleString()}</div>
            </div>
          </div>
        </header>
        <div className="container-main py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
