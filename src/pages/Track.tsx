
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import { Loader2, Package, ArrowRight, Calendar, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TrackingInstructions from '@/components/TrackingInstructions';
import { castToShipment } from '@/types/shipment';

const Track = () => {
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: 'Tracking number required',
        description: 'Please enter a tracking number to track your shipment.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    setSearchAttempted(true);
    
    try {
      const { data, error } = await supabase
        .from(tableFrom('shipments'))
        .select('*')
        .eq('tracking_number', trackingNumber.trim())
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        const castedShipment = castToShipment(data);
        setShipment(castedShipment);
      } else {
        setShipment(null);
        toast({
          title: 'Shipment not found',
          description: 'No shipment found with that tracking number. Please check and try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error tracking shipment:', error);
      setShipment(null);
      toast({
        title: 'Tracking failed',
        description: 'Unable to find shipment with that tracking number. Please check and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-500';
      case 'in_transit':
      case 'in transit':
        return 'bg-blue-500';
      case 'pending_collection':
      case 'pending collection':
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTrack();
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">Track Your Shipment</h1>
          <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
            Enter your tracking number below to check the current status of your shipment.
          </p>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button 
                onClick={handleTrack} 
                disabled={loading}
                className="bg-zim-green hover:bg-zim-green/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Track Shipment
              </Button>
            </div>
          </div>
          
          {searchAttempted && !loading && !shipment && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Shipment Found</h2>
              <p className="text-gray-600 mb-4">
                We couldn't find a shipment with the tracking number you provided. Please check the tracking number and try again.
              </p>
            </div>
          )}
          
          {shipment && (
            <Card className="p-6 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-4 border-b">
                <div>
                  <h2 className="text-xl font-bold">Shipment #{shipment.tracking_number}</h2>
                  <p className="text-gray-600 text-sm">From {shipment.origin} to {shipment.destination}</p>
                </div>
                <div className="mt-2 md:mt-0">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(shipment.status)}`}>
                    {formatStatus(shipment.status)}
                  </span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Shipped On</h3>
                  <p className="text-base font-medium">
                    {new Date(shipment.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Estimated Delivery</h3>
                  <p className="text-base font-medium">
                    {shipment.metadata?.estimatedDelivery || shipment.estimated_delivery || '6-8 weeks from shipment date'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Carrier</h3>
                  <p className="text-base font-medium">
                    {shipment.metadata?.carrier || shipment.carrier || 'Zimbabwe Shipping Ltd'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Service Type</h3>
                  <p className="text-base font-medium">
                    {shipment.metadata?.doorToDoor ? 'Door to Door' : 'Standard Delivery'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  onClick={() => navigate(`/shipment/${shipment.id}`)}
                  className="flex items-center bg-zim-green hover:bg-zim-green/90"
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}
          
          <TrackingInstructions />
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default Track;
