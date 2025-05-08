
import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Package, PoundSterling, Clock, Shield, HeartHandshake } from 'lucide-react';

const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: <Truck className="h-12 w-12 text-zim-green" />,
      title: "Drum Shipping",
      description: "Our most popular service. We provide standardized drums for shipping your goods safely.",
      link: "/services#drum-shipping"
    },
    {
      icon: <Package className="h-12 w-12 text-zim-green" />,
      title: "Other Items",
      description: "Ship furniture, appliances, and other large items that don't fit in standard drums.",
      link: "/services#other-items"
    },
    {
      icon: <PoundSterling className="h-12 w-12 text-zim-green" />,
      title: "Commercial Shipping",
      description: "Specialized services for businesses shipping commercial goods.",
      link: "/services#commercial-shipping"
    },
    {
      icon: <Clock className="h-12 w-12 text-zim-green" />,
      title: "Flexible Payment Options",
      description: "Choose from standard payment, 30-day terms, cash on collection, or pay on arrival.",
      link: "/services#payment-options"
    },
    {
      icon: <Shield className="h-12 w-12 text-zim-green" />,
      title: "Secure Handling",
      description: "Your items are handled with care and security throughout the shipping process.",
      link: "/services#secure-handling"
    },
    {
      icon: <HeartHandshake className="h-12 w-12 text-zim-green" />,
      title: "Door-to-Door Delivery",
      description: "Optional service for direct delivery to the reciever's address.",
      link: "/services#door-to-door"
    },
  ];

  return (
    <section id="services" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We offer a range of shipping services to meet your needs, with a focus on reliability and affordability.
          </p>
          <div className="flex justify-center mt-6">
            <div className="h-1 w-20 bg-zim-green rounded-full mx-1"></div>
            <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1"></div>
            <div className="h-1 w-20 bg-zim-red rounded-full mx-1"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-lg shadow-lg transition-transform duration-300 hover:translate-y-[-8px]"
            >
              <div className="mb-4">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{service.title}</h3>
              <p className="text-gray-600 mb-6">{service.description}</p>
              <Link 
                to={service.link} 
                className="text-zim-green font-medium hover:underline"
              >
                Learn more →
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/services">
            <button className="bg-zim-green hover:bg-zim-green/90 text-white font-bold py-3 px-6 rounded-lg transition-colors mb-8">
              View All Services
            </button>
          </Link>
          
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-3">Need a Custom Quote?</h3>
            <p className="text-gray-600 mb-6">
              For special shipping needs or bulk orders, our team can prepare a customized quote for you.
            </p>
            <Link to="/custom-quote">
              <button className="bg-zim-yellow hover:bg-zim-yellow/90 text-black font-bold py-3 px-6 rounded-lg transition-colors">
                Request Custom Quote
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
