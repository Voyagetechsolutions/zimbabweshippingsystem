import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  TableRow,
} from '@/components/ui/table';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Package,
  Truck,
  Users,
  AlertCircle,
  Search,
  Warehouse,
  Filter,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Shipment, ShipmentMetadata } from '@/types/shipment';

// Type guard to check if a value is a valid ShipmentMetadata
function isValidMetadata(metadata: any): metadata is ShipmentMetadata {
  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata);
}

const LogisticsDashboard = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all shipments with user profiles
  const { data: shipments, isLoading, refetch } = useQuery({
    queryKey: ['logistics-shipments'],
    queryFn: async () => {
      try {
        console.log('Fetching all shipments for logistics dashboard');
        
        // First, fetch all shipments without trying to join with profiles
        const { data: shipmentsData, error: shipmentsError } = await supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (shipmentsError) {
          console.error('Error fetching shipments:', shipmentsError);
          throw shipmentsError;
        }
        
        // Now manually fetch profile data for each shipment
        const enrichedShipments: Shipment[] = [];
        
        for (const shipment of shipmentsData || []) {
          // Create a proper Shipment object with safe metadata handling
          const enrichedShipment: Shipment = {
            id: shipment.id,
            tracking_number: shipment.tracking_number,
            status: shipment.status,
            origin: shipment.origin,
            destination: shipment.destination,
            user_id: shipment.user_id,
            created_at: shipment.created_at,
            updated_at: shipment.updated_at,
            // Ensure metadata is a valid object or provide a default empty object
            metadata: isValidMetadata(shipment.metadata) ? shipment.metadata : {},
            can_cancel: shipment.can_cancel !== undefined ? shipment.can_cancel : true,
            can_modify: shipment.can_modify !== undefined ? shipment.can_modify : true,
          };
          
          // If user_id exists, fetch the related profile data separately
          if (shipment.user_id) {
            try {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', shipment.user_id)
                .single();
                
              if (!userError && userData) {
                enrichedShipment.profiles = {
                  email: userData.email,
                  full_name: userData.full_name
                };
              }
            } catch (profileError) {
              console.error(`Error fetching profile for user ${shipment.user_id}:`, profileError);
              // Don't throw here, just continue without the profile data
            }
          }
          
          enrichedShipments.push(enrichedShipment);
        }
        
        console.log('Fetched shipments with profiles:', enrichedShipments.length);
        return enrichedShipments;
      } catch (error: any) {
        console.error('Error in query function:', error);
        toast({
          title: 'Error fetching shipments',
          description: error.message,
          variant: 'destructive'
        });
        return [];
      }
    },
    refetchInterval: 30000, // Auto refresh every 30 seconds
  });

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Data refreshed',
        description: 'Shipment data has been updated',
      });
    } catch (error: any) {
      toast({
        title: 'Refresh failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter shipments by status, date and search query
  const getFilteredShipments = () => {
    if (!shipments) return [];

    return shipments.filter(shipment => {
      // Status filter
      if (statusFilter !== 'all' && shipment.status !== statusFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter !== 'all') {
        const shipmentDate = new Date(shipment.created_at);
        const now = new Date();
        
        if (dateFilter === 'today') {
          // Check if the shipment is from today
          return shipmentDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          // Check if the shipment is from the last 7 days
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return shipmentDate >= weekAgo;
        } else if (dateFilter === 'month') {
          // Check if the shipment is from the last 30 days
          const monthAgo = new Date();
          monthAgo.setDate(now.getDate() - 30);
          return shipmentDate >= monthAgo;
        }
      }
      
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          shipment.tracking_number.toLowerCase().includes(query) ||
          shipment.origin.toLowerCase().includes(query) ||
          shipment.destination.toLowerCase().includes(query) ||
          shipment.status.toLowerCase().includes(query) ||
          (shipment.profiles?.full_name || '').toLowerCase().includes(query) ||
          (shipment.profiles?.email || '').toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  };

  // Process shipments for warehouse
  const warehouseShipments = getFilteredShipments().filter(s => 
    ['Booking Confirmed', 'Ready for Pickup', 'Processing in Warehouse (UK)'].includes(s.status)
  );
  
  // Process shipments for transit
  const transitShipments = getFilteredShipments().filter(s => 
    ['In Transit', 'Customs Clearance', 'Processing in Warehouse (ZW)'].includes(s.status)
  );
  
  // Process shipments for delivery
  const deliveryShipments = getFilteredShipments().filter(s => 
    ['Out for Delivery'].includes(s.status)
  );
  
  // Process completed shipments
  const completedShipments = getFilteredShipments().filter(s => 
    ['Delivered'].includes(s.status)
  );

  // Update shipment status
  const updateShipmentStatus = async (id: string, newStatus: string) => {
    try {
      console.log(`Updating shipment ${id} to status ${newStatus}`);
      
      const { error } = await supabase
        .from('shipments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) {
        console.error('Error updating shipment status:', error);
        throw error;
      }
      
      toast({
        title: 'Status Updated',
        description: `Shipment status updated to ${newStatus}`,
      });
      
      // Refresh the shipments data
      refetch();
      
    } catch (error: any) {
      console.error('Error updating status:', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Get status badge style based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Booking Confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{status}</Badge>;
      case 'Ready for Pickup':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{status}</Badge>;
      case 'Processing in Warehouse (UK)':
      case 'Processing in Warehouse (ZW)':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">{status}</Badge>;
      case 'Customs Clearance':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">{status}</Badge>;
      case 'In Transit':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">{status}</Badge>;
      case 'Out for Delivery':
        return <Badge className="bg-teal-100 text-teal-800 border-teal-300">{status}</Badge>;
      case 'Delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-300">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get next status options based on current status
  const getNextStatusOptions = (currentStatus: string) => {
    const statusFlow: Record<string, string[]> = {
      'Booking Confirmed': ['Ready for Pickup', 'Processing in Warehouse (UK)'],
      'Ready for Pickup': ['Processing in Warehouse (UK)'],
      'Processing in Warehouse (UK)': ['In Transit', 'Customs Clearance'],
      'In Transit': ['Customs Clearance', 'Processing in Warehouse (ZW)'],
      'Customs Clearance': ['Processing in Warehouse (ZW)'],
      'Processing in Warehouse (ZW)': ['Out for Delivery'],
      'Out for Delivery': ['Delivered'],
      'Delivered': [],
    };
    
    return statusFlow[currentStatus] || [];
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Warehouse Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Warehouse className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-2xl font-bold">{warehouseShipments.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-orange-500 mr-3" />
              <div className="text-2xl font-bold">{transitShipments.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Out for Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="h-8 w-8 text-teal-500 mr-3" />
              <div className="text-2xl font-bold">{deliveryShipments.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-2xl font-bold">{completedShipments.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Shipments Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Shipment Management</CardTitle>
              <CardDescription>View and update shipment status throughout the logistics chain</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by tracking #, customer, or destination"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 flex-col sm:flex-row">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Booking Confirmed">Booking Confirmed</SelectItem>
                  <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="Processing in Warehouse (UK)">UK Warehouse</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Customs Clearance">Customs Clearance</SelectItem>
                  <SelectItem value="Processing in Warehouse (ZW)">ZW Warehouse</SelectItem>
                  <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
              <TabsTrigger value="transit">In Transit</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {renderShipmentsTable(getFilteredShipments())}
            </TabsContent>
            
            <TabsContent value="warehouse">
              {renderShipmentsTable(warehouseShipments)}
            </TabsContent>
            
            <TabsContent value="transit">
              {renderShipmentsTable(transitShipments)}
            </TabsContent>
            
            <TabsContent value="delivery">
              {renderShipmentsTable(deliveryShipments)}
            </TabsContent>
            
            <TabsContent value="completed">
              {renderShipmentsTable(completedShipments)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Shipments Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
          <CardDescription>Latest shipment status changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : getFilteredShipments().slice(0, 5).map((shipment) => (
              <div key={shipment.id} className="flex justify-between items-center border-b pb-3">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{shipment.tracking_number}</span>
                    <span className="mx-2">•</span>
                    <span className="text-sm text-gray-500">{shipment.profiles?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    {getStatusBadge(shipment.status)}
                    <span className="text-xs text-gray-500 ml-2">
                      Updated {format(new Date(shipment.updated_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {getNextStatusOptions(shipment.status).length > 0 && (
                    <Select 
                      onValueChange={(value) => updateShipmentStatus(shipment.id, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {getNextStatusOptions(shipment.status).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
            
            {!isLoading && getFilteredShipments().length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">No shipments found</h3>
                <p className="text-gray-500 mt-1">
                  {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' 
                    ? "Try adjusting your filters" 
                    : "There are no shipments to display"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // Render shipments table
  function renderShipmentsTable(shipmentsList: Shipment[]) {
    if (isLoading) {
      return (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      );
    }
    
    if (shipmentsList.length === 0) {
      return (
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No shipments found</h3>
          <p className="text-gray-500 mt-1">
            {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' 
              ? "Try adjusting your filters" 
              : "There are no shipments in this category"}
          </p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipmentsList.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{shipment.profiles?.full_name || 'Unknown'}</div>
                    <div className="text-gray-500">{shipment.profiles?.email || 'No email'}</div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px] truncate">{shipment.origin}</TableCell>
                <TableCell className="max-w-[180px] truncate">{shipment.destination}</TableCell>
                <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  {getNextStatusOptions(shipment.status).length > 0 ? (
                    <Select 
                      onValueChange={(value) => updateShipmentStatus(shipment.id, value)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {getNextStatusOptions(shipment.status).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="ml-auto">
                      {shipment.status === 'Delivered' ? 'Completed' : 'No Actions'}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
};

export default LogisticsDashboard;
