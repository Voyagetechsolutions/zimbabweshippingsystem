
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Truck, 
  Package, 
  Clock, 
  PoundSterling, 
  Shield, 
  MapPin,
  CheckCircle2
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Services = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Services Grid */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Our Complete Service Offerings</h2>
              <p className="text-gray-600 mt-2">Comprehensive shipping solutions for all your needs</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Drum Shipping */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-zim-green/10 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-zim-green" />
                  </div>
                  <CardTitle>Drum Shipping</CardTitle>
                  <CardDescription>
                    Our most popular and cost-effective shipping method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Available in various sizes (small, medium, large)</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Ideal for clothing, shoes, household items and groceries etc</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Secure packaging with metal coded seal</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Monthly scheduled departures</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/book-shipment">Book Drum Shipping</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Parcel Shipping */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-zim-red/10 rounded-full flex items-center justify-center mb-4">
                    <Truck className="h-6 w-6 text-zim-red" />
                  </div>
                  <CardTitle>Other Items</CardTitle>
                  <CardDescription>
                    Fast and efficient individual parcel delivery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Competitive pricing</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Tracking available for all parcels</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Door-to-door delivery option</span>
                    </li>                    
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/book-shipment">Ship a Parcel</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Door-to-Door Service */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-zim-yellow/10 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="h-6 w-6 text-zim-yellow" />
                  </div>
                  <CardTitle>Door-to-Door Service</CardTitle>
                  <CardDescription>
                    Complete convenience from collection to delivery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>free collection from your UK address</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Delivery to any location in Zimbabwe except rural areas</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Real-time tracking and updates</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/book-shipment">Book Door-to-Door</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Customs Clearance */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Customs Clearance</CardTitle>
                  <CardDescription>
                    Hassle-free importing into Zimbabwe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Expert handling of customs documentation</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Duty payment handling</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Compliance with local regulations</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Avoid delays and complications</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/contact">Inquire About Customs</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Commercial Shipping */}
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <PoundSterling className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>Commercial Shipping</CardTitle>
                  <CardDescription>
                    Specialized solutions for businesses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Volume discounts for regular shipments</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Business-to-business delivery</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Commercial invoice handling</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                      <span>Tailored shipping schedules</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to="/contact">Business Inquiries</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Service Process */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Our Service Process</h2>
              <p className="text-gray-600 mt-2">Simple steps to ship your items to Zimbabwe</p>
            </div>
            
            <div className="relative">
              {/* Process Steps */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-green flex items-center justify-center text-white text-xl font-bold mb-4 z-10">1</div>
                  <h3 className="text-lg font-semibold mb-2">Book Your Shipment</h3>
                  <p className="text-gray-600">Select your service and schedule pickup or drop-off</p>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-yellow flex items-center justify-center text-white text-xl font-bold mb-4 z-10">2</div>
                  <h3 className="text-lg font-semibold mb-2">We Collect</h3>
                  <p className="text-gray-600">We collect your items from your location or receive them at our depot</p>
                </div>
                
                {/* Step 3 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zim-red flex items-center justify-center text-white text-xl font-bold mb-4 z-10">3</div>
                  <h3 className="text-lg font-semibold mb-2">Transit to Zimbabwe</h3>
                  <p className="text-gray-600">Your shipment travels securely to Zimbabwe with tracking updates</p>
                </div>
                
                {/* Step 4 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-4 z-10">4</div>
                  <h3 className="text-lg font-semibold mb-2">Delivery</h3>
                  <p className="text-gray-600">We deliver to your recipient's address in Zimbabwe</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-zim-green/90 to-zim-green">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Ship to Zimbabwe?</h2>
            <p className="text-white text-lg max-w-2xl mx-auto mb-8">
              Book your shipment today and experience our reliable service from the UK to Zimbabwe
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="bg-white text-zim-green hover:bg-gray-100">
                <Link to="/book-shipment">Book a Shipment</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
