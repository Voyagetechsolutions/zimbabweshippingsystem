
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, MapPin, Calendar, Eye } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import NotificationsPanel from '@/components/NotificationsPanel';
import PaymentHistorySection from '@/components/PaymentHistorySection';
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

const getStatusBadgeClass = (status: string) => {
  const statusLower = status.toLowerCase();

  switch (true) {
    case statusLower.includes('processing'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('transit'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('delivered'):
      return 'bg-green-100 text-green-800 border-green-300';
    case statusLower.includes('cancelled'):
      return 'bg-red-100 text-red-800 border-red-300';
    case statusLower.includes('delayed'):
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-500';
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchShipments = async () => {
      setLoading(true);
      try {
        if (!user) return;

        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          setShipments(data as unknown as Shipment[]);
        }
      } catch (error: any) {
        toast({
          title: 'Error fetching shipments',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [user, toast, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar>
        <NotificationsPanel />
      </Navbar>
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="bg-zim-green/10 p-3 rounded-full">
                  <Package className="h-6 w-6 text-zim-green" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Your Shipments</CardTitle>
                  <CardDescription>Track and manage your shipments</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {shipments.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No shipments found. <Link to="/create-shipment" className="text-zim-green hover:underline">Create a new shipment</Link>.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Est. Delivery</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.map((shipment) => (
                        <TableRow key={shipment.id} className="hover:bg-gray-50">
                          <TableCell className="px-4 py-2 border-b font-mono">{shipment.tracking_number}</TableCell>
                          <TableCell className="px-4 py-2 border-b">{shipment.origin}</TableCell>
                          <TableCell className="px-4 py-2 border-b">{shipment.destination}</TableCell>
                          <TableCell className="px-4 py-2 border-b">
                            <Badge className={getStatusBadgeClass(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-2 border-b">
                            {shipment.estimated_delivery && format(new Date(shipment.estimated_delivery), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="px-4 py-2 border-b flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => navigate(`/shipment/${shipment.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {(shipment.can_modify || shipment.can_cancel) && (
                              <ShipmentActions 
                                shipmentId={shipment.id}
                                canModify={shipment.can_modify}
                                canCancel={shipment.can_cancel}
                                onActionComplete={handleRefresh}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          <PaymentHistorySection />
          
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="bg-zim-green/10 p-3 rounded-full">
                  <Truck className="h-6 w-6 text-zim-green" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
                  <CardDescription>Manage your shipping tasks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={() => navigate('/create-shipment')} className="bg-zim-green hover:bg-zim-green/90">
                Create New Shipment
              </Button>
              <Button variant="outline" onClick={() => navigate('/track')}>
                Track a Shipment
              </Button>
              <Button variant="outline" onClick={() => navigate('/address-book')}>
                <MapPin className="mr-1 h-4 w-4" />
                Manage Addresses
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Dashboard;
