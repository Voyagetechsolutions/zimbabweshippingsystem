import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, AlertCircle, Package, Truck, MapPin, Calendar, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Helmet } from 'react-helmet';

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
  const [showStatusHelp, setShowStatusHelp] = useState(false);
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
        .rpc('get_shipment_tracking_info', {
          tracking_num: trackingNumber
        });

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

      const trackingData = data as {
        status: string;
        origin: string;
        destination: string;
        last_updated: string;
        estimated_delivery: string;
        carrier: string;
        tracking_number: string;
      };

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
        title: "Shipment Found",
        description: `Status: ${trackingData.status}`,
      });
    } catch (err) {
      setIsTracking(false);
      setError('An error occurred while tracking your shipment');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Transit':
      case 'InTransit to Zimbabwe':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Ready for Pickup':
      case 'Collected':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Goods Arrived in Zimbabwe':
      case 'Processing in ZW Warehouse':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Track Your Shipment | Zimbabwe Shipping - Real-Time Updates</title>
        <meta name="description" content="Track your shipment from UK or Ireland to Zimbabwe. Enter your tracking number for real-time updates on your package status and delivery." />
        <meta name="keywords" content="track Zimbabwe shipment, shipping tracking, Zimbabwe delivery tracking, parcel tracking Zimbabwe" />

        {/* Open Graph */}
        <meta property="og:title" content="Track Your Shipment | Zimbabwe Shipping" />
        <meta property="og:description" content="Track your shipment from UK or Ireland to Zimbabwe with real-time updates." />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Track Your Shipment | Zimbabwe Shipping" />
        <meta name="twitter:description" content="Track your shipment from UK or Ireland to Zimbabwe with real-time updates." />
      </Helmet>

      <Navbar />
      <main className="flex-grow">
        <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-zim-green/10 rounded-full mb-4">
                  <Search className="h-8 w-8 text-zim-green" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                  Track Your Shipment
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter your tracking number to see where your package is
                </p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    value={trackingNumber}
                    onChange={(e) => {
                      setTrackingNumber(e.target.value.toUpperCase());
                      setError('');
                      setTrackingResult(null);
                    }}
                    placeholder="Enter tracking number (e.g., ZS123456)"
                    className="h-14 text-lg pl-12 pr-4 bg-white dark:bg-gray-800 border-2 focus:border-zim-green"
                  />
                  <Package className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-14 text-lg bg-zim-green hover:bg-zim-green/90"
                  disabled={!trackingNumber.trim() || isTracking}
                >
                  {isTracking ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

              {/* Tracking Result */}
              {trackingResult && (
                <Card className="mt-8 border-2 border-zim-green overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-zim-green px-6 py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Tracking: {trackingResult.tracking_number}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(trackingResult.status)}`}>
                        {trackingResult.status}
                      </span>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">From</p>
                          <p className="font-medium text-gray-900 dark:text-white">{trackingResult.origin}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <MapPin className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">To</p>
                          <p className="font-medium text-gray-900 dark:text-white">{trackingResult.destination}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trackingResult.carrier && (
                        <div className="flex items-center gap-3">
                          <Truck className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Carrier</p>
                            <p className="font-medium">{trackingResult.carrier}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Last Updated</p>
                          <p className="font-medium">{trackingResult.lastUpdate}</p>
                        </div>
                      </div>
                    </div>

                    {trackingResult.estimatedDelivery && trackingResult.estimatedDelivery !== 'Not available' && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Estimated Delivery</p>
                        <p className="text-lg font-semibold text-zim-green">{trackingResult.estimatedDelivery}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Status Help - Collapsible */}
              <div className="mt-8">
                <button
                  onClick={() => setShowStatusHelp(!showStatusHelp)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    What do the status codes mean?
                  </span>
                  {showStatusHelp ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {showStatusHelp && (
                  <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm"><strong>Booking Confirmed</strong> - Your shipment has been booked</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm"><strong>Ready for Pickup</strong> - Awaiting collection</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-sm"><strong>In Transit</strong> - On the way to Zimbabwe</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm"><strong>Arrived in Zimbabwe</strong> - At Zimbabwe warehouse</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm"><strong>Delivered</strong> - Successfully delivered</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Help */}
              <div className="mt-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                  Can't find your shipment?
                </p>
                <a
                  href="tel:+447584100552"
                  className="inline-flex items-center gap-2 text-zim-green hover:underline font-medium"
                >
                  <Phone className="h-4 w-4" />
                  Call us: +44 7584 100552
                </a>
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
