import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Truck, Package, UserCheck, RefreshCcw, Search, Filter, CheckCircle, XCircle, AlertCircle, UserX } from 'lucide-react';
import { Shipment } from '@/types/shipment';

// Define types for driver and delivery data
interface Driver {
  id: string;
  name: string;
  total_deliveries?: number;
  on_time_rate?: number;
  active: boolean;
}

// Update DeliveryRecord to use proper typing for metadata
interface DeliveryRecord {
  id: string;
  tracking_number: string;
  driver_id?: string; 
  driver_name?: string;
  status: string;
  delivery_date?: string;
  recipient_name: string;
  timeliness?: 'on-time' | 'late' | 'failed';
  origin: string;
  destination: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>; // Using Record for metadata to avoid type issues
}

// Type guard to check if a value is a valid object
function isValidObject(obj: any): obj is Record<string, any> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

// Helper function to safely extract values from nested objects
const safeGet = (obj: any, path: string[], defaultValue: any = undefined): any => {
  if (!isValidObject(obj)) return defaultValue;
  
  let current = obj;
  for (const key of path) {
    if (!isValidObject(current) || !(key in current)) return defaultValue;
    current = current[key];
  }
  return current;
};

const DeliveryManagementTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('monitor');
  const [timeFilter, setTimeFilter] = useState('week');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch shipments that are in delivery states
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['Out for Delivery', 'Processing in ZW Warehouse', 'Delivered', 'Failed Attempt'])
        .order('created_at', { ascending: false });

      if (shipmentError) throw shipmentError;

      // Transform shipment data to delivery records with safe type handling
      const deliveryRecords: DeliveryRecord[] = (shipmentData || []).map(shipment => {
        // Safely extract recipient name using our helper function
        let recipientName = 'No Name Provided';
        
        // Ensure metadata is an object before trying to access properties
        const metadata = isValidObject(shipment.metadata) ? shipment.metadata : {};
        
        // Try different paths to get recipient name
        const recipientFromRecipient = safeGet(metadata, ['recipient', 'name'], null);
        const recipientFromFirstLastName = safeGet(metadata, ['recipient', 'firstName'], null) && 
          safeGet(metadata, ['recipient', 'lastName'], null) ? 
          `${safeGet(metadata, ['recipient', 'firstName'], '')} ${safeGet(metadata, ['recipient', 'lastName'], '')}`.trim() : 
          null;
        
        const recipientFromRecipientDetails = safeGet(metadata, ['recipientDetails', 'name'], null);
        const recipientFromDetailsFirstLastName = safeGet(metadata, ['recipientDetails', 'firstName'], null) && 
          safeGet(metadata, ['recipientDetails', 'lastName'], null) ? 
          `${safeGet(metadata, ['recipientDetails', 'firstName'], '')} ${safeGet(metadata, ['recipientDetails', 'lastName'], '')}`.trim() : 
          null;
        
        // Try to get recipient name from different paths
        if (recipientFromRecipient) {
          recipientName = recipientFromRecipient;
        } else if (recipientFromFirstLastName) {
          recipientName = recipientFromFirstLastName;
        } else if (recipientFromRecipientDetails) {
          recipientName = recipientFromRecipientDetails;
        } else if (recipientFromDetailsFirstLastName) {
          recipientName = recipientFromDetailsFirstLastName;
        } else if (safeGet(metadata, ['recipientName'], null)) {
          recipientName = safeGet(metadata, ['recipientName'], 'No Name Provided');
        }
        
        // Safely extract delivery info
        const deliveryInfo = safeGet(metadata, ['delivery'], {});
        
        return {
          id: shipment.id,
          tracking_number: shipment.tracking_number,
          status: shipment.status,
          delivery_date: safeGet(deliveryInfo, ['date'], shipment.updated_at),
          recipient_name: recipientName,
          origin: shipment.origin,
          destination: shipment.destination,
          timeliness: getTimeliness(shipment),
          created_at: shipment.created_at,
          updated_at: shipment.updated_at,
          driver_id: safeGet(deliveryInfo, ['driver_id'], undefined),
          driver_name: safeGet(deliveryInfo, ['driver_name'], undefined),
          metadata: isValidObject(shipment.metadata) ? shipment.metadata : {}
        };
      });

      // Fetch active drivers from profiles table
      const { data: driverData, error: driverError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver');

      if (driverError) {
        // If there's an error fetching drivers, we can still show the delivery data
        console.error('Error fetching drivers:', driverError);
        setDrivers([]);
      } else {
        const formattedDrivers: Driver[] = (driverData || []).map(driver => ({
          id: driver.id,
          name: driver.full_name || 'Unknown Driver',
          active: true
        }));
        setDrivers(formattedDrivers);
      }

      setDeliveries(deliveryRecords);
    } catch (error: any) {
      console.error('Error fetching delivery data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delivery data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract recipient name from shipment metadata
  const getRecipientName = (shipment: any): string => {
    const metadata = shipment.metadata || {};
    
    if (typeof metadata !== 'object') {
      return 'No Name Provided';
    }
    
    if (safeGet(metadata, ['recipientDetails', 'name'])) {
      return metadata.recipientDetails.name;
    } else if (safeGet(metadata, ['recipient', 'name'])) {
      return metadata.recipient.name;
    } else if (safeGet(metadata, ['recipient', 'firstName']) && safeGet(metadata, ['recipient', 'lastName'])) {
      return `${metadata.recipient.firstName} ${metadata.recipient.lastName}`;
    } else if (metadata.recipientName) {
      return metadata.recipientName;
    }
    
    return 'No Name Provided';
  };

  // Determine timeliness based on shipment data
  const getTimeliness = (shipment: any): 'on-time' | 'late' | 'failed' => {
    if (shipment.status === 'Failed Attempt') {
      return 'failed';
    }
    
    // Check if delivery was late based on metadata
    const metadata = isValidObject(shipment.metadata) ? shipment.metadata : {};
    
    // Safely check if delivery is marked as late
    const isLate = safeGet(metadata, ['delivery', 'isLate'], false);
    
    return isLate ? 'late' : 'on-time';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'out for delivery':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'failed attempt':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'returned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'processing in zw warehouse':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getTimelinessIcon = (timeliness: string) => {
    switch (timeliness) {
      case 'on-time':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = searchQuery === '' || 
      delivery.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.destination.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      delivery.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const assignDriver = async (deliveryId: string, driverId: string) => {
    try {
      // Get the shipment
      const { data: shipment, error: fetchError } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', deliveryId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Get the driver's name
      const { data: driver, error: driverError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', driverId)
        .single();
        
      if (driverError) throw driverError;
      
      // Safely prepare the updated metadata
      const existingMetadata = isValidObject(shipment.metadata) ? shipment.metadata : {};
      const existingDelivery = safeGet(existingMetadata, ['delivery'], {});
      
      const updatedMetadata = {
        ...existingMetadata,
        delivery: {
          ...existingDelivery,
          driver_id: driverId,
          driver_name: driver.full_name,
          assigned_at: new Date().toISOString()
        }
      };
      
      // Update the shipment
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', deliveryId);
        
      if (updateError) throw updateError;
      
      // Success message
      toast({
        title: 'Driver assigned',
        description: `The delivery has been assigned to ${driver.full_name}`,
      });
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error assigning driver:', error);
      toast({
        title: 'Assignment failed',
        description: 'Failed to assign driver: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span>Monitor Deliveries</span>
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            <span>Driver Performance</span>
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Issues & Complaints</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Monitoring</CardTitle>
              <CardDescription>Track and manage all deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Search by tracking # or recipient..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="flex gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="out for delivery">Out for Delivery</SelectItem>
                      <SelectItem value="processing in zw warehouse">Processing in ZW</SelectItem>
                      <SelectItem value="failed attempt">Failed Attempt</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Time period" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setTimeFilter('week');
                      fetchData();
                    }}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : filteredDeliveries.length === 0 ? (
                <div className="text-center p-12">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No deliveries found</h3>
                  <p className="text-gray-500">
                    Try adjusting your filters to see more results
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Tracking #</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveries.map((delivery) => {
                        // Format the delivery date 
                        const formattedDate = delivery.delivery_date
                          ? format(new Date(delivery.delivery_date), 'MMM d, yyyy')
                          : 'Not scheduled';
                            
                        return (
                          <TableRow key={delivery.id}>
                            <TableCell className="font-mono">{delivery.tracking_number}</TableCell>
                            <TableCell>{delivery.recipient_name}</TableCell>
                            <TableCell>
                              {drivers.length > 0 && (
                                <Select 
                                  defaultValue={delivery.driver_id}
                                  onValueChange={(value) => assignDriver(delivery.id, value)}
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Assign driver" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {drivers.map(driver => (
                                      <SelectItem key={driver.id} value={driver.id}>
                                        {driver.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {drivers.length === 0 && (
                                <span className="text-sm text-gray-500">No drivers available</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeClass(delivery.status)}>
                                {delivery.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formattedDate}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {delivery.destination}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">View Details</Button>
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
        </TabsContent>

        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Driver Performance</CardTitle>
              <CardDescription>Monitor driver efficiency and delivery metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {drivers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Assigned Deliveries</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drivers.map((driver) => {
                        // Count assigned deliveries for this driver
                        const assignedDeliveries = deliveries.filter(d => {
                          return d.driver_id === driver.id;
                        }).length;
                        
                        return (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">{driver.name}</TableCell>
                            <TableCell>{assignedDeliveries}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">View Details</Button>
                              <Button variant="ghost" size="sm">Assign Tasks</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center p-12">
                  <UserX className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No drivers found</h3>
                  <p className="text-gray-500 mb-6">
                    There are currently no drivers in the system
                  </p>
                  <Button variant="outline">
                    Add New Driver
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Issues & Complaints</CardTitle>
              <CardDescription>Track and resolve delivery-related issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-orange-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">No active issues</h3>
                <p className="text-gray-500 mb-6">
                  There are currently no reported issues or complaints
                </p>
                <Button variant="outline">
                  View Resolved Issues
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default DeliveryManagementTab;
