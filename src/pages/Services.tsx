
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { ChevronRight, Ship, Package, Truck, ShieldCheck, Globe, DollarSign } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: <Ship className="h-10 w-10 text-zim-green" />,
      title: 'Drum Shipping',
      description: 'Our specialized drum shipping service offers the most cost-effective way to send large quantities of goods to Zimbabwe.',
      price: '£260 per 200L drum',
      deliveryTime: '2-3 weeks',
      features: [
        'Ideal for bulk items and multiple goods',
        'Secure packaging and handling',
        'Full tracking capabilities',
        'Delivered to recipient's doorstep'
      ]
    },
    {
      icon: <Package className="h-10 w-10 text-zim-yellow" />,
      title: 'Regular Parcels',
      description: 'Send packages of any size with our flexible parcel shipping options, with competitive rates based on weight.',
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
      icon: <Truck className="h-10 w-10 text-zim-red" />,
      title: 'Door-to-Door Delivery',
      description: 'We pick up from your UK address and deliver directly to your recipient\'s doorstep in Zimbabwe.',
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
      icon: <ShieldCheck className="h-10 w-10 text-zim-green" />,
      title: 'Insurance Coverage',
      description: 'Protect your valuable items with our comprehensive shipping insurance for peace of mind.',
      price: '5% of declared value',
      deliveryTime: 'N/A',
      features: [
        'Coverage against damage',
        'Protection against loss',
        'Simple claims process',
        'Up to £5,000 coverage per shipment'
      ]
    },
    {
      icon: <Globe className="h-10 w-10 text-zim-yellow" />,
      title: 'Real-time Tracking',
      description: 'Stay informed with our advanced tracking system that provides real-time updates on your shipment\'s location.',
      price: 'Included with all shipments',
      deliveryTime: 'N/A',
      features: [
        'SMS notifications',
        'Email updates',
        'Online tracking portal',
        'Customer service support'
      ]
    },
    {
      icon: <DollarSign className="h-10 w-10 text-zim-red" />,
      title: 'Flexible Payment Options',
      description: 'Multiple payment methods available including credit cards, PayPal, and mobile payment solutions.',
      price: 'No additional fees',
      deliveryTime: 'N/A',
      features: [
        'Secure payment processing',
        'Multiple currency options',
        'Payment plans available',
        'Business accounts welcome'
      ]
    },
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
          </div>
        </div>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <Card key={index} className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      {service.icon}
                    </div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <CardDescription>
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
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
                  <div className="p-4 mt-auto">
                    <Link to="/book-shipment">
                      <Button className="w-full bg-zim-green hover:bg-zim-green/90 flex items-center justify-between">
                        Book This Service <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
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
