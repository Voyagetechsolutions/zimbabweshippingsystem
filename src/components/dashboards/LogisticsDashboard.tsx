
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, Package, Calendar, Users, MapPin, BarChart3, 
  FileText, Clock, Filter, AlertTriangle, Download,
  Printer, Send, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ShipmentStatus } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const LogisticsDashboard = () => {
  const [shipments, setShipments] = useState<any[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    booked: 0,
    inTransit: 0,
    delivered: 0,
    capacity: 0
  });
  const [collectionSchedules, setCollectionSchedules] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showShipmentDetails, setShowShipmentDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogisticsData();
  }, []);

  useEffect(() => {
    // Apply filters whenever shipments, status filter or search term changes
    filterShipments();
  }, [shipments, statusFilter, searchTerm]);

  const fetchLogisticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch all shipments
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setShipments(data || []);
      
      // Compute stats
      if (data) {
        const totalCount = data.length;
        const bookedCount = data.filter(s => ['Booked', 'Paid', 'Processing'].includes(s.status)).length;
        const inTransitCount = data.filter(s => ['In Transit', 'Out for Delivery'].includes(s.status)).length;
        const deliveredCount = data.filter(s => s.status === 'Delivered').length;
        
        // Rough capacity calculation (% of total items currently in transit)
        const capacityUtilized = Math.min(Math.round((inTransitCount / totalCount) * 100), 100);
        
        setStats({
          total: totalCount,
          booked: bookedCount,
          inTransit: inTransitCount,
          delivered: deliveredCount,
          capacity: capacityUtilized
        });
      }
      
      // Fetch collection schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });

      if (scheduleError) throw scheduleError;
      setCollectionSchedules(scheduleData || []);
      
    } catch (error: any) {
      console.error('Error fetching logistics data:', error);
      toast({
        title: 'Error fetching data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterShipments = () => {
    let filtered = [...shipments];
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        (s.tracking_number && s.tracking_number.toLowerCase().includes(term)) ||
        (s.origin && s.origin.toLowerCase().includes(term)) ||
        (s.destination && s.destination.toLowerCase().includes(term))
      );
    }
    
    setFilteredShipments(filtered);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const viewShipmentDetails = (shipment: any) => {
    setSelectedShipment(shipment);
    setShowShipmentDetails(true);
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'Booked':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Booked</Badge>;
      case 'Paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case 'Processing':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Processing</Badge>;
      case 'Ready for Pickup':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Ready for Pickup</Badge>;
      case 'In Transit':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">In Transit</Badge>;
      case 'Out for Delivery':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Out for Delivery</Badge>;
      case 'Delivered':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
      case 'Cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecipientInfo = (shipment: any) => {
    if (shipment.metadata && typeof shipment.metadata === 'object') {
      const name = shipment.metadata.recipient_name;
      const phone = shipment.metadata.recipient_phone;
      
      return { 
        name: name || 'Not specified', 
        phone: phone || 'Not specified' 
      };
    }
    return { name: 'Not specified', phone: 'Not specified' };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    
    try {
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };

  const handleExportData = () => {
    try {
      // Create CSV data
      const headers = ['Tracking Number', 'Status', 'Origin', 'Destination', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...filteredShipments.map(s => {
          return [
            s.tracking_number,
            s.status,
            s.origin,
            s.destination,
            new Date(s.created_at).toLocaleDateString()
          ].join(',');
        })
      ].join('\n');
      
      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `logistics-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Export Successful',
        description: 'The logistics report has been downloaded.',
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Shipments
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground">
              Shipments in transit
            </p>
            <div className="mt-4">
              <Progress value={stats.capacity} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.capacity}% of shipping capacity utilized
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Shipments
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.booked}</div>
            <p className="text-xs text-muted-foreground">
              Waiting to be dispatched
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Deliveries
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered packages
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Activity
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All-time shipments
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Logistics Reminders</h3>
            <p className="text-sm text-blue-700">
              Next UK-Zimbabwe shipment departs in 3 days. Ensure all packages are processed by tomorrow.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="shipments">
        <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-2 md:grid-cols-none h-auto md:h-10">
          <TabsTrigger value="shipments" className="py-2">Shipment Management</TabsTrigger>
          <TabsTrigger value="schedule" className="py-2">Collection Schedules</TabsTrigger>
          <TabsTrigger value="reports" className="py-2">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipments" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by tracking number, origin, or destination..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Booked">Booked</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                <SelectItem value="In Transit">In Transit</SelectItem>
                <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportData} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Shipment Management</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : filteredShipments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Tracking</th>
                        <th className="text-left py-3 px-2">Origin</th>
                        <th className="text-left py-3 px-2">Destination</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Created</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.slice(0, 10).map((shipment) => (
                        <tr key={shipment.id} className="border-b">
                          <td className="py-3 px-2">{shipment.tracking_number}</td>
                          <td className="py-3 px-2 max-w-[150px] truncate">{shipment.origin}</td>
                          <td className="py-3 px-2 max-w-[150px] truncate">{shipment.destination}</td>
                          <td className="py-3 px-2">{getStatusBadge(shipment.status)}</td>
                          <td className="py-3 px-2">{formatDate(shipment.created_at).split(',')[0]}</td>
                          <td className="py-3 px-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewShipmentDetails(shipment)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredShipments.length > 10 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Showing 10 of {filteredShipments.length} shipments.
                      </p>
                      <Button variant="link" size="sm">
                        View All Shipments
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No shipments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule" className="space-y-4">
          <div className="flex justify-between mb-4">
            <h3 className="text-xl font-semibold">Collection Schedules</h3>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Add Schedule</span>
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : collectionSchedules.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4">Route</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Areas</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectionSchedules.map((schedule) => (
                        <tr key={schedule.id} className="border-t">
                          <td className="py-3 px-4 font-medium">{schedule.route}</td>
                          <td className="py-3 px-4">{schedule.pickup_date}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(schedule.areas) && schedule.areas.slice(0, 3).map((area: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="bg-gray-100">
                                  {area}
                                </Badge>
                              ))}
                              {Array.isArray(schedule.areas) && schedule.areas.length > 3 && (
                                <Badge variant="outline" className="bg-gray-100">
                                  +{schedule.areas.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Send className="h-3 w-3" />
                                <span>Notify</span>
                              </Button>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>Details</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No collection schedules found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipment Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">Shipment volume analytics will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Delivery Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <Clock className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">Delivery time analytics will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Monthly Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-md">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-3" />
                    <div>
                      <h4 className="font-medium">March 2025 Logistics Summary</h4>
                      <p className="text-sm text-gray-500">Generated on April 1, 2025</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-4 border rounded-md">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-3" />
                    <div>
                      <h4 className="font-medium">February 2025 Logistics Summary</h4>
                      <p className="text-sm text-gray-500">Generated on March 1, 2025</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Shipment Details Dialog */}
      <Dialog open={showShipmentDetails} onOpenChange={setShowShipmentDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Shipment Details</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tracking Number</p>
                  <p className="font-medium">{selectedShipment.tracking_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div>{getStatusBadge(selectedShipment.status)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Origin</p>
                  <p className="font-medium">{selectedShipment.origin}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-medium">{selectedShipment.destination}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{formatDate(selectedShipment.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="font-medium">{formatDate(selectedShipment.updated_at)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Recipient Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{getRecipientInfo(selectedShipment).name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{getRecipientInfo(selectedShipment).phone}</p>
                  </div>
                </div>
              </div>
              
              {selectedShipment.metadata?.delivery_image && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Delivery Image</p>
                  <img 
                    src={selectedShipment.metadata.delivery_image} 
                    alt="Delivery confirmation" 
                    className="w-full h-auto max-h-48 object-contain rounded-md border"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowShipmentDetails(false)}
            >
              Close
            </Button>
            <Button 
              type="button"
              onClick={() => {
                // Handle printing or PDF generation here
                toast({
                  title: 'Feature Coming Soon',
                  description: 'Printing function will be available in a future update.',
                });
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogisticsDashboard;
