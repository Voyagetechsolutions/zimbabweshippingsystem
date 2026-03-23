import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Truck,
  Shield,
  CreditCard,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const TrustSection: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: 'Family Business',
      description: 'Run by a family who understands the importance of your shipments. Personal service, not corporate red tape.',
      color: 'zim-green',
    },
    {
      icon: Truck,
      title: 'Own Trucks in Zimbabwe',
      description: 'We control the entire journey. Our own fleet in Zimbabwe means reliable, on-time deliveries.',
      color: 'zim-yellow',
    },
    {
      icon: Shield,
      title: 'Secure & Insured',
      description: 'Every shipment is fully insured. Metal coded seals protect your drums throughout transit.',
      color: 'zim-red',
    },
    {
      icon: CreditCard,
      title: 'Flexible Payment',
      description: '30-day payment terms available. Pay on arrival option. Cash discounts for immediate savings.',
      color: 'zim-green',
    },
    {
      icon: MapPin,
      title: 'All Zimbabwe Cities',
      description: 'From Harare to Bulawayo, Mutare to Victoria Falls. We deliver everywhere in Zimbabwe.',
      color: 'zim-yellow',
    },
    {
      icon: Clock,
      title: '14+ Years Experience',
      description: 'Since 2011, we\'ve been the trusted choice for UK to Zimbabwe shipping. We know what we\'re doing.',
      color: 'zim-red',
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Why Choose Zimbabwe Shipping?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We're not just another shipping company. We're a family business that treats your shipment like our own.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800 hover:shadow-lg transition-shadow"
              >
                <div className={`
                  inline-flex p-3 rounded-lg mb-4
                  ${feature.color === 'zim-green' ? 'bg-zim-green/10' : ''}
                  ${feature.color === 'zim-yellow' ? 'bg-zim-yellow/10' : ''}
                  ${feature.color === 'zim-red' ? 'bg-zim-red/10' : ''}
                `}>
                  <feature.icon className={`
                    h-6 w-6
                    ${feature.color === 'zim-green' ? 'text-zim-green' : ''}
                    ${feature.color === 'zim-yellow' ? 'text-zim-yellow' : ''}
                    ${feature.color === 'zim-red' ? 'text-zim-red' : ''}
                  `} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Want to learn more about our story?
            </p>
            <Link to="/about-us">
              <Button variant="outline" className="gap-2">
                Read Our Story
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
