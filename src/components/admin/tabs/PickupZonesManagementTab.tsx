import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { Shipment } from '@/types/shipment';

// UI Components
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import { 
  MapPin, 
  Package, 
  Calendar, 
  Truck, 
  User,
  Search,
  MoreHorizontal,
  FileDown,
  Eye,
  Route,
  RefreshCw,
  Loader2
} from 'lucide-react';

// Interfaces
interface RouteSchedule {
  id: string;
  route: string;
  areas: string[];
  pickup_date: string;
  created_at: string;
  updated_at: string;
}

const PickupZonesManagementTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteSchedule[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewShipment, setViewShipment] = useState<Shipment | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // First fetch routes/schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (schedulesError) throw schedulesError;
      
      setRoutes(schedulesData || []);
      
      // Then fetch shipments
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['Booking Confirmed', 'Ready for Pickup'])
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      // Now fetch profile data for each shipment
      const enhancedShipments = await Promise.all(
        (shipmentsData || []).map(async (shipment) => {
          let profileData = undefined;
          
          if (shipment.user_id) {
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', shipment.user_id)
              .single();
              
            if (!userError && userData) {
              profileData = userData;
            }
          }
          
          return {
            ...shipment,
            profiles: profileData
          } as Shipment;
        })
      );
      
      setShipments(enhancedShipments);
      
      console.log('Schedules fetched:', schedulesData);
      console.log('Shipments fetched:', enhancedShipments);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load zone and shipment data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Filter shipments by route and search query
  const filteredShipments = shipments.filter(shipment => {
    const metadata = shipment.metadata || {};
    
    // Get collection data from appropriate location in metadata
    const collection = metadata.collection || metadata.collectionDetails || {};
    const route = collection.route || '';
    
    // Check if route matches selected route (if any)
    const routeMatches = !selectedRoute || route.toLowerCase() === selectedRoute.toLowerCase();
    
    // Check if matches search query
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      shipment.tracking_number.toLowerCase().includes(searchLower) ||
      (shipment.profiles?.full_name && shipment.profiles.full_name.toLowerCase().includes(searchLower)) ||
      (shipment.profiles?.email && shipment.profiles.email.toLowerCase().includes(searchLower)) ||
      route.toLowerCase().includes(searchLower);
    
    return routeMatches && matchesSearch;
  });
  
  // Group shipments by route
  const shipmentsByRoute: Record<string, Shipment[]> = {};
  
  filteredShipments.forEach(shipment => {
    const metadata = shipment.metadata || {};
    const collection = metadata.collection || metadata.collectionDetails || {};
    const route = collection.route || 'Unassigned';
    
    if (!shipmentsByRoute[route]) {
      shipmentsByRoute[route] = [];
    }
    shipmentsByRoute[route].push(shipment);
  });
  
  // Get count of shipments with drums
  const getDrumCount = (shipments: Shipment[]): number => {
    return shipments.reduce((total, shipment) => {
      const metadata = shipment.metadata || {};
      const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
      
      if (shipmentDetails.type === 'Drums' || shipmentDetails.includeDrums) {
        const quantity = parseInt(String(shipmentDetails.quantity)) || 1;
        return total + quantity;
      }
      return total;
    }, 0);
  };
  
  // Export shipments for selected route
  const exportShipments = () => {
    if (!selectedRoute && Object.keys(shipmentsByRoute).length === 0) {
      toast({
        title: 'Export Failed',
        description: 'No shipments available to export',
        variant: 'destructive',
      });
      return;
    }
    
    const shipmentsToExport = selectedRoute ? 
      shipmentsByRoute[selectedRoute] || [] : 
      filteredShipments;
    
    if (shipmentsToExport.length === 0) {
      toast({
        title: 'Export Failed',
        description: 'No shipments available for the selected route',
        variant: 'destructive',
      });
      return;
    }
    
    // Format data for export
    const exportData = shipmentsToExport.map(shipment => {
      const metadata = shipment.metadata || {};
      const sender = metadata.sender || metadata.senderDetails || {};
      const recipient = metadata.recipient || metadata.recipientDetails || {};
      const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
      const collection = metadata.collection || metadata.collectionDetails || {};
      
      return {
        'Tracking Number': shipment.tracking_number,
        'Status': shipment.status,
        'Customer': shipment.profiles?.full_name || shipment.profiles?.email || 'Unknown',
        'Sender Name': sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'N/A',
        'Sender Phone': sender.phone || 'N/A',
        'Sender Address': sender.address || 'N/A',
        'Recipient Name': recipient.name || `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || 'N/A',
        'Recipient Phone': recipient.phone || 'N/A',
        'Route': collection.route || 'Unassigned',
        'Pickup Date': collection.date || 'Not scheduled',
        'Shipment Type': shipmentDetails.type || 'N/A',
        'Quantity': shipmentDetails.quantity || 'N/A',
        'Description': shipmentDetails.description || 'N/A'
      };
    });
    
    // Convert to CSV
    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => 
          JSON.stringify(row[header as keyof typeof row] || '')
        ).join(',')
      )
    ];
    const csvString = csvRows.join('\n');
    
    // Create download
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `shipments_${selectedRoute || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: 'Export Successful',
      description: `${exportData.length} shipments exported to CSV`,
    });
  };
  
  const formatPickupDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return isValid(date) ? format(date, 'MMM d, yyyy') : dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pickup Zones & Collection</CardTitle>
          <CardDescription>
            Manage shipments by collection routes and zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by tracking #, customer or route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-4">
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Routes</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.route}>
                      {route.route}
                    </SelectItem>
                  ))}
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button 
                variant="default" 
                onClick={exportShipments}
                disabled={filteredShipments.length === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-10">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No shipments found for collection</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery || selectedRoute ? "Try adjusting your filters" : "There are no shipments ready for pickup"}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Route Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(shipmentsByRoute).map(([route, shipments]) => {
                  // Get the route schedule if it exists
                  const routeSchedule = routes.find(r => r.route === route);
                  const pickupDate = routeSchedule?.pickup_date 
                    ? formatPickupDate(routeSchedule.pickup_date)
                    : 'Not scheduled';
                  
                  return (
                    <div 
                      key={route} 
                      className={`border rounded-lg shadow-sm p-4 ${selectedRoute === route ? 'bg-blue-50 border-blue-300' : ''}`}
                      onClick={() => setSelectedRoute(route === selectedRoute ? '' : route)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <Route className="h-5 w-5 mr-2 text-blue-600" />
                          <h3 className="font-medium text-lg">{route}</h3>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 border">
                          {shipments.length} Shipment{shipments.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between text-sm border-t pt-2 mt-2">
                        <div>
                          <div className="flex items-center mb-1">
                            <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                            <span className="text-gray-600">Pickup: {pickupDate}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                            <span className="text-gray-600">Areas: {routeSchedule?.areas?.length || 0}</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center mb-1">
                            <Package className="h-4 w-4 mr-1 text-gray-500" />
                            <span className="text-gray-600">Drums: {getDrumCount(shipments)}</span>
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-gray-500" />
                            <span className="text-gray-600">Customers: {new Set(shipments.map(s => s.user_id)).size}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoute(route === selectedRoute ? '' : route);
                        }}
                      >
                        {selectedRoute === route ? 'Hide Details' : 'View Details'}
                      </Button>
                    </div>
                  );
                })}
              </div>
              
              {/* Selected Route Details */}
              {selectedRoute && shipmentsByRoute[selectedRoute] && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      <div className="flex items-center">
                        <Route className="h-5 w-5 mr-2" />
                        {selectedRoute} Shipments
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {shipmentsByRoute[selectedRoute].length} shipments ready for collection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tracking #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Pickup Address</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Drums</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shipmentsByRoute[selectedRoute].map((shipment) => {
                            const metadata = shipment.metadata || {};
                            const sender = metadata.sender || metadata.senderDetails || {};
                            const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
                            
                            const hasDrums = shipmentDetails.type === 'Drums' || shipmentDetails.includeDrums;
                            const drumCount = hasDrums ? (parseInt(String(shipmentDetails.quantity)) || 1) : 0;
                            
                            return (
                              <TableRow key={shipment.id}>
                                <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                                <TableCell>{shipment.profiles?.full_name || shipment.profiles?.email || "Unknown"}</TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {sender.address || "No address provided"}
                                </TableCell>
                                <TableCell>{shipmentDetails.type || "General"}</TableCell>
                                <TableCell>
                                  {hasDrums ? (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                      {drumCount}
                                    </Badge>
                                  ) : (
                                    "None"
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={shipment.status === 'Ready for Pickup' ? 
                                    'bg-green-100 text-green-800 border border-green-300' : 
                                    'bg-blue-100 text-blue-800 border border-blue-300'}>
                                    {shipment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Actions</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => setViewShipment(shipment)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem>
                                        <Truck className="h-4 w-4 mr-2" />
                                        Mark as Collected
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* View Shipment Details Dialog */}
      {viewShipment && (
        <Dialog open={!!viewShipment} onOpenChange={(open) => !open && setViewShipment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Shipment Details</DialogTitle>
              <DialogDescription>
                Tracking Number: {viewShipment.tracking_number}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Shipment details content goes here */}
              {/* Similar to what we have in the ShipmentManagementTab */}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewShipment(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PickupZonesManagementTab;
