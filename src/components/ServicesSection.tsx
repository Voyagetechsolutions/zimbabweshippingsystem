
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Ship, Package, Truck, Globe, DollarSign } from 'lucide-react';
import { useShipping } from '@/contexts/ShippingContext';

const ServicesSection: React.FC = () => {
  const { formatPrice } = useShipping();
  
  const services = [
    {
      icon: <Ship className="h-10 w-10 text-zim-green dark:text-zim-green" />,
      title: 'Drum Shipping',
      description: 'Our specialized drum shipping service offers the most cost-effective way to send large quantities of goods to Zimbabwe. Each drum has a capacity of 220L.',
      bgImage: 'url("/lovable-uploads/84bc927b-c216-4295-a210-64ee6b08eacd.png")'
    },
    {
      icon: <Package className="h-10 w-10 text-zim-yellow dark:text-zim-yellow" />,
      title: 'Regular Parcels',
      description: 'Send packages of any size with our flexible parcel shipping options, with competitive rates based on weight.',
      bgImage: 'url("/lovable-uploads/28deab65-7859-4a23-8d21-37afd6bcda2a.png")'
    },
    {
      icon: <Truck className="h-10 w-10 text-zim-red dark:text-zim-red" />,
      title: 'Door-to-Door Delivery',
      description: `We pick up from your UK address and deliver directly to your recipient's doorstep in Zimbabwe for an additional ${formatPrice(25)}.`,
      bgImage: 'url("/lovable-uploads/0027003d-7b3b-482d-82a2-9cc4877b58b6.png")'
    },
    {
      icon: <Globe className="h-10 w-10 text-zim-green dark:text-zim-green" />,
      title: 'Real-time Tracking',
      description: 'Stay informed with our advanced tracking system that provides real-time updates on your shipment\'s location.',
      bgImage: 'url("/lovable-uploads/8aba4bb5-76cc-4202-a81d-e765192b2dbc.png")'
    },
    {
      icon: <DollarSign className="h-10 w-10 text-zim-yellow dark:text-zim-yellow" />,
      title: 'Flexible Payment Options',
      description: 'Multiple payment methods available including credit cards, PayPal, and mobile payment solutions.',
      bgImage: 'url("/lovable-uploads/288d0f20-90b3-401c-be86-ac3405522ca9.png")'
    },
  ];

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Our Shipping Services</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            We offer a comprehensive range of shipping solutions to meet all your needs when sending items from the UK to Zimbabwe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden relative"
              style={{ 
                background: service.bgImage ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), ${service.bgImage}` : 'white',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="p-6 bg-white dark:bg-gray-800 dark:text-white bg-opacity-10 h-full">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-6 z-10 bg-opacity-90">
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{service.title}</h3>
                <p className="text-gray-200 mb-6">{service.description}</p>
                <Button variant="outline" className="w-full justify-between border-white text-white hover:bg-white hover:text-gray-900 dark:border-gray-600 dark:hover:bg-gray-700 z-10">
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
