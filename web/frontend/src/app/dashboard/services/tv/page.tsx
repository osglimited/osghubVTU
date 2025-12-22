'use client';

import { Tv } from 'lucide-react';
import { useService } from '@/hooks/useServices';

export default function TVPage() {
  const { service, loading, error } = useService('tv');

  return (
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
            <Tv size={40} className="text-[#F97316]" />
            {service.name}
          </h1>
          <p className="text-gray-600 text-lg mb-8">{service.description || 'No description available.'}</p>

          <div className="card space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Provider</label>
              <select className="input-field">
                <option>DSTV</option>
                <option>GOTV</option>
                <option>Startimes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Smart Card Number</label>
              <input type="text" placeholder="Enter smart card number" className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Package</label>
              <select className="input-field">
                <option>Basic - ₦4,350</option>
                <option>Standard - ₦7,800</option>
                <option>Premium - ₦15,000</option>
              </select>
            </div>

            <button className="btn-accent w-full" disabled={!service.enabled}>
              {service.enabled ? 'Subscribe' : 'Coming soon'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
