
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  Quote
} from 'lucide-react';

// Additional component imports for the nested tabs
import SupportTickets from '@/components/admin/SupportTickets';
import ContentManagement from '@/components/admin/ContentManagement';

const AdminDashboardContent = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('shipments');
  const [moreTabValue, setMoreTabValue] = useState('support'); // For managing the inner tab state
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Dashboard statistics
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingShipments: 0,
    activeShipments: 0,
    deliveredShipments: 0,
    totalRevenue: 0,
    pendingQuotes: 0
  });

  useEffect(() => {
    fetchDashboardStats();
    fetchNotifications();
  }, []);

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
        s.status === 'Booking Confirmed' || 
        s.status === 'Ready for Pickup'
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
  };

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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
            <div className="text-xs text-muted-foreground mt-1">Awaiting response</div>
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
          <ShipmentManagementTab />
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
