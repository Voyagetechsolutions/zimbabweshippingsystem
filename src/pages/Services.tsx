
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { ChevronRight, Ship, Package, Truck as TruckIcon, ClipboardCheck, DollarSign } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: <Ship className="h-12 w-12 text-zim-green" />,
      title: "Drum Shipping",
      description: "Ship your belongings in secure drums. Ideal for sending multiple items to Zimbabwe.",
      price: '£260 per 200L drum',
      deliveryTime: '2-3 weeks',
      features: [
        'Ideal for bulk items and multiple goods',
        'Secure packaging and handling',
        'Full tracking capabilities',
        'Delivered to recipient\'s doorstep'
      ],
      image: "/lovable-uploads/f427ac1e-be37-4600-94e5-cc4115c6e4c4.png"
    },
    {
      icon: <Package className="h-12 w-12 text-zim-yellow" />,
      title: "Parcel Delivery",
      description: "Fast and reliable parcel delivery service with full tracking and insurance options.",
      price: 'From £50 per kg',
      deliveryTime: '10-14 days',
      features: [
        'Weight-based pricing',
        'Suitable for smaller packages',
        'Full insurance options available',
        'UK pickup service available'
      ]
    },
    {
      icon: <TruckIcon className="h-12 w-12 text-zim-red" />,
      title: "Door-to-Door Delivery",
      description: "We pick up from your UK address and deliver directly to your recipient's address in Zimbabwe.",
      price: 'Add £25 to any shipping method',
      deliveryTime: 'Based on shipping method',
      features: [
        'Convenient for senders and recipients',
        'No need to drop off or collect parcels',
        'Real-time tracking updates',
        'Delivery confirmation'
      ]
    },
    {
      icon: <ClipboardCheck className="h-12 w-12 text-zim-black" />,
      title: "Customs Clearance",
      description: "We handle all customs paperwork and clearance to ensure smooth delivery of your shipments.",
      price: 'Included with all shipments',
      deliveryTime: 'N/A',
      features: [
        'Expert handling of documentation',
        'Duty and tax calculation',
        'Compliance with regulations',
        'Avoid customs delays'
      ]
    },
    {
      icon: <DollarSign className="h-12 w-12 text-zim-green" />,
      title: "Competitive Pricing",
      description: "Affordable rates with volume discounts available for multiple drum shipments.",
      price: 'Volume discounts available',
      deliveryTime: 'N/A',
      features: [
        'Transparent pricing structure',
        'No hidden fees',
        'Multiple payment options',
        'Business accounts welcome'
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="bg-zim-green/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We offer a comprehensive range of shipping solutions tailored for sending items from the UK to Zimbabwe.
            </p>
            <div className="flex justify-center mt-6">
              <div className="h-1 w-20 bg-zim-green rounded-full mx-1"></div>
              <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1"></div>
              <div className="h-1 w-20 bg-zim-red rounded-full mx-1"></div>
            </div>
          </div>
        </div>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <Card key={index} className="h-full flex flex-col border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-zim-green/5 via-zim-yellow/5 to-zim-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {service.image && (
                    <div className="w-full h-48 overflow-hidden">
                      <img 
                        src={service.image} 
                        alt={service.title} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  
                  <CardHeader className="pb-2 relative z-10">
                    <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">{service.icon}</div>
                    <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow relative z-10">
                    <CardDescription className="text-base text-gray-600 mb-4">
                      {service.description}
                    </CardDescription>
                    
                    <div className="mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Price:</span>
                        <span className="text-zim-green font-bold">{service.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Delivery Time:</span>
                        <span>{service.deliveryTime}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="font-medium mb-2">Features:</p>
                      <ul className="space-y-1">
                        {service.features.map((feature, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-zim-green mr-2">•</span>
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                  <div className="p-4 mt-auto relative z-10">
                    <Link to="/book-shipment">
                      <Button className="w-full bg-zim-green hover:bg-zim-green/90 flex items-center justify-between">
                        Book This Service <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="h-1 w-full zim-gradient-horizontal transition-all duration-300 group-hover:h-2"></div>
                </Card>
              ))}
            </div>

            <div className="mt-16 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Ship?</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Contact us today to discuss your specific shipping needs or book your shipment online.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/book-shipment">
                  <Button size="lg" className="bg-zim-green hover:bg-zim-green/90">
                    Book a Shipment
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="outline" className="border-zim-black">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
