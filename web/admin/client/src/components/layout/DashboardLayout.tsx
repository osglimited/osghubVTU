import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { auth, onAuthStateChanged } from "@/lib/firebase";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user: any) => {
      if (user) {
        setIsAuthenticated(true);
        // If user is already logged in and tries to access login page, redirect to dashboard
        if (location === "/login" || location === "/forgot-password") {
          setLocation("/");
        }
      } else {
        setIsAuthenticated(false);
        // If user is not logged in and tries to access protected routes, redirect to login
        if (location !== "/login" && location !== "/forgot-password") {
          setLocation("/login");
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If on login page or forgot password, render without layout
  if (location === "/login" || location === "/forgot-password") {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-64 transition-all duration-300">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
