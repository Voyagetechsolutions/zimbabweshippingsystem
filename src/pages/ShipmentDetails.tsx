import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ArrowLeft, Package, MapPin, Scale, Calendar, Truck, Clock, Package2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

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
}

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'in transit':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'delivered':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'delayed':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'processing':
      return <Package className="h-5 w-5" />;
    case 'in transit':
      return <Truck className="h-5 w-5" />;
    case 'delivered':
      return <Package2 className="h-5 w-5" />;
    case 'delayed':
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
      try {
        if (!id) return;

        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching shipment:', error);
          toast({
            title: 'Error',
            description: 'Failed to load shipment details.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        setShipment(data as Shipment);
      } catch (error) {
        console.error('Unexpected error:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShipmentDetails();
  }, [id, toast, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getTimelineSteps = (status: string) => {
    const allSteps = [
      { name: 'Processing', completed: false },
      { name: 'In Transit', completed: false },
      { name: 'Out for Delivery', completed: false },
      { name: 'Delivered', completed: false },
    ];
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'processing') {
      allSteps[0].completed = true;
    } else if (statusLower === 'in transit') {
      allSteps[0].completed = true;
      allSteps[1].completed = true;
    } else if (statusLower === 'out for delivery') {
      allSteps[0].completed = true;
      allSteps[1].completed = true;
      allSteps[2].completed = true;
    } else if (statusLower === 'delivered') {
      allSteps.forEach(step => step.completed = true);
    }
    
    return allSteps;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="mb-6">
                <Package className="h-16 w-16 mx-auto text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold mb-4">Shipment Not Found</h1>
              <p className="text-gray-500 mb-6">
                The shipment you're looking for does not exist or you don't have permission to view it.
              </p>
              <Button onClick={() => navigate(-1)} variant="outline" className="mr-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => navigate('/dashboard')} className="bg-zim-green hover:bg-zim-green/90">
                Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const timelineSteps = getTimelineSteps(shipment.status);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Shipment Details</h1>
                <p className="text-gray-500 flex items-center mt-1">
                  <Package className="mr-2 h-4 w-4" />
                  Tracking #: <span className="font-mono ml-2">{shipment.tracking_number}</span>
                </p>
              </div>
              <div className="mt-2 md:mt-0 flex items-center space-x-2">
                <Badge 
                  className={`py-1 px-3 ${getStatusColor(shipment.status)}`}
                >
                  <span className="flex items-center">
                    {getStatusIcon(shipment.status)}
                    <span className="ml-1">{shipment.status}</span>
                  </span>
                </Badge>
                
                {(shipment.status.toLowerCase() !== 'delivered' && 
                  shipment.status.toLowerCase() !== 'cancelled') && 
                  (shipment.can_modify || shipment.can_cancel) && (
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

          {/* Shipment Timeline */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-bold flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Shipment Progress
              </h2>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200"></div>
                {timelineSteps.map((step, index) => (
                  <div key={step.name} className="relative mb-6 last:mb-0 flex items-start">
                    <div className={`
                      absolute left-5 -ml-3 h-6 w-6 rounded-full border-2 z-10
                      flex items-center justify-center
                      ${step.completed 
                        ? 'bg-zim-green border-zim-green' 
                        : 'bg-white border-gray-300'}
                    `}>
                      {step.completed && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-10">
                      <h3 className={`font-medium ${step.completed ? 'text-zim-black' : 'text-gray-500'}`}>
                        {step.name}
                      </h3>
                      {step.completed && index === timelineSteps.findIndex(s => s.completed) && (
                        <p className="text-sm text-gray-500">
                          {format(new Date(shipment.created_at), 'PPP')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipment Information */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-bold flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Shipment Information
              </h2>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-500 mb-2">Origin</h3>
                <div className="flex items-start">
                  <MapPin className="mr-2 h-5 w-5 text-zim-black mt-0.5" />
                  <p className="font-medium">{shipment.origin}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-500 mb-2">Destination</h3>
                <div className="flex items-start">
                  <MapPin className="mr-2 h-5 w-5 text-zim-green mt-0.5" />
                  <p className="font-medium">{shipment.destination}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-500 mb-2">Carrier</h3>
                <div className="flex items-center">
                  <Truck className="mr-2 h-5 w-5" />
                  <p className="font-medium">{shipment.carrier || 'Not specified'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-500 mb-2">Estimated Delivery</h3>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  <p className="font-medium">
                    {shipment.estimated_delivery 
                      ? format(new Date(shipment.estimated_delivery), 'PPP') 
                      : 'Not specified'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-500 mb-2">Weight</h3>
                <div className="flex items-center">
                  <Scale className="mr-2 h-5 w-5" />
                  <p className="font-medium">
                    {shipment.weight ? `${shipment.weight} kg` : 'Not specified'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-500 mb-2">Dimensions</h3>
                <div className="flex items-center">
                  <Package2 className="mr-2 h-5 w-5" />
                  <p className="font-medium">{shipment.dimensions || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between text-sm text-gray-500 mb-4">
                <div>Created: {format(new Date(shipment.created_at), 'PPP pp')}</div>
                <div>Last Updated: {format(new Date(shipment.updated_at), 'PPP pp')}</div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-4">
              {user && (
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  variant="outline"
                >
                  Back to Dashboard
                </Button>
              )}
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(shipment.tracking_number);
                  toast({
                    title: "Tracking Number Copied",
                    description: `${shipment.tracking_number} has been copied to clipboard.`,
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

export default ShipmentDetails;
