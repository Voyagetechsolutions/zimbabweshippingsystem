
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, LineChart, PieChart, TrendingUp, Download } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, 
  LineChart as RechartLine, Line, PieChart as RechartPie,
  Pie, Cell
} from 'recharts';

// Define types for our analytics data
interface ShipmentStatsByStatus {
  status: string;
  count: number;
  color: string;
}

interface ShipmentStatsByMonth {
  month: string;
  count: number;
  revenue: number;
}

interface RevenueByPaymentMethod {
  method: string;
  amount: number;
  color: string;
}

const AnalyticsReports = () => {
  const [timeFrame, setTimeFrame] = useState('30days');
  const [shipmentsByStatus, setShipmentsByStatus] = useState<ShipmentStatsByStatus[]>([]);
  const [shipmentsByMonth, setShipmentsByMonth] = useState<ShipmentStatsByMonth[]>([]);
  const [revenueByMethod, setRevenueByMethod] = useState<RevenueByPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  const COLORS = ['#008C45', '#FCD116', '#DE3831', '#5470C6', '#91CC75', '#9A60B4', '#3ba272'];
  
  // Define status colors
  const statusColors: Record<string, string> = {
    'Processing': '#FCD116',
    'In Transit': '#5470C6',
    'Out for Delivery': '#9A60B4',
    'Delivered': '#008C45',
    'Delayed': '#DE3831',
    'Returned': '#73716e'
  };

  // Define payment method colors
  const paymentMethodColors: Record<string, string> = {
    'STRIPE': '#5470C6',
    'PAYPAL': '#91CC75', 
    'CASH': '#FCD116',
    'BANK_TRANSFER': '#3ba272'
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeFrame]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    
    try {
      // Get date range based on selected time frame
      const endDate = new Date();
      let startDate = new Date();
      
      switch(timeFrame) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '12months':
          startDate.setDate(endDate.getDate() - 365);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Fetch shipment data by status
      const { data: statusData, error: statusError } = await supabase
        .from('shipments')
        .select('status, count')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .group('status');

      if (statusError) throw statusError;

      if (statusData) {
        const formattedStatusData = statusData.map((item: any) => ({
          status: item.status,
          count: parseInt(item.count),
          color: statusColors[item.status] || '#73716e'
        }));
        setShipmentsByStatus(formattedStatusData);
      }

      // Generate month data based on time frame
      const months = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const monthYear = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months.push({
          month: monthYear,
          date: new Date(currentDate),
          count: 0,
          revenue: 0
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Fetch shipment data by month
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (shipmentError) throw shipmentError;

      // Fetch payment data by month
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('created_at, amount, payment_method')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (paymentError) throw paymentError;

      // Process shipment data by month
      if (shipmentData) {
        shipmentData.forEach((shipment: any) => {
          const shipmentDate = new Date(shipment.created_at);
          const monthYear = shipmentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          const monthIndex = months.findIndex(m => m.month === monthYear);
          if (monthIndex >= 0) {
            months[monthIndex].count += 1;
          }
        });
      }

      // Process payment data by month
      if (paymentData) {
        paymentData.forEach((payment: any) => {
          const paymentDate = new Date(payment.created_at);
          const monthYear = paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          const monthIndex = months.findIndex(m => m.month === monthYear);
          if (monthIndex >= 0) {
            months[monthIndex].revenue += parseFloat(payment.amount);
          }
        });

        // Calculate revenue by payment method
        const methodsMap: Record<string, number> = {};
        paymentData.forEach((payment: any) => {
          const method = payment.payment_method || 'UNKNOWN';
          if (!methodsMap[method]) {
            methodsMap[method] = 0;
          }
          methodsMap[method] += parseFloat(payment.amount);
        });

        const revenueData = Object.entries(methodsMap).map(([method, amount]) => ({
          method,
          amount,
          color: paymentMethodColors[method] || '#73716e'
        }));
        setRevenueByMethod(revenueData);
      }

      setShipmentsByMonth(months);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    // Simple CSV download implementation
    const createCSV = (data: any[], headers: string[]) => {
      const headerRow = headers.join(',');
      const dataRows = data.map(item => 
        headers.map(header => item[header] || '').join(',')
      ).join('\n');
      return `${headerRow}\n${dataRows}`;
    };

    let csvContent, filename;
    
    // Get currently visible tab
    const activeTab = document.querySelector('[role="tabpanel"]:not([hidden])');
    if (!activeTab) return;
    
    if (activeTab.id.includes('status')) {
      csvContent = createCSV(shipmentsByStatus, ['status', 'count']);
      filename = `shipments-by-status-${new Date().toISOString().split('T')[0]}.csv`;
    } else if (activeTab.id.includes('trends')) {
      csvContent = createCSV(shipmentsByMonth, ['month', 'count', 'revenue']);
      filename = `shipments-by-month-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      csvContent = createCSV(revenueByMethod, ['method', 'amount']);
      filename = `revenue-by-method-${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Analytics & Reports</CardTitle>
              <CardDescription>
                View insights and download reports for your shipping operations
              </CardDescription>
            </div>
            <div className="flex gap-4">
              <Select value={timeFrame} onValueChange={setTimeFrame}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time frame" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="12months">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={downloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : (
            <Tabs defaultValue="status">
              <TabsList className="mb-6">
                <TabsTrigger value="status" className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  <span>Shipments by Status</span>
                </TabsTrigger>
                <TabsTrigger value="trends" className="flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  <span>Trends</span>
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Revenue by Method</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="status">
                <div className="h-96">
                  {shipmentsByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartPie>
                        <Pie
                          data={shipmentsByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="status"
                        >
                          {shipmentsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} shipments`, 'Count']} />
                        <Legend />
                      </RechartPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No data available for the selected time period</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="trends">
                <div className="h-96">
                  {shipmentsByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartLine
                        data={shipmentsByMonth}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="count"
                          name="Shipment Count"
                          stroke="#008C45"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue (£)"
                          stroke="#DE3831"
                          activeDot={{ r: 8 }}
                        />
                      </RechartLine>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No data available for the selected time period</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="revenue">
                <div className="h-96">
                  {revenueByMethod.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={revenueByMethod}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="method" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`£${value}`, 'Revenue']} />
                        <Legend />
                        <Bar dataKey="amount" name="Revenue (£)">
                          {revenueByMethod.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No data available for the selected time period</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Data shown is for the {timeFrame === '7days' ? 'last 7 days' : 
              timeFrame === '30days' ? 'last 30 days' : 
              timeFrame === '90days' ? 'last 90 days' : 
              'last 12 months'}
          </p>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Performance Metrics</CardTitle>
          <CardDescription>
            Key performance indicators for your shipping operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">On-Time Delivery Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="mr-4 p-2 rounded-full bg-green-100">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">94.5%</div>
                    <div className="text-xs text-gray-500">+2.1% from last period</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Average Delivery Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="mr-4 p-2 rounded-full bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">4.3 days</div>
                    <div className="text-xs text-gray-500">-0.5 days from last period</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Customer Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="mr-4 p-2 rounded-full bg-yellow-100">
                    <TrendingUp className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">4.8/5</div>
                    <div className="text-xs text-gray-500">Based on 230 reviews</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsReports;
