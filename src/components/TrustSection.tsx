import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Truck, ShieldCheck, CreditCard, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { photos } from '@/data/sitePhotos';

const TrustSection: React.FC = () => {
  const features = [
    { icon: Users, title: 'A family, not a call centre', description: 'You deal with the people who handle your goods — no tickets, no runaround.' },
    { icon: Truck, title: 'Our own fleet in Zimbabwe', description: 'We control the whole journey, so deliveries are reliable and on time.' },
    { icon: ShieldCheck, title: 'Insured & metal-sealed', description: 'Every drum is sealed with a coded metal seal and fully insured in transit.' },
    { icon: CreditCard, title: 'Pay on flexible terms', description: '30-day payment terms from collection. Pay-on-arrival options available.' },
    { icon: MapPin, title: 'Every city in Zimbabwe', description: 'Harare, Bulawayo, Mutare, Vic Falls and everywhere in between.' },
    { icon: Clock, title: '14+ years doing this', description: 'Trusted by the diaspora since 2011. We know exactly what we\'re doing.' },
  ];

  return (
    <section className="bg-paper py-20 md:py-28 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Photo collage showing our collection and loading process */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl shadow-lg">
                  <img src={photos.drumWarehouse.src} alt={photos.drumWarehouse.alt} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                </div>
                <div className="overflow-hidden rounded-2xl shadow-lg">
                  <img src={photos.vanLoaded.src} alt={photos.vanLoaded.alt} loading="lazy" className="aspect-square w-full object-cover" />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="overflow-hidden rounded-2xl shadow-lg">
                  <img src={photos.warehouseMarked.src} alt={photos.warehouseMarked.alt} loading="lazy" className="aspect-square w-full object-cover" />
                </div>
                <div className="overflow-hidden rounded-2xl shadow-lg">
                  <img src={photos.machineryLoading.src} alt={photos.machineryLoading.alt} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
            </div>
            {/* Floating credential badge */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-2xl bg-ink px-6 py-4 text-center shadow-xl">
              <div className="font-display text-2xl font-extrabold text-zim-yellow">Since 2011</div>
              <div className="text-xs uppercase tracking-wider text-gray-300">Careful handling. Every shipment.</div>
            </div>
          </div>

          {/* Story + features */}
          <div>
            <span className="eyebrow">Why families trust us</span>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink md:text-4xl dark:text-white">
              We treat your shipment like it's our own
            </h2>
            <p className="mt-4 leading-relaxed text-gray-600 dark:text-gray-300">
              Our director started out as a FedEx driver and went on to build Telk Removals
              in the UK. That background — careful hands, real accountability — is exactly how
              we ship to Zimbabwe today. From a single drum to a container of machinery, your
              goods are handled by people who understand what's inside them.
            </p>

            <div className="mt-8 grid gap-x-6 gap-y-6 sm:grid-cols-2">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zim-green/10">
                    <feature.icon className="h-5 w-5 text-zim-green" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink dark:text-white">{feature.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-9">
              <Link to="/about-us">
                <Button variant="outline" className="gap-2 border-2">
                  Read our full story
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
