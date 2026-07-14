import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, ShieldCheck, Truck, Phone, Search, Calendar } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';
import { photos } from '@/data/sitePhotos';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [nextCollection, setNextCollection] = useState<{ label: string; route: string } | null>(null);

  // Surface the genuine next collection date for honest urgency.
  useEffect(() => {
    const fetchNext = async () => {
      try {
        const { data, error } = await supabase
          .from('collection_schedules')
          .select('route, pickup_date, country')
          .order('pickup_date', { ascending: true });

        if (error || !data) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const next = data
          .map((d) => ({ ...d, date: new Date(d.pickup_date) }))
          .filter((d) => isValid(d.date) && d.date >= today)
          .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

        if (next) {
          setNextCollection({
            label: format(next.date, 'EEE, MMM d'),
            route: next.country === 'Ireland' ? 'Ireland' : 'UK',
          });
        }
      } catch {
        /* non-critical — hero renders fine without it */
      }
    };
    fetchNext();
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-ink">
      {/* Branded operations image showing the team loading a container */}
      <img
        src={photos.containerLoading.src}
        alt={photos.containerLoading.alt}
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Editorial gradient — darker on the left for headline legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-ink/30" />

      {/* Zimbabwe flag accent */}
      <div className="absolute top-0 left-0 right-0 z-20 flex h-1">
        <div className="w-1/3 bg-zim-green" />
        <div className="w-1/3 bg-zim-yellow" />
        <div className="w-1/3 bg-zim-red" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-2xl py-20 md:py-28 lg:py-32">
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zim-green opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-zim-green" />
            </span>
            UK &amp; Ireland to Zimbabwe · Family-run since 2011
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Send it home.
            <span className="block text-zim-yellow">We'll treat it like our own.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-200">
            Free collection across the UK &amp; Ireland, door-to-door delivery to every
            city in Zimbabwe, fully insured and tracked the whole way. Drums from
            <span className="font-semibold text-white"> £280</span>.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => navigate('/book')}
              size="lg"
              className="h-auto bg-zim-green px-8 py-6 text-lg font-semibold shadow-lg shadow-zim-green/25 hover:bg-zim-green-dark"
            >
              Book your shipment
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              onClick={() => navigate('/custom-quote-request')}
              size="lg"
              variant="outline"
              className="h-auto border-white/30 bg-white/5 px-8 py-6 text-lg font-semibold text-white backdrop-blur-sm hover:bg-white hover:text-ink"
            >
              Get a free quote
            </Button>
          </div>

          {/* Trust row */}
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 text-sm text-gray-200">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-zim-yellow text-zim-yellow" />
                ))}
              </div>
              <span className="font-semibold text-white">4.9</span>
              <span className="text-gray-300">from real customers</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-zim-green" />
              <span>Every shipment insured</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-zim-green" />
              <span>Our own fleet in Zimbabwe</span>
            </div>
          </div>

          {/* Next collection + quick links */}
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            {nextCollection && (
              <Link
                to="/collection-schedule"
                className="inline-flex items-center gap-2 rounded-full bg-zim-yellow/15 px-4 py-2 font-medium text-zim-yellow ring-1 ring-inset ring-zim-yellow/30 transition hover:bg-zim-yellow/25"
              >
                <Calendar className="h-4 w-4" />
                Next {nextCollection.route} collection: {nextCollection.label}
              </Link>
            )}
            <Link to="/track" className="inline-flex items-center gap-2 text-gray-200 transition hover:text-white">
              <Search className="h-4 w-4" /> Track a shipment
            </Link>
            <a
              href="https://wa.me/447584100552"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-200 transition hover:text-white"
            >
              <Phone className="h-4 w-4" /> WhatsApp us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
