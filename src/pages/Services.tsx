import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Button } from '@/components/ui/button';
import {
  Package,
  Truck,
  Home,
  Building2,
  Check,
  ArrowRight,
  Calendar,
  Phone
} from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: Package,
      title: 'Drum Shipping',
      description: 'Our most popular service. Ship your goods in secure 200-220L drums.',
      features: [
        'UK: From £240 | Ireland: From €340',
        'Free collection across UK & Ireland',
        'Metal coded seal included',
        'Full insurance & tracking',
      ],
      cta: 'Book Drums',
      link: '/book',
      color: 'zim-green',
    },
    {
      icon: Truck,
      title: 'Other Items',
      description: 'Ship furniture, appliances, electronics, and other large items.',
      features: [
        'Custom pricing based on size',
        'Collection from UK & Ireland',
        'Same great service',
        'Free quote within 24 hours',
      ],
      cta: 'Get Quote',
      link: '/custom-quote-request',
      color: 'zim-yellow',
    },
    {
      icon: Home,
      title: 'Door-to-Door',
      description: 'Complete convenience from your UK or Ireland address to any Zimbabwe address.',
      features: [
        'Free collection in UK & Ireland',
        'Delivery to recipient\'s door',
        'All cities in Zimbabwe',
        'Real-time tracking',
      ],
      cta: 'Book Now',
      link: '/book',
      color: 'zim-red',
    },
    {
      icon: Building2,
      title: 'Commercial',
      description: 'Specialized shipping solutions for businesses in UK & Ireland.',
      features: [
        'Volume discounts',
        'Regular shipping schedules',
        'Commercial invoicing',
        'Dedicated account support',
      ],
      cta: 'Contact Us',
      link: '/contact',
      color: 'gray',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Services | Zimbabwe Shipping - UK & Ireland to Zimbabwe</title>
        <meta name="description" content="UK & Ireland to Zimbabwe shipping services: drum shipping from £240/€340, furniture, appliances, commercial goods. Free collection, door-to-door delivery." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              Now serving UK & Ireland
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Our Services
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              From drums to furniture, personal items to commercial cargo - we ship it all from UK & Ireland to Zimbabwe.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 hover:shadow-lg transition-shadow"
                  >
                    <div className={`
                      inline-flex p-4 rounded-xl mb-6
                      ${service.color === 'zim-green' ? 'bg-zim-green/10' : ''}
                      ${service.color === 'zim-yellow' ? 'bg-zim-yellow/10' : ''}
                      ${service.color === 'zim-red' ? 'bg-zim-red/10' : ''}
                      ${service.color === 'gray' ? 'bg-gray-200' : ''}
                    `}>
                      <service.icon className={`
                        h-8 w-8
                        ${service.color === 'zim-green' ? 'text-zim-green' : ''}
                        ${service.color === 'zim-yellow' ? 'text-zim-yellow' : ''}
                        ${service.color === 'zim-red' ? 'text-zim-red' : ''}
                        ${service.color === 'gray' ? 'text-gray-600' : ''}
                      `} />
                    </div>

                    <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">{service.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{service.description}</p>

                    <ul className="space-y-3 mb-8">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-zim-green flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link to={service.link}>
                      <Button className={`
                        w-full h-12
                        ${service.color === 'zim-green' ? 'bg-zim-green hover:bg-zim-green/90' : ''}
                        ${service.color === 'zim-yellow' ? 'bg-zim-yellow hover:bg-zim-yellow/90 text-black' : ''}
                        ${service.color === 'zim-red' ? 'bg-zim-red hover:bg-zim-red/90' : ''}
                        ${service.color === 'gray' ? 'bg-gray-800 hover:bg-gray-700' : ''}
                      `}>
                        {service.cta}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-12 text-gray-900 dark:text-white">How It Works</h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <div className="w-16 h-16 rounded-full bg-zim-green text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    1
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Book Online</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select your service and schedule a collection date
                  </p>
                </div>

                <div>
                  <div className="w-16 h-16 rounded-full bg-zim-yellow text-black flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    2
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">We Collect</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    We pick up from anywhere in UK & Ireland - free of charge
                  </p>
                </div>

                <div>
                  <div className="w-16 h-16 rounded-full bg-zim-red text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    3
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Delivered</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your items arrive safely at any address in Zimbabwe
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-zim-green">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Ship?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Book your shipment today or contact us for a custom quote.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book">
                <Button size="lg" className="bg-white text-zim-green hover:bg-gray-100">
                  Book Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="tel:+447584100552">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Phone className="mr-2 h-5 w-5" />
                  +44 7584 100552
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export default Services;
