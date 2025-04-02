
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Send } from 'lucide-react';

const CallToAction: React.FC = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-zim-green via-zim-yellow to-zim-red rounded-xl overflow-hidden shadow-xl">
          <div className="bg-white/10 backdrop-blur-sm p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="md:w-2/3 mb-6 md:mb-0">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Ship Your Package?</h2>
                <p className="text-white/90 text-lg">
                  Book your shipment today and enjoy our fast, reliable, and affordable service from the UK to Zimbabwe.
                </p>
              </div>
              <div className="md:w-1/3 flex flex-col space-y-4 md:items-end">
                <Button className="bg-white text-zim-black hover:bg-white/90 text-lg flex items-center justify-center">
                  Book Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/20 flex items-center justify-center">
                  <Send className="mr-2 h-5 w-5" /> Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
