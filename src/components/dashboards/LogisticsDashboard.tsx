
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Truck, 
  Calendar, 
  Search, 
  Filter,
  RefreshCcw,
  ClipboardList,
  Clock,
  ChevronsUpDown,
  PlusCircle,
  Check,
  MoreHorizontal,
  FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const STATUS_OPTIONS = [
  'Booking Confirmed',
  'Ready for Pickup',
  'Processing in Warehouse (UK)',
  'Customs Clearance',
  'Processing in Warehouse (ZW)',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

// Helper function to get status badge class
const getStatusBadgeClass = (status: string) => {
  const statusLower = status.toLowerCase();
  
  switch (true) {
    case statusLower.includes('booking confirmed'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('ready for pickup'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('processing'):
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case statusLower.includes('customs'):
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case statusLower.includes('transit'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('out for delivery'):
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
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

const LogisticsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [scheduledPickups, setScheduledPickups] = useState<any[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<any[]>([]);
  const [inTransitItems, setInTransitItems] = useState<any[]>([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [pickupRoute, setPickupRoute] = useState('');
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);

  // Fetch shipments
  const { 
    data: shipments = [], 
    isLoading: shipmentsLoading, 
    refetch: refetchShipments 
  } = useQuery({
    queryKey: ['logistics-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, profiles:user_id(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch collection schedules
  useEffect(() => {
    const fetchCollectionSchedules = async () => {
      try {
        const { data, error } = await supabase
          .from('collection_schedules')
          .select('*')
          .order('pickup_date', { ascending: true });
          
        if (error) throw error;
        setCollectionSchedules(data || []);
      } catch (error: any) {
        console.error('Error fetching collection schedules:', error.message);
      }
    };
    
    fetchCollectionSchedules();
  }, []);

  // Filter shipments by status groups
  useEffect(() => {
    if (shipments) {
      // Scheduled for pickup
      const pickups = shipments.filter(s => 
        s.status === 'Booking Confirmed' || 
        s.status === 'Ready for Pickup'
      );
      setScheduledPickups(pickups);
      
      // In warehouse
      const warehouse = shipments.filter(s => 
        s.status === 'Processing in Warehouse (UK)' || 
        s.status === 'Processing in Warehouse (ZW)'
      );
      setWarehouseItems(warehouse);
      
      // In transit
      const transit = shipments.filter(s => 
        s.status === 'In Transit' || 
        s.status === 'Customs Clearance' || 
        s.status === 'Out for Delivery'
      );
      setInTransitItems(transit);
    }
  }, [shipments]);

  // Filtered shipments based on search and status
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      searchQuery === '' ||
      shipment.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shipment.profiles?.email && shipment.profiles.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' ||
      shipment.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Handle status update
  const updateShipmentStatus = async () => {
    if (!selectedShipment || !newStatus) return;
    
    try {
      setProcessingAction(true);
      
      const { error } = await supabase
        .from('shipments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedShipment.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Shipment ${selectedShipment.tracking_number} status updated to ${newStatus}`,
      });

      // Close dialog and refresh shipments
      setShowStatusDialog(false);
      refetchShipments();
      
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Create new collection schedule
  const createCollectionSchedule = async () => {
    if (!selectedDate || !pickupRoute || selectedAreas.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all the required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setProcessingAction(true);
      
      const { data, error } = await supabase
        .from('collection_schedules')
        .insert({
          pickup_date: selectedDate,
          route: pickupRoute,
          areas: selectedAreas
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Update the shipments with the scheduled pickup date
      const pickupShipments = scheduledPickups.filter(s => 
        s.status === 'Booking Confirmed' && 
        selectedAreas.some(area => s.origin.toLowerCase().includes(area.toLowerCase()))
      );
      
      // Update each shipment's metadata with the pickup date
      if (pickupShipments.length > 0) {
        for (const shipment of pickupShipments) {
          await supabase
            .from('shipments')
            .update({
              status: 'Ready for Pickup',
              metadata: {
                ...shipment.metadata,
                pickup_date: selectedDate
              }
            })
            .eq('id', shipment.id);
        }
      }
      
      toast({
        title: 'Schedule Created',
        description: `New collection schedule created for ${selectedDate}`,
      });
      
      // Add to collection schedules state
      setCollectionSchedules([...collectionSchedules, data]);
      
      // Reset form and close dialog
      setSelectedDate('');
      setPickupRoute('');
      setSelectedAreas([]);
      setShowScheduleDialog(false);
      
      // Refresh shipments
      refetchShipments();
      
    } catch (error: any) {
      toast({
        title: 'Error creating schedule',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Pickups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="h-8 w-8 text-yellow-500 mr-3" />
              <div className="text-2xl font-bold">{scheduledPickups.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ClipboardList className="h-8 w-8 text-orange-500 mr-3" />
              <div className="text-2xl font-bold">{warehouseItems.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-2xl font-bold">{inTransitItems.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Collection Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-2xl font-bold">{collectionSchedules.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="shipments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>All Shipments</span>
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Collection Schedules</span>
          </TabsTrigger>
          <TabsTrigger value="logistics" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span>Logistics Operations</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipments" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipment Management</CardTitle>
              <CardDescription>View and manage all shipments in the system</CardDescription>
              
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 mt-3">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Search by tracking #, origin, or destination"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="flex space-x-2">
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.toLowerCase()} value={status.toLowerCase()}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline"
                    onClick={() => refetchShipments()}
                    className="h-10 px-4"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {shipmentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-medium text-gray-700 mb-2">No shipments found</h3>
                  <p className="text-gray-500">
                    {searchQuery || statusFilter !== 'all' 
                      ? "Try adjusting your search filters" 
                      : "There are no shipments in the system yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking #</TableHead>
                        <TableHead className="hidden md:table-cell">Customer</TableHead>
                        <TableHead className="hidden md:table-cell">Origin</TableHead>
                        <TableHead className="hidden md:table-cell">Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">
                            {shipment.tracking_number}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {shipment.profiles?.email || 'Unknown'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[150px] truncate">
                            {shipment.origin}
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[150px] truncate">
                            {shipment.destination}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedShipment(shipment);
                                    setNewStatus(shipment.status);
                                    setShowStatusDialog(true);
                                  }}
                                >
                                  Update Status
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => window.open(`/shipment/${shipment.id}`, '_blank')}
                                >
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="collections" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Collection Schedules</h2>
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button className="bg-zim-green hover:bg-zim-green/90">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Collection Schedule</DialogTitle>
                  <DialogDescription>
                    Schedule pickups for specific areas and dates.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pickup Date</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Route Name</label>
                    <Input
                      placeholder="e.g., North London Route"
                      value={pickupRoute}
                      onChange={(e) => setPickupRoute(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Areas Covered</label>
                    <div className="flex flex-wrap gap-2">
                      {['London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Nottingham'].map((area) => (
                        <Badge
                          key={area}
                          variant="outline"
                          className={`cursor-pointer ${
                            selectedAreas.includes(area) 
                              ? 'bg-zim-green/10 text-zim-green border-zim-green' 
                              : ''
                          }`}
                          onClick={() => {
                            if (selectedAreas.includes(area)) {
                              setSelectedAreas(selectedAreas.filter(a => a !== area));
                            } else {
                              setSelectedAreas([...selectedAreas, area]);
                            }
                          }}
                        >
                          {selectedAreas.includes(area) && (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowScheduleDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-zim-green hover:bg-zim-green/90"
                    onClick={createCollectionSchedule}
                    disabled={processingAction}
                  >
                    {processingAction ? 'Creating...' : 'Create Schedule'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collectionSchedules.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-medium text-gray-700 mb-2">No collection schedules</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first collection schedule to organize pickups
                  </p>
                  <Button 
                    onClick={() => setShowScheduleDialog(true)}
                    className="bg-zim-green hover:bg-zim-green/90"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Schedule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              collectionSchedules.map((schedule) => (
                <Card key={schedule.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{schedule.route}</CardTitle>
                        <CardDescription>
                          <Calendar className="h-4 w-4 inline-block mr-1" />
                          {schedule.pickup_date}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="bg-blue-100 text-blue-800 border-blue-300"
                      >
                        {new Date(schedule.pickup_date) > new Date() ? 'Upcoming' : 'Past'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-0">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {schedule.areas.map((area: string) => (
                        <Badge key={area} variant="outline">{area}</Badge>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="pt-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Scheduled Pickups</h4>
                      <div className="max-h-[150px] overflow-y-auto">
                        {scheduledPickups.filter(s => 
                          s.metadata?.pickup_date === schedule.pickup_date
                        ).length > 0 ? (
                          scheduledPickups
                            .filter(s => s.metadata?.pickup_date === schedule.pickup_date)
                            .map(shipment => (
                              <div key={shipment.id} className="flex justify-between items-center py-2 border-b">
                                <div>
                                  <div className="font-medium text-sm">{shipment.tracking_number}</div>
                                  <div className="text-xs text-gray-500">{shipment.origin}</div>
                                </div>
                                <Badge className={getStatusBadgeClass(shipment.status)}>
                                  {shipment.status}
                                </Badge>
                              </div>
                            ))
                        ) : (
                          <p className="text-sm text-gray-500 py-2">No pickups scheduled</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-4">
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Print Manifest
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => window.location.href = '/collection-schedule'}
                    >
                      Manage
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="logistics" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-yellow-500" />
                  Pending Pickups 
                  <Badge className="ml-2">{scheduledPickups.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {scheduledPickups.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No pending pickups</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledPickups.map(shipment => (
                      <div 
                        key={shipment.id} 
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{shipment.tracking_number}</p>
                            <p className="text-xs text-gray-500 mt-1">{shipment.origin}</p>
                          </div>
                          <Badge className={getStatusBadgeClass(shipment.status)}>
                            {shipment.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-xs text-gray-500">
                            {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setNewStatus(shipment.status);
                              setShowStatusDialog(true);
                            }}
                          >
                            Update Status
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Warehouse */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-orange-500" />
                  In Warehouse 
                  <Badge className="ml-2">{warehouseItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {warehouseItems.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No items in warehouse</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {warehouseItems.map(shipment => (
                      <div 
                        key={shipment.id} 
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{shipment.tracking_number}</p>
                            <p className="text-xs text-gray-500 mt-1">{shipment.status}</p>
                          </div>
                          <Badge className={getStatusBadgeClass(shipment.status)}>
                            {shipment.status.includes('UK') ? 'UK' : 'ZW'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-xs text-gray-500">
                            {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setNewStatus(shipment.status);
                              setShowStatusDialog(true);
                            }}
                          >
                            Update Status
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* In Transit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2 text-blue-500" />
                  In Transit 
                  <Badge className="ml-2">{inTransitItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {inTransitItems.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No items in transit</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inTransitItems.map(shipment => (
                      <div 
                        key={shipment.id} 
                        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{shipment.tracking_number}</p>
                            <p className="text-xs text-gray-500 mt-1">{shipment.status}</p>
                          </div>
                          <Badge className={getStatusBadgeClass(shipment.status)}>
                            {shipment.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-xs text-gray-500">
                            {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setNewStatus(shipment.status);
                              setShowStatusDialog(true);
                            }}
                          >
                            Update Status
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipment Status</DialogTitle>
            <DialogDescription>
              Update the status for shipment {selectedShipment?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Status</label>
              <div>
                <Badge className={getStatusBadgeClass(selectedShipment?.status || '')}>
                  {selectedShipment?.status}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select
                value={newStatus}
                onValueChange={setNewStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowStatusDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-zim-green hover:bg-zim-green/90"
              onClick={updateShipmentStatus}
              disabled={processingAction}
            >
              {processingAction ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogisticsDashboard;
