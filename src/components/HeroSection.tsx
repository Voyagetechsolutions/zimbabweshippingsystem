import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Truck, Users, MapPin } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Fetch a random image from the gallery for the background
  useEffect(() => {
    const fetchBackgroundImage = async () => {
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('src')
          .limit(10);

        if (error) {
          console.error('Error fetching background image:', error.message);
          return;
        }

        if (data && data.length > 0) {
          // Pick a random image from the fetched ones
          const randomIndex = Math.floor(Math.random() * data.length);
          setBackgroundImage(data[randomIndex].src);
        }
      } catch (err) {
        console.error('Error fetching background image:', err);
      }
    };

    fetchBackgroundImage();
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Image with Overlay */}
      {backgroundImage && (
        <div className="absolute inset-0">
          <img
            src={backgroundImage}
            alt="Zimbabwe Shipping Operations"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/85 to-gray-900/90" />
        </div>
      )}

      {/* Fallback pattern if no image */}
      {!backgroundImage && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
      )}

      {/* Green accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zim-green via-zim-yellow to-zim-red z-20" />

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Service badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Now serving UK & Ireland
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
            Ship to Zimbabwe from{' '}
            <span className="text-zim-green">£240</span>/drum
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow">
            Free collection across UK & Ireland • Door-to-door delivery • Fully tracked
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={() => navigate('/book')}
              size="lg"
              className="bg-zim-green hover:bg-zim-green/90 text-white text-lg px-8 py-6 h-auto shadow-lg"
            >
              Book Your Shipment
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              onClick={() => navigate('/custom-quote-request')}
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-6 h-auto backdrop-blur-sm"
            >
              Get a Quote
            </Button>
          </div>

          {/* Trust Stats Bar */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-3xl mx-auto border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="bg-zim-green/20 p-3 rounded-full">
                  <Truck className="h-6 w-6 text-zim-green" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">14+</div>
                  <div className="text-sm text-gray-300">Years Experience</div>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="bg-zim-yellow/20 p-3 rounded-full">
                  <Users className="h-6 w-6 text-zim-yellow" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">1000+</div>
                  <div className="text-sm text-gray-300">Happy Customers</div>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="bg-zim-red/20 p-3 rounded-full">
                  <MapPin className="h-6 w-6 text-zim-red" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">All Cities</div>
                  <div className="text-sm text-gray-300">Zimbabwe Covered</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick action links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <Link
              to="/track"
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Track a shipment
            </Link>
            <span className="text-gray-500">•</span>
            <Link
              to="/collection-schedule"
              className="text-gray-300 hover:text-white transition-colors"
            >
              View collection dates
            </Link>
            <span className="text-gray-500">•</span>
            <a
              href="https://wa.me/447584100552"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
