
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Calendar, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ShipmentStatus } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';

const LogisticsDashboard = () => {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    booked: 0,
    inTransit: 0,
    delivered: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setShipments(data || []);
      
      // Compute stats
      if (data) {
        const totalCount = data.length;
        const bookedCount = data.filter(s => s.status === 'Booked' || s.status === 'Paid').length;
        const inTransitCount = data.filter(s => s.status === 'In Transit').length;
        const deliveredCount = data.filter(s => s.status === 'Delivered').length;
        
        setStats({
          total: totalCount,
          booked: bookedCount,
          inTransit: inTransitCount,
          delivered: deliveredCount
        });
      }
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error fetching shipments',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'Booked':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Booked</Badge>;
      case 'Paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case 'Processing':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Processing</Badge>;
      case 'In Transit':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">In Transit</Badge>;
      case 'Delivered':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
      case 'Cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate the percentage of shipping capacity utilized based on in-transit shipments
  const capacityUtilized = stats.inTransit > 0 ? Math.min(Math.round((stats.inTransit / (stats.inTransit + stats.booked)) * 100), 100) : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Shipments
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground">
              Shipments in transit
            </p>
            <div className="mt-4">
              <Progress value={capacityUtilized} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {capacityUtilized}% of shipping capacity utilized
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Shipments
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.booked}</div>
            <p className="text-xs text-muted-foreground">
              Waiting to be dispatched
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Deliveries
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered packages
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="shipments">
        <TabsList>
          <TabsTrigger value="shipments">Recent Shipments</TabsTrigger>
          <TabsTrigger value="schedule">Collection Schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="shipments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Latest Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : shipments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Tracking</th>
                        <th className="text-left py-3 px-2">Origin</th>
                        <th className="text-left py-3 px-2">Destination</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.map((shipment) => (
                        <tr key={shipment.id} className="border-b">
                          <td className="py-3 px-2">{shipment.tracking_number}</td>
                          <td className="py-3 px-2 max-w-[150px] truncate">{shipment.origin}</td>
                          <td className="py-3 px-2 max-w-[150px] truncate">{shipment.destination}</td>
                          <td className="py-3 px-2">{getStatusBadge(shipment.status)}</td>
                          <td className="py-3 px-2">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No shipments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Collection Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center p-4 border rounded-md">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 mr-4">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">UK Northampton Collection</h3>
                      <p className="text-sm text-gray-500">Every Monday & Thursday</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      View Areas
                    </Button>
                  </div>

                  <div className="flex items-center p-4 border rounded-md">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 mr-4">
                      <Truck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">UK to Zimbabwe Dispatch</h3>
                      <p className="text-sm text-gray-500">Every other Friday</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      View Schedule
                    </Button>
                  </div>

                  <div className="flex items-center p-4 border rounded-md">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100 mr-4">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Zimbabwe Deliveries</h3>
                      <p className="text-sm text-gray-500">Starts 4-5 weeks after dispatch</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      View Areas
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogisticsDashboard;
