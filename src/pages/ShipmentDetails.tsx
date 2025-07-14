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
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-6 space-y-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card>
          <CardHeader>
            <h1 className="text-lg md:text-xl font-bold flex items-center">
              <Package className="mr-2" /> Tracking #: {shipment.tracking_number}
            </h1>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Detail label="Origin" value={shipment.origin} icon={<MapPin className="mr-1" />} />
            <Detail label="Destination" value={shipment.destination} icon={<MapPin className="mr-1" />} />
            <Detail label="Carrier" value={shipment.carrier || 'Not specified'} icon={<Truck className="mr-1" />} />
            <Detail
              label="Estimated Delivery"
              value={
                shipment.estimated_delivery
                  ? format(new Date(shipment.estimated_delivery), 'PPP')
                  : 'Not available'
              }
              icon={<Calendar className="mr-1" />}
            />
            <Detail label="Dimensions" value={shipment.dimensions || 'Not specified'} icon={<Package2 className="mr-1" />} />
            <Detail
              label="Created"
              value={format(new Date(shipment.created_at), 'PPP')}
              icon={<Calendar className="mr-1" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setShowTimeline(prev => !prev)}
          >
            <h2 className="text-md font-semibold flex items-center">
              <Truck className="mr-2" /> Shipment Progress
            </h2>
            {showTimeline ? <ChevronUp /> : <ChevronDown />}
          </CardHeader>
          {showTimeline && (
            <CardContent>
              <ul className="space-y-2">
                {timelineSteps.map((step, i) => (
                  <li
                    key={step}
                    className={`flex items-center gap-2 ${
                      i < completed ? 'text-zim-green font-semibold' : 'text-gray-400'
                    }`}
                  >
                    {i < completed ? (
                      <CheckCircle className="w-4 h-4 text-zim-green" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                    )}
                    {step}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-4">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(shipment.tracking_number);
              toast({
                title: 'Copied',
                description: 'Tracking number copied to clipboard.',
              });
            }}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            Copy Tracking Number
          </Button>
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
