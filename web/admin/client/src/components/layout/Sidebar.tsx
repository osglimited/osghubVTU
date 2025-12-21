import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowRightLeft,
  Server,
  Settings,
  User,
  FileText,
  LogOut
} from "lucide-react";
import { auth } from "@/lib/firebase";
// Use the copied admin logo in public assets
const logoUrl = "/assets/IMG-20251201-WA0053.jpg";

export function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "User Management", href: "/users" },
    { icon: Wallet, label: "Wallet Funding", href: "/wallet" },
    { icon: ArrowRightLeft, label: "Transactions", href: "/transactions" },
    { icon: Server, label: "VTU Services", href: "/services" },
    { icon: Settings, label: "API Settings", href: "/settings/api" },
    { icon: FileText, label: "System Logs", href: "/logs" },
    { icon: User, label: "My Profile", href: "/profile" },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform">
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border bg-white px-6">
        <img src={logoUrl} alt="OSGHUB Logo" className="h-10 w-auto" />
      </div>

      <div className="flex h-[calc(100vh-4rem)] flex-col justify-between px-3 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button
            onClick={() => auth.signOut()}
            className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
