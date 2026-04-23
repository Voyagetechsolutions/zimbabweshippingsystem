import React, { useState, useEffect } from 'react';
import TabHeader from '../TabHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminCountry } from '@/contexts/AdminCountryContext';
import { format, isValid } from 'date-fns';
import { Shipment } from '@/types/shipment';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Separator } from '@/components/ui/separator';

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
  Loader2,
  Truck,
  Eye,
  CheckCircle,
  Phone,
  Mail,
  Search,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface CollectionSchedule {
  id: string;
  route: string;
  areas: string[];
  pickup_date: string;
  created_at: string;
  updated_at: string;
  country?: string;
}

const PickupZonesManagementTab = () => {
  const { toast } = useToast();
  const { selectedCountry } = useAdminCountry();
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [markingCollected, setMarkingCollected] = useState<string | null>(null);
  const [schedulingDialog, setSchedulingDialog] = useState(false);
  const [schedulingRoute, setSchedulingRoute] = useState<CollectionSchedule | null>(null);
  const [newPickupDate, setNewPickupDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to filter by country
  const filterByCountry = (schedule: CollectionSchedule) => {
    const scheduleCountry = schedule.country || 'England';
    return (
      (selectedCountry === 'England' && (scheduleCountry === 'England' || scheduleCountry === 'UK' || !schedule.country)) ||
      (selectedCountry === 'Ireland' && scheduleCountry === 'Ireland')
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch collection schedules (routes)
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('route', { ascending: true });

      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);

      // Fetch shipments ready for pickup
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['Booking Confirmed', 'Ready for Pickup', 'Pending Collection', 'Collected'])
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;
      setShipments(shipmentsData || []);

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

  // Get routes filtered by country
  const filteredRoutes = schedules.filter(filterByCountry);

  // Get shipments for a specific route
  const getShipmentsForRoute = (routeName: string): Shipment[] => {
    return shipments.filter(shipment => {
      const metadata = shipment.metadata || {};
      const collection = metadata.collection || {};

      // Check if route is assigned in metadata
      if (collection.route) {
        const assignedRoute = collection.route.toUpperCase().replace(' ROUTE', '');
        if (assignedRoute === routeName.toUpperCase()) return true;
      }

      // Check origin against route areas
      const schedule = schedules.find(s => s.route.toUpperCase() === routeName.toUpperCase());
      if (schedule && shipment.origin) {
        const originLower = shipment.origin.toLowerCase();
        return schedule.areas.some(area => {
          const areaLower = area.toLowerCase();
          // Skip postcodes entry
          if (areaLower.startsWith('postcodes:')) return false;
          return originLower.includes(areaLower) || areaLower.includes(originLower.split(',')[0]);
        });
      }

      return false;
    });
  };

  // Count drums for a route
  const countDrums = (routeName: string): number => {
    const routeShipments = getShipmentsForRoute(routeName);
    return routeShipments.reduce((total, shipment) => {
      const metadata = shipment.metadata || {};
      const items = metadata.items || {};
      if (items.drums?.quantity) {
        return total + items.drums.quantity;
      }
      return total;
    }, 0);
  };

  // Schedule pickup for a route
  const schedulePickup = async () => {
    if (!schedulingRoute || !newPickupDate) return;

    setIsScheduling(true);
    try {
      const formattedDate = format(new Date(newPickupDate), 'MMMM do, yyyy');

      const { error } = await supabase
        .from('collection_schedules')
        .update({
          pickup_date: formattedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', schedulingRoute.id);

      if (error) throw error;

      // Update shipments in this route
      const routeShipments = getShipmentsForRoute(schedulingRoute.route);
      for (const shipment of routeShipments) {
        const updatedMetadata = {
          ...shipment.metadata,
          collection: {
            ...(shipment.metadata?.collection || {}),
            route: schedulingRoute.route,
            date: formattedDate,
            scheduled: true
          }
        };

        await supabase
          .from('shipments')
          .update({
            status: 'Ready for Pickup',
            metadata: updatedMetadata
          })
          .eq('id', shipment.id);
      }

      toast({
        title: 'Pickup Scheduled',
        description: `Collection scheduled for ${formattedDate}`,
      });

      setSchedulingDialog(false);
      setSchedulingRoute(null);
      setNewPickupDate('');
      fetchData();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to schedule pickup: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsScheduling(false);
    }
  };

  // Mark shipment as collected
  const markAsCollected = async (shipmentId: string) => {
    try {
      setMarkingCollected(shipmentId);

      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'Collected',
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (error) throw error;

      setShipments(prev =>
        prev.map(s =>
          s.id === shipmentId
            ? { ...s, status: 'Collected', updated_at: new Date().toISOString() }
            : s
        )
      );

      if (shipmentDialogOpen) {
        setShipmentDialogOpen(false);
        setSelectedShipment(null);
      }

      toast({
        title: 'Collected',
        description: 'Shipment marked as collected.',
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update status: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setMarkingCollected(null);
    }
  };

  // Export pickup list
  const exportPickupList = (route: CollectionSchedule) => {
    try {
      setExporting(true);
      const routeShipments = getShipmentsForRoute(route.route);

      if (routeShipments.length === 0) {
        toast({ title: 'No Data', description: 'No shipments to export.' });
        setExporting(false);
        return;
      }

      const headers = ['Tracking Number', 'Sender Name', 'Phone', 'Address', 'Drums', 'Status'];
      const rows = routeShipments.map(s => {
        const meta = s.metadata || {};
        const sender = meta.sender || meta.senderDetails || {};
        const items = meta.items || {};
        return [
          s.tracking_number,
          `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'N/A',
          sender.phone || 'N/A',
          s.origin || 'N/A',
          items.drums?.quantity || 0,
          s.status
        ];
      });

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${route.route}_Pickups_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({ title: 'Exported', description: 'Pickup list downloaded.' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Export failed.' });
    } finally {
      setExporting(false);
    }
  };

  // Helper to extract sender info
  const getSenderName = (metadata: any): string => {
    const sender = metadata?.sender || metadata?.senderDetails || {};
    if (sender.name) return sender.name;
    if (sender.firstName || sender.lastName) {
      return `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
    }
    return 'Unknown';
  };

  const getSenderPhone = (metadata: any): string => {
    const sender = metadata?.sender || metadata?.senderDetails || {};
    return sender.phone || metadata?.phone || 'N/A';
  };

  // Filter routes by search
  const searchFilteredRoutes = filteredRoutes.filter(route =>
    searchQuery === '' ||
    route.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.areas.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Render route card
  const renderRouteCard = (route: CollectionSchedule) => {
    const routeShipments = getShipmentsForRoute(route.route);
    const pendingShipments = routeShipments.filter(s => s.status !== 'Collected');
    const drumCount = countDrums(route.route);
    const isOverbooked = drumCount >= 10;
    const hasSchedule = route.pickup_date && route.pickup_date !== 'Not set';

    return (
      <Card
        key={route.id}
        className={`cursor-pointer transition-all hover:shadow-md ${isOverbooked ? 'border-red-300 dark:border-red-700' : pendingShipments.length > 0 ? 'border-green-300 dark:border-green-700' : ''
          }`}
        onClick={() => setSelectedRoute(route.route)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${pendingShipments.length > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                <Truck className={`h-6 w-6 ${pendingShipments.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <CardTitle className="text-base">{route.route}</CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>{hasSchedule ? route.pickup_date : 'Not scheduled'}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${pendingShipments.length > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                {pendingShipments.length}
              </div>
              <div className="text-xs text-muted-foreground">pickups</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Areas/Cities */}
          <div className="flex flex-wrap gap-1 mb-3">
            {route.areas.filter(a => !a.startsWith('Postcodes:')).slice(0, 3).map((area, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                <MapPin className="h-2.5 w-2.5 mr-1" />
                {area}
              </Badge>
            ))}
            {route.areas.filter(a => !a.startsWith('Postcodes:')).length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{route.areas.filter(a => !a.startsWith('Postcodes:')).length - 3} more
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span>{drumCount} drums</span>
            </div>
            {isOverbooked && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overbooked
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render selected route details
  const renderRouteDetails = () => {
    const route = schedules.find(s => s.route === selectedRoute);
    if (!route) return null;

    const routeShipments = getShipmentsForRoute(route.route);
    const pendingShipments = routeShipments.filter(s => s.status !== 'Collected');
    const collectedShipments = routeShipments.filter(s => s.status === 'Collected');
    const drumCount = countDrums(route.route);

    return (
      <div className="space-y-4">
        {/* Back button and header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedRoute(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Routes
          </Button>
        </div>

        {/* Route Summary */}
        <Card className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <Truck className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-green-900 dark:text-green-100">{route.route}</h2>
                  <div className="flex items-center gap-3 text-sm text-green-700 dark:text-green-300 mt-1">
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {pendingShipments.length} pending
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {route.pickup_date !== 'Not set' ? route.pickup_date : 'Not scheduled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {drumCount} drums
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportPickupList(route)}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSchedulingRoute(route);
                    setSchedulingDialog(true);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipments Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Pickups ({pendingShipments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingShipments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending pickups for this route</p>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingShipments.map(shipment => {
                      const items = shipment.metadata?.items || {};
                      let itemsText = '';
                      if (items.drums?.quantity) itemsText += `${items.drums.quantity} drum(s)`;
                      if (items.boxes) itemsText += itemsText ? ' + boxes' : 'Boxes';
                      if (!itemsText) itemsText = 'N/A';

                      return (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-mono text-sm">{shipment.tracking_number}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{getSenderName(shipment.metadata)}</div>
                              <div className="text-xs text-muted-foreground">{getSenderPhone(shipment.metadata)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{shipment.origin}</TableCell>
                          <TableCell className="text-sm">{itemsText}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{shipment.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedShipment(shipment);
                                  setShipmentDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => markAsCollected(shipment.id)}
                                disabled={markingCollected === shipment.id}
                              >
                                {markingCollected === shipment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Collected */}
        {collectedShipments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">Recently Collected ({collectedShipments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {collectedShipments.slice(0, 5).map(shipment => (
                  <div key={shipment.id} className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-mono text-sm">{shipment.tracking_number}</span>
                      <span className="text-sm text-muted-foreground">{getSenderName(shipment.metadata)}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">Collected</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <TabHeader
        title="Pickup Zones Management"
        description="Manage pickups by route and schedule collections"
        actions={
          <>
            <Badge variant="outline" className="px-2 py-1 text-xs">
              {selectedCountry === 'Ireland' ? '🇮🇪' : '🇬🇧'} {selectedCountry}
            </Badge>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchData} disabled={loading}>
              <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {!selectedRoute ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search routes or areas..."
                className="pl-8 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Routes Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : searchFilteredRoutes.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No routes found</h3>
                <p className="text-muted-foreground">
                  {filteredRoutes.length === 0
                    ? `No ${selectedCountry} routes configured. Add routes in the Routes tab.`
                    : 'Try adjusting your search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchFilteredRoutes.map(renderRouteCard)}
              </div>
            )}

            {/* Summary */}
            {searchFilteredRoutes.length > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                <span>
                  {searchFilteredRoutes.length} route{searchFilteredRoutes.length !== 1 ? 's' : ''} •{' '}
                  {shipments.filter(s => s.status !== 'Collected').length} pending pickups
                </span>
                <span>
                  Total: {shipments.reduce((acc, s) => acc + (s.metadata?.items?.drums?.quantity || 0), 0)} drums
                </span>
              </div>
            )}
          </>
        ) : (
          renderRouteDetails()
        )}
      </div>

      {/* Schedule Pickup Dialog */}
      <Dialog open={schedulingDialog} onOpenChange={setSchedulingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Collection</DialogTitle>
            <DialogDescription>
              Set a pickup date for {schedulingRoute?.route}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Current Date</Label>
              <Input
                value={schedulingRoute?.pickup_date || 'Not set'}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label>New Pickup Date</Label>
              <Input
                type="date"
                value={newPickupDate}
                onChange={(e) => setNewPickupDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={schedulePickup} disabled={!newPickupDate || isScheduling}>
              {isScheduling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipment Details Dialog */}
      <Dialog open={shipmentDialogOpen} onOpenChange={setShipmentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Shipment Details
            </DialogTitle>
            <DialogDescription>
              {selectedShipment?.tracking_number}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Sender</Label>
                  <p className="font-medium">{getSenderName(selectedShipment.metadata)}</p>
                  <p className="text-sm text-muted-foreground">{getSenderPhone(selectedShipment.metadata)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="outline" className="mt-1">{selectedShipment.status}</Badge>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Pickup Address</Label>
                <p className="text-sm mt-1">{selectedShipment.origin}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Destination</Label>
                <p className="text-sm mt-1">{selectedShipment.destination}</p>
              </div>

              {selectedShipment.status !== 'Collected' && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => markAsCollected(selectedShipment.id)}
                  disabled={markingCollected === selectedShipment.id}
                >
                  {markingCollected === selectedShipment.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark as Collected
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PickupZonesManagementTab;
