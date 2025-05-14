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
import CustomQuoteManagement from './CustomQuoteManagement';

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

const AdminDashboardContent: React.FC = () => {
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
    <div className="space-y-8">
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
      <Tabs defaultValue="shipments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="quotes">Custom Quotes</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        {/* Tab Contents */}
        <TabsContent value="shipments">
          <ShipmentManagementTab />
        </TabsContent>
        
        <TabsContent value="quotes">
          <div className="space-y-6">
            <CustomQuoteManagement />
          </div>
        </TabsContent>
        
        <TabsContent value="customers">
          <CustomerManagementTab />
        </TabsContent>
        
        <TabsContent value="collections">
          <CollectionScheduleTab />
        </TabsContent>
        
        <TabsContent value="settings">
          <SystemSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboardContent;
