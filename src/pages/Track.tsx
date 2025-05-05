
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, AlertCircle, Package, Truck, MapPin, Calendar } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import TrackingInstructions from '@/components/TrackingInstructions';

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
      const { data, error: queryError } = await supabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .single();
      
      setIsTracking(false);
      
      if (queryError) {
        setError('No shipment found with this tracking number');
        return;
      }
      
      if (data) {
        const shipment = data;
        // Safely extract estimated_delivery from metadata, with fallbacks
        let estimatedDelivery = 'Not available';
        if (typeof shipment.metadata === 'object' && shipment.metadata !== null) {
          if (shipment.metadata.estimated_delivery) {
            estimatedDelivery = shipment.metadata.estimated_delivery;
          }
        }
        
        // Safely extract carrier from metadata, with fallbacks
        let carrier = 'Zimbabwe Shipping';
        if (typeof shipment.metadata === 'object' && shipment.metadata !== null) {
          if (shipment.metadata.carrier) {
            carrier = shipment.metadata.carrier;
          }
        }
        
        const result: TrackingResult = {
          status: shipment.status,
          origin: shipment.origin,
          destination: shipment.destination,
          lastUpdate: new Date(shipment.updated_at).toLocaleString(),
          estimatedDelivery,
          carrier,
          tracking_number: shipment.tracking_number
        };
        
        setTrackingResult(result);
        toast({
          title: "Tracking Information Found",
          description: `Latest status: ${shipment.status}`,
        });
      } else {
        setError('No shipment found with this tracking number');
      }
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
        <section className="py-12 md:py-16 w-full">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/2 bg-gray-100 p-8 md:p-12 flex items-center">
                    <div className="w-full">
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
                                setTrackingResult(null);
                              }}
                              placeholder="Enter your tracking number"
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
                          disabled={isTracking}
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
                      <p className="text-sm text-gray-500 mt-4">
                        Your tracking number can be found in your confirmation email or receipt.
                      </p>
                      
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
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-gray-50 w-full">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">Tracking Guide</h2>
            <div className="max-w-4xl mx-auto">
              <TrackingInstructions />
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
