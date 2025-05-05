import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Package, MapPin, Calendar, Truck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { hasShipmentAccess } from '@/utils/supabaseUtils';
import { useNavigate } from 'react-router-dom';
import { Shipment } from '@/types/shipment';
import { castToShipment } from '@/utils/shipmentUtils';

const ShipmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (user && id) {
      checkAccessAndFetchShipment();
    }
  }, [user, id]);

  const checkAccessAndFetchShipment = async () => {
    try {
      setLoading(true);
      const access = await hasShipmentAccess(user?.id);
      setHasAccess(access);
      
      if (!access) {
        setError('You do not have permission to view this shipment.');
        return;
      }

      const fetchShipmentDetails = async () => {
        try {
          const { data, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('id', id)
            .single();
            
          if (error) {
            throw error;
          }
          
          if (data) {
            // Convert to the Shipment type with metadata extracted
            setShipment(castToShipment(data));
          }
        } catch (error: any) {
          console.error('Error fetching shipment details:', error.message);
          setError('Failed to fetch shipment details.');
          toast({
            title: "Error",
            description: "Failed to fetch shipment details",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      fetchShipmentDetails();
    } catch (error: any) {
      console.error('Error checking access:', error.message);
      setError('Failed to check access.');
      toast({
        title: "Error",
        description: "Failed to check access",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => navigate('/track')} className="mt-4">
              Go back to Tracking
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-gray-500">Shipment Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              The shipment with ID {id} could not be found.
            </p>
            <Button onClick={() => navigate('/track')} className="mt-4">
              Go back to Tracking
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center">
                <Package className="h-5 w-5 mr-2 text-zim-green" />
                Shipment Details
              </CardTitle>
              <div className="text-sm text-gray-500">
                Last updated: {new Date(shipment.updated_at).toLocaleString()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-bold text-gray-700">Tracking Number</div>
                <div className="text-md">{shipment.tracking_number}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-700">Status</div>
                <div className="text-md flex items-center">
                  {shipment.status}
                  {shipment.status === 'Delivered' && (
                    <CheckCircle className="h-4 w-4 ml-1 text-green-500" />
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-bold text-gray-700 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Origin
                </div>
                <div className="text-md">{shipment.origin}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-700 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Destination
                </div>
                <div className="text-md">{shipment.destination}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shipment.carrier && (
                <div>
                  <div className="text-sm font-bold text-gray-700 flex items-center">
                    <Truck className="h-4 w-4 mr-1" />
                    Carrier
                  </div>
                  <div className="text-md">{shipment.carrier}</div>
                </div>
              )}
              {shipment.estimated_delivery && (
                <div>
                  <div className="text-sm font-bold text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Estimated Delivery
                  </div>
                  <div className="text-md">
                    {new Date(shipment.estimated_delivery).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
            {shipment.metadata && (
              <div>
                <div className="text-sm font-bold text-gray-700">Metadata</div>
                <div className="text-md">
                  <pre>{JSON.stringify(shipment.metadata, null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ShipmentDetails;
