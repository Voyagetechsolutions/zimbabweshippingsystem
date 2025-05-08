
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Truck, Crosshair, Package, Car, Building, FileBox, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ServicesSection = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <section className={`py-12 md:py-16 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} id="services">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Shipping Services</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            We offer a comprehensive range of shipping services to meet all your UK to Zimbabwe shipping needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <ServiceCard 
            icon={<Truck className="h-8 w-8" />}
            title="Drum Shipping"
            description="Ship your goods securely in our 210L metal drums from the UK to Zimbabwe."
            link="/services#drum-shipping"
          />
          <ServiceCard 
            icon={<Crosshair className="h-8 w-8" />}
            title="Door-to-Door Service"
            description="We'll collect from your UK address and deliver directly to your destination in Zimbabwe."
            link="/services#door-to-door"
          />
          <ServiceCard 
            icon={<Package className="h-8 w-8" />}
            title="Parcel Shipping"
            description="Send individual parcels and packages of all sizes with full tracking capabilities."
            link="/services#parcel-shipping"
          />
          <ServiceCard 
            icon={<Car className="h-8 w-8" />}
            title="Vehicle Shipping"
            description="Transport cars, motorbikes and other vehicles securely from the UK to Zimbabwe."
            link="/services#vehicle-shipping"
          />
          <ServiceCard 
            icon={<Building className="h-8 w-8" />}
            title="Commercial Shipping"
            description="Specialized shipping solutions for businesses, with bulk rates and dedicated support."
            link="/services#commercial-shipping"
          />
          <ServiceCard 
            icon={<AlertCircle className="h-8 w-8" />}
            title="Custom Shipping"
            description="Need to ship something unusual? Get a custom quote for your specific requirements."
            link="/book-shipment"
            isSpecial={true}
          />
        </div>
        
        <div className="text-center mt-8">
          <Link to="/services">
            <Button size="lg" variant="outline" className="group">
              View All Services
              <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  isSpecial?: boolean;
}

const ServiceCard = ({ icon, title, description, link, isSpecial = false }: ServiceCardProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Card className={`h-full flex flex-col transition-all duration-300 hover:shadow-lg border ${
      isDark ? 'hover:border-gray-700' : 'hover:border-gray-300'
    } ${isSpecial ? 'border-zim-green/40 dark:border-zim-green/30' : ''}`}>
      <Link to={link} className="group flex flex-col h-full p-6">
        <div className={`p-3 rounded-full w-fit mb-4 ${
          isSpecial 
            ? 'bg-zim-green/10 text-zim-green' 
            : isDark 
              ? 'bg-gray-800 text-gray-300' 
              : 'bg-gray-100 text-gray-700'
        }`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className={`mb-4 flex-grow ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </p>
        <div className={`flex items-center text-sm font-medium mt-auto ${
          isSpecial ? 'text-zim-green' : 'text-gray-700 dark:text-gray-300'
        } group-hover:underline`}>
          {isSpecial ? 'Request Custom Quote' : 'Learn More'}
          <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
        </div>
      </Link>
    </Card>
  );
};

export default ServicesSection;
