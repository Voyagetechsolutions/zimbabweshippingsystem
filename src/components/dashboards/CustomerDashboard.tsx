import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RecentShipments } from '@/components/customer/RecentShipments';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Package, Truck, MapPin, AlertTriangle, Calendar, ChevronRight, Download, Inbox } from 'lucide-react';
import ShipmentExporter from '@/components/ShipmentExporter';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedShipments, setSelectedShipments] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Fetch user's shipments
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['customerShipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Handle checkbox selection
  const handleSelectShipment = (shipmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedShipments(prev => [...prev, shipmentId]);
    } else {
      setSelectedShipments(prev => prev.filter(id => id !== shipmentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked && shipments) {
      setSelectedShipments(shipments.map(s => s.id));
    } else {
      setSelectedShipments([]);
    }
  };

  // Format status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{status}</Badge>;
      case 'in transit':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{status}</Badge>;
      case 'delayed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Announcements - temporarily disabled */}
      {/* <AnnouncementsFeed /> */}
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Book a Shipment</CardTitle>
            <CardDescription>Create a new shipping request</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Start a new shipping request from UK to Zimbabwe with our easy booking process.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/book-shipment">
                Book Now <Package className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Track Packages</CardTitle>
            <CardDescription>Check your shipment status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Enter your tracking number to get real-time updates on your shipment's location.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link to="/track">
                Track Now <Truck className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Address Book</CardTitle>
            <CardDescription>Manage your delivery addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              View and update your saved addresses for faster checkout in the future.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link to="/address-book">
                Manage Addresses <MapPin className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Shipments Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All Shipments</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>
          
          {/* Export functionality */}
          {selectedShipments.length > 0 ? (
            <ShipmentExporter shipmentIds={selectedShipments} />
          ) : (
            <ShipmentExporter all={false} />
          )}
        </div>
        
        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Your Shipments</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="select-all" 
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm">Select All</label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : shipments && shipments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Origin</TableHead>
                      <TableHead className="hidden md:table-cell">Destination</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedShipments.includes(shipment.id)}
                            onCheckedChange={(checked) => 
                              handleSelectShipment(shipment.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                        <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">{shipment.origin}</TableCell>
                        <TableCell className="hidden md:table-cell">{shipment.destination}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {shipment.created_at ? format(new Date(shipment.created_at), 'MMM d, yyyy') : ''}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Link to={`/shipment/${shipment.id}`}>
                              <span className="sr-only">View details</span>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No shipments found</h3>
                  <p className="text-gray-500 mt-2">
                    You don't have any shipments yet. Start by booking a new shipment.
                  </p>
                  <Button asChild className="mt-4">
                    <Link to="/book-shipment">Book a Shipment</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Active Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : shipments && shipments.filter(s => 
                ['processing', 'in transit', 'delayed'].includes(s.status.toLowerCase())
              ).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Destination</TableHead>
                      <TableHead className="hidden lg:table-cell">Est. Delivery</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments
                      .filter(s => ['processing', 'in transit', 'delayed'].includes(s.status.toLowerCase()))
                      .map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedShipments.includes(shipment.id)}
                              onCheckedChange={(checked) => 
                                handleSelectShipment(shipment.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                          <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                          <TableCell className="hidden md:table-cell">{shipment.destination}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {shipment.estimated_delivery 
                              ? format(new Date(shipment.estimated_delivery), 'MMM d, yyyy') 
                              : 'TBD'}
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Link to={`/shipment/${shipment.id}`}>
                                <span className="sr-only">View details</span>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No active shipments</h3>
                  <p className="text-gray-500 mt-2">
                    You don't have any active shipments at the moment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="delivered" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Delivered Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : shipments && shipments.filter(s => s.status.toLowerCase() === 'delivered').length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Tracking #</TableHead>
                      <TableHead className="hidden md:table-cell">Origin</TableHead>
                      <TableHead className="hidden md:table-cell">Destination</TableHead>
                      <TableHead className="hidden lg:table-cell">Delivered Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments
                      .filter(s => s.status.toLowerCase() === 'delivered')
                      .map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedShipments.includes(shipment.id)}
                              onCheckedChange={(checked) => 
                                handleSelectShipment(shipment.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                          <TableCell className="hidden md:table-cell">{shipment.origin}</TableCell>
                          <TableCell className="hidden md:table-cell">{shipment.destination}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {shipment.estimated_delivery 
                              ? format(new Date(shipment.estimated_delivery), 'MMM d, yyyy') 
                              : format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Link to={`/shipment/${shipment.id}`}>
                                <span className="sr-only">View details</span>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No delivered shipments</h3>
                  <p className="text-gray-500 mt-2">
                    You don't have any delivered shipments yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerDashboard;
