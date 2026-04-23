
import React, { useState, useEffect } from 'react';
import TabHeader from '../TabHeader';
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
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#58D68D', '#F4D03F'];

interface ShipmentStats {
  Booking_Confirmed: number;
  Ready_for_Pickup: number;
  Processing_in_Warehouse_UK: number;
  In_Transit: number;
  Customs_Clearance: number;
  Processing_in_Warehouse_ZW: number;
  Out_for_Delivery: number;
  Delivered: number;
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
    Booking_Confirmed: 0,
    Ready_for_Pickup: 0,
    Processing_in_Warehouse_UK: 0,
    In_Transit: 0,
    Customs_Clearance: 0,
    Processing_in_Warehouse_ZW: 0,
    Out_for_Delivery: 0,
    Delivered: 0
  });
  const [routeData, setRouteData] = useState<any[]>([]);
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
      const { data, error } = await supabase
        .from('shipments')
        .select('status')
        .gte('created_at', getDateRange());
      
      if (error) throw error;
      
      const stats: ShipmentStats = {
        Booking_Confirmed: 0,
        Ready_for_Pickup: 0,
        Processing_in_Warehouse_UK: 0,
        In_Transit: 0,
        Customs_Clearance: 0,
        Processing_in_Warehouse_ZW: 0,
        Out_for_Delivery: 0,
        Delivered: 0
      };
      
      data?.forEach(shipment => {
        const normalizedStatus = shipment.status
          .replace(/ /g, '_')
          .replace(/\(/g, '')
          .replace(/\)/g, '');
        
        if (stats.hasOwnProperty(normalizedStatus)) {
          stats[normalizedStatus as keyof ShipmentStats]++;
        }
      });
      
      setShipmentStats(stats);
    } catch (error) {
      console.error('Error fetching shipment stats:', error);
    }
  };

  const fetchRouteData = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('route')
        .gte('created_at', getDateRange());
      
      if (error) throw error;
      
      // Count shipments by route
      const routeCounts: Record<string, number> = {};
      
      data?.forEach(record => {
        routeCounts[record.route] = (routeCounts[record.route] || 0) + 1;
      });
      
      // Transform to chart data
      const chartData = Object.entries(routeCounts).map(([name, value]) => ({ name, value }));
      setRouteData(chartData);
    } catch (error) {
      console.error('Error fetching route data:', error);
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
        const monthKey = format(new Date(payment.created_at), 'MMM yyyy');
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
    }
  };

  const getDateRange = () => {
    const months = parseInt(timeRange.replace('m', ''));
    return format(subMonths(new Date(), months), 'yyyy-MM-dd');
  };

  const handleRefresh = () => {
    fetchData();
  };

  // Format data for charts
  const shipmentStatusData = Object.entries(shipmentStats).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    value: count
  }));

  return (
    <div className="space-y-4">
      <TabHeader
        title="Reports & Analytics"
        description="Revenue, shipment, and route insights"
        actions={
          <>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="12m">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </>
        }
      />

      {/* Revenue Over Time */}
      <Card className="shadow-none border border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Revenue Over Time</CardTitle>
          <CardDescription className="text-xs">
            Monthly revenue for the {timeRange === '1m' ? 'last month' : `last ${timeRange.replace('m', '')} months`}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-[300px] w-full" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Shipment Status Distribution */}
        <Card className="shadow-none border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Shipment Distribution</CardTitle>
            <CardDescription className="text-xs">Shipments by status</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-[300px] w-full" />
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
        <Card className="shadow-none border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Shipments by Route</CardTitle>
            <CardDescription className="text-xs">Number of shipments per route</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-[300px] w-full" />
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
