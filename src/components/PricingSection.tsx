
import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const PricingSection: React.FC = () => {
  const standardPricingOptions = [
    {
      title: "Single Drum",
      price: "£240",
      description: "Perfect for sending a single drum of items to Zimbabwe",
      features: [
        "1 standard drum",
        "Real-time tracking",
        "Customs clearance",
        "SMS notifications",
        "Collection from UK address"
      ],
      buttonText: "Book Single Drum",
      popular: false
    },
    {
      title: "Multiple Drums (2-4)",
      price: "£240",
      priceDetail: "per drum",
      description: "Multiple drum shipments",
      features: [
        "2-4 standard drums",
        "Real-time tracking",
        "Customs clearance",
        "SMS & Email notifications",
        "Collection from UK address",
        "Priority shipping"
      ],
      buttonText: "Book Multiple Drums",
      popular: true
    },
    {
      title: "Bulk Shipping (5+)",
      price: "£220",
      priceDetail: "per drum",
      description: "Best value for large shipments",
      features: [
        "5+ standard drums",
        "Real-time tracking",
        "Customs clearance",
        "SMS & Email notifications",
        "Collection from UK address",
        "Priority shipping",
        "Dedicated account manager"
      ],
      buttonText: "Book Bulk Shipping",
      popular: false
    }
  ];

  const payLaterPricingOptions = [
    {
      title: "Single Drum (Pay Later)",
      price: "£280",
      description: "Pay within 30 days for a single drum",
      features: [
        "1 standard drum",
        "Real-time tracking",
        "Customs clearance",
        "SMS notifications",
        "Collection from UK address",
        "30-day payment terms"
      ],
      buttonText: "Book Single Drum",
      popular: false
    },
    {
      title: "Multiple Drums (2-4)",
      price: "£260",
      priceDetail: "per drum",
      description: "Pay within 30 days for multiple drums",
      features: [
        "2-4 standard drums",
        "Real-time tracking",
        "Customs clearance",
        "SMS & Email notifications",
        "Collection from UK address",
        "30-day payment terms"
      ],
      buttonText: "Book Multiple Drums",
      popular: false
    },
    {
      title: "Bulk Shipping (5+)",
      price: "£240",
      priceDetail: "per drum",
      description: "Pay within 30 days for bulk shipments",
      features: [
        "5+ standard drums",
        "Real-time tracking",
        "Customs clearance",
        "SMS & Email notifications",
        "Collection from UK address",
        "30-day payment terms"
      ],
      buttonText: "Book Bulk Shipping",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Competitive shipping rates with volume discounts for multiple drums
          </p>
          <div className="flex justify-center mt-6">
            <div className="h-1 w-20 bg-zim-green rounded-full mx-1"></div>
            <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1"></div>
            <div className="h-1 w-20 bg-zim-red rounded-full mx-1"></div>
          </div>
        </div>

        <h3 className="text-2xl font-semibold mb-6 text-center">Standard Payment Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {standardPricingOptions.map((option, index) => (
            <div key={index} className="relative flex flex-col h-full transition-transform duration-300 hover:translate-y-[-8px]">
              <Card className={`border h-full flex flex-col ${option.popular ? 'border-zim-yellow shadow-xl' : 'border-gray-200 shadow-lg'} relative`}>
                {option.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-zim-yellow text-black px-4 py-1 rounded-full font-semibold text-sm">
                    MOST POPULAR
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">{option.title}</CardTitle>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-4xl font-bold">{option.price}</span>
                    {option.priceDetail && <span className="text-gray-500 ml-1">{option.priceDetail}</span>}
                  </div>
                  <CardDescription className="mt-2 text-base">
                    {option.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {option.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-zim-green mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link to="/book-shipment" className="w-full">
                    <Button 
                      className={`w-full ${option.popular ? 'bg-zim-red hover:bg-zim-red/90' : 'bg-zim-green hover:bg-zim-green/90'} text-white font-semibold`}
                    >
                      {option.buttonText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
              {option.popular && (
                <div className="h-1.5 w-full bg-zim-yellow rounded-b-lg"></div>
              )}
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-semibold mb-6 text-center">Pay Later Options (30-day Terms)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {payLaterPricingOptions.map((option, index) => (
            <div key={index} className="relative flex flex-col h-full transition-transform duration-300 hover:translate-y-[-8px]">
              <Card className="border h-full flex flex-col border-gray-200 shadow-lg relative">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">{option.title}</CardTitle>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-4xl font-bold">{option.price}</span>
                    {option.priceDetail && <span className="text-gray-500 ml-1">{option.priceDetail}</span>}
                  </div>
                  <CardDescription className="mt-2 text-base">
                    {option.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {option.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-zim-green mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link to="/book-shipment" className="w-full">
                    <Button 
                      className="w-full bg-zim-green hover:bg-zim-green/90 text-white font-semibold"
                    >
                      {option.buttonText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-xl font-bold mb-4">We Ship More Than Just Drums</h3>
          <div className="max-w-3xl mx-auto bg-gray-50 p-6 rounded-lg">
            <p className="font-semibold mb-2">We also transport the following items:</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left max-w-2xl mx-auto">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-zim-green mr-2" />
                <span>Household furniture</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-zim-green mr-2" />
                <span>Building materials</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-zim-green mr-2" />
                <span>Door frames</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-zim-green mr-2" />
                <span>Kitchen appliances</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-zim-green mr-2" />
                <span>Electronic equipment</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-zim-green mr-2" />
                <span>Commercial goods</span>
              </li>
            </ul>
            <p className="mt-4 text-gray-600">Contact us for custom quotes on larger items.</p>
          </div>
          
          <div className="mt-8">
            <Link to="/services">
              <Button variant="outline" className="border-zim-green text-zim-green hover:bg-zim-green hover:text-white">
                View Full Shipping Services
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
