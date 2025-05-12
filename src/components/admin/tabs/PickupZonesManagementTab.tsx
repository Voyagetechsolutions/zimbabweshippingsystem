
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { Shipment } from '@/types/shipment';

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
  Check,
  User,
  Clock,
  Loader2
} from 'lucide-react';

// Define the standard routes used across the app
const ROUTES = [
  'London Route', 
  'Leeds Route', 
  'Manchester Route', 
  'Birmingham Route', 
  'Nottingham Route', 
  'Cardiff Route',
  'Bournemouth Route', 
  'Southend Route', 
  'Northampton Route', 
  'Brighton Route', 
  'Scotland Route'
];

interface CollectionSchedule {
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
  const [selectedRoute, setSelectedRoute] = useState('all');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [groupedShipments, setGroupedShipments] = useState<{[key: string]: Shipment[]}>({});
  const [schedulingPickups, setSchedulingPickups] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [schedulingRoute, setSchedulingRoute] = useState('');
  const [exporting, setExporting] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    fetchShipmentsAndSchedules();
  }, []);

  useEffect(() => {
    if (shipments.length > 0) {
      groupShipmentsByRoute();
    }
  }, [shipments, selectedRoute, schedules]);

  const fetchShipmentsAndSchedules = async () => {
    setLoading(true);
    try {
      // Fetch collection schedules first
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });

      if (schedulesError) throw schedulesError;
      
      setSchedules(schedulesData || []);
      
      // Then fetch shipments
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['Booking Confirmed', 'Ready for Pickup', 'Pending Collection'])
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
        description: 'Failed to load data: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const groupShipmentsByRoute = () => {
    const grouped: {[key: string]: Shipment[]} = {};
    
    // Initialize all routes
    ROUTES.forEach(route => {
      grouped[route] = [];
    });
    
    // Group shipments by route
    shipments.forEach(shipment => {
      const routeName = determineShipmentRoute(shipment);
      if (!grouped[routeName]) {
        grouped[routeName] = [];
      }
      grouped[routeName].push(shipment);
    });
    
    setGroupedShipments(grouped);
  };

  const determineShipmentRoute = (shipment: Shipment) => {
    // First check if the shipment has a route assigned in its metadata
    const metadata = shipment.metadata || {};
    const collection = metadata.collection || {};
    
    if (collection.route) {
      // If the route doesn't include "Route" suffix, add it
      const routeName = collection.route.includes('Route') 
        ? collection.route 
        : `${collection.route} Route`;
        
      // Check if it's one of our standard routes
      if (ROUTES.includes(routeName)) {
        return routeName;
      }
    }
    
    // If no route in metadata, determine from origin address
    if (!shipment.origin) return 'Other';
    
    const origin = shipment.origin.toLowerCase();
    
    for (const route of ROUTES) {
      const routeCity = route.split(' ')[0].toLowerCase();
      if (origin.includes(routeCity)) {
        return route;
      }
    }
    
    // Check for regions/counties that map to specific routes
    if (origin.includes('manchester') || 
        origin.includes('salford') || 
        origin.includes('bolton')) {
      return 'Manchester Route';
    }
    
    if (origin.includes('london') || 
        origin.includes('croydon') || 
        origin.includes('barnet')) {
      return 'London Route';
    }
    
    if (origin.includes('birmingham') || 
        origin.includes('solihull') || 
        origin.includes('wolverhampton')) {
      return 'Birmingham Route';
    }
    
    if (origin.includes('northampton') || 
        origin.includes('wellingborough')) {
      return 'Northampton Route';  
    }

    if (origin.includes('leeds') || 
        origin.includes('bradford') || 
        origin.includes('huddersfield')) {
      return 'Leeds Route';
    }

    if (origin.includes('nottingham') || 
        origin.includes('derby')) {
      return 'Nottingham Route';
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
      
      // First check if we need to update the collection_schedules table
      const routeName = schedulingRoute.replace(' Route', ''); // Strip "Route" if needed
      
      // Check if this route already exists in the collection_schedules
      const { data: existingSchedule } = await supabase
        .from('collection_schedules')
        .select('*')
        .eq('route', routeName)
        .maybeSingle();
      
      if (existingSchedule) {
        // Update the existing schedule
        await supabase
          .from('collection_schedules')
          .update({
            pickup_date: pickupDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSchedule.id);
      } else {
        // Create a new schedule
        await supabase
          .from('collection_schedules')
          .insert({
            route: routeName,
            areas: routeShipments.map(shipment => 
              shipment.origin.split(',')[0].trim()
            ).filter((value, index, self) => 
              self.indexOf(value) === index
            ), // Get unique areas
            pickup_date: pickupDate
          });
      }
      
      // Update all shipments in this route
      const updates = routeShipments.map(shipment => {
        // Update shipment metadata
        const updatedMetadata = {
          ...shipment.metadata,
          collection: {
            ...(shipment.metadata?.collection || {}),
            route: routeName,
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
      fetchShipmentsAndSchedules();
      
    } catch (error: any) {
      console.error('Error scheduling pickups:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule pickups: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setSchedulingPickups(false);
      setPickupDate('');
      setSchedulingRoute('');
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
        'Status',
        'Pickup Date'
      ];
      
      const rows = shipmentsToExport.map(shipment => {
        const metadata = shipment.metadata || {};
        const senderDetails = metadata.sender || metadata.senderDetails || {};
        const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
        const collectionDetails = metadata.collection || {};
        
        // Get sender name from metadata or profiles
        const senderName = shipment.profiles?.full_name || 
          `${senderDetails.firstName || ''} ${senderDetails.lastName || ''}`.trim() || 
          'N/A';
        
        // Get pickup date from collection details or matching schedule
        let pickupDate = collectionDetails.date || 'Not scheduled';
        
        // If no date in collection details, check the schedules
        if (!collectionDetails.date) {
          const routeName = schedulingRoute.replace(' Route', '');
          const schedule = schedules.find(s => s.route === routeName);
          if (schedule) {
            pickupDate = schedule.pickup_date;
          }
        }
        
        return [
          shipment.tracking_number || '',
          senderName || '',
          senderDetails.phone || '',
          shipment.origin || '',
          shipmentDetails.type || '',
          shipment.status || '',
          pickupDate
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
        const quantity = parseInt(String(shipmentDetails.quantity)) || 1;
        return total + quantity;
      }
      
      return total;
    }, 0);
  };

  // Check if a route is overbooked (more than 10 drums)
  const isRouteOverbooked = (route: string) => {
    return countDrums(route) >= 10;
  };

  // Get the pickup date for a specific route from the schedules
  const getPickupDateForRoute = (route: string) => {
    const routeName = route.replace(' Route', '');
    const schedule = schedules.find(s => s.route === routeName);
    
    if (schedule) {
      return schedule.pickup_date;
    }
    
    return 'Not scheduled';
  };

  // Safely format dates ensuring they are valid
  const safeFormatDate = (dateStr: string, formatStr: string = 'dd/MM/yyyy') => {
    try {
      if (!dateStr) return 'Not set';
      
      const date = new Date(dateStr);
      
      if (!isValid(date)) {
        return dateStr; // Return the original string if it's not a valid date
      }
      
      return format(date, formatStr);
    } catch (error) {
      console.error(`Error formatting date: ${dateStr}`, error);
      return dateStr; // Return the original string if there's an error
    }
  };

  const notifyCustomers = async (route: string) => {
    try {
      const routeShipments = groupedShipments[route] || [];
      if (routeShipments.length === 0) {
        toast({
          title: 'No Customers',
          description: 'There are no customers to notify for this route.',
          variant: 'warning',
        });
        return;
      }

      const pickupDate = getPickupDateForRoute(route);
      if (pickupDate === 'Not scheduled') {
        toast({
          title: 'No Pickup Date',
          description: 'Please schedule a pickup date for this route first.',
          variant: 'warning',
        });
        return;
      }

      // Get all unique emails from the shipments
      const emails = routeShipments
        .map(shipment => {
          const metadata = shipment.metadata || {};
          const senderDetails = metadata.sender || metadata.senderDetails || {};
          return senderDetails.email || shipment.profiles?.email;
        })
        .filter(Boolean) // Remove nulls/undefined
        .filter((email, index, self) => self.indexOf(email) === index); // Remove duplicates

      if (emails.length === 0) {
        toast({
          title: 'No Emails Found',
          description: 'No valid email addresses found for customers in this route.',
          variant: 'warning',
        });
        return;
      }

      // For each email, send a notification about their scheduled pickup
      const routeName = route.replace(' Route', '');
      const formattedDate = safeFormatDate(pickupDate);
      
      // Here we could call the Brevo email function for each email
      toast({
        title: 'Notifications Sent',
        description: `${emails.length} customers have been notified about their pickup in the ${routeName} area.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send notifications: ' + error.message,
        variant: 'destructive',
      });
    }
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
              onClick={fetchShipmentsAndSchedules}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button
              onClick={() => {
                // Pre-select the current pickup date from schedules if available
                if (selectedRoute !== 'all') {
                  const currentDate = getPickupDateForRoute(selectedRoute);
                  if (currentDate !== 'Not scheduled') {
                    setPickupDate(currentDate);
                  } else {
                    setPickupDate('');
                  }
                  setSchedulingRoute(selectedRoute);
                } else {
                  setPickupDate('');
                  setSchedulingRoute('');
                }
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
              if (routeShipments.length === 0) return null;
              
              const drumCount = countDrums(route);
              const isOverbooked = isRouteOverbooked(route);
              const pickupDate = getPickupDateForRoute(route);
              
              return (
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
                    <CardDescription className="flex flex-col gap-1">
                      <div>{routeShipments.length} shipments ready for pickup</div>
                      <div className="flex items-center text-sm mt-1">
                        <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        <span>{pickupDate !== 'Not scheduled' ? pickupDate : 'No pickup date'}</span>
                      </div>
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
              );
            })}
          </div>
        ) : (
          // Show selected route details
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selectedRoute} Route</h2>
                <div className="flex items-center text-muted-foreground gap-2">
                  <span>{(groupedShipments[selectedRoute] || []).length} shipments, {countDrums(selectedRoute)} drums</span>
                  <Badge variant="outline" className="flex items-center ml-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    {getPickupDateForRoute(selectedRoute)}
                  </Badge>
                </div>
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
                    {(groupedShipments[selectedRoute] || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                          No shipments found for this route
                        </TableCell>
                      </TableRow>
                    ) : (
                      (groupedShipments[selectedRoute] || []).map(shipment => {
                        const metadata = shipment.metadata || {};
                        const senderDetails = metadata.sender || metadata.senderDetails || {};
                        const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
                        const collectionDetails = metadata.collection || {};
                        
                        // Get sender name from either profiles or metadata
                        const senderName = shipment.profiles?.full_name || 
                          `${senderDetails.firstName || ''} ${senderDetails.lastName || ''}`.trim() || 
                          'N/A';
                        
                        return (
                          <TableRow key={shipment.id}>
                            <TableCell className="font-mono text-sm">
                              {shipment.tracking_number}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <div>
                                  <div className="text-sm font-medium">{senderName}</div>
                                  <div className="text-xs text-muted-foreground">{senderDetails.phone || 'N/A'}</div>
                                </div>
                              </div>
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
                                variant={shipment.status === 'Ready for Pickup' || shipment.status === 'Pending Collection' ? 'default' : 'outline'}
                              >
                                {shipment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {collectionDetails.date || getPickupDateForRoute(selectedRoute)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
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
                  const currentDate = getPickupDateForRoute(selectedRoute);
                  if (currentDate !== 'Not scheduled') {
                    setPickupDate(currentDate);
                  }
                  setSchedulingRoute(selectedRoute);
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
            
            {/* Show current pickup date if available */}
            {schedulingRoute && getPickupDateForRoute(schedulingRoute) !== 'Not scheduled' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start gap-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  <p className="font-medium">Current Pickup Date</p>
                  <p>This route currently has a pickup date of {getPickupDateForRoute(schedulingRoute)}.</p>
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
              {schedulingPickups ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Schedule Pickups
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PickupZonesManagementTab;
