
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import TrackingSection from '@/components/TrackingSection';
import ShippingCalculator from '@/components/ShippingCalculator';
import TestimonialSection from '@/components/TestimonialSection';
import CallToAction from '@/components/CallToAction';
import WhatsAppButton from '@/components/WhatsAppButton';
import ReviewsSection from '@/components/reviews/ReviewsSection';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <ServicesSection />
        <TrackingSection />
        <ShippingCalculator />
        <section className="py-16 bg-gray-50">
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
