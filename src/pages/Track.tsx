import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, AlertCircle, Package, Truck, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

type TrackingResult = {
  status: string;
  origin: string;
  destination: string;
  lastUpdate: string;
  estimatedDelivery: string | null;
  carrier: string | null;
  tracking_number: string;
};

const Track = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber) {
      setError('Please enter a tracking number');
      return;
    }
    
    setError('');
    setIsTracking(true);
    
    try {
      // Use the secure tracking function that only returns non-sensitive data
      const { data, error: queryError } = await supabase
        .rpc('get_shipment_tracking_info', { 
          tracking_num: trackingNumber 
        });
      
      // Also log the tracking access for security monitoring
      await supabase.rpc('log_tracking_access', { 
        tracking_num: trackingNumber 
      });
      
      setIsTracking(false);
      
      if (queryError) {
        setError('An error occurred while tracking your shipment');
        console.error(queryError);
        return;
      }
      
      if (!data) {
        setError('No shipment found with this tracking number');
        return;
      }
      
      // Type the secure tracking data properly
      const trackingData = data as {
        status: string;
        origin: string;
        destination: string;
        last_updated: string;
        estimated_delivery: string;
        carrier: string;
        tracking_number: string;
      };
      
      // Parse the secure tracking data
      const result: TrackingResult = {
        status: trackingData.status,
        origin: trackingData.origin,
        destination: trackingData.destination,
        lastUpdate: new Date(trackingData.last_updated).toLocaleString(),
        estimatedDelivery: trackingData.estimated_delivery === '"Not available"' ? 'Not available' : trackingData.estimated_delivery,
        carrier: trackingData.carrier === '"Zimbabwe Shipping"' ? 'Zimbabwe Shipping' : trackingData.carrier,
        tracking_number: trackingData.tracking_number
      };
      
      setTrackingResult(result);
      toast({
        title: "Tracking Information Found",
        description: `Latest status: ${trackingData.status}`,
      });
    } catch (err) {
      setIsTracking(false);
      setError('An error occurred while tracking your shipment');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Navbar />
      <main className="flex-grow w-full">
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
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold mb-2">How to Track Your Shipment</h3>
                    
                    <div className="space-y-3">
                      <div className="flex">
                        <div className="mr-3 flex-shrink-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zim-green text-white">
                            1
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Find your tracking number</p>
                          <p className="text-sm text-gray-600">
                            Your tracking number can be found in your confirmation email or receipt.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <div className="mr-3 flex-shrink-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zim-green text-white">
                            2
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Enter the tracking number</p>
                          <p className="text-sm text-gray-600">
                            Enter your tracking number in the field above and click "Track Shipment".
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <div className="mr-3 flex-shrink-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zim-green text-white">
                            3
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">View shipment details</p>
                          <p className="text-sm text-gray-600">
                            You'll be able to see the current status, origin, destination, and estimated delivery date of your shipment.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-100 p-4 rounded-md mt-4">
                      <div className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-zim-green mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium">Need Help?</p>
                          <p className="text-sm text-gray-600">
                            If you need assistance tracking your shipment, please call us at <span className="text-zim-green">+44 7584 100552</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
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
                            onChange={(e) => {
                              setTrackingNumber(e.target.value.toUpperCase());
                              setError('');
                              setTrackingResult(null);
                            }}
                            placeholder="Enter tracking number (e.g., ABCD1234)"
                            className="pl-10 pr-4 h-12 text-lg dark:bg-gray-700 dark:border-gray-600"
                          />
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                        className="w-full h-12 text-lg bg-zim-green hover:bg-zim-green/90 dark:bg-zim-green dark:hover:bg-zim-green/90 transition-colors"
                        disabled={!trackingNumber.trim() || isTracking}
                      >
                        {isTracking ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Tracking...
                          </div>
                        ) : (
                          <>
                            <Search className="mr-2 h-5 w-5" />
                            Track Shipment
                          </>
                        )}
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

                    {trackingResult && (
                      <Card className="mt-6 border-zim-green animate-fade-in">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="font-bold">Status</span>
                              <span className={`px-2 py-1 rounded text-sm ${
                                trackingResult.status === 'Delivered' 
                                  ? 'bg-green-100 text-green-800' 
                                  : trackingResult.status === 'In Transit' 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}>
                                {trackingResult.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-zim-green" />
                              <div>
                                <p className="text-sm text-gray-500">From</p>
                                <p className="font-medium">{trackingResult.origin}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-zim-red" />
                              <div>
                                <p className="text-sm text-gray-500">To</p>
                                <p className="font-medium">{trackingResult.destination}</p>
                              </div>
                            </div>
                            {trackingResult.carrier && (
                              <div className="flex items-center gap-3">
                                <Truck className="h-5 w-5 text-gray-500" />
                                <div>
                                  <p className="text-sm text-gray-500">Carrier</p>
                                  <p className="font-medium">{trackingResult.carrier}</p>
                                </div>
                              </div>
                            )}
                            {trackingResult.estimatedDelivery && (
                              <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-zim-yellow" />
                                <div>
                                  <p className="text-sm text-gray-500">Estimated Delivery</p>
                                  <p className="font-medium">{trackingResult.estimatedDelivery}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-zim-green" />
                              <div>
                                <p className="text-sm text-gray-500">Tracking Number</p>
                                <p className="font-medium">{trackingResult.tracking_number}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="text-sm text-gray-500">Last Updated</p>
                                <p className="font-medium">{trackingResult.lastUpdate}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-900 w-full">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
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
                  <div className="bg-gray-800 rounded p-4 transform transition-all hover:scale-105 hover:shadow-lg">
                    <span className="text-zim-green font-medium">Booked</span>
                    <p className="text-gray-400 text-sm">Your package is confirmed for shipping</p>
                  </div>
                </div>
                
                <div className="mb-6 relative">
                  <div className="absolute -left-6 top-0 w-6 h-6 rounded-full border-4 border-zim-yellow bg-gray-900"></div>
                  <div className="bg-gray-800 rounded p-4 transform transition-all hover:scale-105 hover:shadow-lg">
                    <span className="text-zim-yellow font-medium">In Transit</span>
                    <p className="text-gray-400 text-sm">Your package is on its way to destination</p>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-6 top-0 w-6 h-6 rounded-full border-4 border-gray-700 bg-gray-900"></div>
                  <div className="bg-gray-800 rounded p-4 transform transition-all hover:scale-105 hover:shadow-lg">
                    <span className="text-gray-400 font-medium">Delivered</span>
                    <p className="text-gray-500 text-sm">Your package has been delivered</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Track;
