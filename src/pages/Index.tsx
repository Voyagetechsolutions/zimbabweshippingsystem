import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import HowItWorks from '@/components/HowItWorks';
import PricingSection from '@/components/PricingSection';
import UpcomingCollections from '@/components/UpcomingCollections';
import TrustSection from '@/components/TrustSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import CallToAction from '@/components/CallToAction';
import WhatsAppButton from '@/components/WhatsAppButton';
import ShippingGallerySlideshow from '@/components/ShippingGallerySlideshow';
import SocialProofBanner from '@/components/SocialProofBanner';
import { Helmet } from 'react-helmet';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Zimbabwe Shipping | Ship from UK & Ireland to Zimbabwe</title>
        <meta
          name="description"
          content="Ship to Zimbabwe from UK & Ireland. Free collection, door-to-door delivery, fully tracked. Family-run business with 14+ years experience. Book online today."
        />
        <meta name="keywords" content="Zimbabwe shipping, UK to Zimbabwe, Ireland to Zimbabwe, drum shipping, trunk shipping, Zimbabwe courier, send goods to Zimbabwe" />
        <meta name="author" content="Zimbabwe Shipping" />

        {/* Open Graph */}
        <meta property="og:title" content="Zimbabwe Shipping | Ship from UK & Ireland to Zimbabwe" />
        <meta property="og:description" content="Ship to Zimbabwe from UK & Ireland. Free collection, door-to-door delivery, fully tracked. Book online today." />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Zimbabwe Shipping | Ship from UK & Ireland to Zimbabwe" />
        <meta name="twitter:description" content="Ship to Zimbabwe from UK & Ireland. Free collection, door-to-door delivery, fully tracked. Book online today." />
      </Helmet>

      <Navbar />
      <main className="flex-grow">
        {/* Hero with pricing headline and trust stats */}
        <HeroSection />

        {/* Social proof stats banner */}
        <SocialProofBanner />

        {/* How it works - 3 simple steps */}
        <HowItWorks />

        {/* Gallery - real photos of our operations */}
        <ShippingGallerySlideshow />

        {/* Upcoming collection dates */}
        <UpcomingCollections />

        {/* Pricing - drums and custom quote */}
        <PricingSection />

        {/* Why choose us - trust builders */}
        <TrustSection />

        {/* Customer testimonials */}
        <TestimonialsSection />

        {/* Final CTA */}
        <CallToAction />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
