'use client';

import { GraduationCap } from 'lucide-react';
import { useService } from '@/hooks/useServices';

export default function ExamPinsPage() {
  const { service, loading, error } = useService('exam-pins');

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
                <GraduationCap size={40} className="text-[#F97316]" />
                {service.name}
              </h1>
              <p className="text-gray-600 text-lg mb-8">{service.description || 'No description available.'}</p>

              <div className="card space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
                  <select className="input-field">
                    <option>WAEC</option>
                    <option>NECO</option>
                    <option>NABTEB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <select className="input-field">
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                    <option>5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <div className="input-field bg-gray-50 flex items-center">₦3,500</div>
                </div>

                <button className="btn-accent w-full" disabled={!service.enabled}>
                  {service.enabled ? 'Purchase PINs' : 'Coming soon'}
                </button>
              </div>
            </>
          )}
        </div>
  );
}
