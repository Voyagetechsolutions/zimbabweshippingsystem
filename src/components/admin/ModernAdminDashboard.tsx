import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Truck,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Quote,
  LayoutDashboard,
  MapPin,
  CreditCard,
  BarChart3,
  Bell,
  Calendar,
  Route,
  Settings,
  MessageSquare,
  ImageIcon,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronDown,
  Star,
} from 'lucide-react';

// Import existing tab components
import ShipmentManagementTab from './tabs/ShipmentManagementTab';
import CustomerManagementTab from './tabs/CustomerManagementTab';
import CustomQuoteManagement from './CustomQuoteManagement';
import PickupZonesManagementTab from './tabs/PickupZonesManagementTab';
import DeliveryManagementTab from './tabs/DeliveryManagementTab';
import PaymentsInvoicingTab from './tabs/PaymentsInvoicingTab';
import PaymentScheduleManagement from './PaymentScheduleManagement';
import ReportsAnalyticsTab from './tabs/ReportsAnalyticsTab';
import NotificationsAlertsTab from './tabs/NotificationsAlertsTab';
import CollectionScheduleTab from './tabs/CollectionScheduleTab';
import RouteManagementTab from './tabs/RouteManagementTab';
import UserManagementTab from './tabs/UserManagementTab';
import SupportTickets from './SupportTickets';
import ContentManagement from './ContentManagement';
import SystemSettingsTab from './tabs/SystemSettingsTab';
import ServiceReviewsTab from './tabs/ServiceReviewsTab';

interface DashboardStats {
  totalShipments: number;
  pendingShipments: number;
  activeShipments: number;
  deliveredShipments: number;
  totalRevenue: number;
  pendingQuotes: number;
  totalCustomers: number;
  monthlyGrowth: number;
}

export const ModernAdminDashboard = () => {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    main: true,
    operations: false,
    finance: false,
    communications: false,
    system: false,
  });
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    pendingShipments: 0,
    activeShipments: 0,
    deliveredShipments: 0,
    totalRevenue: 0,
    pendingQuotes: 0,
    totalCustomers: 0,
    monthlyGrowth: 0,
  });

  const menuGroups = [
    {
      key: 'main',
      label: 'Main',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'text-purple-600' },
        { id: 'shipments', label: 'Shipments', icon: Package, color: 'text-blue-600' },
        { id: 'quotes', label: 'Custom Quotes', icon: Quote, color: 'text-orange-600' },
        { id: 'customers', label: 'Customers', icon: Users, color: 'text-green-600' },
      ],
    },
    {
      key: 'operations',
      label: 'Operations',
      items: [
        { id: 'pickup', label: 'Pickup Zones', icon: MapPin, color: 'text-red-600' },
        { id: 'delivery', label: 'Delivery', icon: Truck, color: 'text-indigo-600' },
        { id: 'collection', label: 'Schedule', icon: Calendar, color: 'text-cyan-600' },
        { id: 'routes', label: 'Routes', icon: Route, color: 'text-lime-600' },
      ],
    },
    {
      key: 'finance',
      label: 'Finance',
      items: [
        { id: 'payments', label: 'Payments', icon: CreditCard, color: 'text-teal-600' },
        { id: 'schedule', label: '30-Day Payments', icon: CalendarDays, color: 'text-pink-600' },
        { id: 'reports', label: 'Reports', icon: BarChart3, color: 'text-yellow-600' },
      ],
    },
    {
      key: 'communications',
      label: 'Communications',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-red-500' },
        { id: 'support', label: 'Support Tickets', icon: MessageSquare, color: 'text-amber-600' },
        { id: 'feedback', label: 'Feedback', icon: Star, color: 'text-emerald-600' },
      ],
    },
    {
      key: 'system',
      label: 'System',
      items: [
        { id: 'users', label: 'Users', icon: Users, color: 'text-violet-600' },
        { id: 'content', label: 'Content', icon: ImageIcon, color: 'text-rose-600' },
        { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600' },
      ],
    },
  ];

  // Flat list for mobile dropdown and renderContent
  const menuItems = menuGroups.flatMap((g) => g.items);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand the group containing the active view
  useEffect(() => {
    for (const group of menuGroups) {
      if (group.items.some((item) => item.id === activeView)) {
        setExpandedGroups((prev) => ({ ...prev, [group.key]: true }));
        break;
      }
    }
  }, [activeView]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [shipmentsRes, paymentsRes, quotesRes, customersRes] = await Promise.all([
        supabase.from('shipments').select('id, status, created_at'),
        supabase.from('payments').select('amount'),
        supabase.from('custom_quotes').select('id, status').eq('status', 'pending'),
        supabase.from('profiles').select('id, created_at'),
      ]);

      const shipments = shipmentsRes.data || [];
      const payments = paymentsRes.data || [];
      const quotes = quotesRes.data || [];
      const customers = customersRes.data || [];

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthShipments = shipments.filter(s => new Date(s.created_at) >= lastMonth).length;
      const lastMonthShipments = shipments.length - thisMonthShipments;
      const growth = lastMonthShipments > 0 ? ((thisMonthShipments - lastMonthShipments) / lastMonthShipments) * 100 : 0;

      setStats({
        totalShipments: shipments.length,
        pendingShipments: shipments.filter(s => s.status === 'pending' || s.status === 'Ready for Pickup').length,
        activeShipments: shipments.filter(s => ['Processing in UK Warehouse', 'Customs Clearance', 'Out for Delivery'].includes(s.status)).length,
        deliveredShipments: shipments.filter(s => s.status === 'Delivered').length,
        totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        pendingQuotes: quotes.length,
        totalCustomers: customers.length,
        monthlyGrowth: growth,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, change, color, trend }: any) => (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
        <p className="text-purple-100">Here's what's happening with your shipping business today.</p>
        <Button onClick={fetchDashboardStats} variant="secondary" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Package} label="Total Shipments" value={stats.totalShipments} change={stats.monthlyGrowth} trend={stats.monthlyGrowth >= 0 ? 'up' : 'down'} color="bg-blue-500" />
        <StatCard icon={Clock} label="Pending Shipments" value={stats.pendingShipments} color="bg-yellow-500" />
        <StatCard icon={Truck} label="Active Shipments" value={stats.activeShipments} color="bg-orange-500" />
        <StatCard icon={CheckCircle} label="Delivered" value={stats.deliveredShipments} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={`£${stats.totalRevenue.toFixed(2)}`} color="bg-emerald-500" />
        <StatCard icon={Quote} label="Pending Quotes" value={stats.pendingQuotes} color="bg-purple-500" />
        <StatCard icon={Users} label="Total Customers" value={stats.totalCustomers} color="bg-cyan-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-6 flex-col gap-2 hover:border-blue-500 hover:bg-blue-50" onClick={() => setActiveView('shipments')}>
              <Package className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">View Shipments</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2 hover:border-orange-500 hover:bg-orange-50" onClick={() => setActiveView('quotes')}>
              <Quote className="h-6 w-6 text-orange-600" />
              <span className="text-sm font-medium">Custom Quotes</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2 hover:border-green-500 hover:bg-green-50" onClick={() => setActiveView('customers')}>
              <Users className="h-6 w-6 text-green-600" />
              <span className="text-sm font-medium">Customers</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2 hover:border-purple-500 hover:bg-purple-50" onClick={() => setActiveView('reports')}>
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'overview': return renderOverview();
      case 'shipments': return <ShipmentManagementTab />;
      case 'quotes': return <CustomQuoteManagement />;
      case 'customers': return <CustomerManagementTab />;
      case 'pickup': return <PickupZonesManagementTab />;
      case 'delivery': return <DeliveryManagementTab />;
      case 'payments': return <PaymentsInvoicingTab />;
      case 'schedule': return <PaymentScheduleManagement />;
      case 'reports': return <ReportsAnalyticsTab />;
      case 'notifications': return <NotificationsAlertsTab />;
      case 'collection': return <CollectionScheduleTab />;
      case 'routes': return <RouteManagementTab />;
      case 'users': return <UserManagementTab />;
      case 'support': return <SupportTickets />;
      case 'content': return <ContentManagement />;
      case 'feedback': return <ServiceReviewsTab />;
      case 'settings': return <SystemSettingsTab />;
      default: return renderOverview();
    }
  };

  if (loading && activeView === 'overview') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex">
        {/* Sidebar with collapsible groups */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0 hidden lg:block">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Admin Panel
            </h2>
          </div>
          <nav className="px-3 py-3">
            {menuGroups.map((group) => (
              <div key={group.key} className="mb-1">
                {/* Group header with dropdown arrow */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedGroups[group.key] ? 'rotate-180' : ''
                      }`}
                  />
                </button>
                {/* Group items - shown when expanded */}
                {expandedGroups[group.key] && (
                  <div className="space-y-0.5 mb-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveView(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeView === item.id
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          <Icon className={`h-4 w-4 ${activeView === item.id ? 'text-white' : item.color}`} />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Mobile Menu */}
          <div className="lg:hidden mb-6">
            <select
              value={activeView}
              onChange={(e) => setActiveView(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              {menuItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {renderContent()}
        </main>
      </div>
    </div>
  );
};
