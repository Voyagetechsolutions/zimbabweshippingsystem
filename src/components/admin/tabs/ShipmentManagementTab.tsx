import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  RefreshCcw, 
  Package,
  CheckCircle,
  Calendar,
  RotateCw,
  Truck,
  Ship,
  CircleAlert,
  X,
  Info,
  Loader2
} from 'lucide-react';
import { Shipment, ShipmentFilters } from '@/types/shipment';

const ShipmentManagementTab = () => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Selected shipment for detail view
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Collection route information
  const [routes, setRoutes] = useState<{route: string; pickup_date: string; areas: string[]}[]>([]);
  
  // Filters
  const [filters, setFilters] = useState<ShipmentFilters>({
    status: '',
    search: '',
  });

  // Status options for the dropdown
  const statusOptions = [
    'Booking Confirmed',
    'Ready for Pickup',
    'Processing in UK Warehouse',
    'In Transit to Zimbabwe',
    'Customs Clearance',
    'Processing in ZW Warehouse',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
    'Failed Attempt'
  ];
  
  useEffect(() => {
    fetchShipments();
    fetchRoutes();
  }, [activeTab]);
  
  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });
      
      if (error) throw error;
      
      setRoutes(data || []);
    } catch (error) {
      console.error('Failed to fetch collection routes:', error);
    }
  };
  
  const fetchShipments = useCallback(async () => {
    setLoading(true);
    
    try {
      // Construct query based on active tab
      let query = supabase
        .from('shipments')
        .select('*, profiles(email, full_name)');
      
      // Apply tab filter
      switch (activeTab) {
        case 'pending':
          query = query.in('status', ['Booking Confirmed', 'Ready for Pickup']);
          break;
        case 'processing':
          query = query.in('status', ['Processing in UK Warehouse', 'In Transit to Zimbabwe', 'Customs Clearance', 'Processing in ZW Warehouse']);
          break;
        case 'delivery':
          query = query.in('status', ['Out for Delivery', 'Delivered', 'Failed Attempt']);
          break;
        case 'cancelled':
          query = query.eq('status', 'Cancelled');
          break;
        // 'all' tab doesn't need additional filtering
      }
      
      // Apply search filter if provided
      if (filters.search) {
        query = query.or(`tracking_number.ilike.%${filters.search}%,origin.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`);
      }
      
      // Apply status filter if provided
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      // Execute the query
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process the data - Fixed to properly handle profiles data type
      const shipmentData: Shipment[] = data.map(item => {
        // Handle profiles correctly, whether it's an object or array
        let profileData = {
          email: null as string | null,
          full_name: null as string | null
        };
        
        // Check if profiles exists and extract data
        if (item.profiles) {
          // Handle case when profiles is an array (might happen with certain Supabase responses)
          if (Array.isArray(item.profiles)) {
            if (item.profiles.length > 0) {
              // Type assertion to help TypeScript understand the structure
              const profileItem = item.profiles[0] as { email?: string, full_name?: string };
              profileData.email = profileItem.email || null;
              profileData.full_name = profileItem.full_name || null;
            }
          } else {
            // Handle case when profiles is an object
            const profileObj = item.profiles as { email?: string, full_name?: string };
            profileData.email = profileObj.email || null;
            profileData.full_name = profileObj.full_name || null;
          }
        }
        
        // Create clean shipment object
        const { profiles: _, ...shipmentData } = item;
        
        return {
          ...shipmentData,
          profiles: profileData
        } as Shipment;
      });
      
      setShipments(shipmentData);
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Failed to load shipments',
        description: 'There was a problem retrieving shipment data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters.search, filters.status, toast]);

  const handleStatusChange = async (shipmentId: string, newStatus: string) => {
    setIsUpdating(true);
    
    try {
      // Update the shipment status
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', shipmentId);
      
      if (error) throw error;
      
      // Update local state
      setShipments(prevShipments => 
        prevShipments.map(shipment => 
          shipment.id === shipmentId 
            ? { ...shipment, status: newStatus, updated_at: new Date().toISOString() }
            : shipment
        )
      );
      
      // Update selected shipment if applicable
      if (selectedShipment && selectedShipment.id === shipmentId) {
        setSelectedShipment({
          ...selectedShipment,
          status: newStatus,
          updated_at: new Date().toISOString()
        });
      }

      // Create notification for status change
      await createNotification({
        title: 'Shipment Status Updated',
        message: `Shipment #${selectedShipment?.tracking_number} status changed to ${newStatus}`,
        type: 'status_update',
        related_id: shipmentId,
        user_id: selectedShipment?.user_id || ''
      });
      
      // Show success message
      toast({
        title: 'Status Updated',
        description: `Shipment status has been updated to ${newStatus}`,
      });
      
    } catch (error) {
      console.error('Error updating shipment status:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update shipment status.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSearch = (searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue }));
  };
  
  const handleFilterChange = (filterValue: string) => {
    setFilters(prev => ({ ...prev, status: filterValue }));
  };
  
  const resetFilters = () => {
    setFilters({ status: '', search: '' });
    fetchShipments();
  };
  
  // Create notification function - Fixed to ensure user_id is always provided when required
  const createNotification = async (notification: { 
    title: string;
    message: string;
    type: string;
    related_id?: string;
    user_id: string; // Made required to match Supabase schema
  }) => {
    try {
      await supabase.from('notifications').insert([notification]);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };
  
  useEffect(() => {
    fetchShipments();
  }, [filters, fetchShipments]);
  
  // Function to match postal code with route area
  const findMatchingRoute = (postalCode: string | undefined) => {
    if (!postalCode || !routes.length) return null;
    
    // First characters of the postal code often indicate the area
    const postalPrefix = postalCode.substring(0, 2).toUpperCase();
    
    // Find matching route by checking if any route's area contains the postal prefix
    return routes.find(route => 
      route.areas.some(area => 
        // Check if area contains the postal prefix (case insensitive)
        area.toUpperCase().includes(postalPrefix) || 
        // Or if the postal prefix contains the area (case insensitive)
        postalPrefix.includes(area.toUpperCase())
      )
    );
  };
  
  // Function to get collection info from shipment metadata and matching route
  const getCollectionInfo = (shipment: Shipment) => {
    if (!shipment.metadata) return null;
    
    const senderPostalCode = shipment.metadata.sender?.postcode || 
                            shipment.metadata.senderDetails?.postcode ||
                            undefined;
    
    // Get any existing collection info stored in metadata
    const existingCollectionInfo = shipment.metadata.collection || {};
    
    // Find matching route based on postal code
    const matchingRoute = findMatchingRoute(senderPostalCode);
    
    if (matchingRoute) {
      return {
        route: existingCollectionInfo.route || matchingRoute.route,
        date: existingCollectionInfo.date || matchingRoute.pickup_date,
        scheduled: existingCollectionInfo.scheduled || true
      };
    }
    
    return existingCollectionInfo;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Booking Confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-300">{status}</Badge>;
      case 'Ready for Pickup':
        return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">{status}</Badge>;
      case 'Processing in UK Warehouse':
        return <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-300">{status}</Badge>;
      case 'In Transit to Zimbabwe':
        return <Badge className="bg-purple-100 text-purple-800 border border-purple-300">{status}</Badge>;
      case 'Customs Clearance':
        return <Badge className="bg-orange-100 text-orange-800 border border-orange-300">{status}</Badge>;
      case 'Processing in ZW Warehouse':
        return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">{status}</Badge>;
      case 'Out for Delivery':
        return <Badge className="bg-green-100 text-green-800 border border-green-300">{status}</Badge>;
      case 'Delivered':
        return <Badge className="bg-green-500 text-white">{status}</Badge>;
      case 'Failed Attempt':
        return <Badge className="bg-red-100 text-red-800 border border-red-300">{status}</Badge>;
      case 'Cancelled':
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Booking Confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'Ready for Pickup':
        return <Calendar className="h-5 w-5 text-yellow-500" />;
      case 'Processing in UK Warehouse':
        return <Package className="h-5 w-5 text-indigo-500" />;
      case 'In Transit to Zimbabwe':
        return <Ship className="h-5 w-5 text-purple-500" />;
      case 'Customs Clearance':
        return <CircleAlert className="h-5 w-5 text-orange-500" />;
      case 'Processing in ZW Warehouse':
        return <Package className="h-5 w-5 text-emerald-500" />;
      case 'Out for Delivery':
        return <Truck className="h-5 w-5 text-green-500" />;
      case 'Delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Failed Attempt':
        return <X className="h-5 w-5 text-red-500" />;
      case 'Cancelled':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
            <div>
              <CardTitle>Shipment Management</CardTitle>
              <CardDescription>Track and manage shipments</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters} 
              disabled={loading}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search by tracking number, origin, or destination"
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="flex space-x-4">
              <div className="w-full min-w-[200px] md:w-[200px]">
                <Select
                  value={filters.status || ''}
                  onValueChange={handleFilterChange}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-5 mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
            
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : (
              <TabsContent value={activeTab}>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Tracking #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead className="w-[120px]">Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10">
                            <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No shipments found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        shipments.map((shipment) => (
                          <TableRow key={shipment.id}>
                            <TableCell className="font-medium">
                              {shipment.tracking_number}
                            </TableCell>
                            <TableCell>
                              {shipment.profiles?.full_name || shipment.profiles?.email || 'Unknown User'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(shipment.status)}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {shipment.origin}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {shipment.destination}
                            </TableCell>
                            <TableCell>
                              {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedShipment(shipment)}
                                  >
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
                                  {selectedShipment && (
                                    <>
                                      <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                          <Package className="h-5 w-5" />
                                          Shipment #{selectedShipment.tracking_number}
                                        </DialogTitle>
                                        <DialogDescription>
                                          View and update shipment details
                                        </DialogDescription>
                                      </DialogHeader>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                        {/* Left Column - Status and Basic Info */}
                                        <div className="space-y-6">
                                          {/* Status Section */}
                                          <div>
                                            <Label className="text-base font-semibold">Current Status</Label>
                                            <div className="flex items-center mt-2 mb-4">
                                              {getStatusIcon(selectedShipment.status)}
                                              <span className="ml-2">{selectedShipment.status}</span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                              <Label>Update Status</Label>
                                              <Select
                                                defaultValue={selectedShipment.status}
                                                onValueChange={(value) => handleStatusChange(selectedShipment.id, value)}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select a new status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {statusOptions.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                      {status}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              
                                              <Button 
                                                className="w-full mt-2" 
                                                disabled={isUpdating}
                                                onClick={() => handleStatusChange(selectedShipment.id, selectedShipment.status)}
                                              >
                                                {isUpdating ? (
                                                  <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Updating...
                                                  </>
                                                ) : (
                                                  <>
                                                    <RotateCw className="h-4 w-4 mr-2" />
                                                    Update Status
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          </div>
                                          
                                          {/* Shipment Basic Info */}
                                          <div>
                                            <Label className="text-base font-semibold">Shipment Information</Label>
                                            <div className="mt-2 space-y-2 text-sm">
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Created:</span>
                                                <span>{format(new Date(selectedShipment.created_at), 'MMM d, yyyy HH:mm')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Last Updated:</span>
                                                <span>{format(new Date(selectedShipment.updated_at), 'MMM d, yyyy HH:mm')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Origin:</span>
                                                <span className="text-right max-w-[70%]">{selectedShipment.origin}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">Destination:</span>
                                                <span className="text-right max-w-[70%]">{selectedShipment.destination}</span>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Collection Information */}
                                          <div>
                                            <Label className="text-base font-semibold">Collection Information</Label>
                                            {(() => {
                                              const collectionInfo = getCollectionInfo(selectedShipment);
                                              return collectionInfo ? (
                                                <div className="mt-2 space-y-2 text-sm">
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Route:</span>
                                                    <span>{collectionInfo.route || 'Not assigned'}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Pickup Date:</span>
                                                    <span>{collectionInfo.date || 'Not scheduled'}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Status:</span>
                                                    <span>{collectionInfo.scheduled ? 'Scheduled' : 'Not scheduled'}</span>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="mt-2 text-sm text-muted-foreground">
                                                  No collection information available
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                        
                                        {/* Right Column - Sender, Recipient, Shipment Details */}
                                        <div className="space-y-6">
                                          {/* Sender Information */}
                                          <div>
                                            <Label className="text-base font-semibold">Sender Details</Label>
                                            <div className="mt-2 space-y-2 text-sm">
                                              {(() => {
                                                const sender = selectedShipment.metadata?.sender || selectedShipment.metadata?.senderDetails;
                                                if (!sender) return <div className="text-muted-foreground">No sender details available</div>;
                                                
                                                const name = sender.name || 
                                                  (sender.firstName && sender.lastName ? `${sender.firstName} ${sender.lastName}` : undefined);
                                                
                                                return (
                                                  <>
                                                    {name && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Name:</span>
                                                        <span>{name}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {sender.email && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Email:</span>
                                                        <span>{sender.email}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {sender.phone && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Phone:</span>
                                                        <span>{sender.phone}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {sender.address && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Address:</span>
                                                        <span className="text-right max-w-[70%]">{sender.address}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {sender.postcode && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Postcode:</span>
                                                        <span>{sender.postcode}</span>
                                                      </div>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                          
                                          {/* Recipient Information */}
                                          <div>
                                            <Label className="text-base font-semibold">Recipient Details</Label>
                                            <div className="mt-2 space-y-2 text-sm">
                                              {(() => {
                                                const recipient = selectedShipment.metadata?.recipient || selectedShipment.metadata?.recipientDetails;
                                                if (!recipient) return <div className="text-muted-foreground">No recipient details available</div>;
                                                
                                                const name = recipient.name || 
                                                  (recipient.firstName && recipient.lastName ? `${recipient.firstName} ${recipient.lastName}` : undefined);
                                                
                                                return (
                                                  <>
                                                    {name && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Name:</span>
                                                        <span>{name}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {recipient.phone && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Phone:</span>
                                                        <span>{recipient.phone}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {recipient.address && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Address:</span>
                                                        <span className="text-right max-w-[70%]">{recipient.address}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {recipient.city && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">City:</span>
                                                        <span>{recipient.city}</span>
                                                      </div>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                          
                                          {/* Shipment Details */}
                                          <div>
                                            <Label className="text-base font-semibold">Package Details</Label>
                                            <div className="mt-2 space-y-2 text-sm">
                                              {(() => {
                                                const shipmentDetails = selectedShipment.metadata?.shipment || selectedShipment.metadata?.shipmentDetails;
                                                if (!shipmentDetails) return <div className="text-muted-foreground">No package details available</div>;
                                                
                                                return (
                                                  <>
                                                    {shipmentDetails.type && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Type:</span>
                                                        <span>{shipmentDetails.type}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {shipmentDetails.quantity && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Quantity:</span>
                                                        <span>{shipmentDetails.quantity}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {shipmentDetails.category && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Category:</span>
                                                        <span>{shipmentDetails.category}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {shipmentDetails.description && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Description:</span>
                                                        <span className="text-right max-w-[70%]">{shipmentDetails.description}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {(typeof shipmentDetails.includeDrums !== 'undefined') && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Include Drums:</span>
                                                        <span>{shipmentDetails.includeDrums ? 'Yes' : 'No'}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {(typeof shipmentDetails.includeOtherItems !== 'undefined') && (
                                                      <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Include Other Items:</span>
                                                        <span>{shipmentDetails.includeOtherItems ? 'Yes' : 'No'}</span>
                                                      </div>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <DialogFooter>
                                        <Button variant="outline">Print Details</Button>
                                        <Button>Close</Button>
                                      </DialogFooter>
                                    </>
                                  )}
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShipmentManagementTab;
