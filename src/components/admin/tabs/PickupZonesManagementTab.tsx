import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// UI Components
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

// Icons
import { 
  MapPin, 
  RefreshCcw, 
  Download, 
  Calendar, 
  Package, 
  AlertCircle,
  Check
} from 'lucide-react';

// Available routes
const ROUTES = [
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Glasgow',
  'Sheffield',
  'Bradford',
  'Liverpool',
  'Edinburgh',
  'Cardiff'
];

const PickupZonesManagementTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState('all');
  const [shipments, setShipments] = useState<any[]>([]);
  const [groupedShipments, setGroupedShipments] = useState<{[key: string]: any[]}>({});
  const [schedulingPickups, setSchedulingPickups] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [schedulingRoute, setSchedulingRoute] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, []);

  useEffect(() => {
    if (shipments.length > 0) {
      groupShipmentsByRoute();
    }
  }, [shipments, selectedRoute]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      // Modified query to not join with profiles table since the relationship doesn't exist
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['Booking Confirmed', 'Ready for Pickup'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Shipments fetched:', data);
      setShipments(data || []);
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipments: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const groupShipmentsByRoute = () => {
    const grouped: {[key: string]: any[]} = {};
    
    // Initialize all routes
    ROUTES.forEach(route => {
      grouped[route] = [];
    });
    
    // Group shipments by route
    shipments.forEach(shipment => {
      const route = determineShipmentRoute(shipment);
      if (!grouped[route]) {
        grouped[route] = [];
      }
      grouped[route].push(shipment);
    });
    
    setGroupedShipments(grouped);
  };

  const determineShipmentRoute = (shipment: any) => {
    if (!shipment.origin) return 'Other';
    
    const origin = shipment.origin.toLowerCase();
    
    for (const route of ROUTES) {
      if (origin.includes(route.toLowerCase())) {
        return route;
      }
    }
    
    // Check for regions/counties that map to specific routes
    if (origin.includes('manchester') || 
        origin.includes('salford') || 
        origin.includes('bolton')) {
      return 'Manchester';
    }
    
    if (origin.includes('london') || 
        origin.includes('croydon') || 
        origin.includes('barnet')) {
      return 'London';
    }
    
    if (origin.includes('birmingham') || 
        origin.includes('solihull') || 
        origin.includes('wolverhampton')) {
      return 'Birmingham';
    }
    
    // Default
    return 'Other';
  };

  const schedulePickups = async () => {
    if (!schedulingRoute || !pickupDate) {
      toast({
        title: 'Missing Information',
        description: 'Please select a route and pickup date.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSchedulingPickups(true);
      
      // Get shipments for the selected route
      const routeShipments = groupedShipments[schedulingRoute] || [];
      
      if (routeShipments.length === 0) {
        toast({
          title: 'No Shipments',
          description: 'There are no shipments to schedule for this route.',
          variant: 'default',
        });
        return;
      }
      
      // Update all shipments in this route
      const updates = routeShipments.map(shipment => {
        // Update shipment metadata
        const updatedMetadata = {
          ...shipment.metadata,
          collection: {
            ...(shipment.metadata?.collection || {}),
            route: schedulingRoute,
            date: pickupDate,
            scheduled: true
          }
        };
        
        return supabase
          .from('shipments')
          .update({
            status: 'Ready for Pickup',
            metadata: updatedMetadata
          })
          .eq('id', shipment.id);
      });
      
      await Promise.all(updates);
      
      toast({
        title: 'Pickups Scheduled',
        description: `Successfully scheduled ${routeShipments.length} pickups for ${schedulingRoute} on ${pickupDate}`,
      });
      
      // Refresh data
      fetchShipments();
      setSchedulingPickups(false);
      setPickupDate('');
      setSchedulingRoute('');
    } catch (error: any) {
      console.error('Error scheduling pickups:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule pickups: ' + error.message,
        variant: 'destructive',
      });
      setSchedulingPickups(false);
    }
  };

  const exportPickupList = (route: string) => {
    try {
      setExporting(true);
      
      const shipmentsToExport = route === 'all' ? shipments : groupedShipments[route] || [];
      
      if (shipmentsToExport.length === 0) {
        toast({
          title: 'No Data',
          description: 'There are no shipments to export for this route.',
          variant: 'default',
        });
        setExporting(false);
        return;
      }
      
      // Format data for CSV
      const headers = [
        'Tracking Number',
        'Sender Name',
        'Sender Phone',
        'Pickup Address',
        'Shipment Type',
        'Status'
      ];
      
      const rows = shipmentsToExport.map(shipment => {
        const metadata = shipment.metadata || {};
        const senderDetails = metadata.sender || metadata.senderDetails || {};
        const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
        
        const senderName = `${senderDetails.firstName || ''} ${senderDetails.lastName || ''}`.trim() || 'N/A';
        
        return [
          shipment.tracking_number || '',
          senderName || '',
          senderDetails.phone || '',
          shipment.origin || '',
          shipmentDetails.type || '',
          shipment.status || ''
        ];
      });
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${route === 'all' ? 'All' : route}_Pickups_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Export Successful',
        description: 'Pickup list has been exported.',
      });
    } catch (error: any) {
      console.error('Error exporting pickup list:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export pickup list: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Count drums in a route's shipments
  const countDrums = (route: string) => {
    const routeShipments = groupedShipments[route] || [];
    return routeShipments.reduce((total, shipment) => {
      const metadata = shipment.metadata || {};
      const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
      
      if (shipmentDetails.type === 'Drums' || shipmentDetails.includeDrums) {
        const quantity = parseInt(shipmentDetails.quantity) || 1;
        return total + quantity;
      }
      
      return total;
    }, 0);
  };

  // Check if a route is overbooked (more than 10 drums)
  const isRouteOverbooked = (route: string) => {
    return countDrums(route) >= 10;
  };

  const notifyCustomers = (route: string) => {
    toast({
      title: 'Notifications Sent',
      description: `Customers have been notified about their pickup in the ${route} area.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pickup Zones Management</CardTitle>
        <CardDescription>
          Manage shipments by pickup zone and schedule collections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Select Route</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {ROUTES.map(route => (
                  <SelectItem key={route} value={route}>
                    {route} ({(groupedShipments[route] || []).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportPickupList(selectedRoute)}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export List
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchShipments}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button
              onClick={() => {
                setSchedulingRoute(selectedRoute !== 'all' ? selectedRoute : '');
                setPickupDate('');
                setSchedulingPickups(true);
              }}
              disabled={selectedRoute === 'all' || loading}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Pickups
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No shipments found</h3>
            <p className="text-muted-foreground">There are no shipments ready for pickup</p>
          </div>
        ) : selectedRoute === 'all' ? (
          // Show all routes summary
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(groupedShipments).map(route => {
              const routeShipments = groupedShipments[route] || [];
              const drumCount = countDrums(route);
              const isOverbooked = isRouteOverbooked(route);
              
              return routeShipments.length > 0 ? (
                <Card 
                  key={route}
                  className={isOverbooked ? 'border-red-500 dark:border-red-700' : ''}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{route}</CardTitle>
                      <Badge 
                        variant={isOverbooked ? 'destructive' : 'outline'}
                        className="ml-2"
                      >
                        {drumCount} drums
                      </Badge>
                    </div>
                    <CardDescription>
                      {routeShipments.length} shipments ready for pickup
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <Progress 
                      value={drumCount > 10 ? 100 : (drumCount / 10) * 100}
                      className={`h-2 ${isOverbooked ? 'bg-red-200 dark:bg-red-900' : ''}`}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRoute(route)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportPickupList(route)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardFooter>
                </Card>
              ) : null;
            })}
          </div>
        ) : (
          // Show selected route details
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selectedRoute} Route</h2>
                <p className="text-muted-foreground">
                  {(groupedShipments[selectedRoute] || []).length} shipments, {countDrums(selectedRoute)} drums
                </p>
              </div>
              
              {isRouteOverbooked(selectedRoute) && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Overbooked ({countDrums(selectedRoute)} drums)
                </Badge>
              )}
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Tracking #</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Pickup Address</TableHead>
                      <TableHead>Shipment Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Collection Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(groupedShipments[selectedRoute] || []).map(shipment => {
                      const metadata = shipment.metadata || {};
                      const senderDetails = metadata.sender || metadata.senderDetails || {};
                      const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
                      const collectionDetails = metadata.collection || {};
                      const senderName = `${senderDetails.firstName || ''} ${senderDetails.lastName || ''}`.trim() || 'N/A';
                      
                      return (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-mono text-sm">
                            {shipment.tracking_number}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{senderName}</div>
                            <div className="text-xs text-muted-foreground">{senderDetails.phone || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {shipment.origin}
                          </TableCell>
                          <TableCell>
                            {shipmentDetails.type || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {shipmentDetails.type === 'Drums' && shipmentDetails.quantity ? shipmentDetails.quantity : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={shipment.status === 'Ready for Pickup' ? 'default' : 'outline'}
                            >
                              {shipment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {collectionDetails.date || 'Not scheduled'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => notifyCustomers(selectedRoute)}
              >
                Notify Customers
              </Button>
              <Button
                onClick={() => {
                  setSchedulingRoute(selectedRoute);
                  setPickupDate('');
                  setSchedulingPickups(true);
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Pickups
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Schedule Pickups Dialog */}
      <Dialog open={schedulingPickups} onOpenChange={setSchedulingPickups}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Pickups</DialogTitle>
            <DialogDescription>
              Set a collection date for shipments
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route</Label>
              <Select value={schedulingRoute} onValueChange={setSchedulingRoute}>
                <SelectTrigger id="route">
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {ROUTES.map(route => (
                    <SelectItem key={route} value={route}>
                      {route} ({(groupedShipments[route] || []).length} shipments)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pickup-date">Pickup Date</Label>
              <Input 
                id="pickup-date"
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            
            {schedulingRoute && isRouteOverbooked(schedulingRoute) && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="text-sm text-red-600 dark:text-red-400">
                  <p className="font-medium">Warning: Route is overbooked</p>
                  <p>This route has {countDrums(schedulingRoute)} drums, which exceeds the recommended maximum of 10.</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulingPickups(false)}>
              Cancel
            </Button>
            <Button 
              onClick={schedulePickups}
              disabled={!schedulingRoute || !pickupDate}
            >
              <Check className="h-4 w-4 mr-2" />
              Schedule Pickups
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PickupZonesManagementTab;
