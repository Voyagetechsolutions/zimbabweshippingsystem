import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shipment, castToShipments } from '@/types/shipment';
import { PaymentInfo } from '@/types/receipt'; // Corrected import
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatRelativeTime, getStatusBadgeClass } from '@/utils/formatters';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ShipmentExporter } from '@/components/ShipmentExporter';

const CustomerDashboard = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Dashboard | UK to Zimbabwe Shipping';
  }, []);

  useEffect(() => {
    const fetchShipments = async () => {
      setLoading(true);
      try {
        if (!user) {
          setError('Not authenticated');
          return;
        }

        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching shipments:', error);
          setError('Failed to load shipments data');
        } else {
          setShipments(castToShipments(data || []));
        }
      } catch (err) {
        console.error('Error fetching shipments:', err);
        setError('Failed to load shipments data');
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [user]);

  const handleBookShipment = () => {
    navigate('/book-shipment');
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome to Your Dashboard!
          </h1>
          <p className="text-gray-500">
            Track your shipments and manage your account.
          </p>
        </div>
        <ShipmentExporter />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle><Skeleton className="h-5 w-3/4" /></CardTitle>
                  <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : shipments.length > 0 ? (
          shipments.map((shipment) => (
            <Card key={shipment.id} className="bg-white shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-semibold">
                  Tracking Number: {shipment.tracking_number}
                </CardTitle>
                <CardDescription>
                  Updated {formatRelativeTime(shipment.updated_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="text-sm">
                  Origin: {shipment.origin || 'N/A'}
                </div>
                <div className="text-sm">
                  Destination: {shipment.destination || 'N/A'}
                </div>
                <div className="flex items-center">
                  <Badge className={getStatusBadgeClass(shipment.status)}>
                    {shipment.status}
                  </Badge>
                </div>
              </CardContent>
              <div className="p-4 border-t">
                <Link
                  to={`/shipment/${shipment.id}`}
                  className="inline-flex items-center text-blue-600 hover:underline"
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 lg:col-span-3 text-center py-6">
            <h2 className="text-xl font-semibold text-gray-700">
              No shipments found
            </h2>
            <p className="text-gray-500 mt-2">
              Ready to send a package?
            </p>
            <button
              onClick={handleBookShipment}
              className="mt-4 bg-zim-green hover:bg-zim-green/90 text-white font-bold py-2 px-4 rounded"
            >
              Book a Shipment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
