
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import TrackingInstructions from './TrackingInstructions';

const TrackingSection: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate(`/track?tracking=${trackingNumber}`);
    }
  };

  return (
    <section className="py-16 bg-white dark:bg-gray-900 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 dark:text-white">Track Your Shipment</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Enter your tracking number to get real-time updates on your shipment from the UK to Zimbabwe.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 flex flex-col justify-center">
              <TrackingInstructions />
            </div>
            
            <div className="md:col-span-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 md:p-8 shadow-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="tracking" className="block text-sm font-medium mb-2 dark:text-white">
                      Tracking Number
                    </label>
                    <div className="relative">
                      <Input 
                        id="tracking"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking number (e.g., ABCD1234)"
                        className="pl-10 pr-4 h-12 text-lg dark:bg-gray-700 dark:border-gray-600"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg bg-zim-green hover:bg-zim-green/90 dark:bg-zim-green dark:hover:bg-zim-green/90 transition-colors"
                    disabled={!trackingNumber.trim()}
                  >
                    Track Shipment
                  </Button>
                </form>
                
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-3 dark:text-white">Shipping Status Meaning:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mt-1"></div>
                      <div>
                        <span className="font-medium dark:text-white">Booking Confirmed</span>
                        <p className="text-gray-600 dark:text-gray-400">Your shipment has been booked</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1"></div>
                      <div>
                        <span className="font-medium dark:text-white">Ready for Pickup</span>
                        <p className="text-gray-600 dark:text-gray-400">Awaiting collection</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500 mt-1"></div>
                      <div>
                        <span className="font-medium dark:text-white">InTransit to Zimbabwe</span>
                        <p className="text-gray-600 dark:text-gray-400">Shipment on the way to Zimbabwe</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mt-1"></div>
                      <div>
                        <span className="font-medium dark:text-white">Goods Arrived in Zimbabwe</span>
                        <p className="text-gray-600 dark:text-gray-400">Goods have arrived in Zimbabwe</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600 mt-1"></div>
                      <div>
                        <span className="font-medium dark:text-white">Processing in ZW Warehouse</span>
                        <p className="text-gray-600 dark:text-gray-400">Processing in Zimbabwe warehouse</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-600 mt-1"></div>
                      <div>
                        <span className="font-medium dark:text-white">Delivered</span>
                        <p className="text-gray-600 dark:text-gray-400">Shipment delivered</p>
                      </div>
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
