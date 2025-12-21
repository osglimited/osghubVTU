'use client';

import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/a11y';
import Image from 'next/image';

interface Service {
  id: string;
  name: string;
  icon: string;
  category?: string;
}

const services: Service[] = [
  // Mobile Networks - Airtime & Data
  { id: 'mtn', name: 'MTN', icon: '/images/networks/mtn.png', category: 'Airtime & Data' },
  { id: 'airtel', name: 'Airtel', icon: '/images/networks/airtel.png', category: 'Airtime & Data' },
  { id: 'glo', name: 'Glo', icon: '/images/networks/glo.png', category: 'Airtime & Data' },
  { id: '9mobile', name: '9mobile', icon: '/images/networks/9mobile.png', category: 'Airtime & Data' },
  
  // Data Bundles
  { id: 'mtn-data', name: 'MTN Data', icon: '/images/icons/data.png', category: 'Data Plans' },
  { id: 'airtel-data', name: 'Airtel Data', icon: '/images/icons/data.png', category: 'Data Plans' },
  { id: 'glo-data', name: 'Glo Data', icon: '/images/icons/data.png', category: 'Data Plans' },
  { id: '9mobile-data', name: '9mobile Data', icon: '/images/icons/data.png', category: 'Data Plans' },
  
  // Exam Pins
  { id: 'waec', name: 'WAEC', icon: '/images/icons/waec.png', category: 'Exam PINs' },
  { id: 'neco', name: 'NECO', icon: '/images/icons/neco.png', category: 'Exam PINs' },
  { id: 'nabteb', name: 'NABTEB', icon: '/images/icons/nabteb.png', category: 'Exam PINs' },
  
  // Electricity Bills
  { id: 'ibedc', name: 'IBEDC', icon: '/images/bills/ibedc.png', category: 'Electricity' },
  { id: 'ekedc', name: 'EKEDC', icon: '/images/bills/ekedc.png', category: 'Electricity' },
  { id: 'ikedc', name: 'IKEDC', icon: '/images/bills/ikedc.png', category: 'Electricity' },
  { id: 'phed', name: 'PHED', icon: '/images/bills/phed.png', category: 'Electricity' },
  { id: 'aedc', name: 'AEDC', icon: '/images/bills/aedc.png', category: 'Electricity' },
  { id: 'eedc', name: 'EEDC', icon: '/images/bills/eedc.png', category: 'Electricity' },
  { id: 'kedco', name: 'KEDCO', icon: '/images/bills/kedco.png', category: 'Electricity' },
  
  // Cable TV
  { id: 'dstv', name: 'DStv', icon: '/images/tv/dstv.png', category: 'Cable TV' },
  { id: 'gotv', name: 'GOtv', icon: '/images/tv/gotv.png', category: 'Cable TV' },
  { id: 'startimes', name: 'Startimes', icon: '/images/tv/startimes.png', category: 'Cable TV' },
  
  // Internet Services
  { id: 'spectranet', name: 'Spectranet', icon: '/images/internet/spectranet.png', category: 'Internet' },
  { id: 'smiile', name: 'SMILE', icon: '/images/internet/smile.png', category: 'Internet' },
  
  // Betting
  { id: 'bet9ja', name: 'Bet9ja', icon: '/images/betting/bet9ja.png', category: 'Betting' },
  { id: 'betking', name: 'BetKing', icon: '/images/betting/betking.png', category: 'Betting' },
  { id: 'sportybet', name: 'SportyBet', icon: '/images/betting/sportybet.png', category: 'Betting' }
];

export function ServiceSlider() {
  const swiperRef = useRef<any>(null);

  // Group services by category
  const servicesByCategory = services.reduce<Record<string, Service[]>>((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {});

  return (
    <section className="py-8 md:py-12 bg-white border-t border-b border-gray-100">
      <div className="container px-4 mx-auto">
        <h2 className="sr-only">Our Services</h2>
        <Swiper
          ref={swiperRef}
          modules={[Autoplay, Navigation, Pagination, A11y]}
          spaceBetween={16}
          slidesPerView={2.5}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          pagination={{
            clickable: true,
            el: '.service-swiper-pagination',
            bulletClass: 'w-2 h-2 rounded-full bg-gray-300 mx-1 inline-block',
            bulletActiveClass: 'bg-primary w-4',
          }}
          a11y={{
            enabled: true,
            prevSlideMessage: 'Previous service',
            nextSlideMessage: 'Next service',
            firstSlideMessage: 'This is the first service',
            lastSlideMessage: 'This is the last service',
            paginationBulletMessage: 'Go to service {{index}}',
          }}
          breakpoints={{
            480: { slidesPerView: 3 },
            640: { slidesPerView: 4 },
            768: { slidesPerView: 5 },
            1024: { slidesPerView: 6 },
            1280: { slidesPerView: 8 },
          }}
          className="w-full pb-8"
        >
          {services.map((service) => (
            <SwiperSlide key={service.id}>
              <div 
                className="flex flex-col items-center p-3 rounded-xl bg-white border border-gray-100 hover:border-primary/20 hover:shadow-sm transition-all duration-300 h-full cursor-pointer group"
                role="button"
                tabIndex={0}
                onClick={() => {
                  // Handle service click (e.g., navigate to service page)
                  console.log(`Selected service: ${service.name}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    console.log(`Selected service: ${service.name}`);
                  }
                }}
              >
                <div className="w-14 h-14 md:w-16 md:h-16 mb-2 flex items-center justify-center bg-white rounded-lg p-2 group-hover:bg-primary/5 transition-colors duration-300">
                  <Image
                    src={service.icon}
                    alt={`${service.name} logo`}
                    width={48}
                    height={48}
                    className="object-contain w-full h-full"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to a placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/images/placeholder-service.png';
                    }}
                  />
                </div>
                <span className="text-xs md:text-sm font-medium text-gray-800 text-center leading-tight">
                  {service.name}
                </span>
                {service.category && (
                  <span className="mt-1 text-[10px] text-gray-500 font-medium">
                    {service.category}
                  </span>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        
        {/* Custom pagination */}
        <div className="service-swiper-pagination text-center mt-4" />
      </div>
    </section>
  );
}