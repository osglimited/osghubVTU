'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, List, User, Settings, ShieldCheck, LifeBuoy, Smartphone, Wifi, Tv, Zap, FileText, LogOut, Bell, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
    { href: '/dashboard/transactions', label: 'Transactions', icon: List },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard/security', label: 'Security', icon: ShieldCheck },
    { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  ];

  const serviceItems = [
    { href: '/dashboard/services/airtime', label: 'Airtime', icon: Smartphone },
    { href: '/dashboard/services/data', label: 'Data', icon: Wifi },
    { href: '/dashboard/services/cable', label: 'Cable TV', icon: Tv },
    { href: '/dashboard/services/electricity', label: 'Electricity', icon: Zap },
    { href: '/dashboard/services/exam-pins', label: 'Exam PINs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:block
      `}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0A1F44]">OSGHUB VTU</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1 hover:bg-gray-100 rounded-md text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="px-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${pathname === href ? 'bg-gray-100 text-[#0A1F44] font-semibold' : 'text-gray-700'}`}>
              <Icon size={18} className="text-[#F97316]" />
              {label}
            </Link>
          ))}
          <div className="px-3 pt-4 text-xs font-semibold text-gray-500">Services</div>
          {serviceItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${pathname === href ? 'bg-gray-100 text-[#0A1F44] font-semibold' : 'text-gray-700'}`}>
              <Icon size={18} className="text-[#F97316]" />
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
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="container-main py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                className="md:hidden p-1 hover:bg-gray-100 rounded-md" 
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={24} className="text-[#0A1F44]" />
              </button>
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
