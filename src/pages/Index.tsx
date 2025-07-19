
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import TrackingSection from '@/components/TrackingSection';
import PricingSection from '@/components/PricingSection';
import CallToAction from '@/components/CallToAction';
import WhatsAppButton from '@/components/WhatsAppButton';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import ShippingGallerySlideshow from '@/components/ShippingGallerySlideshow';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Clock, Shield, MapPin, Package } from 'lucide-react';
import { Helmet } from 'react-helmet';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Zimbabwe Shipping | Professional UK to Zimbabwe Courier & Freight Services</title>
        <meta
          name="description"
          content="Professional Zimbabwe shipping and freight services from the UK. Established courier company offering secure door-to-door delivery, competitive rates, and reliable transit times to all Zimbabwe cities."
        />
        <meta name="keywords" content="Zimbabwe courier, UK Zimbabwe freight, professional shipping services, Zimbabwe logistics, international courier" />
        <meta name="author" content="Zimbabwe Shipping" />

        {/* Open Graph */}
        <meta property="og:title" content="Zimbabwe Shipping | Professional UK to Zimbabwe Courier Services" />
        <meta property="og:description" content="Professional Zimbabwe shipping and freight services from the UK with secure delivery and competitive rates." />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Zimbabwe Shipping | Professional UK to Zimbabwe Courier Services" />
        <meta name="twitter:description" content="Professional Zimbabwe shipping and freight services from the UK with secure delivery and competitive rates." />
      </Helmet>

      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        
        {/* Enhanced Services Overview Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Comprehensive Zimbabwe Shipping Solutions</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
                We provide end-to-end shipping solutions from the UK to Zimbabwe, combining years of experience with modern logistics technology. Our comprehensive service portfolio includes personal shipments, commercial freight, and specialized cargo handling to meet diverse customer needs across all Zimbabwe cities.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Button
                asChild
                variant="outline"
                className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow h-auto flex-col space-y-4 border-gray-200"
              >
                <Link to="/pricing">
                  <div className="w-16 h-16 rounded-full bg-zim-green/10 flex items-center justify-center mx-auto">
                    <Clock className="h-8 w-8 text-zim-green" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Delivery Time</h3>
                    <p className="text-sm text-gray-600">4-6 weeks transit time</p>
                  </div>
                </Link>
              </Button>
              
              <Button
                asChild
                variant="outline"
                className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow h-auto flex-col space-y-4 border-gray-200"
              >
                <Link to="/services">
                  <div className="w-16 h-16 rounded-full bg-zim-yellow/10 flex items-center justify-center mx-auto">
                    <Shield className="h-8 w-8 text-zim-yellow" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Secure Packaging</h3>
                    <p className="text-sm text-gray-600">Safe handling guaranteed</p>
                  </div>
                </Link>
              </Button>
              
              <Button
                asChild
                variant="outline"
                className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow h-auto flex-col space-y-4 border-gray-200"
              >
                <Link to="/pricing">
                  <div className="w-16 h-16 rounded-full bg-zim-red/10 flex items-center justify-center mx-auto">
                    <MapPin className="h-8 w-8 text-zim-red" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Best Prices</h3>
                    <p className="text-sm text-gray-600">Starting from £150</p>
                  </div>
                </Link>
              </Button>
              
              <Button
                asChild
                variant="outline"
                className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow h-auto flex-col space-y-4 border-gray-200"
              >
                <Link to="/pricing">
                  <div className="w-16 h-16 rounded-full bg-zim-black/10 flex items-center justify-center mx-auto">
                    <Package className="h-8 w-8 text-zim-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Volume Based</h3>
                    <p className="text-sm text-gray-600">Pricing by volume</p>
                  </div>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <ServicesSection />
        <TrackingSection />
        <PricingSection />
        <ShippingGallerySlideshow />
        
        <section id="reviews" className="py-16 bg-gray-50 reviews-section">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-6">Customer Reviews and Testimonials</h2>
            <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
              Read what our customers say about their experience with Zimbabwe Shipping Services. These genuine reviews reflect our commitment to providing exceptional shipping services, reliable delivery times, and outstanding customer support for every shipment from the UK to Zimbabwe.
            </p>
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
