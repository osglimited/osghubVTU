'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Tv } from 'lucide-react';

export default function TVPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-[#0A1F44] mb-4 flex items-center gap-3">
            <Tv size={40} className="text-[#F97316]" />
            Cable TV Subscription
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            Instant activation for DSTV, GOTV, and Startimes.
          </p>

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

            <button className="btn-accent w-full">
              Subscribe
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
