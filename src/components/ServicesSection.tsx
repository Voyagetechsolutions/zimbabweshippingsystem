
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Package, Truck, Globe, DollarSign, Drum } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PriceDisplayProps {
  price: number;
  label: string;
  type: string;
  description: string;
  buttonText?: string;
  popular?: boolean;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ price, label, type, description, buttonText = "Book Now", popular = false }) => {
  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-lg bg-gradient-to-tr from-zim-green/20 to-zim-yellow/20 opacity-50 blur-sm"></div>
      <div className={`bg-white rounded-lg shadow-lg overflow-hidden relative border-2 ${popular ? 'border-zim-red' : 'border-zim-yellow'}`}>
        <div className="absolute top-0 right-0">
          <div className={`${popular ? 'bg-zim-red' : 'bg-zim-yellow'} text-white px-4 py-1 font-semibold text-sm transform rotate-45 translate-x-6 -translate-y-1`}>
            {type}
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{label}</h3>
          <p className="text-gray-600 mb-4">{description}</p>
          <div className="text-3xl font-bold text-zim-green mb-4">£{price}<span className="text-lg text-gray-500 font-normal">/drum</span></div>
          <Link to="/book-shipment">
            <Button className={`w-full ${popular ? 'bg-zim-red hover:bg-zim-red/90' : 'bg-zim-green hover:bg-zim-green/90'}`}>
              {buttonText}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: <Drum className="h-10 w-10 text-zim-green" />,
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
      description: 'We pick up from your UK address and deliver directly to your recipient\'s doorstep in Zimbabwe.',
    },
    {
      icon: <Globe className="h-10 w-10 text-zim-yellow" />,
      title: 'Real-time Tracking',
      description: 'Stay informed with our advanced tracking system that provides real-time updates on your shipment\'s location.',
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

        <div className="mt-16 mb-8 text-center">
          <h3 className="text-2xl font-bold mb-8">Drum Shipping Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PriceDisplay 
              price={260} 
              label="Single Drum" 
              type="Standard" 
              description="Basic shipping option" 
              buttonText="Book Now"
            />
            <PriceDisplay 
              price={250} 
              label="Multiple Drums" 
              type="Value" 
              description="For 2-4 drums" 
              buttonText="Book Now"
            />
            <PriceDisplay 
              price={220} 
              label="Bulk Drums" 
              type="Popular" 
              description="For 5+ drums" 
              buttonText="Book Now & Save"
              popular={true}
            />
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link to="/services">
            <Button className="bg-zim-green hover:bg-zim-green/90 text-lg px-8">
              View All Services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
