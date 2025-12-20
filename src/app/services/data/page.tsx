'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Wifi } from 'lucide-react';
import { useService } from '@/hooks/useServices';

export default function DataPage() {
  const { service, loading, error } = useService('data');

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-12">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="card text-center py-12">Loading service...</div>
          ) : error ? (
            <div className="card text-center py-12 text-destructive">Error loading service: {error}</div>
          ) : !service ? (
            <div className="card text-center py-12">Service not available</div>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-[#0A1F44] mb-4 flex items-center gap-3">
                <Wifi size={40} className="text-[#F97316]" />
                {service.name}
              </h1>
              <p className="text-gray-600 text-lg mb-8">{service.description || 'No description available.'}</p>

              <div className="card space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Network</label>
                  <select className="input-field">
                    <option>MTN</option>
                    <option>Glo</option>
                    <option>Airtel</option>
                    <option>9mobile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input type="tel" placeholder="+234..." className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Plan</label>
                  <select className="input-field">
                    <option>500MB - ₦100</option>
                    <option>1GB - ₦200</option>
                    <option>5GB - ₦1,000</option>
                    <option>10GB - ₦2,000</option>
                  </select>
                </div>

                <button className="btn-accent w-full" disabled={!service.enabled}>
                  {service.enabled ? 'Buy Data' : 'Coming soon'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
