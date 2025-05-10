
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  RefreshCw 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#58D68D', '#F4D03F'];

interface ShipmentStats {
  'Booking Confirmed': number;
  'Ready for Pickup': number;
  'Processing in Warehouse (UK)': number;
  'In Transit': number;
  'Customs Clearance': number;
  'Processing in Warehouse (ZW)': number;
  'Out for Delivery': number;
  Delivered: number;
  Cancelled: number;
  [key: string]: number; // Index signature
}

interface RouteData {
  name: string;
  value: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

const ReportsAnalyticsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6m');
  const [shipmentStats, setShipmentStats] = useState<ShipmentStats>({
    'Booking Confirmed': 0,
    'Ready for Pickup': 0,
    'Processing in Warehouse (UK)': 0,
    'In Transit': 0,
    'Customs Clearance': 0,
    'Processing in Warehouse (ZW)': 0,
    'Out for Delivery': 0,
    'Delivered': 0,
    'Cancelled': 0
  });
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchShipmentStats(),
        fetchRouteData(),
        fetchRevenueData()
      ]);
    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchShipmentStats = async () => {
    try {
      const dateLimit = getDateRange();
      
      const { data, error } = await supabase
        .from('shipments')
        .select('status')
        .gte('created_at', dateLimit);
      
      if (error) throw error;
      
      const stats: ShipmentStats = {
        'Booking Confirmed': 0,
        'Ready for Pickup': 0,
        'Processing in Warehouse (UK)': 0,
        'In Transit': 0,
        'Customs Clearance': 0,
        'Processing in Warehouse (ZW)': 0,
        'Out for Delivery': 0,
        'Delivered': 0,
        'Cancelled': 0
      };
      
      data?.forEach(shipment => {
        if (stats.hasOwnProperty(shipment.status)) {
          stats[shipment.status]++;
        } else {
          // Handle any status that doesn't match our predefined keys
          console.log(`Unknown status: ${shipment.status}`);
        }
      });
      
      setShipmentStats(stats);
    } catch (error) {
      console.error('Error fetching shipment stats:', error);
      throw error;
    }
  };

  const fetchRouteData = async () => {
    try {
      const dateLimit = getDateRange();
      
      // Fetch collection schedules
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('route')
        .gte('created_at', dateLimit);
      
      if (error) throw error;
      
      // Count shipments by route
      const routeCounts: Record<string, number> = {};
      
      data?.forEach(record => {
        routeCounts[record.route] = (routeCounts[record.route] || 0) + 1;
      });
      
      // Transform to chart data
      const chartData = Object.entries(routeCounts).map(([name, value]) => ({ name, value }));
      setRouteData(chartData.length > 0 ? chartData : [{ name: 'No Data', value: 0 }]);
    } catch (error) {
      console.error('Error fetching route data:', error);
      throw error;
    }
  };

  const fetchRevenueData = async () => {
    try {
      // Get the number of months to fetch based on timeRange
      const monthsToFetch = parseInt(timeRange.replace('m', ''));
      
      // Get payments within the date range
      const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at')
        .gte('created_at', format(subMonths(new Date(), monthsToFetch), 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Group revenue by month
      const monthlyRevenue: Record<string, number> = {};
      
      // Initialize all months with 0
      for (let i = 0; i < monthsToFetch; i++) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, 'MMM yyyy');
        monthlyRevenue[monthKey] = 0;
      }
      
      // Sum up payments by month
      data?.forEach(payment => {
        const monthKey = format(parseISO(payment.created_at), 'MMM yyyy');
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += payment.amount;
        }
      });
      
      // Transform to chart data and sort by date
      const chartData = Object.entries(monthlyRevenue)
        .map(([month, revenue]) => ({ month, revenue }))
        .reverse();
      
      setRevenueData(chartData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      throw error;
    }
  };

  const getDateRange = () => {
    const months = parseInt(timeRange.replace('m', ''));
    return format(subMonths(new Date(), months), 'yyyy-MM-dd');
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleExport = () => {
    // Implementation for exporting data as CSV or PDF would go here
    toast({
      title: 'Export Started',
      description: 'Your report is being prepared for download',
    });
  };

  // Format data for charts
  const shipmentStatusData = Object.entries(shipmentStats).map(([status, count]) => ({
    name: status,
    value: count
  })).filter(item => item.value > 0); // Only show statuses with data

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">Last Month</SelectItem>
            <SelectItem value="3m">Last 3 Months</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="12m">Last Year</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Revenue Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>
            Monthly revenue for the {timeRange === '1m' ? 'last month' : `last ${timeRange.replace('m', '')} months`}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : revenueData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No revenue data available for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `£${value}`} />
                <Tooltip formatter={(value) => `£${Number(value).toFixed(2)}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  activeDot={{ r: 8 }} 
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Shipment Distribution & Route Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Distribution</CardTitle>
            <CardDescription>Shipments by status</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : shipmentStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No shipment data available for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shipmentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {shipmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} shipments`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Shipments by Route */}
        <Card>
          <CardHeader>
            <CardTitle>Shipments by Route</CardTitle>
            <CardDescription>Number of shipments per route</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : routeData.length === 0 || (routeData.length === 1 && routeData[0].name === 'No Data') ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No route data available for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366F1" name="Shipments" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsAnalyticsTab;
