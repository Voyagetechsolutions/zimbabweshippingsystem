import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search, AlertCircle, Package } from 'lucide-react';

const TrackingSection: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber) {
      setError('Please enter a tracking number');
      return;
    }
    
    if (!trackingNumber.match(/^[A-Z]{4}\d{4}$/)) {
      setError('Invalid tracking number format. Please use format ABCD1234');
      return;
    }
    
    setError('');
    // Here we would redirect to the tracking page with the tracking number
    // For now just log it
    console.log(`Tracking shipment: ${trackingNumber}`);
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 bg-gray-100 p-8 md:p-12 flex items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Track Your Shipment</h2>
                <p className="text-gray-600 mb-6">
                  Enter your tracking number to get real-time updates on your shipment's location and estimated delivery date.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="tracking" className="block text-sm font-medium text-gray-700 mb-1">
                      Tracking Number
                    </label>
                    <div className="relative">
                      <input
                        id="tracking"
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => {
                          setTrackingNumber(e.target.value.toUpperCase());
                          setError('');
                        }}
                        placeholder="e.g. ABCD1234"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zim-green focus:border-transparent"
                      />
                      {error && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </div>
                    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-zim-green hover:bg-zim-green/90 text-white py-3 flex items-center justify-center"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Track Shipment
                  </Button>
                </form>
                <p className="text-sm text-gray-500 mt-4">
                  Your tracking number can be found in your confirmation email or receipt.
                </p>
              </div>
            </div>
            <div className="md:w-1/2 bg-gray-900 p-8 md:p-12 flex items-center">
              <div>
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-zim-yellow flex items-center justify-center mr-4">
                    <Package className="h-6 w-6 text-zim-black" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Shipment Progress</h3>
                </div>
                <div className="relative pl-6">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-700"></div>
                  
                  <div className="mb-6 relative">
                    <div className="absolute -left-6 top-0 w-6 h-6 rounded-full border-4 border-zim-green bg-gray-900"></div>
                    <div className="bg-gray-800 rounded p-4">
                      <span className="text-zim-green font-medium">Booked</span>
                      <p className="text-gray-400 text-sm">Your package is confirmed for shipping</p>
                    </div>
                  </div>
                  
                  <div className="mb-6 relative">
                    <div className="absolute -left-6 top-0 w-6 h-6 rounded-full border-4 border-zim-yellow bg-gray-900"></div>
                    <div className="bg-gray-800 rounded p-4">
                      <span className="text-zim-yellow font-medium">In Transit</span>
                      <p className="text-gray-400 text-sm">Your package is on its way to Zimbabwe</p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -left-6 top-0 w-6 h-6 rounded-full border-4 border-gray-700 bg-gray-900"></div>
                    <div className="bg-gray-800 rounded p-4">
                      <span className="text-gray-400 font-medium">Delivered</span>
                      <p className="text-gray-500 text-sm">Your package has been delivered</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrackingSection;
