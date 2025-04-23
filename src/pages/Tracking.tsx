
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TrackingInstructions from '@/components/TrackingInstructions';
import { PackageSearchIcon, CheckCircle, Clock, Truck, MapPin, AlertCircle } from 'lucide-react';

interface ShipmentStatus {
  id: string;
  status: string;
  location: string;
  timestamp: string;
  notes: string | null;
}

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  origin: string;
  destination: string;
  estimated_delivery: string | null;
  created_at: string;
  shipment_type: string;
  sender_name: string;
  recipient_name: string;
  statuses: ShipmentStatus[];
}

const TrackingPage = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set page title
    document.title = 'Track Your Shipment | UK to Zimbabwe Shipping';
    
    // Check for tracking number in URL params
    const params = new URLSearchParams(window.location.search);
    const trackingParam = params.get('tracking');
    if (trackingParam) {
      setTrackingNumber(trackingParam);
      handleTracking(trackingParam);
    }
  }, []);

  const handleTracking = async (trackingNum: string) => {
    if (!trackingNum) {
      toast({
        title: "Tracking number required",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setShipment(null);
    
    try {
      // Fetch the main shipment data
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_number,
          status,
          origin,
          destination,
          estimated_delivery,
          created_at,
          shipment_type,
          sender_details->name as sender_name,
          recipient_details->name as recipient_name
        `)
        .eq('tracking_number', trackingNum)
        .single();

      if (shipmentError) throw shipmentError;
      if (!shipmentData) throw new Error('Shipment not found');
      
      // Fetch the status history
      const { data: statusData, error: statusError } = await supabase
        .from('shipment_statuses')
        .select('id, status, location, timestamp, notes')
        .eq('shipment_id', shipmentData.id)
        .order('timestamp', { ascending: false });
      
      if (statusError) throw statusError;
      
      // Combine the data
      const fullShipment = {
        ...shipmentData,
        statuses: statusData || []
      };
      
      setShipment(fullShipment);
      
    } catch (err: any) {
      console.error('Error tracking shipment:', err);
      setError(err.message || 'Failed to track shipment. Please check the tracking number and try again.');
      toast({
        title: "Tracking failed",
        description: err.message || 'Failed to track shipment. Please check the tracking number and try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTracking(trackingNumber);
  };

  // Helper function to render appropriate icon for status
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'in transit':
        return <Truck className="h-6 w-6 text-blue-600" />;
      case 'processing':
      case 'awaiting collection':
        return <Clock className="h-6 w-6 text-orange-600" />;
      case 'out for delivery':
        return <MapPin className="h-6 w-6 text-indigo-600" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-600" />;
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">Track Your Shipment</h1>
            <p className="mt-2 text-lg text-gray-600">Enter your tracking number to get real-time updates</p>
          </div>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center flex justify-center items-center gap-2">
                <PackageSearchIcon className="h-5 w-5" />
                Track & Trace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="Enter tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-grow"
                />
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-zim-green hover:bg-zim-green/90"
                >
                  {loading ? 'Tracking...' : 'Track'}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Tracking Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {shipment && (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Shipment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Tracking Number</dt>
                          <dd className="mt-1 text-sm text-gray-900">{shipment.tracking_number}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Status</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            {getStatusIcon(shipment.status)}
                            <span className="ml-2">{shipment.status}</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Shipment Type</dt>
                          <dd className="mt-1 text-sm text-gray-900">{shipment.shipment_type}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Date Submitted</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date(shipment.created_at).toLocaleDateString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">From</dt>
                          <dd className="mt-1 text-sm text-gray-900">{shipment.origin}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">To</dt>
                          <dd className="mt-1 text-sm text-gray-900">{shipment.destination}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Sender</dt>
                          <dd className="mt-1 text-sm text-gray-900">{shipment.sender_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Recipient</dt>
                          <dd className="mt-1 text-sm text-gray-900">{shipment.recipient_name}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Tracking History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {shipment.statuses.map((status, statusIdx) => (
                        <li key={status.id}>
                          <div className="relative pb-8">
                            {statusIdx !== shipment.statuses.length - 1 ? (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-100">
                                  {getStatusIcon(status.status)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-900 font-medium">
                                    {status.status}
                                    {status.location && (
                                      <span className="text-gray-500"> at {status.location}</span>
                                    )}
                                  </p>
                                  {status.notes && (
                                    <p className="mt-1 text-sm text-gray-500">{status.notes}</p>
                                  )}
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  <time dateTime={status.timestamp}>
                                    {new Date(status.timestamp).toLocaleString()}
                                  </time>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {!shipment && !loading && (
            <TrackingInstructions />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default TrackingPage;
