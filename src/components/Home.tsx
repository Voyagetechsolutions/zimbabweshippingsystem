import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  TruckIcon,
  ShieldCheckIcon,
  ClockIcon,
  MapPinIcon,
  CalculatorIcon,
  HeartIcon,
} from 'lucide-react';
import { Helmet } from 'react-helmet';
import HeroImage from '@/assets/hero.webp';
import WhatsAppButton from '@/components/WhatsAppButton';
import AnnouncementsFeed from '@/components/AnnouncementsFeed';
import PersonalizedTestimonials from '@/components/PersonalizedTestimonials';
import QuickShippingCalculator from '@/components/QuickShippingCalculator';
import ShippingNewsTicker from '@/components/ShippingNewsTicker';
import ShippingGallerySlideshow from '@/components/ShippingGallerySlideshow';

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const services = [
    {
      title: 'UK to Zimbabwe Shipping',
      description: 'Reliable and regular Zimbabwe shipping from the UK to all major cities in Zimbabwe.',
      icon: <TruckIcon className="h-10 w-10 text-zim-green" />,
    },
    {
      title: 'Door-to-Door Delivery',
      description: 'We collect from your UK address and deliver directly to your recipient in Zimbabwe.',
      icon: <MapPinIcon className="h-10 w-10 text-zim-green" />,
    },
    {
      title: 'Secure Handling',
      description: 'Your Zimbabwe shipments are carefully handled and tracked throughout the journey.',
      icon: <ShieldCheckIcon className="h-10 w-10 text-zim-green" />,
    },
    {
      title: 'Fast Transit Times',
      description: 'Regular departures and efficient Zimbabwe shipping with competitive transit times.',
      icon: <ClockIcon className="h-10 w-10 text-zim-green" />,
    },
    {
      title: 'Transparent Pricing',
      description: 'Clear pricing structure for Zimbabwe shipping with no hidden fees.',
      icon: <CalculatorIcon className="h-10 w-10 text-zim-green" />,
    },
    {
      title: 'Personal Service',
      description: 'Dedicated customer service team for all your Zimbabwe shipping needs.',
      icon: <HeartIcon className="h-10 w-10 text-zim-green" />,
    },
  ];

  const animationClass = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8';

  return (
    <div className="bg-white">
      <Helmet>
        <title>Zimbabwe Shipping | UK to Zimbabwe Delivery Services</title>
        <meta
          name="description"
          content="Reliable and affordable Zimbabwe shipping services from the UK. Door-to-door delivery, parcel tracking & more. Book online today!"
        />
      </Helmet>

      {/* Hero Section */}
      <section className="relative px-4 py-16 sm:px-6 sm:py-24 lg:py-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-black opacity-70 z-0"></div>
        <img
          src={HeroImage}
          alt="Shipping container with Zimbabwe flag"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 transition-all duration-700 ${animationClass}`}>
            Reliable Zimbabwe Shipping from UK – Fast & Affordable
          </h1>
          <p className={`text-lg md:text-xl text-white/90 mb-10 transition-all duration-700 delay-100 ${animationClass}`}>
            We specialize in Zimbabwe shipping with secure, affordable, and fast door-to-door delivery.
          </p>
          <div className={`flex flex-col sm:flex-row justify-center gap-4 transition-all duration-700 delay-200 ${animationClass}`}>
            <Button asChild size="lg" className="bg-zim-green hover:bg-zim-green/90">
              <Link to="/booking">Book a Shipment</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
              <Link to="/track">Track Shipment</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* News Ticker Section */}
      <section className="py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <ShippingNewsTicker />
      </section>

      {/* Announcements Section */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <AnnouncementsFeed />
      </section>

      {/* Shipping Gallery Slideshow */}
      <ShippingGallerySlideshow />

      {/* Quick Calculator and Services Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-gray-50">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="text-left mb-8">
              <h2 className={`text-3xl font-bold text-gray-900 mb-4 transition-all duration-700 delay-300 ${animationClass}`}>
                Our Zimbabwe Shipping Services
              </h2>
              <p className={`text-lg text-gray-600 max-w-2xl transition-all duration-700 delay-400 ${animationClass}`}>
                We offer comprehensive Zimbabwe shipping solutions from the UK, focusing on reliability, transparency, and customer satisfaction.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {services.slice(0, 4).map((service, index) => (
                <div
                  key={index}
                  className={`bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all duration-700 ${animationClass}`}
                  style={{ transitionDelay: `${500 + index * 100}ms` }}
                >
                  <div className="mb-3">{service.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                  <p className="text-gray-600 text-sm">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <QuickShippingCalculator />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Read testimonials from customers in your area who have used our Zimbabwe shipping services.
          </p>
        </div>
        <PersonalizedTestimonials />
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-zim-green text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className={`text-3xl font-bold mb-6 transition-all duration-700 ${animationClass}`}>
            Ready to get started?
          </h2>
          <p className={`text-lg mb-8 max-w-2xl mx-auto transition-all duration-700 delay-100 ${animationClass}`}>
            Join thousands of satisfied customers who trust us with their Zimbabwe shipping needs. Book your shipment today!
          </p>
          <Button asChild size="lg" variant="outline" className={`bg-white text-zim-green hover:bg-gray-100 transition-all duration-700 delay-200 ${animationClass}`}>
            <Link to="/signup">Sign Up Now</Link>
          </Button>
        </div>
      </section>

      <WhatsAppButton />
    </div>
  );
};

export default Home;
