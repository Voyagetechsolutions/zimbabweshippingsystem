import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, Package, MapPin, Calendar, Truck, Clock, Package2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import ShipmentActions from '@/components/ShipmentActions';

interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  carrier: string | null;
  weight: number | null;
  dimensions: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
  can_modify: boolean | null;
  can_cancel: boolean | null;
}

const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();

  switch (true) {
    case statusLower.includes('booking confirmed'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('ready for pickup'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('processing'):
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case statusLower.includes('customs'):
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case statusLower.includes('transit'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('out for delivery'):
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case statusLower.includes('delivered'):
      return 'bg-green-100 text-green-800 border-green-300';
    case statusLower.includes('cancelled') || statusLower.includes('delayed'):
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase();

  switch (true) {
    case statusLower.includes('booking confirmed'):
    case statusLower.includes('ready for pickup'):
    case statusLower.includes('processing'):
    case statusLower.includes('customs'):
      return <Package className="h-5 w-5" />;
    case statusLower.includes('transit'):
    case statusLower.includes('out for delivery'):
      return <Truck className="h-5 w-5" />;
    case statusLower.includes('delivered'):
      return <Package2 className="h-5 w-5" />;
    case statusLower.includes('cancelled'):
    case statusLower.includes('delayed'):
      return <Clock className="h-5 w-5" />;
    default:
      return <Package className="h-5 w-5" />;
  }
};

const ShipmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchShipmentDetails = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load shipment details.',
          variant: 'destructive',
        });
      } else {
        setShipment(data as Shipment);
      }

      setLoading(false);
    };

    fetchShipmentDetails();
  }, [id, toast, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getTimelineSteps = (status: string) => {
    const steps = [
      'Booking Confirmed',
      'Ready for Pickup',
      'Processing in Warehouse (UK)',
      'Customs Clearance',
      'Processing in Warehouse (ZW)',
      'Out for Delivery',
      'Delivered',
    ];

    const statusLower = status.toLowerCase();
    const index = steps.findIndex(step => statusLower.includes(step.toLowerCase()));

    return steps.map((step, i) => ({
      name: step,
      completed: i <= index,
    }));
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-grow overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            <Card className="max-w-3xl mx-auto">
              <CardContent className="pt-6 text-center">
                <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Shipment Not Found</h1>
                <p className="text-gray-500 mb-6">
                  The shipment you're looking for does not exist or you don't have permission to view it.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                  </Button>
                  <Button onClick={() => navigate('/dashboard')} className="bg-zim-green hover:bg-zim-green/90">
                    Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const timelineSteps = getTimelineSteps(shipment.status);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl space-y-6">
          <div>
            <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <h1 className="text-2xl font-bold mb-2">Shipment Details</h1>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
              <p className="text-gray-500 break-all">
                <Package className="inline h-4 w-4 mr-1" />
                Tracking #: <span className="font-mono">{shipment.tracking_number}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge className={`py-1 px-3 ${getStatusColor(shipment.status)}`}>
                  {getStatusIcon(shipment.status)}
                  <span className="ml-1">{shipment.status}</span>
                </Badge>

                {(shipment.can_modify || shipment.can_cancel) && (
                  <ShipmentActions
                    shipmentId={shipment.id}
                    canModify={shipment.can_modify}
                    canCancel={shipment.can_cancel}
                    onActionComplete={handleRefresh}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold flex items-center">
                <Clock className="mr-2 h-5 w-5" /> Shipment Progress
              </h2>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8">
                <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />
                {timelineSteps.map((step, idx) => (
                  <div key={idx} className="mb-6 last:mb-0 relative">
                    <div
                      className={`absolute left-0 h-6 w-6 rounded-full border-2 z-10 flex items-center justify-center ${
                        step.completed ? 'bg-zim-green border-zim-green' : 'bg-white border-gray-300'
                      }`}
                    >
                      {step.completed && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-10">
                      <p className={`font-medium ${step.completed ? 'text-zim-black' : 'text-gray-500'}`}>
                        {step.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold flex items-center">
                <Package className="mr-2 h-5 w-5" /> Shipment Information
              </h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Origin" icon={<MapPin />} value={shipment.origin} />
                <Info label="Destination" icon={<MapPin />} value={shipment.destination} />
                <Info label="Carrier" icon={<Truck />} value={shipment.carrier || 'Not specified'} />
                <Info
                  label="Estimated Delivery"
                  icon={<Calendar />}
                  value={
                    shipment.estimated_delivery
                      ? format(new Date(shipment.estimated_delivery), 'PPP')
                      : 'Not specified'
                  }
                />
                <Info label="Dimensions" icon={<Package2 />} value={shipment.dimensions || 'Not specified'} />
              </div>
            </CardContent>
          </Card>

          {/* Footer Info */}
          <Card>
            <CardContent className="text-sm text-gray-500">
              <p>Created: {format(new Date(shipment.created_at), 'PPP pp')}</p>
              <p>Last Updated: {format(new Date(shipment.updated_at), 'PPP pp')}</p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
              {user && (
                <Button onClick={() => navigate('/dashboard')} variant="outline">
                  Back to Dashboard
                </Button>
              )}
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(shipment.tracking_number);
                  toast({
                    title: 'Copied!',
                    description: `Tracking # ${shipment.tracking_number} copied to clipboard.`,
                  });
                }}
                className="bg-zim-green hover:bg-zim-green/90"
              >
                Copy Tracking #
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

const Info = ({
  label,
  icon,
  value,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
}) => (
  <div>
    <h3 className="text-gray-500 text-sm mb-1">{label}</h3>
    <div className="flex items-center text-sm font-medium">
      {icon && <span className="mr-2 text-zim-black">{icon}</span>}
      {value}
    </div>
  </div>
);

export default ShipmentDetails;
