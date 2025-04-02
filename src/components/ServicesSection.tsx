
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Ship, Package, Truck, ShieldCheck, Globe, DollarSign } from 'lucide-react';

const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: <Ship className="h-10 w-10 text-zim-green" />,
      title: 'Drum Shipping',
      description: 'Our specialized drum shipping service offers the most cost-effective way to send large quantities of goods to Zimbabwe.',
    },
    {
      icon: <Package className="h-10 w-10 text-zim-yellow" />,
      title: 'Regular Parcels',
      description: 'Send packages of any size with our flexible parcel shipping options, with competitive rates based on weight.',
    },
    {
      icon: <Truck className="h-10 w-10 text-zim-red" />,
      title: 'Door-to-Door Delivery',
      description: 'We pick up from your UK address and deliver directly to your recipient's doorstep in Zimbabwe.',
    },
    {
      icon: <ShieldCheck className="h-10 w-10 text-zim-green" />,
      title: 'Insurance Coverage',
      description: 'Protect your valuable items with our comprehensive shipping insurance for peace of mind.',
    },
    {
      icon: <Globe className="h-10 w-10 text-zim-yellow" />,
      title: 'Real-time Tracking',
      description: 'Stay informed with our advanced tracking system that provides real-time updates on your shipment's location.',
    },
    {
      icon: <DollarSign className="h-10 w-10 text-zim-red" />,
      title: 'Flexible Payment Options',
      description: 'Multiple payment methods available including credit cards, PayPal, and mobile payment solutions.',
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Shipping Services</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We offer a comprehensive range of shipping solutions to meet all your needs when sending items from the UK to Zimbabwe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-6">{service.description}</p>
                <Button variant="outline" className="w-full justify-between border-zim-black text-zim-black hover:bg-zim-black hover:text-white">
                  Learn More <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="h-1 zim-gradient-horizontal"></div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Button className="bg-zim-green hover:bg-zim-green/90 text-lg px-8">
            View All Services
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
