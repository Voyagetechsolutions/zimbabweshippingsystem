import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { AdminCountryProvider, useAdminCountry } from '@/contexts/AdminCountryContext';

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
import CollectionScheduleManagementEnhanced from '@/components/admin/tabs/CollectionScheduleManagementEnhanced';
import RouteManagementTab from '@/components/admin/tabs/RouteManagementTab';
import UserManagementTab from '@/components/admin/tabs/UserManagementTab';
import SystemSettingsTab from '@/components/admin/tabs/SystemSettingsTab';
import CustomQuoteManagement from '@/components/admin/CustomQuoteManagement';
import SupportTickets from '@/components/admin/SupportTickets';
import ContentManagement from '@/components/admin/ContentManagement';
import PaymentScheduleManagement from '@/components/admin/PaymentScheduleManagement';
import ServiceReviewsTab from '@/components/admin/tabs/ServiceReviewsTab';
import ManualBookingTab from '@/components/admin/tabs/ManualBookingTab';
import WhatsAppBotSettingsTab from '@/components/admin/tabs/WhatsAppBotSettingsTab';
import DeliveryNotesTab from '@/components/admin/tabs/DeliveryNotesTab';

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
  PlusCircle,
  FileText,
} from 'lucide-react';

interface NavGroup {
  key: string;
  label: string;
  items: { value: string; label: string; icon: any }[];
}

const AdminDashboardInner = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { selectedCountry, setSelectedCountry } = useAdminCountry();
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
        { value: 'manualBooking', label: 'Manual Booking', icon: PlusCircle },
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
        { value: 'deliveryNotes', label: 'Delivery Notes', icon: FileText },
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
        { value: 'whatsappBot', label: 'WhatsApp Bot', icon: MessageSquare },
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
          <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Welcome back! 👋</h2>
                  <p className="text-white/90 text-lg">Here's what's happening with your shipments today</p>
                </div>
                <div className="hidden md:block">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <LayoutDashboard className="h-12 w-12 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Shipments */}
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Shipments</CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.totalShipments}</div>
                  <Progress value={100} className="h-2 bg-blue-200 dark:bg-blue-900" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">All time shipments</p>
                </CardContent>
              </Card>

              {/* Pending Shipments */}
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">Pending Collection</CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.pendingShipments}</div>
                  <Progress
                    value={stats.totalShipments ? (stats.pendingShipments / stats.totalShipments) * 100 : 0}
                    className="h-2 bg-amber-200 dark:bg-amber-900"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {stats.totalShipments ? Math.round((stats.pendingShipments / stats.totalShipments) * 100) : 0}% of total
                  </p>
                </CardContent>
              </Card>

              {/* Active Shipments */}
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">In Transit</CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                      <Truck className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.activeShipments}</div>
                  <Progress
                    value={stats.totalShipments ? (stats.activeShipments / stats.totalShipments) * 100 : 0}
                    className="h-2 bg-cyan-200 dark:bg-cyan-900"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Currently being shipped</p>
                </CardContent>
              </Card>

              {/* Delivered */}
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">Delivered</CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                      <Truck className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.deliveredShipments}</div>
                  <Progress
                    value={stats.totalShipments ? (stats.deliveredShipments / stats.totalShipments) * 100 : 0}
                    className="h-2 bg-green-200 dark:bg-green-900"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Successfully completed</p>
                </CardContent>
              </Card>

              {/* Total Revenue */}
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Revenue</CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">£{stats.totalRevenue.toFixed(2)}</div>
                  <Progress value={100} className="h-2 bg-purple-200 dark:bg-purple-900" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Total earnings</p>
                </CardContent>
              </Card>

              {/* Pending Quotes */}
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/50 dark:to-red-950/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400">Pending Quotes</CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center shadow-lg">
                      <Quote className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.pendingQuotes}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-rose-200 dark:bg-rose-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-red-500 animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Awaiting response</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={() => setActiveTab('manualBooking')}
                className="h-24 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <PlusCircle className="h-8 w-8" />
                  <span className="font-semibold">New Booking</span>
                </div>
              </Button>
              <Button
                onClick={() => setActiveTab('shipments')}
                variant="outline"
                className="h-24 border-2 hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold">View Shipments</span>
                </div>
              </Button>
              <Button
                onClick={() => setActiveTab('customQuotes')}
                variant="outline"
                className="h-24 border-2 hover:bg-orange-50 dark:hover:bg-orange-950 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <Quote className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  <span className="font-semibold">Manage Quotes</span>
                </div>
              </Button>
              <Button
                onClick={() => setActiveTab('reports')}
                variant="outline"
                className="h-24 border-2 hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold">View Reports</span>
                </div>
              </Button>
            </div>
          </div>
        );
      case 'manualBooking': return <ManualBookingTab />;
      case 'shipments': return <ShipmentManagementTab />;
      case 'customQuotes': return <CustomQuoteManagement />;
      case 'customers': return <CustomerManagementTab />;
      case 'pickupZones': return <PickupZonesManagementTab />;
      case 'delivery': return <DeliveryManagementTab />;
      case 'payments': return <PaymentsInvoicingTab />;
      case 'paymentSchedule': return <PaymentScheduleManagement />;
      case 'reports': return <ReportsAnalyticsTab />;
      case 'notifications': return <NotificationsAlertsTab />;
      case 'schedule': return <CollectionScheduleManagementEnhanced />;
      case 'routes': return <RouteManagementTab />;
      case 'users': return <UserManagementTab />;
      case 'supportTickets': return <SupportTickets />;
      case 'contentManagement': return <ContentManagement />;
      case 'feedback': return <ServiceReviewsTab />;
      case 'deliveryNotes': return <DeliveryNotesTab />;
      case 'whatsappBot': return <WhatsAppBotSettingsTab />;
      case 'settings': return <SystemSettingsTab />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Sidebar for Desktop */}
      {!isMobile && (
        <aside className={cn(
          "h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ease-in-out flex flex-col",
          isSidebarOpen ? "w-72" : "w-20"
        )}>
          {/* Logo/Brand Section */}
          <div className="flex items-center justify-between p-4 h-20 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700">
            {isSidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <LayoutDashboard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Admin Panel</h2>
                  <p className="text-xs text-white/80">Zimbabwe Shipping</p>
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex text-white hover:bg-white/20"
            >
              {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navGroups.map((group) => (
              <div key={group.key} className="mb-2">
                {/* Group header */}
                {isSidebarOpen ? (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        expandedGroups[group.key] && "rotate-180"
                      )}
                    />
                  </button>
                ) : (
                  <div className="h-px bg-gray-200 dark:bg-gray-800 my-3" />
                )}

                {/* Group items */}
                {(expandedGroups[group.key] || !isSidebarOpen) && (
                  <div className="space-y-1 mt-1">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.value;
                      return (
                        <Button
                          key={item.value}
                          variant="ghost"
                          className={cn(
                            "justify-start text-sm font-medium px-3 py-2.5 rounded-lg w-full transition-all duration-200",
                            !isSidebarOpen && "w-12 h-12 p-0 justify-center",
                            isActive
                              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:from-green-600 hover:to-emerald-600"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                          )}
                          onClick={() => setActiveTab(item.value)}
                        >
                          <item.icon className={cn("h-5 w-5", isSidebarOpen && "mr-3", isActive && "drop-shadow-sm")} />
                          {isSidebarOpen && <span>{item.label}</span>}
                          {isActive && isSidebarOpen && (
                            <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer - Country Selector */}
          {isSidebarOpen && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-800">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">Region</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedCountry('England')}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                      selectedCountry === 'England'
                        ? "bg-blue-500 text-white shadow-md"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    )}
                  >
                    <span className="text-lg">🇬🇧</span>
                    <span className="text-xs">UK</span>
                  </button>
                  <button
                    onClick={() => setSelectedCountry('Ireland')}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                      selectedCountry === 'Ireland'
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    )}
                  >
                    <span className="text-lg">🇮🇪</span>
                    <span className="text-xs">IE</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {navItems.find(item => item.value === activeTab)?.label || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedCountry === 'England' ? '🇬🇧 United Kingdom' : '🇮🇪 Ireland'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDashboard}
                disabled={loading}
                className="hidden sm:flex hover:bg-green-50 dark:hover:bg-green-950 hover:border-green-300 dark:hover:border-green-700 transition-colors"
              >
                <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative hover:bg-green-50 dark:hover:bg-green-950 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">
                        {notifications.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notifications
                    </h3>
                    <p className="text-sm text-white/80 mt-1">
                      {notifications.length} unread notification{notifications.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="max-h-[400px] overflow-auto p-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 mb-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border border-gray-200 dark:border-gray-700"
                        >
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{notification.title}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{notification.message}</p>
                          <span className="text-xs text-gray-500 dark:text-gray-500 mt-2 block">
                            {new Date(notification.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No new notifications</p>
                      <p className="text-xs mt-1">You're all caught up!</p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {isMobile && showMobileMenu && (
          <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <Select value={activeTab} onValueChange={(value) => { setActiveTab(value); setShowMobileMenu(false); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {navGroups.map((group) => (
                  <div key={group.key}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            {renderTabContent(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap in context provider
const AdminDashboardContent = () => {
  return (
    <AdminCountryProvider>
      <AdminDashboardInner />
    </AdminCountryProvider>
  );
};

export default AdminDashboardContent;
