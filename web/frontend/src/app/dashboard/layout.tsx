import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </DashboardGuard>
  );
}
