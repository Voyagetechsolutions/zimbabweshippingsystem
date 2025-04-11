
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  Ship, 
  Package, 
  Truck as TruckIcon, 
  ClipboardCheck, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CornerRightDown,
  HelpCircle
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  const shippingGuidelinesCategories = [
    {
      title: 'Permitted Items',
      icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
      description: 'Items that are allowed to be shipped to Zimbabwe',
      items: [
        { name: 'Clothing & Textiles', details: 'All types of clothing, bedding, and textiles are permitted.' },
        { name: 'Non-perishable Food', details: 'Properly packaged dry goods, canned foods, and sealed non-perishable items.' },
        { name: 'Personal Care Items', details: 'Toiletries, cosmetics, and personal hygiene products (non-aerosol).' },
        { name: 'Household Goods', details: 'Kitchenware, small appliances, and home accessories.' },
        { name: 'Electronics', details: 'Computers, phones, tablets, and other electronics (limit of 2 per category per shipment).' },
        { name: 'Books & Educational Materials', details: 'All types of books, educational resources, and stationery.' },
        { name: 'Medical Supplies', details: 'Non-prescription medications, first aid supplies, and medical devices.' },
        { name: 'Toys & Games', details: 'Children\'s toys, board games, and recreational items.' },
        { name: 'Sporting Goods', details: 'Sports equipment and recreational gear (size restrictions apply).' }
      ]
    },
    {
      title: 'Restricted Items',
      icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
      description: 'Items that require special permission or have limitations',
      items: [
        { name: 'Prescription Medications', details: 'Requires proper documentation and prescription copies.' },
        { name: 'High-Value Electronics', details: 'Items valued over £500 require additional insurance and documentation.' },
        { name: 'Used Motor Vehicle Parts', details: 'Limited quantities allowed; requires detailed listing and inspection.' },
        { name: 'Agricultural Items', details: 'Seeds, plants, and agricultural products require phytosanitary certificates.' },
        { name: 'Jewelry & Valuables', details: 'High-value items must be declared and may incur additional customs duties.' },
        { name: 'Animal Products', details: 'Limited to properly processed and packaged items with appropriate documentation.' },
        { name: 'Commercial Quantities', details: 'Bulk commercial goods require import licenses and additional paperwork.' }
      ]
    },
    {
      title: 'Prohibited Items',
      icon: <XCircle className="h-6 w-6 text-red-500" />,
      description: 'Items that cannot be shipped under any circumstances',
      items: [
        { name: 'Weapons & Ammunition', details: 'All firearms, weapons, explosives, and related items.' },
        { name: 'Illegal Drugs', details: 'Narcotics and controlled substances of any kind.' },
        { name: 'Perishable Foods', details: 'Fresh fruits, vegetables, meat, and other perishable food items.' },
        { name: 'Flammable Materials', details: 'Fuel, matches, lighters, and other flammable substances.' },
        { name: 'Pornographic Materials', details: 'Adult content or obscene materials.' },
        { name: 'Currency & Bearer Instruments', details: 'Cash, blank checks, and negotiable financial instruments.' },
        { name: 'Hazardous Materials', details: 'Chemicals, corrosives, and dangerous goods.' },
        { name: 'Counterfeit Goods', details: 'Fake or replica branded items and intellectual property violations.' },
        { name: 'Live Animals', details: 'All live animals and insects.' },
        { name: 'Alcohol & Tobacco', details: 'Alcoholic beverages and tobacco products are not permitted.' }
      ]
    },
    {
      title: 'Packaging Guidelines',
      icon: <CornerRightDown className="h-6 w-6 text-blue-500" />,
      description: 'Proper packaging ensures your items arrive safely',
      items: [
        { name: 'Drum Packaging', details: 'Use plastic bags to group similar items, fill empty spaces with soft items, and secure drum lids properly.' },
        { name: 'Fragile Items', details: 'Wrap in bubble wrap or paper, place in center of package surrounded by cushioning material.' },
        { name: 'Electronics', details: 'Use original packaging when possible, remove batteries, and wrap in anti-static material.' },
        { name: 'Clothing', details: 'Vacuum seal bags can maximize space, group clothing by type and recipient.' },
        { name: 'Liquids', details: 'Must be sealed in leak-proof containers, wrapped in plastic, and clearly labeled.' },
        { name: 'Documentation', details: 'Include a detailed packing list with estimated values for customs purposes.' }
      ]
    }
  ];

  const shippingFAQs = [
    {
      question: 'How do I determine the right shipping method for my needs?',
      answer: 'Consider the volume and weight of your items. Drum shipping is ideal for sending multiple items or larger volumes (up to 80kg per drum). Parcel delivery is better for smaller, lighter shipments or when faster delivery is needed.'
    },
    {
      question: 'What is the weight limit for drums and parcels?',
      answer: 'Our standard drums can accommodate up to 80kg of items. For parcel shipping, we accept packages up to 30kg, with pricing calculated based on actual weight.'
    },
    {
      question: 'How are restricted postal codes handled?',
      answer: 'For postal codes in restricted areas, we only offer collection services for large business shipments due to logistical limitations. If you\'re in a restricted area, please contact our support team via WhatsApp at +44 7584 100552 to discuss possible arrangements.'
    },
    {
      question: 'What should I do if my item is not listed in the guidelines?',
      answer: 'If you\'re unsure about shipping a particular item, please contact our customer service team before booking your shipment. We can provide guidance on specific items and any documentation requirements.'
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
          </div>
        </section>

        {/* Shipping Guidelines and Restrictions Section */}
        <section id="shipping-guidelines" className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Shipping Guidelines & Restrictions</h2>
              <p className="text-gray-600 max-w-3xl mx-auto mt-4">
                Understanding what can and cannot be shipped to Zimbabwe is essential for a smooth shipping experience. 
                Review our comprehensive guidelines to ensure your items comply with customs regulations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {shippingGuidelinesCategories.map((category, index) => (
                <Card key={index} className="border-t-4 border-t-zim-green h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center">
                      <div className="mr-2">{category.icon}</div>
                      <span>{category.title}</span>
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {category.items.map((item, i) => (
                        <li key={i} className="pb-3 border-b border-gray-100 last:border-0">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.details}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-md shadow-sm mb-12">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-amber-800 mb-2">Restricted Areas Notice</h3>
                  <p className="text-amber-700">
                    The following postal code areas are only serviced for large business shipments due to logistics limitations:
                  </p>
                  <p className="text-amber-700 mt-2 font-medium">
                    EX, TQ, DT, SA, LD, HR, IP, NR, HU, TS, DL, SR, DH, CA, NE, TD, EH, ML, KA, DG, G, KY, PA, IV, AB, DD
                  </p>
                  <p className="text-amber-700 mt-2">
                    If your postal code is in a restricted area, please contact our support team via WhatsApp at{' '}
                    <a href="https://wa.me/447584100552" className="font-bold underline">+44 7584 100552</a> for assistance.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6">Frequently Asked Questions</h3>
              <Accordion type="single" collapsible className="w-full">
                {shippingFAQs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left font-medium">
                      <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 text-zim-green mr-2" />
                        <span>{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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
