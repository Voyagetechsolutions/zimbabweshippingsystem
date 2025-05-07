
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PricingSection: React.FC = () => {
  const standardPricingOptions = [
    {
      title: "Single Drum",
      price: "£260",
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
      title: "Single Drum",
      price: "£280",
      description: "Pay in 30 days for a single drum shipment",
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
      price: "£270",
      priceDetail: "per drum",
      description: "Multiple drum shipments with deferred payment",
      features: [
        "2-4 standard drums",
        "Real-time tracking",
        "Customs clearance",
        "SMS & Email notifications",
        "Collection from UK address",
        "Priority shipping",
        "30-day payment period"
      ],
      buttonText: "Book Multiple Drums",
      popular: true
    },
    {
      title: "Bulk Shipping (5+)",
      price: "£250",
      priceDetail: "per drum",
      description: "Best value for large shipments with flexible payment",
      features: [
        "5+ standard drums",
        "Real-time tracking",
        "Customs clearance",
        "SMS & Email notifications",
        "Collection from UK address",
        "Priority shipping",
        "Dedicated account manager",
        "30-day payment period"
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

        <Tabs defaultValue="standard" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="standard">Discounted Rate</TabsTrigger>
            <TabsTrigger value="payLater">Standard Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="standard">
            <h3 className="text-2xl font-semibold mb-6 text-center">Cash on Collection</h3>            
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
          </TabsContent>

          <TabsContent value="payLater">
            <h3 className="text-2xl font-semibold mb-6 text-center">Standard Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {payLaterPricingOptions.map((option, index) => (
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
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center">
          <Link to="/pricing">
            <Button variant="outline" className="border-zim-green text-zim-green hover:bg-zim-green hover:text-white">
              View All Pricing Options
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
