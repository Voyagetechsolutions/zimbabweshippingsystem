
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  BarChart,
  PieChart,
  DonutChart,
} from '@/components/ui/charts';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  LineChart,
  ArrowUp,
  ArrowDown,
  Activity,
  RefreshCw,
  Download,
  BarChart3,
  FileDown,
  Loader2
} from 'lucide-react';
import { format, sub, differenceInDays } from 'date-fns';

interface ChartData {
  name: string;
  value: number;
}

// Type guard to check if a value is a valid object
function isValidObject(obj: any): obj is Record<string, any> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

const ReportsAnalyticsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30days');
  
  // Analytics data
  const [shipmentsData, setShipmentsData] = useState<ChartData[]>([]);
  const [shipmentsByStatus, setShipmentsByStatus] = useState<ChartData[]>([]);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [drumCount, setDrumCount] = useState(0);
  const [topRoutes, setTopRoutes] = useState<ChartData[]>([]);
  
  // Summary statistics
  const [summaryStats, setSummaryStats] = useState({
    totalShipments: 0,
    totalRevenue: 0,
    averageValue: 0,
    percentChange: 0,
    isPositiveChange: true,
    totalDrums: 0,
    activeShipments: 0
  });
  
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);
  
  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const today = new Date();
      let startDate;
      
      switch(timeRange) {
        case '7days':
          startDate = sub(today, { days: 7 });
          break;
        case '30days':
          startDate = sub(today, { days: 30 });
          break;
        case '90days':
          startDate = sub(today, { days: 90 });
          break;
        case '12months':
          startDate = sub(today, { months: 12 });
          break;
        default:
          startDate = sub(today, { days: 30 });
      }
      
      const formattedStartDate = startDate.toISOString();
      
      // Fetch shipments data
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*, profiles:user_id(full_name, email)')
        .gte('created_at', formattedStartDate);
      
      if (shipmentsError) throw shipmentsError;
      
      // Fetch payments data
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', formattedStartDate);
      
      if (paymentsError) throw paymentsError;
      
      // Process shipments by date
      const shipmentsByDate = processShipmentsByDate(shipments || [], startDate, today);
      setShipmentsData(shipmentsByDate);
      
      // Process shipments by status
      const statusCounts = processShipmentsByStatus(shipments || []);
      setShipmentsByStatus(statusCounts);
      
      // Count drums
      const drumTotal = countDrums(shipments || []);
      setDrumCount(drumTotal);
      
      // Process revenue data
      const revenueByDate = processRevenueByDate(payments || [], startDate, today);
      setRevenueData(revenueByDate);
      
      // Process top routes
      const routesData = processRouteStats(shipments || []);
      setTopRoutes(routesData);
      
      // Calculate summary statistics
      const currentPeriodShipments = shipments?.length || 0;
      
      // Calculate previous period for comparison
      const previousStartDate = sub(startDate, { 
        days: differenceInDays(today, startDate) 
      });
      
      const { data: previousShipments } = await supabase
        .from('shipments')
        .select('count')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', formattedStartDate);
      
      const previousPeriodShipments = previousShipments?.[0]?.count || 0;
      
      const percentChange = previousPeriodShipments > 0 
        ? ((currentPeriodShipments - previousPeriodShipments) / previousPeriodShipments) * 100
        : 100;
      
      const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const averageValue = currentPeriodShipments > 0 ? totalRevenue / currentPeriodShipments : 0;
      const activeShipmentCount = shipments?.filter(s => 
        s.status !== 'Delivered' && 
        s.status !== 'Cancelled' && 
        s.status !== 'Failed Attempt'
      ).length || 0;
      
      setSummaryStats({
        totalShipments: currentPeriodShipments,
        totalRevenue,
        averageValue,
        percentChange: Math.abs(percentChange),
        isPositiveChange: percentChange >= 0,
        totalDrums: drumTotal,
        activeShipments: activeShipmentCount
      });
      
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
  
  // Process shipments by date for time series chart
  const processShipmentsByDate = (shipments: any[], startDate: Date, endDate: Date) => {
    // Create a map to store shipment counts by date
    const shipmentsByDate: Record<string, number> = {};
    
    // Initialize all dates in range with 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      shipmentsByDate[dateString] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Count shipments by date
    shipments.forEach(shipment => {
      const shipmentDate = format(new Date(shipment.created_at), 'yyyy-MM-dd');
      if (shipmentsByDate[shipmentDate] !== undefined) {
        shipmentsByDate[shipmentDate]++;
      }
    });
    
    // Convert to chart data format
    return Object.entries(shipmentsByDate).map(([date, count]) => ({
      name: format(new Date(date), 'MMM d'),
      value: count
    }));
  };
  
  // Process revenue by date for time series chart
  const processRevenueByDate = (payments: any[], startDate: Date, endDate: Date) => {
    // Create a map to store revenue by date
    const revenueByDate: Record<string, number> = {};
    
    // Initialize all dates in range with 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      revenueByDate[dateString] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sum revenue by date
    payments.forEach(payment => {
      const paymentDate = format(new Date(payment.created_at), 'yyyy-MM-dd');
      if (revenueByDate[paymentDate] !== undefined) {
        revenueByDate[paymentDate] += payment.amount || 0;
      }
    });
    
    // Convert to chart data format
    return Object.entries(revenueByDate).map(([date, amount]) => ({
      name: format(new Date(date), 'MMM d'),
      value: amount
    }));
  };
  
  // Process shipments by status for pie chart
  const processShipmentsByStatus = (shipments: any[]) => {
    const statusCounts: Record<string, number> = {};
    
    shipments.forEach(shipment => {
      const status = shipment.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: status,
        value: count
      }))
      .sort((a, b) => b.value - a.value);
  };
  
  // Process route statistics
  const processRouteStats = (shipments: any[]) => {
    const routeCounts: Record<string, number> = {};
    
    shipments.forEach(shipment => {
      if (isValidObject(shipment.metadata)) {
        const collection = shipment.metadata.collection || shipment.metadata.collectionDetails;
        if (isValidObject(collection) && collection.route) {
          const route = collection.route;
          routeCounts[route] = (routeCounts[route] || 0) + 1;
        }
      }
    });
    
    return Object.entries(routeCounts)
      .map(([route, count]) => ({
        name: route,
        value: count
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 routes
  };
  
  // Count total drums
  const countDrums = (shipments: any[]) => {
    let totalDrums = 0;
    
    shipments.forEach(shipment => {
      if (isValidObject(shipment.metadata)) {
        const shipmentDetails = shipment.metadata.shipment || shipment.metadata.shipmentDetails;
        if (isValidObject(shipmentDetails)) {
          const hasDrums = shipmentDetails.type === 'Drums' || shipmentDetails.includeDrums;
          if (hasDrums) {
            const quantity = parseInt(String(shipmentDetails.quantity)) || 1;
            totalDrums += quantity;
          }
        }
      }
    });
    
    return totalDrums;
  };
  
  const exportReportData = () => {
    // Format export data
    const exportData = {
      reportDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      timeRange,
      summaryStats,
      shipmentsByStatus,
      shipmentsData,
      revenueData,
      topRoutes
    };
    
    // Convert to JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipping_report_${format(new Date(), 'yyyyMMdd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: 'Report exported',
      description: 'The report has been exported as JSON'
    });
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        
        <div className="flex gap-3 self-stretch md:self-auto w-full md:w-auto">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={fetchAnalyticsData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={exportReportData} disabled={loading}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
          <span className="ml-3 text-lg text-gray-500">Loading analytics data...</span>
        </div>
      ) : (
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="shipments" className="flex items-center gap-2">
              <BarChartIcon className="h-4 w-4" />
              <span>Shipments</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              <span>Revenue</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Shipments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryStats.totalShipments}</div>
                  <div className="flex items-center text-xs mt-1">
                    {summaryStats.isPositiveChange ? (
                      <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span 
                      className={summaryStats.isPositiveChange ? 'text-green-500' : 'text-red-500'}
                    >
                      {summaryStats.percentChange.toFixed(1)}%
                    </span>
                    <span className="text-gray-500 ml-1">vs previous period</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Shipments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryStats.activeShipments}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Currently in transit
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">£{summaryStats.totalRevenue.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg. £{summaryStats.averageValue.toFixed(2)} per shipment
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Drums
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryStats.totalDrums}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Shipped during this period
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipment Status Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of shipments by current status
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {shipmentsByStatus.length > 0 ? (
                    <DonutChart 
                      data={shipmentsByStatus}
                      index="name"
                      category="value"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Routes</CardTitle>
                  <CardDescription>
                    Most popular collection routes
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {topRoutes.length > 0 ? (
                    <BarChart 
                      data={topRoutes}
                      index="name"
                      categories={["value"]}
                      valueFormatter={(value) => `${value} shipments`}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No route data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="shipments">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipment Volume Over Time</CardTitle>
                  <CardDescription>
                    Number of shipments processed per day
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {shipmentsData.length > 0 ? (
                    <AreaChart 
                      data={shipmentsData}
                      index="name"
                      categories={["value"]}
                      valueFormatter={(value) => `${value} shipments`}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No shipment data available
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipment Status Distribution</CardTitle>
                    <CardDescription>
                      Breakdown of shipments by current status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    {shipmentsByStatus.length > 0 ? (
                      <PieChart 
                        data={shipmentsByStatus}
                        index="name"
                        category="value"
                        valueFormatter={(value) => `${value} shipments`}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Routes</CardTitle>
                    <CardDescription>
                      Most popular collection routes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px] flex flex-col">
                    {topRoutes.length > 0 ? (
                      <BarChart 
                        data={topRoutes}
                        index="name"
                        categories={["value"]}
                        valueFormatter={(value) => `${value} shipments`}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No route data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="revenue">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Over Time</CardTitle>
                  <CardDescription>
                    Daily revenue from shipments
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {revenueData.length > 0 ? (
                    <AreaChart 
                      data={revenueData}
                      index="name"
                      categories={["value"]}
                      valueFormatter={(value) => `£${value.toFixed(2)}`}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No revenue data available
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Additional revenue metrics could go here */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">£{summaryStats.totalRevenue.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {timeRange === '7days' ? 'Last 7 days' : 
                       timeRange === '30days' ? 'Last 30 days' : 
                       timeRange === '90days' ? 'Last 90 days' : 
                       'Last 12 months'}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">£{summaryStats.averageValue.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Per shipment
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Shipment Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summaryStats.totalShipments}</div>
                    <div className="flex items-center text-xs mt-1">
                      {summaryStats.isPositiveChange ? (
                        <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span 
                        className={summaryStats.isPositiveChange ? 'text-green-500' : 'text-red-500'}
                      >
                        {summaryStats.percentChange.toFixed(1)}%
                      </span>
                      <span className="text-gray-500 ml-1">vs previous period</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </>
  );
};

export default ReportsAnalyticsTab;
