
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import TrackingSection from '@/components/TrackingSection';
import ShippingCalculator from '@/components/ShippingCalculator';
import PricingSection from '@/components/PricingSection';
import CallToAction from '@/components/CallToAction';
import WhatsAppButton from '@/components/WhatsAppButton';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import ShippingGallerySlideshow from '@/components/ShippingGallerySlideshow';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Truck, Package } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <ServicesSection />
        
        {/* Quick Links Section */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-zim-green/10 flex items-center justify-center mr-4">
                    <Clock className="h-6 w-6 text-zim-green" />
                  </div>
                  <h3 className="text-xl font-bold">Pricing Details</h3>
                </div>
                <p className="text-gray-600 mb-4">View our transparent shipping rates from the UK to Zimbabwe with volume discounts.</p>
                <Link to="/pricing">
                  <Button variant="outline" className="w-full">
                    View Pricing <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-zim-yellow/10 flex items-center justify-center mr-4">
                    <Package className="h-6 w-6 text-zim-yellow" />
                  </div>
                  <h3 className="text-xl font-bold">Custom Quotes</h3>
                </div>
                <p className="text-gray-600 mb-4">Request custom quotes for special items, oversized cargo, or bulk shipments.</p>
                <Link to="/custom-quote">
                  <Button variant="outline" className="w-full">
                    Get Quote <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-zim-red/10 flex items-center justify-center mr-4">
                    <Truck className="h-6 w-6 text-zim-red" />
                  </div>
                  <h3 className="text-xl font-bold">Track Shipment</h3>
                </div>
                <p className="text-gray-600 mb-4">Enter your tracking number to check the current status of your shipment.</p>
                <Link to="/track">
                  <Button variant="outline" className="w-full">
                    Track Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        <TrackingSection />
        <PricingSection />
        <ShippingCalculator />
        <ShippingGallerySlideshow />
        <section id="reviews" className="py-16 bg-gray-50 reviews-section">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
            <ReviewsSection />
          </div>
        </section>
        <CallToAction />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
