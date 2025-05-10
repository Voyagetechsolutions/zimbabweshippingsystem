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
import { 
  Truck, 
  Package, 
  UserCheck, 
  RefreshCcw, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  UserX,
  Plus,
  Star 
} from 'lucide-react';
import { Shipment } from '@/types/shipment';
import { Driver, DriverPerformance } from '@/types/driver';
import { tableFrom } from '@/integrations/supabase/db-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

// Define types for delivery data
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
  metadata?: Record<string, any>; 
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  // Form state for adding/editing drivers
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRegion, setFormRegion] = useState('UK');

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchShipmentStats(),
        fetchDrivers(),
      ]);
    } catch (error: any) {
      console.error('Error fetching delivery data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delivery data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchShipmentStats = async () => {
    try {
      // Fetch shipments that are in delivery states or recently delivered
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .in('status', ['Out for Delivery', 'Processing in Warehouse (ZW)', 'Delivered', 'Failed Attempt'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform shipment data to delivery records with safe type handling
      const deliveryRecords: DeliveryRecord[] = (data || []).map(shipment => {
        // Safely extract recipient name
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

      setDeliveries(deliveryRecords);
    } catch (error) {
      console.error('Error fetching shipment stats:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      // First fetch all driver profiles
      const { data: driverProfilesData, error: driverProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver');
        
      if (driverProfilesError) throw driverProfilesError;
      
      // Create an array to hold all our driver data
      const driversWithPerformance: Driver[] = [];
      
      // Process each driver profile
      for (const driver of driverProfilesData || []) {
        // Get region from communication preferences
        const commPrefs = typeof driver.communication_preferences === 'object' ? 
          driver.communication_preferences : {};
        let region = 'UK'; // Default
        
        if (commPrefs && 'region' in commPrefs) {
          region = commPrefs.region as string;
        }
        
        // Check if we have performance data for this driver
        const { data: performanceData, error: performanceError } = await supabase
          .from(tableFrom('driver_performance'))
          .select('*')
          .eq('driver_id', driver.id)
          .single();
        
        const driverObj: Driver = {
          id: driver.id,
          name: driver.full_name || 'Unknown Driver',
          email: driver.email,
          region: region,
          active: true
        };
        
        // Add performance data if it exists
        if (performanceData && !performanceError) {
          driverObj.performance = performanceData as unknown as DriverPerformance;
        }
        
        driversWithPerformance.push(driverObj);
      }
      
      setDrivers(driversWithPerformance);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      // If there's an error, we can still show empty drivers list
      setDrivers([]);
    }
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
      case 'processing in warehouse (zw)':
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
      
      // Update driver performance metrics
      await updateDriverPerformanceMetrics(driverId);
      
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

  const updateDriverPerformanceMetrics = async (driverId: string) => {
    try {
      // Count deliveries for this driver
      const driverDeliveries = deliveries.filter(d => d.driver_id === driverId);
      const totalDeliveries = driverDeliveries.length;
      const completedDeliveries = driverDeliveries.filter(d => d.status === 'Delivered').length;
      const onTimeDeliveries = driverDeliveries.filter(d => d.status === 'Delivered' && d.timeliness === 'on-time').length;
      
      // Calculate rating (basic calculation as an example)
      const rating = onTimeDeliveries > 0 && completedDeliveries > 0 
        ? Math.min(5, (onTimeDeliveries / completedDeliveries) * 5) 
        : 5; // Default 5-star rating
      
      // Get the driver profile to determine region
      const { data: driverProfile } = await supabase
        .from('profiles')
        .select('communication_preferences')
        .eq('id', driverId)
        .single();
      
      let regionValue = 'UK';
      if (driverProfile && 
          driverProfile.communication_preferences && 
          typeof driverProfile.communication_preferences === 'object' &&
          'region' in driverProfile.communication_preferences) {
        regionValue = driverProfile.communication_preferences.region as string;
      }
      
      // Check if entry exists
      const { data, error: fetchError } = await supabase
        .from(tableFrom('driver_performance'))
        .select('id')
        .eq('driver_id', driverId);
        
      if (fetchError) {
        console.error('Error checking driver performance:', fetchError);
        return;
      }
      
      if (data && data.length > 0) {
        // Update existing entry
        await supabase
          .from(tableFrom('driver_performance'))
          .update({
            total_deliveries: totalDeliveries,
            completed_deliveries: completedDeliveries,
            on_time_deliveries: onTimeDeliveries,
            rating: rating,
            updated_at: new Date().toISOString()
          })
          .eq('driver_id', driverId);
      } else {
        // Create new entry
        await supabase
          .from(tableFrom('driver_performance'))
          .insert({
            driver_id: driverId,
            total_deliveries: totalDeliveries,
            completed_deliveries: completedDeliveries,
            on_time_deliveries: onTimeDeliveries,
            rating: rating,
            region: regionValue || 'UK',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      // Refresh drivers to update performance data
      await fetchDrivers();
    } catch (error) {
      console.error('Error updating driver metrics:', error);
      // We don't want to block the main flow if metrics update fails
    }
  };

  const handleAddDriver = async () => {
    try {
      if (!formName || !formEmail) {
        toast({
          title: 'Missing Information',
          description: 'Please provide name and email for the driver',
          variant: 'destructive'
        });
        return;
      }

      if (editingDriver) {
        // Update existing driver
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formName,
            email: formEmail,
            role: 'driver',
            communication_preferences: {
              region: formRegion,
              email: true,
              sms: true
            }
          })
          .eq('id', editingDriver.id);

        if (error) throw error;

        toast({
          title: 'Driver Updated',
          description: `${formName} has been updated successfully`
        });
      } else {
        // This is a new driver
        // First check if user already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', formEmail)
          .single();
          
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means not found, which is good in this case
          throw checkError;
        }
        
        if (existingUser) {
          // User exists, update role to driver
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: formName,
              role: 'driver',
              communication_preferences: {
                region: formRegion, 
                email: true,
                sms: true
              }
            })
            .eq('id', existingUser.id);
            
          if (updateError) throw updateError;
        } else {
          // Need to create a new user and profile
          // This is a complex operation that might require custom API endpoints
          // For now, we'll show a message explaining the limitation
          toast({
            title: 'Action Required',
            description: 'New drivers must first register an account in the system',
            variant: 'destructive'
          });
          return;
        }
        
        toast({
          title: 'Driver Added',
          description: `${formName} has been added as a driver`
        });
      }

      // Refresh data and close dialog
      resetDriverForm();
      setDialogOpen(false);
      fetchDrivers();
    } catch (error: any) {
      console.error('Error saving driver:', error);
      toast({
        title: 'Error',
        description: `Failed to save driver: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setFormName(driver.name);
    setFormEmail(driver.email);
    setFormRegion(driver.region || 'UK');
    setDialogOpen(true);
  };

  const resetDriverForm = () => {
    setEditingDriver(null);
    setFormName('');
    setFormEmail('');
    setFormRegion('UK');
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
                      <SelectItem value="processing in warehouse (zw)">Processing in ZW</SelectItem>
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
                              {drivers.length > 0 ? (
                                <Select 
                                  defaultValue={delivery.driver_id}
                                  onValueChange={(value) => assignDriver(delivery.id, value)}
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Assign driver">
                                      {delivery.driver_name || "Assign driver"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {drivers.map(driver => (
                                      <SelectItem key={driver.id} value={driver.id}>
                                        {driver.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
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
                              <Button variant="ghost" size="sm" onClick={() => {
                                window.location.href = `/shipment/${delivery.id}`;
                              }}>
                                View Details
                              </Button>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Driver Performance</CardTitle>
                <CardDescription>Monitor driver efficiency and delivery metrics</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetDriverForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-zim-green hover:bg-zim-green/90">
                    <Plus className="mr-2 h-4 w-4" /> Add Driver
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                    <DialogDescription>
                      {editingDriver 
                        ? 'Update the driver information' 
                        : 'Enter the details for the new driver'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Enter driver's full name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="Enter driver's email"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="region">Region</Label>
                      <Select value={formRegion} onValueChange={setFormRegion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UK">UK</SelectItem>
                          <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="bg-zim-green hover:bg-zim-green/90" onClick={handleAddDriver}>
                      {editingDriver ? 'Update Driver' : 'Add Driver'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Drivers</TabsTrigger>
                  <TabsTrigger value="uk">UK Drivers</TabsTrigger>
                  <TabsTrigger value="zimbabwe">Zimbabwe Drivers</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  {renderDriversTable(drivers)}
                </TabsContent>
                <TabsContent value="uk">
                  {renderDriversTable(drivers.filter(d => d.region === 'UK'))}
                </TabsContent>
                <TabsContent value="zimbabwe">
                  {renderDriversTable(drivers.filter(d => d.region === 'Zimbabwe'))}
                </TabsContent>
              </Tabs>
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
  
  function renderDriversTable(driversToShow: Driver[]) {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      );
    }
    
    if (driversToShow.length === 0) {
      return (
        <div className="text-center p-12">
          <UserX className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No drivers found</h3>
          <p className="text-gray-500 mb-6">
            There are currently no drivers in the system
          </p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Total Deliveries</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>On-Time Rate</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {driversToShow.map((driver) => {
              const performance = driver.performance || {
                total_deliveries: 0,
                completed_deliveries: 0,
                on_time_deliveries: 0,
                rating: 5
              };
              
              const onTimeRate = performance.completed_deliveries > 0
                ? ((performance.on_time_deliveries / performance.completed_deliveries) * 100).toFixed(0)
                : "N/A";
              
              return (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>{driver.email}</TableCell>
                  <TableCell>{driver.region || 'UK'}</TableCell>
                  <TableCell>{performance.total_deliveries}</TableCell>
                  <TableCell>{performance.completed_deliveries}</TableCell>
                  <TableCell>
                    <Badge className={
                      onTimeRate === "N/A" ? "bg-gray-100 text-gray-800" :
                      parseInt(onTimeRate) > 90 ? "bg-green-100 text-green-800" :
                      parseInt(onTimeRate) > 75 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {onTimeRate === "N/A" ? onTimeRate : `${onTimeRate}%`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="ml-
