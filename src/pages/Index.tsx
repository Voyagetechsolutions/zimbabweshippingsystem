
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
