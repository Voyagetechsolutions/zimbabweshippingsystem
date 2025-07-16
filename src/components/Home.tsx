
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
        <title>Zimbabwe Shipping Services - Fast UK to Zimbabwe Delivery | Family-Run Business Since 2011</title>
        <meta
          name="description"
          content="Expert Zimbabwe shipping services from UK. Family-run business since 2011 offering door-to-door delivery, secure handling, and competitive rates. Free UK collection with 30-day payment terms."
        />
        <meta name="keywords" content="Zimbabwe shipping, UK to Zimbabwe delivery, shipping to Zimbabwe, parcel delivery Zimbabwe, family shipping business" />
        <meta name="author" content="Zimbabwe Shipping Services" />

        {/* Open Graph for Facebook & others */}
        <meta property="og:title" content="Zimbabwe Shipping Services - Fast UK to Zimbabwe Delivery" />
        <meta property="og:description" content="Expert Zimbabwe shipping from UK. Family-run business since 2011 with door-to-door delivery, secure handling, and competitive rates." />
        <meta property="og:image" content="https://zimbabweshipping.com/og-image.jpg" />
        <meta property="og:url" content="https://zimbabweshipping.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Zimbabwe Shipping Services - Fast UK to Zimbabwe Delivery" />
        <meta name="twitter:description" content="Expert Zimbabwe shipping from UK. Family-run business since 2011 with door-to-door delivery and secure handling." />
        <meta name="twitter:image" content="https://zimbabweshipping.com/og-image.jpg" />
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
            We specialize in Zimbabwe shipping with secure, affordable, and fast door-to-door delivery. Our family-run business has been serving the Zimbabwe community since 2011, providing trusted shipping solutions with exceptional customer service.
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

      {/* Why Choose Zimbabwe Shipping Services Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose Zimbabwe Shipping Services?</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            As a family-run business established in 2011, we understand the importance of connecting families and businesses between the UK and Zimbabwe. Our director's experience as a former FedEx driver and successful establishment of Telk Removals has shaped our commitment to safe, reliable, and trustworthy shipping services.
          </p>
          <p className="text-base text-gray-600 max-w-3xl mx-auto">
            We treat every shipment as if it were our own, ensuring your goods are handled with the utmost care throughout their journey. From personal items and gifts to commercial cargo, we provide comprehensive shipping solutions that you can depend on. Our expansion from Bulawayo Shipping Services to Zimbabwe Shipping Services reflects our growth and commitment to serving all cities across Zimbabwe.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {services.map((service, index) => (
            <div
              key={index}
              className={`bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 ${animationClass}`}
              style={{ transitionDelay: `${300 + index * 100}ms` }}
            >
              <div className="mb-4 flex justify-center">{service.icon}</div>
              <h3 className="text-xl font-semibold mb-3 text-center">{service.title}</h3>
              <p className="text-gray-600 text-center leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our Experience and Commitment Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">14+ Years of Shipping Excellence</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Since 2011, Zimbabwe Shipping Services has been the trusted choice for UK to Zimbabwe shipping. Our journey began with a passion for safe and reliable transportation, strongly influenced by our director's experience as a FedEx driver where diligent goods handling and trustworthiness became our core values.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Before venturing into international shipping, we successfully established Telk Removals, a well-regarded home removals company in the UK. This experience sharpened our skills in handling diverse goods and deepened our understanding of customer needs: care, reliability, and trust.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              In 2013, we expanded into trucking logistics in Zimbabwe, complementing our shipping business and ensuring progressive goods movement throughout the country. Today, we serve all major cities in Zimbabwe and have recently opened a new branch in Ireland to better serve our growing customer base.
            </p>
            <div className="space-y-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-zim-green mr-3" />
                <span className="font-medium">Free collection from anywhere in the UK</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-zim-green mr-3" />
                <span className="font-medium">30-day payment terms from collection</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-zim-green mr-3" />
                <span className="font-medium">Competitive and transparent pricing</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-zim-green mr-3" />
                <span className="font-medium">Customs clearance assistance</span>
              </div>
            </div>
          </div>
          <div>
            <QuickShippingCalculator />
          </div>
        </div>
      </section>

      {/* Shipping Gallery Slideshow */}
      <ShippingGallerySlideshow />

      {/* Testimonials Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What Our Customers Say About Our Zimbabwe Shipping Services
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Read testimonials from satisfied customers who have trusted us with their Zimbabwe shipping needs. Our commitment to excellence has earned us a reputation for reliability and outstanding customer service across the UK and beyond.
          </p>
        </div>
        <PersonalizedTestimonials />
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-zim-green text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className={`text-3xl font-bold mb-6 transition-all duration-700 ${animationClass}`}>
            Ready to Ship to Zimbabwe? Join Thousands of Satisfied Customers
          </h2>
          <p className={`text-lg mb-8 max-w-2xl mx-auto transition-all duration-700 delay-100 ${animationClass}`}>
            Experience the difference of working with a family-run shipping company that treats your goods like our own. With over 14 years of experience, competitive pricing, and exceptional customer service, we're your trusted partner for all Zimbabwe shipping needs. Contact us today for a quote or to discuss your specific requirements.
          </p>
          <Button asChild size="lg" variant="outline" className={`bg-white text-zim-green hover:bg-gray-100 transition-all duration-700 delay-200 ${animationClass}`}>
            <Link to="/signup">Get Started Today</Link>
          </Button>
        </div>
      </section>

      <WhatsAppButton />
    </div>
  );
};

export default Home;
