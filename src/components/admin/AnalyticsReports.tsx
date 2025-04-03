import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, Users, Package, Truck, Calendar } from 'lucide-react';

const AnalyticsReports = () => {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [shipmentData, setShipmentData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch payment data for revenue analysis
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('amount, created_at, payment_status')
        .eq('payment_status', 'completed');
      
      if (paymentError) throw paymentError;

      // Calculate total revenue
      const revenue = paymentData?.reduce((total, payment) => total + Number(payment.amount), 0) || 0;
      setTotalRevenue(revenue);
      
      // Process payment data for monthly revenue chart
      const monthlyRevenue: Record<string, number> = {};
      
      paymentData?.forEach(payment => {
        const date = new Date(payment.created_at);
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        if (!monthlyRevenue[monthYear]) {
          monthlyRevenue[monthYear] = 0;
        }
        
        monthlyRevenue[monthYear] += Number(payment.amount);
      });
      
      const revenueChartData = Object.keys(monthlyRevenue).map(month => ({
        month,
        revenue: monthlyRevenue[month]
      }));
      
      setRevenueData(revenueChartData);
      
      // Fetch shipment data for shipment analytics
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('status, created_at, metadata');
      
      if (shipmentsError) throw shipmentsError;
      
      // Process shipment data for monthly shipments
      const monthlyShipments: Record<string, number> = {};
      
      shipments?.forEach(shipment => {
        const date = new Date(shipment.created_at);
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        if (!monthlyShipments[monthYear]) {
          monthlyShipments[monthYear] = 0;
        }
        
        monthlyShipments[monthYear] += 1;
      });
      
      const shipmentChartData = Object.keys(monthlyShipments).map(month => ({
        month,
        shipments: monthlyShipments[month]
      }));
      
      setShipmentData(shipmentChartData);
      
      // Process status distribution
      const statusCount: Record<string, number> = {};
      
      shipments?.forEach(shipment => {
        const status = shipment.status || 'Unknown';
        
        if (!statusCount[status]) {
          statusCount[status] = 0;
        }
        
        statusCount[status] += 1;
      });
      
      const statusChartData = Object.keys(statusCount).map(status => ({
        name: status,
        value: statusCount[status]
      }));
      
      setStatusData(statusChartData);
      
      // Fetch user registration data
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('created_at');
      
      if (usersError) throw usersError;
      
      // Process user growth data
      const monthlyUsers: Record<string, number> = {};
      
      users?.forEach(user => {
        const date = new Date(user.created_at);
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        if (!monthlyUsers[monthYear]) {
          monthlyUsers[monthYear] = 0;
        }
        
        monthlyUsers[monthYear] += 1;
      });
      
      const userGrowthData = Object.keys(monthlyUsers).map(month => ({
        month,
        users: monthlyUsers[month]
      }));
      
      setUserGrowth(userGrowthData);
      
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Summary Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold mt-1">£{totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other Summary Cards */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Shipments</p>
                <h3 className="text-2xl font-bold mt-1">
                  {statusData.reduce((total, item) => total + item.value, 0)}
                </h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <h3 className="text-2xl font-bold mt-1">
                  {userGrowth.reduce((total, item) => total + item.users, 0)}
                </h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deliveries This Month</p>
                <h3 className="text-2xl font-bold mt-1">
                  {shipmentData.length > 0 ? shipmentData[shipmentData.length - 1].shipments : 0}
                </h3>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <Truck className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Monthly revenue from all payment sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `£${value}`} />
                <Tooltip formatter={(value) => `£${value}`} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipment Status Distribution</CardTitle>
            <CardDescription>Current status of all shipments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Shipments */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Shipments</CardTitle>
            <CardDescription>Number of shipments per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shipmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="shipments" name="Shipments" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsReports;
