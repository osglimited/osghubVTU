'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, List, User, Settings, ShieldCheck, LifeBuoy, Smartphone, Wifi, Tv, Zap, FileText, LogOut, Bell, Menu, Eye, EyeOff, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { notifications, removeNotification, clearNotifications } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/** Mobile drawer */}
      <MobileSidebar
        openLabel="Menu"
        pathname={pathname}
        onLogout={async () => { await signOut(); router.push('/'); }}
        items={{ primary: primaryItems, services: serviceItems, account: accountItems }}
      />
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex-col overflow-y-auto">
        <div className="flex flex-col h-full">
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
          </nav>
          <div className="mt-auto border-t border-gray-200">
            <div className="px-3 pt-3 text-[11px] font-semibold text-gray-500">Account & Support</div>
            <nav className="px-2 space-y-1 pb-3">
              {accountItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${
                    pathname === href ? 'bg-gray-50 text-[#0A1F44]' : 'text-gray-600'
                  } text-sm`}
                >
                  <Icon size={18} className="text-[#F97316] opacity-80" />
                  {label}
                </Link>
              ))}
              <button
                onClick={async () => { await signOut(); router.push('/'); }}
                className="flex items-center gap-3 px-3 py-2 mt-1 rounded-md hover:bg-gray-50 text-red-600 text-sm"
              >
                <LogOut size={18} />
                Logout
              </button>
            </nav>
          </div>
        </div>
      </aside>
      <main className="md:ml-64">
        <header className="bg-white border-b border-gray-200">
          <div className="container-main py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 rounded-md border border-gray-200" onClick={() => (document.getElementById('mobile-sidebar-toggle') as HTMLButtonElement)?.click()}>
                <Menu className="text-[#0A1F44]" />
              </button>
              <div className="relative">
                <button className="p-2 rounded-md border border-gray-200" onClick={() => setNotifOpen((v) => !v)}>
                  <Bell className="text-[#F97316]" />
                </button>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {Math.min(notifications.length, 9)}
                  </span>
                )}
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 top-10 z-50 w-[90vw] sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <div className="flex items-center justify-between px-3 py-2 border-b">
                        <div className="text-sm font-semibold text-[#0A1F44]">Notifications</div>
                        <button
                          className="text-xs text-gray-500 hover:text-gray-700"
                          onClick={() => clearNotifications()}
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-gray-500">No notifications</div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="px-4 py-3 border-b last:border-b-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium">{n.title}</div>
                                  {n.message && <div className="text-xs text-gray-600 mt-0.5">{n.message}</div>}
                                </div>
                                <button
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                  onClick={() => removeNotification(n.id)}
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="font-semibold text-[#0A1F44]">{user?.fullName || 'User'}</div>
                <div className="text-sm text-gray-500">@{user?.username}</div>
              </div>
            </div>
            <WalletBalanceHeader />
            </div>
        </header>
        <div className="container-main py-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function WalletBalanceHeader() {
  const { user } = useAuth();
  const [show, setShow] = useState<boolean>(false);
  useEffect(() => {
    const v = sessionStorage.getItem('showMainBalance');
    setShow(v === 'true');
  }, []);
  useEffect(() => {
    sessionStorage.setItem('showMainBalance', String(show));
  }, [show]);
  const amount = `₦${(user?.walletBalance || 0).toLocaleString()}`;
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-2">
        <div className="text-xs text-gray-500">Wallet Balance</div>
        <button className="p-1 rounded-md border border-gray-200" onClick={() => setShow(s => !s)}>
          {show ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      <div className="text-2xl font-bold">{show ? amount : '••••••'}</div>
    </div>
  );
}

function MobileSidebar({
  pathname,
  items,
  onLogout,
  openLabel,
}: {
  pathname: string;
  items: { primary: { href: string; label: string; icon: any }[]; services: { href: string; label: string; icon: any }[]; account: { href: string; label: string; icon: any }[] };
  onLogout: () => void;
  openLabel: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const btn = document.getElementById('mobile-sidebar-toggle');
    if (!btn) return;
    btn.onclick = () => setOpen(true);
  }, []);
  return (
    <>
      <button id="mobile-sidebar-toggle" style={{ position: 'absolute', left: -9999, top: -9999 }} aria-label={openLabel}></button>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-[#0A1F44]">OSGHUB VTU</span>
              <button className="p-2 rounded-md border border-gray-200" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <nav className="px-2 py-2 space-y-1 overflow-y-auto">
              {items.primary.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${pathname === href ? 'bg-gray-100 text-[#0A1F44] font-semibold' : 'text-gray-700'}`} onClick={() => setOpen(false)}>
                  <Icon size={18} className="text-[#F97316]" />
                  {label}
                </Link>
              ))}
              <div className="px-3 pt-4 text-xs font-semibold text-gray-500">Services</div>
              {items.services.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${pathname === href ? 'bg-gray-100 text-[#0A1F44] font-semibold' : 'text-gray-700'}`} onClick={() => setOpen(false)}>
                  <Icon size={18} className="text-[#F97316]" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t border-gray-200">
              <div className="px-3 pt-3 text-[11px] font-semibold text-gray-500">Account & Support</div>
              <nav className="px-2 space-y-1 pb-3">
                {items.account.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 ${pathname === href ? 'bg-gray-50 text-[#0A1F44]' : 'text-gray-600'} text-sm`} onClick={() => setOpen(false)}>
                    <Icon size={18} className="text-[#F97316] opacity-80" />
                    {label}
                  </Link>
                ))}
                <button onClick={() => { onLogout(); setOpen(false); }} className="flex items-center gap-3 px-3 py-2 mt-1 rounded-md hover:bg-gray-50 text-red-600 text-sm">
                  <LogOut size={18} />
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}
