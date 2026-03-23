import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Phone } from 'lucide-react';

const CallToAction: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-zim-green via-zim-green to-emerald-600 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Ship?
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers. Book your shipment today and get your items to Zimbabwe safely.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-zim-green hover:bg-white/90 text-lg px-8 py-6 h-auto"
                onClick={() => navigate('/book')}
              >
                Book Your Shipment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <a href="tel:+447584100552">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto w-full"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  +44 7584 100552
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
