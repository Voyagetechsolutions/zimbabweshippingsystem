
import React from 'react';
import Navbar, { CurrencyProvider } from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import TrackingSection from '@/components/TrackingSection';
import TestimonialSection from '@/components/TestimonialSection';
import CallToAction from '@/components/CallToAction';
import WhatsAppButton from '@/components/WhatsAppButton';

const Index = () => {
  return (
    <CurrencyProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <HeroSection />
          <ServicesSection />
          <TrackingSection />
          <TestimonialSection />
          <CallToAction />
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </CurrencyProvider>
  );
};

export default Index;
