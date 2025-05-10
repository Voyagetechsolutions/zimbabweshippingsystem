
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Truck, 
  Search, 
  Filter, 
  MoreHorizontal, 
  User,
  Package,
  FileText,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Check,
  MapPin,
  Phone,
  Star,
  FileDown,
  Plus
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shipment } from '@/types/shipment';
import { BarChart } from '@/components/ui/charts';

interface Driver {
  id: string;
  full_name: string;
  email: string;
  role: string;
  location?: string;
  phone_number?: string;
  rating?: number;
  deliveries_completed?: number;
  on_time_rate?: number;
}

interface DeliveryAssignment {
  id: string;
  shipment_id: string;
  driver_id: string;
  assigned_at: string;
  completed_at?: string;
  status: string;
  notes?: string;
  driver_name?: string;
  tracking_number?: string;
  destination?: string;
}

const DeliveryManagementTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Shipments data
  const [pendingShipments, setPendingShipments] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryAssignment[]>([]);
  
  // UI states
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Driver management states
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [driverForm, setDriverForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    location: '',
  });
  
  // Selected timeframe for performance stats
  const [timeframe, setTimeframe] = useState('week');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch shipments ready for delivery
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*, profiles:user_id(email, full_name)')
        .eq('status', 'Out for Delivery');
      
      if (shipmentsError) throw shipmentsError;
      
      // Type cast since we know the structure matches our Shipment type
      setPendingShipments(shipmentsData as unknown as Shipment[]);
      
      // 2. Fetch drivers (profiles with driver role)
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver');
      
      if (driversError) throw driversError;
      
      // Transform driver data to include performance metrics
      const enhancedDrivers: Driver[] = (driversData || []).map(driver => ({
        id: driver.id,
        full_name: driver.full_name || 'Unnamed Driver',
        email: driver.email,
        role: driver.role,
        location: driver.communication_preferences?.location || 'Unknown',
        phone_number: driver.communication_preferences?.phone || 'Not provided',
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // Random rating between 3.0-5.0 for demo
        deliveries_completed: Math.floor(Math.random() * 50) + 10, // Random number for demo
        on_time_rate: Math.round((Math.random() * 20 + 80) * 10) / 10, // 80-100% random for demo
      }));
      
      setDrivers(enhancedDrivers);
      
      // 3. Fetch delivery assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('delivery_assignments')
        .select('*, shipments:shipment_id(tracking_number, destination)')
        .order('assigned_at', { ascending: false });
      
      if (assignmentsError) {
        console.error("Error fetching delivery assignments:", assignmentsError);
        // If table doesn't exist yet, just continue
        setDeliveries([]);
      } else {
        // Process assignment data
        const processedDeliveries = (assignmentsData || []).map(assignment => ({
          id: assignment.id,
          shipment_id: assignment.shipment_id,
          driver_id: assignment.driver_id,
          assigned_at: assignment.assigned_at,
          completed_at: assignment.completed_at,
          status: assignment.status,
          notes: assignment.notes,
          driver_name: assignment.driver_name,
          tracking_number: assignment.shipments?.tracking_number,
          destination: assignment.shipments?.destination
        }));
        
        setDeliveries(processedDeliveries);
      }
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

  const assignDelivery = async () => {
    if (!selectedShipment || !selectedDriver) {
      toast({
        title: 'Missing information',
        description: 'Please select both a shipment and a driver',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Get driver details
      const driverInfo = drivers.find(d => d.id === selectedDriver);
      
      if (!driverInfo) throw new Error('Driver not found');
      
      // 2. Update shipment metadata to include delivery driver info
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('metadata')
        .eq('id', selectedShipment.id)
        .single();
      
      if (shipmentError) throw shipmentError;
      
      // Prepare updated metadata with delivery information
      const metadata = typeof shipment.metadata === 'object' && shipment.metadata !== null
        ? { ...shipment.metadata }
        : {};
      
      if (!metadata.delivery) {
        metadata.delivery = {};
      }
      
      // Add delivery driver information
      metadata.delivery = {
        ...metadata.delivery,
        driver_id: selectedDriver,
        driver_name: driverInfo.full_name,
        assigned_at: new Date().toISOString(),
        notes: assignmentNotes,
      };
      
      // 3. Update the shipment metadata
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ metadata })
        .eq('id', selectedShipment.id);
      
      if (updateError) throw updateError;
      
      // 4. Create delivery assignment record
      // Check if the delivery_assignments table exists, if not try to create it
      let tableExists = true;
      
      try {
        // Try to query the table
        const { error: checkError } = await supabase
          .from('delivery_assignments')
          .select('id')
          .limit(1);
        
        if (checkError && checkError.message.includes('relation "delivery_assignments" does not exist')) {
          tableExists = false;
        }
      } catch (error) {
        tableExists = false;
      }
      
      if (tableExists) {
        const { error: assignmentError } = await supabase
          .from('delivery_assignments')
          .insert({
            shipment_id: selectedShipment.id,
            driver_id: selectedDriver,
            driver_name: driverInfo.full_name,
            assigned_at: new Date().toISOString(),
            status: 'assigned',
            notes: assignmentNotes
          });
        
        if (assignmentError) {
          console.error('Error creating assignment record:', assignmentError);
          // Continue anyway since we updated the shipment metadata
        }
      }
      
      // 5. Success
      toast({
        title: 'Delivery Assigned',
        description: `Shipment assigned to ${driverInfo.full_name} successfully`,
      });
      
      // 6. Refresh data
      fetchData();
      
      // 7. Reset form and close dialog
      setAssignmentNotes('');
      setSelectedDriver('');
      setSelectedShipment(null);
      setShowAssignmentDialog(false);
      
    } catch (error: any) {
      console.error('Error assigning delivery:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign delivery',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new driver
  const addNewDriver = async () => {
    const { full_name, email, phone_number, location } = driverForm;
    
    if (!full_name || !email) {
      toast({
        title: 'Missing information',
        description: 'Please provide driver name and email',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Create or update the profile with the driver role
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          email,
          full_name,
          role: 'driver',
          communication_preferences: {
            email: true,
            sms: true,
            phone: phone_number,
            location: location
          }
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // 2. Add the driver to our local state
      const newDriver: Driver = {
        id: data.id,
        full_name: data.full_name || 'Unnamed Driver',
        email: data.email,
        role: 'driver',
        phone_number: phone_number || 'Not provided',
        location: location || 'Unknown',
        rating: 5.0,
        deliveries_completed: 0,
        on_time_rate: 100
      };
      
      setDrivers([...drivers, newDriver]);
      
      // 3. Reset form and close dialog
      setDriverForm({
        full_name: '',
        email: '',
        phone_number: '',
        location: '',
      });
      setShowDriverDialog(false);
      
      toast({
        title: 'Driver Added',
        description: `${full_name} has been added as a driver`,
      });
      
    } catch (error: any) {
      console.error('Error adding driver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add driver',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter pending shipments based on search
  const filteredShipments = pendingShipments.filter(shipment => {
    const searchLower = searchQuery.toLowerCase();
    return (
      shipment.tracking_number.toLowerCase().includes(searchLower) ||
      shipment.destination.toLowerCase().includes(searchLower) ||
      (shipment.profiles?.full_name && shipment.profiles.full_name.toLowerCase().includes(searchLower)) ||
      (shipment.profiles?.email && shipment.profiles.email.toLowerCase().includes(searchLower))
    );
  });
  
  // Filter drivers based on search
  const filteredDrivers = drivers.filter(driver => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      driver.full_name.toLowerCase().includes(searchLower) ||
      driver.email.toLowerCase().includes(searchLower) ||
      (driver.location && driver.location.toLowerCase().includes(searchLower))
    );
  });

  // Get performance data
  const getPerformanceData = () => {
    // We'd typically fetch this from the server based on timeframe
    // For now, generate some example data
    const performanceData = [
      { name: 'On-Time Rate', value: 92 },
      { name: 'Customer Rating', value: 4.7 * 20 }, // Scale 0-5 to 0-100
      { name: 'Completion Rate', value: 98 },
    ];
    
    return performanceData;
  };
  
  // Get driver performance chart data
  const getDriverPerformanceData = () => {
    // Generate data for each driver (limited to top 5 for chart readability)
    return drivers
      .slice(0, 5)
      .map(driver => ({
        name: driver.full_name.split(' ')[0], // Just first name for chart display
        onTime: driver.on_time_rate || 0,
        rating: (driver.rating || 0) * 20, // Scale 0-5 to 0-100
        deliveries: Math.min(100, ((driver.deliveries_completed || 0) / 50) * 100) // Scale based on max 50 deliveries
      }));
  };

  return (
    <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6 grid w-full grid-cols-3">
        <TabsTrigger value="pending" className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          <span>Pending Deliveries</span>
        </TabsTrigger>
        <TabsTrigger value="performance" className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          <span>Driver Performance</span>
        </TabsTrigger>
        <TabsTrigger value="drivers" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>Driver Management</span>
        </TabsTrigger>
      </TabsList>
      
      {/* Pending Deliveries Tab */}
      <TabsContent value="pending">
        <Card>
          <CardHeader>
            <CardTitle>Pending Deliveries</CardTitle>
            <CardDescription>
              Shipments that are out for delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search deliveries by tracking # or destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={fetchData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="text-center p-12">
                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No pending deliveries</h3>
                <p className="text-gray-500">
                  {searchQuery ? 
                    "Try adjusting your search query" : 
                    "There are no shipments out for delivery at the moment"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Driver</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment) => {
                      // Extract delivery info from metadata
                      const deliveryInfo = shipment.metadata && 
                                         typeof shipment.metadata === 'object' && 
                                         shipment.metadata !== null && 
                                         'delivery' in shipment.metadata ? 
                                           shipment.metadata.delivery : null;
                      
                      return (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                          <TableCell>
                            {shipment.profiles?.full_name || shipment.profiles?.email || "Unknown Customer"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{shipment.destination}</TableCell>
                          <TableCell>
                            <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">
                              Out for Delivery
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {deliveryInfo && deliveryInfo.driver_name ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span>{deliveryInfo.driver_name}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                Not Assigned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!deliveryInfo || !deliveryInfo.driver_name ? (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedShipment(shipment);
                                  setShowAssignmentDialog(true);
                                }}
                              >
                                Assign Driver
                              </Button>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark as Delivered
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <User className="h-4 w-4 mr-2" />
                                    Reassign Driver
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
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
      
      {/* Driver Performance Tab */}
      <TabsContent value="performance">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <CardTitle>Driver Performance</CardTitle>
                <CardDescription>
                  Monitor delivery performance metrics
                </CardDescription>
              </div>
              
              <Select 
                value={timeframe}
                onValueChange={setTimeframe}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <div className="text-center p-12">
                <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No drivers available</h3>
                <p className="text-gray-500">
                  Add drivers to see performance metrics
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setActiveTab('drivers');
                    setShowDriverDialog(true);
                  }}
                >
                  Add Drivers
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Overall Performance Chart */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Overall Fleet Performance</h3>
                  <div className="h-80">
                    <BarChart
                      data={getPerformanceData()}
                      index="name"
                      categories={['value']}
                      valueFormatter={(value) => `${value}%`}
                      className="h-80"
                    />
                  </div>
                </div>
                
                {/* Driver Comparison Chart */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Driver Comparison</h3>
                  <div className="h-80">
                    <BarChart
                      data={getDriverPerformanceData()}
                      index="name"
                      categories={['onTime', 'rating', 'deliveries']}
                      valueFormatter={(value) => `${value}%`}
                      className="h-80"
                    />
                  </div>
                </div>
                
                {/* Driver Performance Table */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Individual Performance</h3>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Driver</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Deliveries Completed</TableHead>
                          <TableHead>On-Time Rate</TableHead>
                          <TableHead>Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.map((driver) => (
                          <TableRow key={driver.id}>
                            <TableCell>
                              <div className="font-medium">{driver.full_name}</div>
                              <div className="text-sm text-gray-500">{driver.email}</div>
                            </TableCell>
                            <TableCell>
                              {driver.location || 'Unknown'}
                            </TableCell>
                            <TableCell>{driver.deliveries_completed || 0}</TableCell>
                            <TableCell>
                              <Badge className={`${
                                (driver.on_time_rate || 0) > 90 
                                  ? 'bg-green-100 text-green-800' 
                                  : (driver.on_time_rate || 0) > 80 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {driver.on_time_rate || 0}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium mr-1">{driver.rating || 0}</span>
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export Performance Report
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Driver Management Tab */}
      <TabsContent value="drivers">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <CardTitle>Driver Management</CardTitle>
                <CardDescription>
                  Manage delivery drivers and their assignments
                </CardDescription>
              </div>
              
              <Button onClick={() => setShowDriverDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search drivers by name, email or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button 
                variant="outline" 
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center p-12">
                <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No drivers found</h3>
                <p className="text-gray-500">
                  {searchQuery ? 
                    "Try adjusting your search query" : 
                    "There are no drivers added yet"}
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setShowDriverDialog(true)}
                >
                  Add Driver
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell>
                          <div className="font-medium">{driver.full_name}</div>
                          <div className="text-sm text-gray-500">{driver.email}</div>
                        </TableCell>
                        <TableCell>
                          {driver.phone_number && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-gray-500" />
                              <span>{driver.phone_number}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-gray-500" />
                            <span>{driver.location || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{driver.rating || 'N/A'}</span>
                            {driver.rating && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                          </div>
                          <div className="text-xs text-gray-500">
                            {driver.deliveries_completed || 0} deliveries completed
                          </div>
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
                              <DropdownMenuItem>
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                View Assignments
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Performance Report
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                Deactivate Driver
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

      {/* Driver Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Delivery Driver</DialogTitle>
            <DialogDescription>
              Select a driver to handle this delivery
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedShipment && (
              <>
                <div className="grid grid-cols-2 gap-2 border-b pb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tracking #:</p>
                    <p className="font-mono">{selectedShipment.tracking_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Customer:</p>
                    <p>{selectedShipment.profiles?.full_name || selectedShipment.profiles?.email || "Unknown"}</p>
                  </div>
                  <div className="col-span-2 mt-2">
                    <p className="text-sm font-medium text-gray-500">Destination:</p>
                    <p>{selectedShipment.destination}</p>
                  </div>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="driver">Select Driver</Label>
              <Select 
                value={selectedDriver} 
                onValueChange={setSelectedDriver}
              >
                <SelectTrigger id="driver">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.full_name} {driver.location && `(${driver.location})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {drivers.length === 0 && (
                <p className="text-sm text-amber-500 mt-2">
                  No drivers available. Please add drivers first.
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="notes">Delivery Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions for the driver..."
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAssignmentDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={assignDelivery}
              disabled={isSubmitting || !selectedDriver}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Assign Delivery
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Driver Dialog */}
      <Dialog open={showDriverDialog} onOpenChange={setShowDriverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>
              Enter the driver details to add them to the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="driver-name">Full Name</Label>
              <Input
                id="driver-name"
                placeholder="John Smith"
                value={driverForm.full_name}
                onChange={(e) => setDriverForm({...driverForm, full_name: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="driver-email">Email Address</Label>
              <Input
                id="driver-email"
                type="email"
                placeholder="john.smith@example.com"
                value={driverForm.email}
                onChange={(e) => setDriverForm({...driverForm, email: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="driver-phone">Phone Number</Label>
              <Input
                id="driver-phone"
                placeholder="+1 (234) 567-8901"
                value={driverForm.phone_number}
                onChange={(e) => setDriverForm({...driverForm, phone_number: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="driver-location">Location/Base</Label>
              <Input
                id="driver-location"
                placeholder="London, UK"
                value={driverForm.location}
                onChange={(e) => setDriverForm({...driverForm, location: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDriverDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={addNewDriver}
              disabled={isSubmitting || !driverForm.full_name || !driverForm.email}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Driver
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default DeliveryManagementTab;
