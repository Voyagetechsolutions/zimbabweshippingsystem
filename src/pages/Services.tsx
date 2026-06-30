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
import { photos } from '@/data/sitePhotos';

const Services = () => {
  const services = [
    {
      icon: Package,
      title: 'Drum Shipping',
      description: 'Our most popular service. Ship your goods in secure 200-220L drums.',
      features: [
        'UK: £280/drum | Ireland: €360/drum',
        'Free collection across UK & Ireland',
        'Metal coded seal included',
        'Full insurance & tracking',
      ],
      cta: 'Book Drums',
      link: '/book',
      color: 'zim-green',
      photo: photos.drumWarehouse,
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
      photo: photos.applianceCollection,
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
      photo: photos.vanPacked,
    },
    {
      icon: Building2,
      title: 'Commercial',
      description: 'Specialized shipping solutions for businesses in UK & Ireland.',
      features: [
        'Competitive rates',
        'Regular shipping schedules',
        'Commercial invoicing',
        'Dedicated account support',
      ],
      cta: 'Contact Us',
      link: '/contact',
      color: 'gray',
      photo: photos.machineryLoading,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Services | Zimbabwe Shipping - Ship from UK & Ireland</title>
        <meta
          name="description"
          content="Zimbabwe shipping services from UK & Ireland. Drum shipping, trunk shipping (Ireland exclusive), furniture, appliances. Free collection, door-to-door delivery, fully tracked."
        />
        <meta name="keywords" content="Zimbabwe shipping services, drum shipping, trunk shipping Ireland, UK to Zimbabwe, Ireland to Zimbabwe, furniture shipping, commercial shipping Zimbabwe" />

        {/* Open Graph */}
        <meta property="og:title" content="Services | Zimbabwe Shipping" />
        <meta property="og:description" content="Shipping services from UK & Ireland to Zimbabwe. Drums, trunks, furniture, appliances. Free collection, door-to-door delivery." />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Services | Zimbabwe Shipping" />
        <meta name="twitter:description" content="Shipping services from UK & Ireland to Zimbabwe. Drums, trunks, furniture. Free collection." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-ink py-20 text-white md:py-28">
          <img
            src={photos.containerLoading.src}
            alt={photos.containerLoading.alt}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/55" />
          <div className="absolute top-0 left-0 right-0 flex h-1">
            <div className="w-1/3 bg-zim-green" />
            <div className="w-1/3 bg-zim-yellow" />
            <div className="w-1/3 bg-zim-red" />
          </div>
          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zim-green opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-zim-green" />
              </span>
              Now serving UK &amp; Ireland
            </div>
            <h1 className="font-display text-4xl font-extrabold md:text-5xl lg:text-6xl">
              Everything we ship home
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-xl text-gray-300">
              From a single drum to a container of furniture, personal gifts to
              commercial cargo — we ship it all from the UK &amp; Ireland to Zimbabwe.
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
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-paper transition-shadow hover:shadow-xl dark:border-gray-800 dark:bg-gray-800"
                  >
                    {/* Real photo */}
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <img
                        src={service.photo.src}
                        alt={service.photo.alt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                      <div className={`
                        absolute bottom-4 left-4 inline-flex h-12 w-12 items-center justify-center rounded-xl shadow-lg
                        ${service.color === 'zim-green' ? 'bg-zim-green' : ''}
                        ${service.color === 'zim-yellow' ? 'bg-zim-yellow' : ''}
                        ${service.color === 'zim-red' ? 'bg-zim-red' : ''}
                        ${service.color === 'gray' ? 'bg-ink' : ''}
                      `}>
                        <service.icon className={`h-6 w-6 ${service.color === 'zim-yellow' ? 'text-ink' : 'text-white'}`} />
                      </div>
                    </div>

                    <div className="p-8">
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
