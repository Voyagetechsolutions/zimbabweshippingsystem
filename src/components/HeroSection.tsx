
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection: React.FC = () => {
  return (
    <div className="relative bg-[#111827] text-white">
      {/* Zimbabwe flag vertical stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-8 h-full">
        <div className="h-1/3 bg-zim-green"></div>
        <div className="h-1/3 bg-zim-yellow"></div>
        <div className="h-1/3 bg-zim-red"></div>
      </div>
      
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <div className="max-w-lg">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                Reliable Shipping <br />
                from <span className="text-zim-red">UK</span> to <br />
                <span className="text-zim-green">Zimbabwe</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-6">
                Zimbabwe Shipping offers secure and affordable shipping services. Send drums, parcels, and personal effects with confidence and track your shipments in real-time.
              </p>
              <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex">
                <Link to="/book-shipment">
                  <Button className="w-full md:w-auto bg-zim-red hover:bg-zim-red/90 text-white flex items-center justify-center text-lg">
                    Book Your Shipment <ArrowRight className="ml-2" />
                  </Button>
                </Link>
                <Link to="/track">
                  <Button variant="outline" className="w-full md:w-auto border-white text-white hover:bg-white/10 flex items-center justify-center text-lg">
                    Track Shipment
                  </Button>
                </Link>
              </div>
              
              <div className="mt-12 grid grid-cols-2 gap-6">
                <div className="flex items-center">
                  <div className="text-zim-green mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Fast Delivery</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-zim-yellow mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Secure Packaging</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-zim-red mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Insurance Options</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-zim-yellow mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Real-time Tracking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative">
              {/* Glowing effect around the logo */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-zim-green via-zim-yellow to-zim-red opacity-50 blur-xl"></div>
              <img 
                src="/lovable-uploads/55da115e-5e6f-4816-9216-0cae708d4c3d.png" 
                alt="Zimbabwe Shipping Logo" 
                className="relative z-10 w-80 h-80 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
