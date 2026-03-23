import React from 'react';
import { Calendar, Truck, Home, ArrowRight } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: Calendar,
      number: '1',
      title: 'Book Online',
      description: 'Choose your service, select a collection date, and enter your details. Takes less than 5 minutes.',
      color: 'zim-green',
    },
    {
      icon: Truck,
      number: '2',
      title: 'We Collect',
      description: 'We pick up your items from anywhere in the UK. Free collection included.',
      color: 'zim-yellow',
    },
    {
      icon: Home,
      number: '3',
      title: 'Delivered',
      description: 'Your shipment arrives safely at any address in Zimbabwe. Track every step.',
      color: 'zim-red',
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Shipping to Zimbabwe has never been easier. Three simple steps to get your items home.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection line (desktop only) */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-zim-green via-zim-yellow to-zim-red" />

            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  {/* Step number circle */}
                  <div className={`
                    relative z-10 w-32 h-32 rounded-full flex items-center justify-center mb-6
                    ${step.color === 'zim-green' ? 'bg-zim-green/10' : ''}
                    ${step.color === 'zim-yellow' ? 'bg-zim-yellow/10' : ''}
                    ${step.color === 'zim-red' ? 'bg-zim-red/10' : ''}
                  `}>
                    <div className={`
                      w-20 h-20 rounded-full flex items-center justify-center
                      ${step.color === 'zim-green' ? 'bg-zim-green' : ''}
                      ${step.color === 'zim-yellow' ? 'bg-zim-yellow' : ''}
                      ${step.color === 'zim-red' ? 'bg-zim-red' : ''}
                    `}>
                      <step.icon className="h-10 w-10 text-white" />
                    </div>
                    <span className={`
                      absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                      ${step.color === 'zim-green' ? 'bg-zim-green' : ''}
                      ${step.color === 'zim-yellow' ? 'bg-zim-yellow' : ''}
                      ${step.color === 'zim-red' ? 'bg-zim-red' : ''}
                    `}>
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-xs">
                    {step.description}
                  </p>
                </div>

                {/* Arrow between steps (mobile only) */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <ArrowRight className="h-6 w-6 text-gray-300 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
