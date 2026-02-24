import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';

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
import SupportTickets from '@/components/admin/SupportTickets';
import ContentManagement from '@/components/admin/ContentManagement';
import PaymentScheduleManagement from '@/components/admin/PaymentScheduleManagement';
import ServiceReviewsTab from '@/components/admin/tabs/ServiceReviewsTab';

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
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Star,
} from 'lucide-react';

interface NavGroup {
  key: string;
  label: string;
  items: { value: string; label: string; icon: any }[];
}

const AdminDashboardContent = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    main: true,
    operations: false,
    finance: false,
    communications: false,
    system: false,
  });

  // Dashboard statistics
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingShipments: 0,
    activeShipments: 0,
    deliveredShipments: 0,
    totalRevenue: 0,
    pendingQuotes: 0
  });

  const navGroups: NavGroup[] = [
    {
      key: 'main',
      label: 'Main',
      items: [
        { value: 'overview', label: 'Overview', icon: LayoutDashboard },
        { value: 'shipments', label: 'Shipments', icon: Package },
        { value: 'customQuotes', label: 'Custom Quotes', icon: Quote },
        { value: 'customers', label: 'Customers', icon: User },
      ],
    },
    {
      key: 'operations',
      label: 'Operations',
      items: [
        { value: 'pickupZones', label: 'Pickup Zones', icon: MapPin },
        { value: 'delivery', label: 'Delivery', icon: Truck },
        { value: 'schedule', label: 'Schedule', icon: Calendar },
        { value: 'routes', label: 'Routes', icon: Route },
      ],
    },
    {
      key: 'finance',
      label: 'Finance',
      items: [
        { value: 'payments', label: 'Payments', icon: CreditCard },
        { value: 'paymentSchedule', label: '30-Day Payments', icon: CalendarDays },
        { value: 'reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      key: 'communications',
      label: 'Communications',
      items: [
        { value: 'notifications', label: 'Notifications', icon: Bell },
        { value: 'supportTickets', label: 'Support Tickets', icon: MessageSquare },
        { value: 'feedback', label: 'Feedback', icon: Star },
      ],
    },
    {
      key: 'system',
      label: 'System',
      items: [
        { value: 'users', label: 'Users', icon: Users },
        { value: 'contentManagement', label: 'Content', icon: ImageIcon },
        { value: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  // Flat list for mobile dropdown
  const navItems = navGroups.flatMap((g) => g.items);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand the group containing the active tab
  useEffect(() => {
    for (const group of navGroups) {
      if (group.items.some((item) => item.value === activeTab)) {
        setExpandedGroups((prev) => ({ ...prev, [group.key]: true }));
        break;
      }
    }
  }, [activeTab]);

  useEffect(() => {
    fetchDashboardStats();
    fetchNotifications();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const { data: shipments, error: shipmentError } = await supabase
        .from('shipments')
        .select('id, status');

      if (shipmentError) throw shipmentError;

      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select('amount');

      if (paymentError) throw paymentError;

      const { data: quotes, error: quotesError } = await supabase
        .from('custom_quotes')
        .select('id, status')
        .eq('status', 'pending');

      if (quotesError) throw quotesError;

      const totalShipments = shipments?.length || 0;
      const pendingShipments = shipments?.filter(s =>
        s.status === 'Booking Confirmed' || s.status === 'Ready for Pickup'
      ).length || 0;
      const activeShipments = shipments?.filter(s =>
        s.status === 'Processing in UK Warehouse' ||
        s.status === 'Customs Clearance' ||
        s.status === 'Processing in ZW Warehouse' ||
        s.status === 'Out for Delivery'
      ).length || 0;
      const deliveredShipments = shipments?.filter(s => s.status === 'Delivered').length || 0;
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

  const refreshDashboard = () => {
    fetchDashboardStats();
    fetchNotifications();
  };

  const renderTabContent = (tabValue: string) => {
    switch (tabValue) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipments</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalShipments}</div>
                <Progress value={100} className="h-1 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Shipments</CardTitle>
                <Package className="h-4 w-4 text-yellow-500" />
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
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Shipments</CardTitle>
                <Truck className="h-4 w-4 text-blue-500" />
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
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
                <Truck className="h-4 w-4 text-green-500" />
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
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <CreditCard className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{stats.totalRevenue.toFixed(2)}</div>
                <Progress value={100} className="h-1 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Quotes</CardTitle>
                <Quote className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
                <div className="text-xs text-muted-foreground mt-1">Awaiting response</div>
              </CardContent>
            </Card>
          </div>
        );
      case 'shipments': return <ShipmentManagementTab />;
      case 'customQuotes': return <CustomQuoteManagement />;
      case 'customers': return <CustomerManagementTab />;
      case 'pickupZones': return <PickupZonesManagementTab />;
      case 'delivery': return <DeliveryManagementTab />;
      case 'payments': return <PaymentsInvoicingTab />;
      case 'paymentSchedule': return <PaymentScheduleManagement />;
      case 'reports': return <ReportsAnalyticsTab />;
      case 'notifications': return <NotificationsAlertsTab />;
      case 'schedule': return <CollectionScheduleTab />;
      case 'routes': return <RouteManagementTab />;
      case 'users': return <UserManagementTab />;
      case 'supportTickets': return <SupportTickets />;
      case 'contentManagement': return <ContentManagement />;
      case 'feedback': return <ServiceReviewsTab />;
      case 'settings': return <SystemSettingsTab />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar for Desktop */}
      {!isMobile && (
        <aside className={cn(
          "h-full border-r bg-card transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-20"
        )}>
          <div className="flex items-center justify-between p-4 h-16">
            {isSidebarOpen ? (
              <h2 className="text-lg font-semibold text-primary">Admin Panel</h2>
            ) : (
              <LayoutDashboard className="h-6 w-6 text-primary" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex"
            >
              {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
          </div>
          <Separator />

          {/* Collapsible grouped nav */}
          <nav className="flex flex-col p-2 mt-2">
            {navGroups.map((group) => (
              <div key={group.key} className="mb-1">
                {/* Group header with dropdown arrow */}
                {isSidebarOpen ? (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        expandedGroups[group.key] && "rotate-180"
                      )}
                    />
                  </button>
                ) : (
                  <Separator className="my-2" />
                )}

                {/* Group items */}
                {(expandedGroups[group.key] || !isSidebarOpen) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Button
                        key={item.value}
                        variant={activeTab === item.value ? "secondary" : "ghost"}
                        className={cn(
                          "justify-start text-sm font-medium px-3 py-2 rounded-md w-full",
                          !isSidebarOpen && "w-10 h-10 p-0 justify-center"
                        )}
                        onClick={() => setActiveTab(item.value)}
                      >
                        <item.icon className={cn("h-5 w-5", isSidebarOpen && "mr-3")} />
                        {isSidebarOpen && <span>{item.label}</span>}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center pb-4 border-b">
          <h1 className="text-3xl font-bold">
            {navItems.find(item => item.value === activeTab)?.label || 'Admin Dashboard'}
          </h1>
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button variant="outline" size="sm" onClick={() => setShowMobileMenu(!showMobileMenu)}>
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={loading}>
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin mr-2")} />
              {!loading && "Refresh"}
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
              <PopoverContent className="w-80 p-2">
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Notifications</h3>
                  <Separator />
                  {notifications.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-3 bg-muted rounded-md hover:bg-muted/80 transition-colors cursor-pointer">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                          <span className="text-xs text-right text-gray-500 block mt-1">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
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
        </header>

        {/* Mobile Navigation Dropdown */}
        {isMobile && showMobileMenu && (
          <div className="mb-6 border-b pb-4">
            <Select value={activeTab} onValueChange={(value) => { setActiveTab(value); setShowMobileMenu(false); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {navItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {renderTabContent(activeTab)}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardContent;
