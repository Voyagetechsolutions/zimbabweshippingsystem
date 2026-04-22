import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { AdminCountryProvider, useAdminCountry } from '@/contexts/AdminCountryContext';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Tab Components
import ShipmentManagementTab from '@/components/admin/tabs/ShipmentManagementTab';
import CustomerManagementTab from '@/components/admin/tabs/CustomerManagementTab';
import PickupZonesManagementTab from '@/components/admin/tabs/PickupZonesManagementTab';
import DeliveryManagementTab from '@/components/admin/tabs/DeliveryManagementTab';
import PaymentsInvoicingTab from '@/components/admin/tabs/PaymentsInvoicingTab';
import ReportsAnalyticsTab from '@/components/admin/tabs/ReportsAnalyticsTab';
import NotificationsAlertsTab from '@/components/admin/tabs/NotificationsAlertsTab';
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
  CalendarDays,
  Star,
  PlusCircle,
  FileText,
  Search,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface NavItem {
  value: string;
  label: string;
  icon: any;
  badge?: number;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

interface RecentShipment {
  id: string;
  tracking_number: string | null;
  status: string | null;
  created_at: string;
  metadata: any;
}

const STATUS_VARIANT: Record<string, string> = {
  'Delivered': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'Out for Delivery': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'Processing in UK Warehouse': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'Processing in ZW Warehouse': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'Customs Clearance': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'Booking Confirmed': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'Ready for Pickup': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

const AdminDashboardInner = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { selectedCountry, setSelectedCountry } = useAdminCountry();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');

  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingShipments: 0,
    activeShipments: 0,
    deliveredShipments: 0,
    totalRevenue: 0,
    pendingQuotes: 0,
  });
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);

  const navGroups: NavGroup[] = useMemo(() => [
    {
      key: 'main',
      label: 'Overview',
      items: [
        { value: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { value: 'manualBooking', label: 'Manual Booking', icon: PlusCircle },
      ],
    },
    {
      key: 'shipments',
      label: 'Shipments',
      items: [
        { value: 'shipments', label: 'All Shipments', icon: Package, badge: stats.pendingShipments || undefined },
        { value: 'customQuotes', label: 'Custom Quotes', icon: Quote, badge: stats.pendingQuotes || undefined },
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
  ], [stats.pendingShipments, stats.pendingQuotes]);

  const filteredNavGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [navGroups, navQuery]);

  const allItems = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);
  const activeLabel = allItems.find((i) => i.value === activeTab)?.label ?? 'Dashboard';

  useEffect(() => {
    fetchDashboardStats();
    fetchNotifications();
    fetchRecentShipments();
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
      const pendingShipments = shipments?.filter(
        (s) => s.status === 'Booking Confirmed' || s.status === 'Ready for Pickup'
      ).length || 0;
      const activeShipments = shipments?.filter(
        (s) =>
          s.status === 'Processing in UK Warehouse' ||
          s.status === 'Customs Clearance' ||
          s.status === 'Processing in ZW Warehouse' ||
          s.status === 'Out for Delivery'
      ).length || 0;
      const deliveredShipments = shipments?.filter((s) => s.status === 'Delivered').length || 0;
      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      setStats({
        totalShipments,
        pendingShipments,
        activeShipments,
        deliveredShipments,
        totalRevenue,
        pendingQuotes: quotes?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive',
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

  const fetchRecentShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, tracking_number, status, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setRecentShipments((data as RecentShipment[]) || []);
    } catch (error) {
      console.error('Error fetching recent shipments:', error);
    }
  };

  const refreshDashboard = () => {
    fetchDashboardStats();
    fetchNotifications();
    fetchRecentShipments();
  };

  const handleNavClick = (value: string) => {
    setActiveTab(value);
    setMobileNavOpen(false);
    setNavQuery('');
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    []
  );

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{greeting}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <QuickAction
          icon={PlusCircle}
          label="New Booking"
          description="Create a shipment"
          onClick={() => setActiveTab('manualBooking')}
          primary
        />
        <QuickAction
          icon={Package}
          label="Shipments"
          description="Manage active"
          onClick={() => setActiveTab('shipments')}
        />
        <QuickAction
          icon={Quote}
          label="Quotes"
          description="Review requests"
          onClick={() => setActiveTab('customQuotes')}
        />
        <QuickAction
          icon={BarChart3}
          label="Reports"
          description="View analytics"
          onClick={() => setActiveTab('reports')}
        />
      </div>

      {/* Needs attention */}
      {(stats.pendingShipments > 0 || stats.pendingQuotes > 0) && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Needs attention
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {stats.pendingShipments > 0 && (
              <AttentionCard
                icon={AlertCircle}
                count={stats.pendingShipments}
                title="pending collection"
                description="Shipments waiting to be picked up"
                onClick={() => setActiveTab('shipments')}
              />
            )}
            {stats.pendingQuotes > 0 && (
              <AttentionCard
                icon={Quote}
                count={stats.pendingQuotes}
                title="quote requests"
                description="Awaiting your response"
                onClick={() => setActiveTab('customQuotes')}
              />
            )}
          </div>
        </section>
      )}

      {/* KPIs */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          At a glance
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <StatCard icon={Package} label="Total shipments" value={stats.totalShipments.toLocaleString()} />
          <StatCard icon={Truck} label="In transit" value={stats.activeShipments.toLocaleString()} accent />
          <StatCard icon={CheckCircle2} label="Delivered" value={stats.deliveredShipments.toLocaleString()} />
          <StatCard icon={CreditCard} label="Total revenue" value={`£${stats.totalRevenue.toFixed(2)}`} />
        </div>
      </section>

      {/* Recent shipments */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Recent shipments
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            onClick={() => setActiveTab('shipments')}
          >
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {recentShipments.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                No recent shipments
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentShipments.map((s) => {
                      const customer =
                        s.metadata?.sender_name ||
                        s.metadata?.customer_name ||
                        s.metadata?.recipient_name ||
                        '—';
                      const statusClass =
                        (s.status && STATUS_VARIANT[s.status]) ||
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
                      return (
                        <TableRow
                          key={s.id}
                          className="cursor-pointer"
                          onClick={() => setActiveTab('shipments')}
                        >
                          <TableCell className="font-mono text-xs">
                            {s.tracking_number || '—'}
                          </TableCell>
                          <TableCell className="truncate max-w-[200px]">{customer}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                statusClass
                              )}
                            >
                              {s.status || 'Unknown'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-gray-500 dark:text-gray-400">
                            {new Date(s.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
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
      </section>
    </div>
  );

  const renderTabContent = (tabValue: string) => {
    switch (tabValue) {
      case 'overview': return renderOverview();
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

  const sidebar = (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
          <LayoutDashboard className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Admin Panel</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Zimbabwe Shipping</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            placeholder="Search sections…"
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {filteredNavGroups.length === 0 ? (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-6">
            No sections match "{navQuery}"
          </div>
        ) : (
          filteredNavGroups.map((group, groupIdx) => (
            <div key={group.key} className={cn(groupIdx > 0 && 'mt-3')}>
              <p className="px-2.5 mb-0.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {group.label}
              </p>
              <div className="space-y-px">
                {group.items.map((item) => {
                  const isActive = activeTab === item.value;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleNavClick(item.value)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                        )}
                      />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'h-4 px-1.5 text-[10px] font-semibold',
                            isActive
                              ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          )}
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-56 border-r border-gray-200 dark:border-gray-800 shrink-0">
          {sidebar}
        </aside>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-3 md:px-4 h-12">
            {isMobile && (
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  {sidebar}
                </SheetContent>
              </Sheet>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">
                {activeLabel}
              </h1>
            </div>

            <div className="flex items-center gap-1.5">
              <Select
                value={selectedCountry}
                onValueChange={(v) => setSelectedCountry(v as 'England' | 'Ireland')}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="England">
                    <span className="flex items-center gap-2">
                      <span>🇬🇧</span> UK
                    </span>
                  </SelectItem>
                  <SelectItem value="Ireland">
                    <span className="flex items-center gap-2">
                      <span>🇮🇪</span> Ireland
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={refreshDashboard}
                disabled={loading}
                className="h-8 w-8"
                title="Refresh"
              >
                <RefreshCcw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 relative" title="Notifications">
                    <Bell className="h-3.5 w-3.5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[10px] font-semibold">
                        {notifications.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {notifications.length} unread
                    </p>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="max-h-[360px] overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(n.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">You're all caught up</p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="w-full p-3 md:p-4">{renderTabContent(activeTab)}</div>
        </main>
      </div>
    </div>
  );
};

// --- Small presentational components ---

const QuickAction: FC<{
  icon: any;
  label: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}> = ({ icon: Icon, label, description, onClick, primary }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2.5 rounded-md border p-2.5 text-left transition-colors',
      primary
        ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
    )}
  >
    <div
      className={cn(
        'h-8 w-8 rounded-md flex items-center justify-center shrink-0',
        primary ? 'bg-white/15' : 'bg-emerald-50 dark:bg-emerald-950'
      )}
    >
      <Icon className={cn('h-4 w-4', primary ? 'text-white' : 'text-emerald-600 dark:text-emerald-400')} />
    </div>
    <div className="min-w-0">
      <p className={cn('text-xs font-semibold truncate', primary ? 'text-white' : 'text-gray-900 dark:text-white')}>
        {label}
      </p>
      <p className={cn('text-[11px] truncate', primary ? 'text-white/80' : 'text-gray-500 dark:text-gray-400')}>
        {description}
      </p>
    </div>
  </button>
);

const AttentionCard: FC<{
  icon: any;
  count: number;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon: Icon, count, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-between gap-3 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-left hover:bg-amber-100/70 dark:hover:bg-amber-950 transition-colors"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-8 w-8 rounded-md bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-white">
          {count} {title}
        </p>
        <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate">{description}</p>
      </div>
    </div>
    <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
  </button>
);

const StatCard: FC<{
  icon: any;
  label: string;
  value: string;
  accent?: boolean;
}> = ({ icon: Icon, label, value, accent }) => (
  <Card className="shadow-none border border-gray-200 dark:border-gray-800">
    <CardContent className="p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <div
          className={cn(
            'h-6 w-6 rounded-md flex items-center justify-center',
            accent
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </CardContent>
  </Card>
);

const AdminDashboardContent = () => (
  <AdminCountryProvider>
    <AdminDashboardInner />
  </AdminCountryProvider>
);

export default AdminDashboardContent;
