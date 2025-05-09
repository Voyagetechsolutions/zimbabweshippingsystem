
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

// Define types for driver and delivery data
interface Driver {
  id: string;
  name: string;
  total_deliveries: number;
  on_time_rate: number;
  active: boolean;
}

interface Delivery {
  id: string;
  tracking_number: string;
  driver_id: string;
  driver_name: string;
  status: string;
  delivery_date: string;
  recipient_name: string;
  timeliness: 'on-time' | 'late' | 'failed';
}

const DeliveryManagementTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('monitor');
  const [timeFilter, setTimeFilter] = useState('week');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Simulated data - in a real app, this would come from the database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real implementation, you would fetch this data from your database
        // For demo purposes, we'll use mock data
        const mockDrivers: Driver[] = [
          { id: 'd1', name: 'John Smith', total_deliveries: 28, on_time_rate: 95, active: true },
          { id: 'd2', name: 'Maria Garcia', total_deliveries: 35, on_time_rate: 98, active: true },
          { id: 'd3', name: 'Robert Johnson', total_deliveries: 19, on_time_rate: 87, active: true }
        ];
        
        const mockDeliveries: Delivery[] = [
          { 
            id: 'del1', 
            tracking_number: 'ZIMSHIP-12345', 
            driver_id: 'd1', 
            driver_name: 'John Smith',
            status: 'Delivered', 
            delivery_date: '2025-05-07T14:30:00', 
            recipient_name: 'Alice Moyo', 
            timeliness: 'on-time' 
          },
          { 
            id: 'del2', 
            tracking_number: 'ZIMSHIP-23456', 
            driver_id: 'd2', 
            driver_name: 'Maria Garcia',
            status: 'Out for Delivery', 
            delivery_date: '2025-05-09T11:00:00', 
            recipient_name: 'Thomas Ncube', 
            timeliness: 'on-time' 
          },
          { 
            id: 'del3', 
            tracking_number: 'ZIMSHIP-34567', 
            driver_id: 'd3', 
            driver_name: 'Robert Johnson',
            status: 'Failed Attempt', 
            delivery_date: '2025-05-08T16:15:00', 
            recipient_name: 'Grace Mutasa', 
            timeliness: 'failed' 
          },
          { 
            id: 'del4', 
            tracking_number: 'ZIMSHIP-45678', 
            driver_id: 'd1', 
            driver_name: 'John Smith',
            status: 'Delivered', 
            delivery_date: '2025-05-08T09:20:00', 
            recipient_name: 'David Shumba', 
            timeliness: 'late' 
          }
        ];

        // In production, you'd fetch from Supabase here
        // const { data: driversData, error: driversError } = await supabase
        //   .from('drivers')
        //   .select('*');
        
        // if (driversError) throw driversError;
        
        setDrivers(mockDrivers);
        setDeliveries(mockDeliveries);
      } catch (error) {
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

    fetchData();
  }, [toast]);

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
      delivery.recipient_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      delivery.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const assignDriver = (deliveryId: string, driverId: string) => {
    // In a real implementation, you would update the database
    toast({
      title: 'Driver assigned',
      description: 'The delivery has been assigned to a new driver',
    });
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
                      <SelectItem value="failed attempt">Failed Attempt</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
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
                    }}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reset
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
                        <TableHead>Timeliness</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell className="font-mono">{delivery.tracking_number}</TableCell>
                          <TableCell>{delivery.recipient_name}</TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(delivery.status)}>
                              {delivery.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(delivery.delivery_date), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="flex items-center">
                            {getTimelinessIcon(delivery.timeliness)}
                            <span className="ml-2">
                              {delivery.timeliness === 'on-time' ? 'On time' : 
                               delivery.timeliness === 'late' ? 'Late' : 'Failed'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">View Details</Button>
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

        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Driver Performance</CardTitle>
              <CardDescription>Monitor driver efficiency and delivery metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver Name</TableHead>
                      <TableHead>Total Deliveries</TableHead>
                      <TableHead>On-Time Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.total_deliveries}</TableCell>
                        <TableCell>{driver.on_time_rate}%</TableCell>
                        <TableCell>
                          <Badge className={driver.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {driver.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View Details</Button>
                          <Button variant="ghost" size="sm">Assign Tasks</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
