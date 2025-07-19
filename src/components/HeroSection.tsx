
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, Package, MapPin, Calendar, DollarSign, FileText } from 'lucide-react';
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
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  asChild
                  variant="outline"
                  className="flex items-center bg-white p-3 rounded-md shadow-sm border w-full text-left h-auto flex-col space-y-2"
                >
                  <Link to="/collection-schedule">
                    <div className="bg-zim-green/10 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-zim-green" />
                    </div>
                    <div className="text-sm text-center">
                      <p className="font-medium">Our Collection Schedule</p>
                      <p className="text-gray-500 text-xs">View pickup dates</p>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="flex items-center bg-white p-3 rounded-md shadow-sm border w-full text-left h-auto flex-col space-y-2"
                >
                  <Link to="/pricing">
                    <div className="bg-zim-yellow/10 p-2 rounded-full">
                      <DollarSign className="h-5 w-5 text-zim-yellow" />
                    </div>
                    <div className="text-sm text-center">
                      <p className="font-medium">Our Pricing</p>
                      <p className="text-gray-500 text-xs">View shipping rates</p>
                    </div>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="flex items-center bg-white p-3 rounded-md shadow-sm border w-full text-left h-auto flex-col space-y-2"
                >
                  <Link to="/shipping-guidelines">
                    <div className="bg-zim-red/10 p-2 rounded-full">
                      <FileText className="h-5 w-5 text-zim-red" />
                    </div>
                    <div className="text-sm text-center">
                      <p className="font-medium">Shipping Guidelines</p>
                      <p className="text-gray-500 text-xs">What you can ship</p>
                    </div>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              {/* Multi-layered glow effect around the logo */}
              <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-zim-green via-zim-yellow to-zim-red opacity-50 blur-xl animate-pulse"></div>
              <div className="absolute -inset-6 rounded-full bg-zim-yellow/30 opacity-40 blur-2xl animate-pulse animate-delay-200"></div>
              <div className="absolute -inset-8 rounded-full bg-zim-green/20 opacity-30 blur-3xl animate-pulse animate-delay-500"></div>
              
              {/* Logo with subtle hover animation */}
              <div className="relative z-10 transform transition-all duration-500 hover:scale-105">
                <img 
                  src="/lovable-uploads/9916a41e-7a43-42af-b9b0-e92e37521652.png" 
                  alt="Zimbabwe Shipping" 
                  className="w-64 h-64 md:w-80 md:h-80 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
