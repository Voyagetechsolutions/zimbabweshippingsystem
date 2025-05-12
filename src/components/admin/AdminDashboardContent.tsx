
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Shipment } from '@/types/shipment';

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

// Icons
import { 
  Package, 
  Truck, 
  User, 
  MapPin, 
  CreditCard, 
  BarChart3, 
  Bell, 
  Calendar, 
  Route, 
  Settings,
  Users,
  RefreshCcw,
  Menu,
  MessageSquare,
  ImageIcon,
  Quote,
  Search,
  Filter,
  Eye,
  Edit
} from 'lucide-react';

// Tab Components
import ShipmentManagementTab from '@/components/admin/tabs/ShipmentManagementTab';
import CustomerManagementTab from '@/components/admin/tabs/CustomerManagementTab';
import PickupZonesManagementTab from '@/components/admin/tabs/PickupZonesManagementTab';
import DeliveryManagementTab from '@/components/admin/tabs/DeliveryManagementTab';
import PaymentsInvoicingTab from '@/components/admin/tabs/PaymentsInvoicingTab';
import ReportsAnalyticsTab from '@/components/admin/tabs/ReportsAnalyticsTab';
import NotificationsAlertsTab from '@/components/admin/tabs/NotificationsAlertsTab';
import CollectionScheduleTab from '@/components/admin/tabs/CollectionScheduleTab';
import RouteManagementTab from '@/components/admin/tabs/RouteManagementTab';
import UserManagementTab from '@/components/admin/tabs/UserManagementTab';
import SystemSettingsTab from '@/components/admin/tabs/SystemSettingsTab';
import CustomQuoteManagement from '@/components/admin/CustomQuoteManagement';

// Additional component imports for the nested tabs
import SupportTickets from '@/components/admin/SupportTickets';
import ContentManagement from '@/components/admin/ContentManagement';

const STATUS_OPTIONS = [
  'Booking Confirmed',
  'Pending Collection',
  'Ready for Pickup',
  'Processing in UK Warehouse',
  'Customs Clearance',
  'Processing in ZW Warehouse',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const AdminDashboardContent = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('shipments');
  const [moreTabValue, setMoreTabValue] = useState('support'); // For managing the inner tab state
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewShipmentId, setViewShipmentId] = useState<string | null>(null);
  const [editShipmentId, setEditShipmentId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Dashboard statistics
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingShipments: 0,
    pendingCollection: 0,
    activeShipments: 0,
    deliveredShipments: 0,
    totalRevenue: 0,
    pendingQuotes: 0
  });

  useEffect(() => {
    fetchDashboardStats();
    fetchNotifications();
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching shipments:', error);
        throw error;
      }
      
      console.log('Fetched shipments:', data);
      setShipments(data as Shipment[] || []);
    } catch (error) {
      console.error('Error in fetchShipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Fetch shipments stats
      const { data: shipments, error: shipmentError } = await supabase
        .from('shipments')
        .select('id, status');
      
      if (shipmentError) throw shipmentError;
      
      // Fetch payments data for revenue calculation
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select('amount');
      
      if (paymentError) throw paymentError;
      
      // Fetch custom quotes
      const { data: quotes, error: quotesError } = await supabase
        .from('custom_quotes')
        .select('id, status')
        .eq('status', 'pending');
      
      if (quotesError) throw quotesError;
      
      // Calculate stats
      const totalShipments = shipments?.length || 0;
      
      const pendingShipments = shipments?.filter(s => 
        s.status === 'Booking Confirmed'
      ).length || 0;

      const pendingCollection = shipments?.filter(s => 
        s.status === 'Pending Collection'
      ).length || 0;
      
      const activeShipments = shipments?.filter(s => 
        s.status === 'Processing in UK Warehouse' || 
        s.status === 'Customs Clearance' ||
        s.status === 'Processing in ZW Warehouse' ||
        s.status === 'Out for Delivery'
      ).length || 0;
      
      const deliveredShipments = shipments?.filter(s => 
        s.status === 'Delivered'
      ).length || 0;
      
      const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      
      setStats({
        totalShipments,
        pendingShipments,
        pendingCollection,
        activeShipments,
        deliveredShipments,
        totalRevenue,
        pendingQuotes: quotes?.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      // Fetch the latest notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Function to handle refreshing the dashboard data
  const refreshDashboard = () => {
    fetchDashboardStats();
    fetchNotifications();
    fetchShipments();
  };

  // Helper function to extract sender's name from metadata
  const getSenderName = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Name Provided';
    }
    
    const metadata = shipment.metadata;
    
    // First check senderDetails which should be our primary path
    if (metadata.senderDetails) {
      if (metadata.senderDetails.firstName && metadata.senderDetails.lastName) {
        return `${metadata.senderDetails.firstName} ${metadata.senderDetails.lastName}`;
      }
      if (metadata.senderDetails.name) {
        return metadata.senderDetails.name;
      }
    }
    
    // Then check sender which is the second most common path
    if (metadata.sender) {
      if (metadata.sender.firstName && metadata.sender.lastName) {
        return `${metadata.sender.firstName} ${metadata.sender.lastName}`;
      }
      if (metadata.sender.name) {
        return metadata.sender.name;
      }
    }
    
    // Check for directly nested properties
    if (metadata.firstName && metadata.lastName) {
      return `${metadata.firstName} ${metadata.lastName}`;
    }
    
    return 'No Name Provided';
  };

  // Helper function to extract receiver's name from metadata
  const getReceiverName = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Name Provided';
    }
    
    const metadata = shipment.metadata;
    
    if (metadata.recipientDetails?.name) {
      return metadata.recipientDetails.name;
    }
    
    if (metadata.recipient?.name) {
      return metadata.recipient.name;
    }
    
    if (metadata.recipientName) {
      return metadata.recipientName;
    }
    
    return 'No Name Provided';
  };
  
  // Helper function to extract contact info
  const getContactInfo = (shipment: Shipment, type: 'sender' | 'receiver'): string => {
    if (!shipment || !shipment.metadata) {
      return 'Not Available';
    }
    
    const metadata = shipment.metadata;
    
    if (type === 'sender') {
      return metadata.senderDetails?.phone || 
             metadata.sender?.phone || 
             metadata.phone || 
             'Not Available';
    } else {
      return metadata.recipientDetails?.phone || 
             metadata.recipient?.phone || 
             metadata.recipientPhone || 
             'Not Available';
    }
  };

  // Function to update shipment status
  const updateShipmentStatus = async () => {
    if (!editShipmentId || !selectedStatus) return;
    
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ 
          status: selectedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', editShipmentId);
      
      if (error) throw error;
      
      toast({
        title: "Status Updated",
        description: `Shipment status updated to ${selectedStatus}`,
      });
      
      // Reset state and refresh data
      setEditShipmentId(null);
      setSelectedStatus('');
      fetchShipments();
      fetchDashboardStats();
      
    } catch (error) {
      console.error('Error updating shipment status:', error);
      toast({
        title: "Error",
        description: "Failed to update shipment status",
        variant: "destructive",
      });
    }
  };

  // Helper function to render status badge
  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('delivered')) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{status}</Badge>;
    } else if (statusLower.includes('cancelled')) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">{status}</Badge>;
    } else if (statusLower.includes('pending collection')) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{status}</Badge>;
    } else if (statusLower.includes('booked') || statusLower.includes('booking')) { 
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{status}</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter shipments based on search and status
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      searchQuery === '' ||
      shipment.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSenderName(shipment).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getReceiverName(shipment).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      shipment.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header with title and notification bell */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="outline" size="sm" onClick={() => setShowMobileMenu(!showMobileMenu)}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h3 className="font-medium">Notifications</h3>
                {notifications.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-3 bg-muted rounded-md">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShipments}</div>
            <Progress value={100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingShipments}</div>
            <Progress 
              value={stats.totalShipments ? (stats.pendingShipments / stats.totalShipments) * 100 : 0} 
              className="h-1 mt-2 bg-yellow-200 dark:bg-yellow-900" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCollection}</div>
            <Progress 
              value={stats.totalShipments ? (stats.pendingCollection / stats.totalShipments) * 100 : 0} 
              className="h-1 mt-2 bg-orange-200 dark:bg-orange-900" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeShipments}</div>
            <Progress 
              value={stats.totalShipments ? (stats.activeShipments / stats.totalShipments) * 100 : 0} 
              className="h-1 mt-2 bg-blue-200 dark:bg-blue-900" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveredShipments}</div>
            <Progress 
              value={stats.totalShipments ? (stats.deliveredShipments / stats.totalShipments) * 100 : 0} 
              className="h-1 mt-2 bg-green-200 dark:bg-green-900" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalRevenue.toFixed(2)}</div>
            <Progress value={100} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs defaultValue="shipments" value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isMobile && showMobileMenu ? (
          <div className="mb-6">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <span className="flex items-center gap-2">
                  {activeTab === 'shipments' && <Package className="h-4 w-4" />}
                  {activeTab === 'customers' && <User className="h-4 w-4" />}
                  {activeTab === 'pickupZones' && <MapPin className="h-4 w-4" />}
                  {activeTab === 'delivery' && <Truck className="h-4 w-4" />}
                  {activeTab === 'payments' && <CreditCard className="h-4 w-4" />}
                  {activeTab === 'reports' && <BarChart3 className="h-4 w-4" />}
                  {activeTab === 'notifications' && <Bell className="h-4 w-4" />}
                  {activeTab === 'schedule' && <Calendar className="h-4 w-4" />}
                  {activeTab === 'routes' && <Route className="h-4 w-4" />}
                  {activeTab === 'users' && <Users className="h-4 w-4" />}
                  {activeTab === 'settings' && <Settings className="h-4 w-4" />}
                  {activeTab === 'customQuotes' && <Quote className="h-4 w-4" />}
                  
                  {activeTab === 'shipments' && 'Shipment Management'}
                  {activeTab === 'customers' && 'Customer Management'}
                  {activeTab === 'pickupZones' && 'Pickup Zones'}
                  {activeTab === 'delivery' && 'Delivery Management'}
                  {activeTab === 'payments' && 'Payments & Invoicing'}
                  {activeTab === 'reports' && 'Reports & Analytics'}
                  {activeTab === 'notifications' && 'Notifications'}
                  {activeTab === 'schedule' && 'Collection Schedule'}
                  {activeTab === 'routes' && 'Route Management'}
                  {activeTab === 'users' && 'User Management'}
                  {activeTab === 'settings' && 'System Settings'}
                  {activeTab === 'customQuotes' && 'Custom Quotes'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shipments">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Shipment Management</span>
                  </div>
                </SelectItem>
                <SelectItem value="customers">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Customer Management</span>
                  </div>
                </SelectItem>
                <SelectItem value="pickupZones">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Pickup Zones</span>
                  </div>
                </SelectItem>
                <SelectItem value="delivery">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    <span>Delivery Management</span>
                  </div>
                </SelectItem>
                <SelectItem value="payments">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Payments & Invoicing</span>
                  </div>
                </SelectItem>
                <SelectItem value="reports">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Reports & Analytics</span>
                  </div>
                </SelectItem>
                <SelectItem value="notifications">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </div>
                </SelectItem>
                <SelectItem value="schedule">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Collection Schedule</span>
                  </div>
                </SelectItem>
                <SelectItem value="routes">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    <span>Route Management</span>
                  </div>
                </SelectItem>
                <SelectItem value="users">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>User Management</span>
                  </div>
                </SelectItem>
                <SelectItem value="settings">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>System Settings</span>
                  </div>
                </SelectItem>
                <SelectItem value="customQuotes">
                  <div className="flex items-center gap-2">
                    <Quote className="h-4 w-4" />
                    <span>Custom Quotes</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <TabsList className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2 h-auto p-1">
            <TabsTrigger value="shipments" className="flex items-center gap-1 py-2 h-auto">
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">Shipments</span>
            </TabsTrigger>
            
            <TabsTrigger value="customers" className="flex items-center gap-1 py-2 h-auto">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Customers</span>
            </TabsTrigger>
            
            <TabsTrigger value="pickupZones" className="flex items-center gap-1 py-2 h-auto">
              <MapPin className="h-4 w-4" />
              <span className="hidden md:inline">Pickup Zones</span>
            </TabsTrigger>
            
            <TabsTrigger value="delivery" className="flex items-center gap-1 py-2 h-auto">
              <Truck className="h-4 w-4" />
              <span className="hidden md:inline">Delivery</span>
            </TabsTrigger>
            
            <TabsTrigger value="payments" className="flex items-center gap-1 py-2 h-auto">
              <CreditCard className="h-4 w-4" />
              <span className="hidden md:inline">Payments</span>
            </TabsTrigger>
            
            <TabsTrigger value="reports" className="flex items-center gap-1 py-2 h-auto">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden md:inline">Reports</span>
            </TabsTrigger>
            
            <TabsTrigger value="notifications" className="flex items-center gap-1 py-2 h-auto">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">Notifications</span>
            </TabsTrigger>
            
            <TabsTrigger value="schedule" className="flex items-center gap-1 py-2 h-auto">
              <Calendar className="h-4 w-4" />
              <span className="hidden md:inline">Schedule</span>
            </TabsTrigger>
            
            <TabsTrigger value="routes" className="flex items-center gap-1 py-2 h-auto">
              <Route className="h-4 w-4" />
              <span className="hidden md:inline">Routes</span>
            </TabsTrigger>
            
            <TabsTrigger value="users" className="flex items-center gap-1 py-2 h-auto">
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">Users</span>
            </TabsTrigger>
            
            <TabsTrigger value="settings" className="flex items-center gap-1 py-2 h-auto">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Settings</span>
            </TabsTrigger>
            
            <TabsTrigger value="customQuotes" className="flex items-center gap-1 py-2 h-auto">
              <Quote className="h-4 w-4" />
              <span className="hidden md:inline">Custom Quotes</span>
            </TabsTrigger>
          </TabsList>
        )}

        {/* Tab Contents */}
        <TabsContent value="shipments" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipment Management</CardTitle>
              <CardDescription>View and manage all shipments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by tracking #, sender, receiver..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <span>Status</span>
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
                  
                  <Button variant="outline" onClick={refreshDashboard}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Shipments Table */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No shipments found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tracking #</TableHead>
                          <TableHead>Sender Name</TableHead>
                          <TableHead>Receiver Name</TableHead>
                          <TableHead>Sender Number</TableHead>
                          <TableHead>Receiver Number</TableHead>
                          <TableHead>Origin</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShipments.map(shipment => (
                          <TableRow key={shipment.id}>
                            <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{getSenderName(shipment)}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{getReceiverName(shipment)}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{getContactInfo(shipment, 'sender')}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{getContactInfo(shipment, 'receiver')}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{shipment.origin}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{shipment.destination}</TableCell>
                            <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                            <TableCell>{format(new Date(shipment.created_at), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setViewShipmentId(shipment.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setEditShipmentId(shipment.id);
                                    setSelectedStatus(shipment.status);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground mt-2">
                Showing {filteredShipments.length} of {shipments.length} shipments
              </div>
            </CardContent>
          </Card>

          {/* Status Update Dialog */}
          {editShipmentId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h3 className="font-bold text-lg mb-4">Update Shipment Status</h3>
                <div className="mb-4">
                  <label className="block text-sm mb-2">New Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditShipmentId(null)}>Cancel</Button>
                  <Button onClick={updateShipmentStatus}>Update Status</Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="customers" className="mt-0 space-y-4">
          <CustomerManagementTab />
        </TabsContent>
        
        <TabsContent value="pickupZones" className="mt-0 space-y-4">
          <PickupZonesManagementTab />
        </TabsContent>
        
        <TabsContent value="delivery" className="mt-0 space-y-4">
          <DeliveryManagementTab />
        </TabsContent>
        
        <TabsContent value="payments" className="mt-0 space-y-4">
          <PaymentsInvoicingTab />
        </TabsContent>
        
        <TabsContent value="reports" className="mt-0 space-y-4">
          <ReportsAnalyticsTab />
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-0 space-y-4">
          <NotificationsAlertsTab />
        </TabsContent>
        
        <TabsContent value="schedule" className="mt-0 space-y-4">
          <CollectionScheduleTab />
        </TabsContent>
        
        <TabsContent value="routes" className="mt-0 space-y-4">
          <RouteManagementTab />
        </TabsContent>
        
        <TabsContent value="users" className="mt-0 space-y-4">
          <UserManagementTab />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-0 space-y-4">
          <SystemSettingsTab />
        </TabsContent>
        
        <TabsContent value="customQuotes" className="mt-0 space-y-4">
          <CustomQuoteManagement />
        </TabsContent>

        <TabsContent value="more" className="mt-0 space-y-4">
          <Tabs defaultValue="support" value={moreTabValue} onValueChange={setMoreTabValue}>
            <TabsList className="mb-6">
              <TabsTrigger value="support" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Support Tickets</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Media Library</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="support">
              <SupportTickets />
            </TabsContent>
            
            <TabsContent value="media">
              <ContentManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboardContent;
