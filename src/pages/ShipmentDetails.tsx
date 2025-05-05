
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shipment, castToShipment } from '@/types/shipment';
import { Json } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Package, Truck, CalendarDays, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { formatDate, formatRelativeTime, getStatusBadgeClass } from '@/utils/formatters';

const ShipmentDetails = () => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Shipment Details | UK to Zimbabwe Shipping';
  }, []);

  useEffect(() => {
    const fetchShipment = async () => {
      setLoading(true);
      try {
        if (!id) {
          setError('Shipment ID is required');
          return;
        }

        const { data: shipmentData, error: shipmentError } = await supabase
          .from('shipments')
          .select('*')
          .eq('id', id)
          .single();

        if (shipmentError) {
          console.error('Error fetching shipment:', shipmentError);
          setError('Failed to load shipment details');
          return;
        }

        if (!shipmentData) {
          setError('Shipment not found');
          return;
        }

        // Use the castToShipment helper to properly type the shipment data
        setShipment(castToShipment(shipmentData));
      } catch (err) {
        console.error('Error fetching shipment:', err);
        setError('Failed to load shipment details');
      } finally {
        setLoading(false);
      }
    };

    fetchShipment();
  }, [id]);

  // Helper function to safely render metadata fields
  const renderMetadataField = (field: string): React.ReactNode => {
    if (!shipment?.metadata) return 'N/A';
    
    if (typeof shipment.metadata === 'object' && shipment.metadata !== null) {
      // Using type assertion to handle the metadata
      const metadata = shipment.metadata as Record<string, any>;
      if (field in metadata) {
        const value = metadata[field];
        if (typeof value === 'boolean') {
          return value ? 'Yes' : 'No';
        }
        return value?.toString() || 'N/A';
      }
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col">
          <main className="container mx-auto px-4 py-8 flex-grow">
            <div className="rounded-md bg-red-50 p-4">
              <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
              <p className="text-sm text-red-800">{error}</p>
              <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  if (!shipment) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col">
          <main className="container mx-auto px-4 py-8 flex-grow">
            <div className="rounded-md bg-gray-50 p-4">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Shipment Not Found</h2>
              <p className="text-sm text-gray-800">The requested shipment could not be found.</p>
              <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col">
        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card className="bg-white shadow-md rounded-lg">
            <CardHeader className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold">
                Shipment Details
              </CardTitle>
              <CardDescription>
                Tracking Number: {shipment.tracking_number}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Status</span>
                  <Badge className={getStatusBadgeClass(shipment.status)}>
                    {shipment.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Updated {formatRelativeTime(shipment.updated_at)}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Origin</span>
                </div>
                <div className="text-sm text-gray-600">{shipment.origin || 'N/A'}</div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Destination</span>
                </div>
                <div className="text-sm text-gray-600">{shipment.destination || 'N/A'}</div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Created At</span>
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(shipment.created_at)}
                </div>
              </div>
              {shipment.estimated_delivery && (
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Estimated Delivery</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDate(shipment.estimated_delivery)}
                  </div>
                </div>
              )}
              {shipment.carrier && (
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Carrier</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {shipment.carrier}
                  </div>
                </div>
              )}
              {shipment.weight && (
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Weight</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {shipment.weight}
                  </div>
                </div>
              )}
              {shipment.dimensions && (
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Dimensions</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {shipment.dimensions}
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Door to Door</span>
                </div>
                <div className="text-sm text-gray-600">
                  {renderMetadataField('doorToDoor')}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Amount Paid</span>
                </div>
                <div className="text-sm text-gray-600">
                  {renderMetadataField('amountPaid')}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Pickup Country</span>
                </div>
                <div className="text-sm text-gray-600">
                  {renderMetadataField('pickupCountry')}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Shipment Type</span>
                </div>
                <div className="text-sm text-gray-600">
                  {renderMetadataField('shipmentType')}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Can Cancel</span>
                </div>
                <div className="text-sm text-gray-600">
                  {shipment.can_cancel ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Can Modify</span>
                </div>
                <div className="text-sm text-gray-600">
                  {shipment.can_modify ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ShipmentDetails;
