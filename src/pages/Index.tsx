
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
import { Clock, ArrowRight, Truck, Package, Shield, MapPin } from 'lucide-react';
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
              <div className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full bg-zim-green/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-zim-green" />
                </div>
                <h3 className="font-semibold mb-2">Secure Handling</h3>
                <p className="text-sm text-gray-600">Professional packaging and secure handling throughout the shipping process</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full bg-zim-yellow/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-zim-yellow" />
                </div>
                <h3 className="font-semibold mb-2">Door-to-Door</h3>
                <p className="text-sm text-gray-600">Complete collection and delivery service from your UK address to Zimbabwe destination</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full bg-zim-red/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-zim-red" />
                </div>
                <h3 className="font-semibold mb-2">Regular Departures</h3>
                <p className="text-sm text-gray-600">Consistent shipping schedules with reliable transit times and tracking updates</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full bg-zim-black/10 flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-zim-black" />
                </div>
                <h3 className="font-semibold mb-2">Volume Pricing</h3>
                <p className="text-sm text-gray-600">Competitive volume-based pricing with transparent costs and no hidden fees</p>
              </div>
            </div>
          </div>
        </section>

        <ServicesSection />
        
        {/* Quick Links Section */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">Quick Access to Our Services</h2>
            <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
              Access our most popular services quickly. Whether you need pricing information, want to track your shipment, or require customer support, we've made it easy to find what you're looking for.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-zim-green/10 flex items-center justify-center mr-4">
                    <Clock className="h-6 w-6 text-zim-green" />
                  </div>
                  <h3 className="text-xl font-bold">Transparent Pricing Information</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  View our comprehensive shipping rates from the UK to Zimbabwe with volume discounts and special offers. Our transparent pricing structure ensures you know exactly what you'll pay with no hidden fees or surprises.
                </p>
                <Link to="/pricing">
                  <Button variant="outline" className="w-full">
                    View Complete Pricing <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-zim-red/10 flex items-center justify-center mr-4">
                    <Truck className="h-6 w-6 text-zim-red" />
                  </div>
                  <h3 className="text-xl font-bold">Real-Time Shipment Tracking</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Enter your tracking number to check the current status and location of your shipment. Our advanced tracking system provides real-time updates from collection in the UK to delivery in Zimbabwe.
                </p>
                <Link to="/track">
                  <Button variant="outline" className="w-full">
                    Track Your Shipment <ArrowRight className="ml-2 h-4 w-4" />
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
