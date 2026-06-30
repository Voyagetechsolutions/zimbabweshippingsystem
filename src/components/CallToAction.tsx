import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Phone, MessageCircle } from 'lucide-react';
import { photos } from '@/data/sitePhotos';

const CallToAction: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="relative isolate overflow-hidden rounded-3xl bg-ink shadow-2xl">
          {/* Real photo, subtle */}
          <img
            src={photos.containerLoading.src}
            alt={photos.containerLoading.alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/60" />
          <div className="absolute top-0 left-0 right-0 flex h-1">
            <div className="w-1/3 bg-zim-green" />
            <div className="w-1/3 bg-zim-yellow" />
            <div className="w-1/3 bg-zim-red" />
          </div>

          <div className="relative px-6 py-14 md:px-14 md:py-20">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold text-white md:text-4xl lg:text-5xl">
                Ready to send it home?
              </h2>
              <p className="mt-4 text-lg text-gray-200">
                Book your collection today, or ask us anything first — a real person
                answers. We collect free across the UK &amp; Ireland and deliver to every
                city in Zimbabwe.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  size="lg"
                  className="h-auto bg-zim-green px-8 py-6 text-lg font-semibold hover:bg-zim-green-dark"
                  onClick={() => navigate('/book')}
                >
                  Book your shipment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <a href="https://wa.me/447584100552" target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    className="h-auto w-full bg-[#25D366] px-8 py-6 text-lg font-semibold text-white hover:bg-[#1da851]"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Chat on WhatsApp
                  </Button>
                </a>
                <a href="tel:+447584100552">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-auto w-full border-white/30 bg-transparent px-8 py-6 text-lg font-semibold text-white hover:bg-white/10"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    +44 7584 100552
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
