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
  CheckCircle,
  Printer,
  Download,
  User,
  Phone,
  Mail,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const STATUS_STEPS = [
  'Pending',
  'Confirmed',
  'Collected',
  'In Transit',
  'Zim Warehouse',
  'Out for Delivery',
  'Delivered'
];

const ShipmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const getStatusProgress = (status) => {
    const statusMap = {
      'pending': 0,
      'confirmed': 1,
      'collected': 2,
      'in transit': 3,
      'intransit': 3,
      'ontransit': 3,
      'zim warehouse': 4,
      'out for delivery': 5,
      'delivered': 6
    };
    
    const currentStep = statusMap[status?.toLowerCase()] ?? 0;
    return Math.round((currentStep / (STATUS_STEPS.length - 1)) * 100);
  };

  const getCurrentStepIndex = (status) => {
    const statusMap = {
      'pending': 0,
      'confirmed': 1,
      'collected': 2,
      'in transit': 3,
      'intransit': 3,
      'ontransit': 3,
      'zim warehouse': 4,
      'out for delivery': 5,
      'delivered': 6
    };
    return statusMap[status?.toLowerCase()] ?? 0;
  };

  const getSenderName = (shipment) => {
    const metadata = shipment?.metadata || {};
    return metadata.sender?.name ||
      `${metadata.sender?.firstName || ''} ${metadata.sender?.lastName || ''}`.trim() ||
      `${metadata.senderDetails?.firstName || ''} ${metadata.senderDetails?.lastName || ''}`.trim() ||
      metadata.senderDetails?.name ||
      'No Name';
  };

  const getReceiverName = (shipment) => {
    const metadata = shipment?.metadata || {};
    return metadata.recipient?.name ||
      metadata.recipientDetails?.name ||
      metadata.recipientName ||
      'No Name';
  };

  const printPage = () => window.print();

  const exportJSON = () => {
    if (!shipment) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(shipment, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `shipment_${shipment.tracking_number || 'data'}.json`);
    dlAnchorElem.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Package className="h-12 w-12 animate-pulse text-emerald-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading shipment details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

  const currentStepIndex = getCurrentStepIndex(shipment.status);
  const progress = getStatusProgress(shipment.status);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {/* Header Section */}
        <div className="bg-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">Tracking Number</p>
                  <h1 className="text-2xl font-bold tracking-wide">{shipment.tracking_number}</h1>
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`text-sm px-4 py-1.5 font-semibold ${
                shipment.status?.toLowerCase() === 'delivered' ? 'bg-green-600' :
                shipment.status?.toLowerCase() === 'cancelled' ? 'bg-red-500' :
                shipment.status?.toLowerCase().includes('transit') ? 'bg-blue-500' :
                'bg-white/20 backdrop-blur-sm'
              }`}>
                {shipment.status}
              </Badge>
              <p className="text-white/70 text-xs mt-2">
                Created {format(new Date(shipment.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border">
          <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-600" />
            Shipment Progress
          </h2>
          
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between relative">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = currentStepIndex >= index;
              const isCurrent = currentStepIndex === index;
              return (
                <div key={step} className="relative z-10 flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-emerald-500/30 scale-110' : ''}`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center max-w-[80px] ${
                    isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'
                  }`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Route Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Origin</p>
                <p className="font-semibold">{shipment.origin || 'United Kingdom'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="font-semibold">{shipment.destination || 'Zimbabwe'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sender & Receiver Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sender Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <User className="h-4 w-4" />
                Sender Details
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold">{getSenderName(shipment)}</p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.metadata?.sender?.email || shipment.metadata?.senderDetails?.email || 'No email'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{shipment.metadata?.sender?.phone || shipment.metadata?.senderDetails?.phone || 'No phone'}</span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{shipment.metadata?.sender?.address || shipment.metadata?.senderDetails?.address || shipment.origin || 'No address'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Receiver Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <User className="h-4 w-4" />
                Receiver Details
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold">{getReceiverName(shipment)}</p>
                  <p className="text-sm text-muted-foreground">Zimbabwe</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{shipment.metadata?.recipient?.phone || shipment.metadata?.recipientDetails?.phone || 'No phone'}</span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{shipment.metadata?.recipient?.address || shipment.metadata?.recipientDetails?.address || shipment.destination || 'No address'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Carrier</p>
              <p className="font-medium">{shipment.carrier || 'Zimbabwe Shipping Nexus'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Estimated Delivery</p>
              <p className="font-medium">
                {shipment.estimated_delivery ? format(new Date(shipment.estimated_delivery), 'PPP') : 'To be confirmed'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Last Updated</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(shipment.updated_at), 'PPP')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Dimensions</p>
              <p className="font-medium">{shipment.dimensions || 'Standard'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(shipment.tracking_number);
              toast({ title: 'Copied', description: 'Tracking number copied to clipboard.' });
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Copy Tracking Number
          </Button>

          <Button variant="outline" onClick={printPage} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>

          <Button variant="outline" onClick={exportJSON} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShipmentDetails;
