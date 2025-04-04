
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, Package, Shield, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const HeroSection: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 hero-pattern">
      <div className="absolute inset-0 bg-gradient-to-r from-zim-green/10 to-zim-red/10"></div>
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="max-w-lg">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                UK to Zimbabwe <span className="text-zim-green">Shipping</span> Made Simple
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-6">
                Fast, reliable, and affordable shipping services for all your packages. From personal items to commercial cargo.
              </p>
              <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex">
                <Link to="/book-shipment">
                  <Button className="w-full md:w-auto bg-zim-red hover:bg-zim-red/90 text-white flex items-center justify-center text-lg py-3 px-8">
                    Book Your Shipment <ArrowRight className="ml-2" />
                  </Button>
                </Link>
                <Link to="/track">
                  <Button variant="outline" className="w-full md:w-auto border-zim-black text-zim-black hover:bg-zim-black hover:text-white flex items-center justify-center text-lg py-3 px-8">
                    Track Shipment
                  </Button>
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="flex items-center bg-white p-3 rounded-md shadow-sm border">
                  <div className="bg-zim-green/10 p-2 rounded-full mr-3">
                    <Truck className="h-5 w-5 text-zim-green" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Fast Delivery</p>
                    <p className="text-gray-500 text-xs">2-3 weeks transit time</p>
                  </div>
                </div>
                <div className="flex items-center bg-white p-3 rounded-md shadow-sm border">
                  <div className="bg-zim-yellow/10 p-2 rounded-full mr-3">
                    <Package className="h-5 w-5 text-zim-yellow" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Secure Packaging</p>
                    <p className="text-gray-500 text-xs">Safe handling guaranteed</p>
                  </div>
                </div>
                <div className="flex items-center bg-white p-3 rounded-md shadow-sm border">
                  <div className="bg-zim-red/10 p-2 rounded-full mr-3">
                    <Shield className="h-5 w-5 text-zim-red" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Insurance Options</p>
                    <p className="text-gray-500 text-xs">Coverage up to £1000</p>
                  </div>
                </div>
                <div className="flex items-center bg-white p-3 rounded-md shadow-sm border">
                  <div className="bg-zim-black/10 p-2 rounded-full mr-3">
                    <MapPin className="h-5 w-5 text-zim-black" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Real-time Tracking</p>
                    <p className="text-gray-500 text-xs">Know where your package is</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-zim-green via-zim-yellow to-zim-red opacity-50 blur-xl animate-float"></div>
              <div className="zim-border bg-white overflow-hidden relative z-10 rounded-lg shadow-xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex flex-col p-6">
                  <div className="border-b pb-4 mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Drum Shipping Special Offer</h3>
                    <p className="text-gray-600">Our most popular service</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-700">1 Drum</span>
                      <span className="font-semibold">£260</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">2-4 Drums</span>
                      <span className="font-semibold">£250 each</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">5+ Drums</span>
                      <span className="font-semibold">£220 each</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-center">
                    <Link to="/book-shipment">
                      <Button className="w-full bg-zim-red hover:bg-zim-red/90">
                        Book Now & Save
                      </Button>
                    </Link>
                  </div>
                </div>
                {/* Zimbabwe flag stripe decoration */}
                <div className="absolute bottom-0 left-0 right-0 h-2 zim-gradient-horizontal"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
