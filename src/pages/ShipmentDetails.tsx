import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Calendar,
  Package2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const ShipmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    const fetchShipment = async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({ title: 'Error', description: 'Shipment not found', variant: 'destructive' });
      } else {
        setShipment(data);
      }

      setLoading(false);
    };

    fetchShipment();
  }, [id]);

  const timelineSteps = [
    'Booking Confirmed',
    'Ready for Pickup',
    'Processing in Warehouse (UK)',
    'Customs Clearance',
    'Processing in Warehouse (ZW)',
    'Out for Delivery',
    'Delivered',
  ];

  const getCompletedSteps = (status: string) => {
    const index = timelineSteps.findIndex(step =>
      status.toLowerCase().includes(step.toLowerCase())
    );
    return index >= 0 ? index + 1 : 0;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!shipment) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow p-6 text-center">
          <h2 className="text-xl font-bold">Shipment not found</h2>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const completed = getCompletedSteps(shipment.status);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(shipment.tracking_number);
              toast({
                title: 'Copied',
                description: 'Tracking number copied to clipboard.',
              });
            }}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Copy Tracking #
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tracking Info Card */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-bold">Tracking #{shipment.tracking_number}</h1>
                </div>
                <div className="text-sm text-muted-foreground">
                  Status: <span className="font-medium text-foreground">{shipment.status}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Origin</div>
                    <div className="flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 text-primary" />
                      {shipment.origin}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Destination</div>
                    <div className="flex items-center gap-2 font-medium">
                      <MapPin className="h-4 w-4 text-primary" />
                      {shipment.destination}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipment Progress */}
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setShowTimeline(prev => !prev)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Shipment Progress</h2>
                  </div>
                  {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {showTimeline && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {timelineSteps.map((step, i) => (
                      <div
                        key={step}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          i < completed 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        {i < completed ? (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0"></div>
                        )}
                        <span className={i < completed ? 'font-medium' : ''}>{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right Column - Additional Details */}
          <div className="space-y-6">
            
            {/* Shipment Details */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package2 className="h-4 w-4" />
                  Details
                </h3>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Carrier</div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>{shipment.carrier || 'Not specified'}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Dimensions</div>
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4 text-muted-foreground" />
                    <span>{shipment.dimensions || 'Not specified'}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Estimated Delivery</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {shipment.estimated_delivery
                        ? format(new Date(shipment.estimated_delivery), 'PPP')
                        : 'Not available'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Created</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(shipment.created_at), 'PPP')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const Detail = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <div>
    <div className="text-gray-500 text-xs mb-1">{label}</div>
    <div className="flex items-center text-base font-medium">{icon} {value}</div>
  </div>
);

export default ShipmentDetails;
