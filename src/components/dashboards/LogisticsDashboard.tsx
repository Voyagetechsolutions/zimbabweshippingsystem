
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, Package, Calendar, Users, MapPin, BarChart3, 
  FileText, Clock, Filter, AlertTriangle, Download,
  Printer, Send, Search, Plus, Mail
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    route: '',
    pickup_date: '',
    areas: [] as string[]
  });
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [newArea, setNewArea] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
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
        const bookedCount = data.filter(s => ['Booking Confirmed', 'Paid', 'Processing'].includes(s.status)).length;
        const inTransitCount = data.filter(s => [
          'In Transit', 
          'Out for Delivery', 
          'Processing in Warehouse (UK)', 
          'Customs Clearance', 
          'Processing in Warehouse (ZW)'
        ].includes(s.status)).length;
        const deliveredCount = data.filter(s => s.status === 'Delivered').length;
        
        // Rough capacity calculation (% of total items currently in transit)
        const capacityUtilized = inTransitCount > 0 
          ? Math.min(Math.round((inTransitCount / Math.max(totalCount, 1)) * 100), 100) 
          : 0;
        
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

  const handleAddSchedule = () => {
    setNewSchedule({
      route: '',
      pickup_date: '',
      areas: []
    });
    setShowScheduleDialog(true);
  };

  const handleAddArea = () => {
    if (newArea.trim() !== '') {
      setNewSchedule(prev => ({
        ...prev,
        areas: [...prev.areas, newArea.trim()]
      }));
      setNewArea('');
    }
  };

  const handleRemoveArea = (index: number) => {
    setNewSchedule(prev => ({
      ...prev,
      areas: prev.areas.filter((_, i) => i !== index)
    }));
  };

  const handleScheduleSubmit = async () => {
    // Validate input
    if (!newSchedule.route || !newSchedule.pickup_date || newSchedule.areas.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      setScheduleSaving(true);
      const { data, error } = await supabase
        .from('collection_schedules')
        .insert([{
          route: newSchedule.route,
          pickup_date: newSchedule.pickup_date,
          areas: newSchedule.areas
        }])
        .select();

      if (error) throw error;

      toast({
        title: 'Schedule Added',
        description: 'Collection schedule has been successfully added',
      });

      setShowScheduleDialog(false);
      fetchLogisticsData(); // Refresh data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleOpenNotifyDialog = (schedule: any) => {
    setSelectedSchedule(schedule);
    setNotificationMessage(`Important: Collection in ${schedule.route} scheduled for ${schedule.pickup_date}. Please prepare your packages for pickup. Areas covered: ${schedule.areas.join(', ')}.`);
    setShowNotifyDialog(true);
  };

  const handleSendNotification = async () => {
    if (!selectedSchedule || !notificationMessage.trim()) return;

    try {
      setNotifySending(true);

      // Find affected users with shipments in this schedule
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('user_id')
        .in('status', ['Booking Confirmed', 'Ready for Pickup'])
        .contains('metadata', { pickup_date: selectedSchedule.pickup_date });

      if (shipmentError) throw shipmentError;

      // Get unique user IDs
      const userIds = [...new Set(shipmentData?.map(s => s.user_id) || [])];

      if (userIds.length === 0) {
        toast({
          title: 'No Recipients',
          description: 'No users found with shipments in this schedule.',
          variant: 'warning'
        });
        setShowNotifyDialog(false);
        return;
      }

      // Create notifications for each user
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: `Collection Schedule: ${selectedSchedule.route}`,
        message: notificationMessage,
        type: 'schedule_update'
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      toast({
        title: 'Notifications Sent',
        description: `Sent to ${userIds.length} customer(s)`,
      });

      setShowNotifyDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error sending notifications',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setNotifySending(false);
    }
  };

  const handlePrintDetails = (schedule: any) => {
    const printContent = `
      <html>
      <head>
        <title>Collection Schedule: ${schedule.route}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          h1 { color: #166534; }
          .header { border-bottom: 2px solid #166534; padding-bottom: 10px; margin-bottom: 20px; }
          .info { margin-bottom: 20px; }
          .info-label { font-weight: bold; }
          .areas { margin-bottom: 20px; }
          .area-item { background: #f0f0f0; padding: 5px 10px; margin: 5px; display: inline-block; border-radius: 4px; }
          .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Zimbabwe Shipping - Collection Schedule</h1>
        </div>
        <div class="info">
          <p><span class="info-label">Route:</span> ${schedule.route}</p>
          <p><span class="info-label">Date:</span> ${schedule.pickup_date}</p>
        </div>
        <div class="areas">
          <p class="info-label">Areas Covered:</p>
          ${schedule.areas.map((area: string) => `<div class="area-item">${area}</div>`).join('')}
        </div>
        <div class="footer">
          <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Zimbabwe Shipping Ltd. | Contact: +44 123 456 7890</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Print after a short delay to ensure content is loaded
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      toast({
        title: 'Print Error',
        description: 'Unable to open print window. Check if pop-ups are blocked.',
        variant: 'destructive'
      });
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

  const printShipmentDetails = () => {
    if (!selectedShipment) return;

    const recipient = getRecipientInfo(selectedShipment);
    
    const printContent = `
      <html>
      <head>
        <title>Shipment #${selectedShipment.tracking_number}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          h1 { color: #166534; }
          .header { border-bottom: 2px solid #166534; padding-bottom: 10px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; grid-gap: 10px; margin-top: 10px; }
          .info-item { padding: 5px 0; }
          .info-label { font-weight: bold; display: block; font-size: 12px; color: #666; }
          .info-value { font-size: 14px; }
          .status { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 14px; }
          .status-booked { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
          .status-intransit { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
          .status-processing { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
          .status-customs { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
          .status-out { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .status-delivered { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
          .status-cancelled { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
          .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; color: #666; }
          .image { max-width: 100%; max-height: 200px; margin-top: 10px; border-radius: 4px; border: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Zimbabwe Shipping - Shipment Details</h1>
        </div>
        
        <div class="section">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Tracking Number</span>
              <div class="info-value">${selectedShipment.tracking_number}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Status</span>
              <div class="status ${getStatusClass(selectedShipment.status)}">${selectedShipment.status}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Shipment Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Origin</span>
              <div class="info-value">${selectedShipment.origin}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Destination</span>
              <div class="info-value">${selectedShipment.destination}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <div class="info-value">${formatDate(selectedShipment.created_at)}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Last Updated</span>
              <div class="info-value">${formatDate(selectedShipment.updated_at)}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Recipient Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Name</span>
              <div class="info-value">${recipient.name}</div>
            </div>
            <div class="info-item">
              <span class="info-label">Phone</span>
              <div class="info-value">${recipient.phone}</div>
            </div>
          </div>
        </div>
        
        ${selectedShipment.metadata?.delivery_image ? `
          <div class="section">
            <div class="section-title">Delivery Image</div>
            <img class="image" src="${selectedShipment.metadata.delivery_image}" alt="Delivery confirmation" />
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Zimbabwe Shipping Ltd. | Contact: support@zimbabweshipping.com | +44 123 456 7890</p>
        </div>
      </body>
      </html>
    `;

    function getStatusClass(status: string) {
      switch (status) {
        case 'Booking Confirmed':
        case 'Paid':
          return 'status-booked';
        case 'Processing in Warehouse (UK)':
        case 'Processing in Warehouse (ZW)':
          return 'status-processing';
        case 'Customs Clearance':
          return 'status-customs';
        case 'In Transit':
          return 'status-intransit';
        case 'Out for Delivery':
          return 'status-out';
        case 'Delivered':
          return 'status-delivered';
        case 'Cancelled':
          return 'status-cancelled';
        default:
          return '';
      }
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Print after a short delay to ensure content is loaded
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      toast({
        title: 'Print Error',
        description: 'Unable to open print window. Check if pop-ups are blocked.',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'Booking Confirmed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Booking Confirmed</Badge>;
      case 'Paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case 'Processing':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Processing</Badge>;
      case 'Ready for Pickup':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Ready for Pickup</Badge>;
      case 'Processing in Warehouse (UK)':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Processing in UK</Badge>;
      case 'Customs Clearance':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Customs Clearance</Badge>;
      case 'Processing in Warehouse (ZW)':
        return <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">Processing in ZW</Badge>;
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
                <SelectItem value="Booking Confirmed">Booking Confirmed</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                <SelectItem value="Processing in Warehouse (UK)">Processing in UK</SelectItem>
                <SelectItem value="Customs Clearance">Customs Clearance</SelectItem>
                <SelectItem value="Processing in Warehouse (ZW)">Processing in ZW</SelectItem>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.slice(0, 10).map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell>{shipment.tracking_number}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{shipment.origin}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{shipment.destination}</TableCell>
                          <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                          <TableCell>{formatDate(shipment.created_at).split(',')[0]}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewShipmentDetails(shipment)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredShipments.length > 10 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Showing 10 of {filteredShipments.length} shipments.
                      </p>
                      <Button variant="link" size="sm" onClick={() => toast({ title: "Feature Coming Soon", description: "View all shipments functionality will be available in a future update." })}>
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
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleAddSchedule}
              >
                <Calendar className="h-4 w-4" />
                <span>Add Schedule</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => {
                  if (collectionSchedules.length === 0) {
                    toast({
                      title: "No Schedules",
                      description: "There are no schedules to print."
                    });
                    return;
                  }
                  
                  const schedulesPrintContent = `
                    <html>
                    <head>
                      <title>Collection Schedules</title>
                      <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; }
                        h1 { color: #166534; }
                        .header { border-bottom: 2px solid #166534; padding-bottom: 10px; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #f9fafb; text-align: left; padding: 8px; }
                        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
                        .areas { font-size: 12px; color: #666; }
                        .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; color: #666; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <h1>Zimbabwe Shipping - Collection Schedules</h1>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Route</th>
                            <th>Date</th>
                            <th>Areas</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${collectionSchedules.map(schedule => `
                            <tr>
                              <td><strong>${schedule.route}</strong></td>
                              <td>${schedule.pickup_date}</td>
                              <td class="areas">${schedule.areas.join(', ')}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <div class="footer">
                        <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                        <p>Zimbabwe Shipping Ltd. | Contact: +44 123 456 7890</p>
                      </div>
                    </body>
                    </html>
                  `;
                  
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(schedulesPrintContent);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 500);
                  } else {
                    toast({
                      title: 'Print Error',
                      description: 'Unable to open print window. Check if pop-ups are blocked.',
                      variant: 'destructive'
                    });
                  }
                }}
              >
                <Printer className="h-4 w-4" />
                <span>Print All</span>
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Route</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Areas</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collectionSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.route}</TableCell>
                        <TableCell>{schedule.pickup_date}</TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => handleOpenNotifyDialog(schedule)}
                            >
                              <Send className="h-3 w-3" />
                              <span>Notify</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => handlePrintDetails(schedule)}
                            >
                              <FileText className="h-3 w-3" />
                              <span>Details</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => {
                      // Generate and download a sample report for demonstration
                      const reportData = `
                        Zimbabwe Shipping - Monthly Logistics Report
                        ------------------------------------------------
                        Month: March 2025
                        Generated: April 1, 2025
                        
                        SHIPMENT STATISTICS
                        ------------------------------------------------
                        Total Shipments: ${stats.total}
                        New Bookings: ${stats.booked}
                        In Transit: ${stats.inTransit}
                        Delivered: ${stats.delivered}
                        
                        PERFORMANCE METRICS
                        ------------------------------------------------
                        Average Delivery Time: 5.2 days
                        On-Time Delivery Rate: 94%
                        Customer Satisfaction: 4.7/5
                        
                        ROUTE ANALYSIS
                        ------------------------------------------------
                        Most Active Route: London to Harare
                        Most Delayed Route: Manchester to Bulawayo
                        
                        LOGISTICS ISSUES
                        ------------------------------------------------
                        Customs Delays: 3 incidents
                        Lost Packages: 0
                        Damaged Packages: 1
                        
                        ------------------------------------------------
                        Zimbabwe Shipping Ltd.
                        support@zimbabweshipping.com | +44 123 456 7890
                      `;
                      
                      const blob = new Blob([reportData], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'Zimbabwe-Shipping-March-2025-Report.txt';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      toast({
                        title: "Report Downloaded",
                        description: "The March 2025 report has been downloaded."
                      });
                    }}
                  >
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => {
                      const reportData = `
                        Zimbabwe Shipping - Monthly Logistics Report
                        ------------------------------------------------
                        Month: February 2025
                        Generated: March 1, 2025
                        
                        SHIPMENT STATISTICS
                        ------------------------------------------------
                        Total Shipments: ${Math.max(0, stats.total - 5)}
                        New Bookings: ${Math.max(0, stats.booked - 3)}
                        In Transit: ${Math.max(0, stats.inTransit - 2)}
                        Delivered: ${Math.max(0, stats.delivered - 7)}
                        
                        PERFORMANCE METRICS
                        ------------------------------------------------
                        Average Delivery Time: 5.5 days
                        On-Time Delivery Rate: 92%
                        Customer Satisfaction: 4.6/5
                        
                        ROUTE ANALYSIS
                        ------------------------------------------------
                        Most Active Route: London to Harare
                        Most Delayed Route: Birmingham to Bulawayo
                        
                        LOGISTICS ISSUES
                        ------------------------------------------------
                        Customs Delays: 5 incidents
                        Lost Packages: 1
                        Damaged Packages: 2
                        
                        ------------------------------------------------
                        Zimbabwe Shipping Ltd.
                        support@zimbabweshipping.com | +44 123 456 7890
                      `;
                      
                      const blob = new Blob([reportData], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'Zimbabwe-Shipping-February-2025-Report.txt';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      toast({
                        title: "Report Downloaded",
                        description: "The February 2025 report has been downloaded."
                      });
                    }}
                  >
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
              onClick={printShipmentDetails}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Collection Schedule</DialogTitle>
            <DialogDescription>
              Create a new collection schedule for customer pickups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route Name</Label>
              <Input 
                id="route" 
                placeholder="e.g., London to Harare" 
                value={newSchedule.route}
                onChange={(e) => setNewSchedule({...newSchedule, route: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pickup-date">Pickup Date</Label>
              <Input 
                id="pickup-date" 
                type="date" 
                value={newSchedule.pickup_date}
                onChange={(e) => setNewSchedule({...newSchedule, pickup_date: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Areas Covered</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Add area (e.g., Camden)" 
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddArea();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddArea}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {newSchedule.areas.map((area, index) => (
                  <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1">
                    {area}
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="ml-1 h-4 w-4 p-0"
                      onClick={() => handleRemoveArea(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                {newSchedule.areas.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No areas added yet. Add at least one area.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowScheduleDialog(false)}
              disabled={scheduleSaving}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleScheduleSubmit}
              disabled={scheduleSaving}
            >
              {scheduleSaving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Dialog */}
      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notify Customers</DialogTitle>
            <DialogDescription>
              Send notification to customers with shipments on this schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notification-message">Notification Message</Label>
              <textarea 
                id="notification-message" 
                className="w-full min-h-[100px] p-2 border rounded-md"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter notification message..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNotifyDialog(false)}
              disabled={notifySending}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleSendNotification}
              disabled={notifySending || !notificationMessage.trim()}
              className="gap-2"
            >
              {notifySending ? (
                <>
                  <span className="animate-spin">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Notification</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogisticsDashboard;
