
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// Fixed component to not use the 'group' method which doesn't exist
const AnalyticsReports: React.FC = () => {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [shipmentsData, setShipmentsData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<any[]>([]);
  const [timeFrame, setTimeFrame] = useState<'7days' | '30days' | 'year'>('7days');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        // Fetch revenue data
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: true });
          
        if (paymentData) {
          // Process data for the selected time frame
          const filteredData = filterDataByTimeFrame(paymentData, timeFrame);
          
          // Aggregate revenue by day
          const aggregatedRevenue = aggregateDataByDay(filteredData, 'amount');
          setRevenueData(aggregatedRevenue);
        }

        // Fetch shipments data
        const { data: shipmentData } = await supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: true });
          
        if (shipmentData) {
          // Process data for the selected time frame
          const filteredData = filterDataByTimeFrame(shipmentData, timeFrame);
          
          // Count shipments by status
          const statusCounts = countByField(filteredData, 'status');
          setShipmentsData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
          
          // Count shipments by location (destination)
          const locationCounts = countByField(filteredData, 'destination');
          setLocationData(Object.entries(locationCounts).map(([name, value]) => ({ name, value })));
        }

        // Fetch customer data (profiles)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });
          
        if (profileData) {
          // Process data for the selected time frame
          const filteredData = filterDataByTimeFrame(profileData, timeFrame);
          
          // Aggregate customers by day
          const aggregatedCustomers = aggregateDataByDay(filteredData, 'id', true);
          setCustomerData(aggregatedCustomers);
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeFrame]);

  const filterDataByTimeFrame = (data: any[], timeFrame: string) => {
    const now = new Date();
    let startDate;

    switch (timeFrame) {
      case '7days':
        startDate = subDays(now, 7);
        break;
      case '30days':
        startDate = subDays(now, 30);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 7);
    }

    return data.filter(item => new Date(item.created_at) >= startDate);
  };

  const aggregateDataByDay = (data: any[], valueField: string, isCount = false) => {
    const now = new Date();
    let startDate, endDate;
    
    switch (timeFrame) {
      case '7days':
        startDate = subDays(now, 7);
        endDate = now;
        break;
      case '30days':
        startDate = subDays(now, 30);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st of current year
        endDate = now;
        break;
      default:
        startDate = subDays(now, 7);
        endDate = now;
    }

    // Generate all days in the range
    const dayRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Create a map to store values by day
    const dailyData = dayRange.reduce((acc, day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      acc[dateKey] = 0;
      return acc;
    }, {} as Record<string, number>);
    
    // Aggregate values by day
    data.forEach(item => {
      const dateKey = format(new Date(item.created_at), 'yyyy-MM-dd');
      if (dailyData[dateKey] !== undefined) {
        if (isCount) {
          dailyData[dateKey]++;
        } else {
          dailyData[dateKey] += Number(item[valueField]) || 0;
        }
      }
    });
    
    // Convert to array format for charts
    return Object.entries(dailyData).map(([date, value]) => ({
      date: format(new Date(date), 'MMM dd'),
      value: value
    }));
  };

  const countByField = (data: any[], field: string) => {
    return data.reduce((acc, item) => {
      const value = item[field] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28FD0', '#FF6B6B'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="7days" onValueChange={(value) => setTimeFrame(value as '7days' | '30days' | 'year')}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <TabsList>
            <TabsTrigger value="7days">7 Days</TabsTrigger>
            <TabsTrigger value="30days">30 Days</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="7days" className="space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#2cb67d" activeDot={{ r: 8 }} name="Revenue (£)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shipments by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Shipments by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shipmentsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {shipmentsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* New Customers */}
            <Card>
              <CardHeader>
                <CardTitle>New Customer Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={customerData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f9ca24" name="New Customers" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="30days" className="space-y-6">
          {/* Similar content structure as 7days but with different title */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#2cb67d" activeDot={{ r: 8 }} name="Revenue (£)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Similar grid as 7days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Same components as 7days */}
            <Card>
              <CardHeader>
                <CardTitle>Shipments by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shipmentsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {shipmentsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New Customer Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={customerData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f9ca24" name="New Customers" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="year" className="space-y-6">
          {/* Similar content structure but for yearly view */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue (This Year)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#2cb67d" activeDot={{ r: 8 }} name="Revenue (£)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Same components */}
            <Card>
              <CardHeader>
                <CardTitle>Shipments by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shipmentsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {shipmentsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New Customer Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={customerData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f9ca24" name="New Customers" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsReports;
