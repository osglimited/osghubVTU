import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Smartphone, Wifi, Tv, Zap, GraduationCap, CreditCard, ArrowRight, CheckCircle } from 'lucide-react';

export default function Home() {
  const services = [
    { title: 'Buy Airtime', icon: Smartphone, desc: 'Instant airtime for all networks' },
    { title: 'Buy Data', icon: Wifi, desc: 'Fast data bundles' },
    { title: 'Cable TV', icon: Tv, desc: 'Activate subscriptions instantly' },
    { title: 'Electricity', icon: Zap, desc: 'Pay bills instantly' },
    { title: 'Education Pins', icon: GraduationCap, desc: 'WAEC, NECO, NABTEB' },
    { title: 'Airtime to Cash', icon: CreditCard, desc: 'Convert airtime instantly' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#0A1F44] to-[#020617] text-white py-20 md:py-32">
        <div className="container-main text-center">
          <div className="inline-block px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm mb-6">
            <span className="text-[#F97316]">✦</span> #1 VTU Platform in Nigeria
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Instant Top-up for <br /> <span className="text-[#F97316]">Everything You Need</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Fast, secure, and automated. Get airtime, data, and more in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-accent flex items-center gap-2 text-lg px-8 py-3">
                Get Started <ArrowRight size={20} />
              </button>
            </Link>
            <Link href="/login">
              <button className="px-8 py-3 border-2 border-white rounded-lg hover:bg-white/10 transition text-lg">
                Login
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-[#F8FAFC]">
        <div className="container-main">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A1F44] text-center mb-4">
            Our Services
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
            Complete solutions for all your digital needs
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.title} className="card hover:shadow-lg">
                  <Icon size={40} className="text-[#F97316] mb-4" />
                  <h3 className="text-xl font-semibold text-[#0A1F44] mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-600">{service.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="about" className="py-20 bg-white">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0A1F44] mb-6">
                Why Choose OSGHUB VTU?
              </h2>
              <ul className="space-y-4">
                {[
                  { title: 'Lightning Fast', desc: 'Instant delivery within seconds' },
                  { title: '100% Secure', desc: 'Bank-level encryption' },
                  { title: '24/7 Support', desc: 'Always here to help' },
                  { title: 'Best Rates', desc: 'Competitive pricing guaranteed' },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <CheckCircle className="text-[#16A34A] flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-[#0A1F44]">{item.title}</h3>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#0A1F44] to-[#020617] rounded-2xl p-8 text-white text-center">
              <div className="text-5xl font-bold mb-2">10k+</div>
              <div className="text-gray-300 mb-8">Happy Customers</div>
              <div className="text-5xl font-bold mb-2">50k+</div>
              <div className="text-gray-300">Daily Transactions</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
