import React, { useEffect, useState, useRef } from 'react';
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
  Printer,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const getStatusColorClass = (status) => {
  const s = status.toLowerCase();
  if (s.includes('delivered')) return 'bg-green-100 text-green-800 border-green-300';
  if (s.includes('cancelled') || s.includes('delayed')) return 'bg-red-100 text-red-800 border-red-300';
  if (s.includes('out for delivery')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
  if (s.includes('processing')) return 'bg-orange-100 text-orange-800 border-orange-300';
  if (s.includes('ready for pickup')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (s.includes('customs')) return 'bg-purple-100 text-purple-800 border-purple-300';
  if (s.includes('booking confirmed')) return 'bg-blue-100 text-blue-800 border-blue-300';
  return 'bg-gray-100 text-gray-800 border-gray-300';
};

const ShipmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const timelineRef = useRef(null);

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
  }, [id, toast]);

  const timelineSteps = [
    'Booking Confirmed',
    'Ready for Pickup',
    'Processing in Warehouse (UK)',
    'Customs Clearance',
    'Processing in Warehouse (ZW)',
    'Out for Delivery',
    'Delivered',
  ];

  const getCompletedSteps = (status) => {
    const index = timelineSteps.findIndex(step =>
      status.toLowerCase().includes(step.toLowerCase())
    );
    return index >= 0 ? index + 1 : 0;
  };

  const completed = shipment ? getCompletedSteps(shipment.status) : 0;

  const printPage = () => window.print();

  const exportJSON = () => {
    if (!shipment) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(shipment, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `shipment_${shipment.tracking_number || 'data'}.json`);
    dlAnchorElem.click();
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  if (!shipment) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow p-6 text-center overflow-auto">
          <h2 className="text-xl font-bold">Shipment not found</h2>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6 space-y-6 max-w-4xl overflow-auto">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className={`inline-block px-4 py-1 rounded-full font-semibold border ${getStatusColorClass(shipment.status)}`}>
          {shipment.status}
        </div>

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
            <Detail label="Estimated Delivery" value={shipment.estimated_delivery ? format(new Date(shipment.estimated_delivery), 'PPP') : 'Not available'} icon={<Calendar className="mr-1" />} />
            <Detail label="Dimensions" value={shipment.dimensions || 'Not specified'} icon={<Package2 className="mr-1" />} />
            <Detail label="Created" value={format(new Date(shipment.created_at), 'PPP')} icon={<Calendar className="mr-1" />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            className="flex justify-between items-center cursor-pointer"
            onClick={() => setShowTimeline(prev => !prev)}
            aria-expanded={showTimeline}
            aria-controls="shipment-timeline"
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowTimeline(prev => !prev)}
          >
            <h2 className="text-md font-semibold flex items-center">
              <Truck className="mr-2" /> Shipment Progress
            </h2>
            {showTimeline ? <ChevronUp /> : <ChevronDown />}
          </CardHeader>
          <CardContent
            id="shipment-timeline"
            ref={timelineRef}
            className={`overflow-hidden transition-all duration-300 ease-in-out ${showTimeline ? 'max-h-[500px]' : 'max-h-0'}`}
          >
            <ul className="space-y-2">
              {timelineSteps.map((step, i) => (
                <li
                  key={step}
                  className={`flex items-center gap-2 ${i < completed ? 'text-zim-green font-semibold' : 'text-gray-400'}`}
                >
                  {i < completed ? <CheckCircle className="w-4 h-4 text-zim-green" /> : <div className="w-4 h-4 rounded-full border border-gray-300"></div>}
                  {step}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-4">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(shipment.tracking_number);
              toast({ title: 'Copied', description: 'Tracking number copied to clipboard.' });
            }}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            Copy Tracking Number
          </Button>

          <Button variant="outline" onClick={printPage} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>

          <Button variant="outline" onClick={exportJSON} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export JSON
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Detail = ({ label, value, icon }) => (
  <div>
    <div className="text-gray-500 text-xs mb-1">{label}</div>
    <div className="flex items-start gap-1 text-base font-medium break-words whitespace-pre-wrap">
      {icon} <span>{value}</span>
    </div>
  </div>
);

export default ShipmentDetails;
