
import React from 'react';
import { Button } from "@/components/ui/button";
import { Package, ArrowRight, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection: React.FC = () => {
  return (
    <div className="relative hero-pattern">
      <div className="absolute inset-0 bg-gradient-to-r from-zim-green/10 to-zim-red/10"></div>
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <div className="max-w-lg">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                UK to Zimbabwe <span className="text-zim-green">Shipping</span> Made Simple
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-6">
                Fast, reliable, and affordable shipping services for all your packages. From personal items to commercial cargo.
              </p>
              <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex">
                <Link to="/book-shipment">
                  <Button className="w-full md:w-auto bg-zim-green hover:bg-zim-green/90 text-white flex items-center justify-center text-lg">
                    <Package className="mr-2" /> Book Shipment
                  </Button>
                </Link>
                <Link to="/track">
                  <Button variant="outline" className="w-full md:w-auto border-zim-black text-zim-black hover:bg-zim-black hover:text-white flex items-center justify-center text-lg">
                    Track Package <ArrowRight className="ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zim-red">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Best Prices</p>
                    <p className="text-gray-500 text-xs">Starting from £220</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="grid grid-cols-1 gap-4 w-full max-w-md">
              <div className="relative">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-tr from-zim-green/20 to-zim-yellow/20 opacity-50 blur-sm"></div>
                <div className="bg-white rounded-lg shadow-lg overflow-hidden relative border-2 border-zim-yellow">
                  <div className="absolute top-0 right-0">
                    <div className="bg-zim-yellow text-white px-4 py-1 font-semibold text-sm transform rotate-45 translate-x-6 -translate-y-1">
                      Standard
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Single Drum</h3>
                    <p className="text-gray-600 mb-4">Basic shipping option</p>
                    <div className="text-3xl font-bold text-zim-green mb-4">£260<span className="text-lg text-gray-500 font-normal">/drum</span></div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-gray-700">
                        <svg className="h-5 w-5 text-zim-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        200L capacity per drum
                      </li>
                      <li className="flex items-center text-gray-700">
                        <svg className="h-5 w-5 text-zim-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        2-3 weeks delivery time
                      </li>
                    </ul>
                    <Link to="/book-shipment" className="block">
                      <Button className="w-full bg-zim-green hover:bg-zim-green/90">
                        Book Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-tr from-zim-green/30 to-zim-red/30 opacity-70 blur-sm"></div>
                <div className="bg-white rounded-lg shadow-lg overflow-hidden relative border-2 border-zim-red">
                  <div className="absolute top-0 right-0">
                    <div className="bg-zim-red text-white px-4 py-1 font-semibold text-sm transform rotate-45 translate-x-6 -translate-y-1">
                      Popular
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Multiple Drums</h3>
                    <p className="text-gray-600 mb-4">Best value option</p>
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-zim-green">£250<span className="text-lg text-gray-500 font-normal">/drum</span></div>
                      <p className="text-sm text-gray-600">2-4 drums</p>
                    </div>
                    <div className="mb-6">
                      <div className="text-3xl font-bold text-zim-green">£220<span className="text-lg text-gray-500 font-normal">/drum</span></div>
                      <p className="text-sm text-gray-600">5+ drums</p>
                    </div>
                    <Link to="/book-shipment" className="block">
                      <Button className="w-full bg-zim-red hover:bg-zim-red/90">
                        Book Now & Save
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
