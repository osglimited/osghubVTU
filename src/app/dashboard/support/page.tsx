'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';

export default function SupportPage() {
  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="max-w-2xl space-y-6">
          <h1 className="text-3xl font-bold text-[#0A1F44]">Support</h1>

          <div className="card space-y-4">
            <p className="text-gray-600">
              Need help with your account or a transaction? Reach us via:
            </p>
            <ul className="list-disc list-inside text-[#0A1F44]">
              <li>Email: support@osghub.com</li>
              <li>Phone: +234-000-000-0000</li>
            </ul>
            <p className="text-gray-600">
              Our team responds within 24 hours during business days.
            </p>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
