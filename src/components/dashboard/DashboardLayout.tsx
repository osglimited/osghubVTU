'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, LayoutDashboard, Wallet, Receipt, User, Settings, Shield, LifeBuoy, Smartphone, Wifi, Tv, Zap, GraduationCap } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const topNav = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
    { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
  ];

  const servicesNav = [
    { href: '/dashboard/services/airtime', label: 'Airtime', icon: Smartphone },
    { href: '/dashboard/services/data', label: 'Data', icon: Wifi },
    { href: '/dashboard/services/cable', label: 'Cable TV', icon: Tv },
    { href: '/dashboard/services/electricity', label: 'Electricity', icon: Zap },
    { href: '/dashboard/services/exam-pins', label: 'Exam Pins', icon: GraduationCap },
  ];

  const accountNav = [
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard/security', label: 'Security', icon: Shield },
    { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  ];

  const logout = async () => {
    await signOut();
    router.push('/login');
  };

  const linkClasses = (href: string) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return [
      'flex items-center gap-2 px-3 py-2 rounded text-sm',
      active
        ? 'bg-blue-50 text-[#0A1F44] font-semibold ring-1 ring-blue-200'
        : 'text-[#0A1F44] hover:bg-gray-100'
    ].join(' ');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] grid grid-cols-[240px_1fr]">
      <aside className="bg-white border-r border-gray-200 px-4 pt-4 pb-0 flex flex-col h-screen sticky top-0 overflow-y-auto">
        <div className="font-bold text-lg text-[#0A1F44] mb-4">OSGHUB VTU</div>
        <nav className="space-y-2">
          {topNav.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 mb-2 text-xs font-semibold text-gray-500 px-3">Services</div>
        <nav className="space-y-2">
          {servicesNav.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-2 border-t border-gray-200">
          <nav className="space-y-1">
            {accountNav.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="flex flex-col">
        <header className="bg-white border-b border-gray-200 h-14 px-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-[#0A1F44]">{user?.fullName}</span> &middot; @{user?.username}
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-[#0A1F44] text-white px-3 py-1 text-sm">
              ₦{(user?.walletBalance || 0).toLocaleString()}
            </div>
            <button onClick={logout} className="flex items-center gap-2 text-red-600 hover:text-red-800">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
