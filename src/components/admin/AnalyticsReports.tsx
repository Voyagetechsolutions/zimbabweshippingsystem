
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface ShipmentStat {
  status: string;
  count: number;
  color: string;
}

interface TimelineData {
  date: string;
  shipments: number;
}

const AnalyticsReports = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [statusStats, setStatusStats] = useState<ShipmentStat[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch shipment statistics by status
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('status');
      
      if (shipmentsError) throw shipmentsError;
      
      // Process shipment data by status
      const statusCounts: Record<string, number> = {};
      shipmentsData?.forEach(shipment => {
        const status = shipment.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      // Create status statistics with colors
      const statusColors: Record<string, string> = {
        'Processing': '#FFC107',
        'In Transit': '#2196F3',
        'Out for Delivery': '#9C27B0',
        'Delivered': '#4CAF50',
        'Delayed': '#F44336',
        'Returned': '#607D8B'
      };
      
      const stats = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        color: statusColors[status] || '#9E9E9E'
      }));
      
      setStatusStats(stats);
      
      // Generate timeline data based on time range
      let startDate;
      const endDate = new Date();
      
      switch(timeRange) {
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subDays(endDate, 30);
          break;
        case 'quarter':
          startDate = subDays(endDate, 90);
          break;
        default:
          startDate = subDays(endDate, 7);
      }
      
      // For demonstration, generate sample timeline data
      // In a real app, this would come from a database query
      const timeline: TimelineData[] = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        timeline.push({
          date: format(currentDate, 'MMM dd'),
          // Generate random shipment count between 1-20 for demonstration
          shipments: Math.floor(Math.random() * 20) + 1
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setTimelineData(timeline);
      
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

  const generateReport = (reportType: string) => {
    toast({
      title: 'Report Generated',
      description: `${reportType} report has been generated`,
    });
    // In a real implementation, this would generate a downloadable report
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Analytics & Reports</CardTitle>
              <CardDescription>View shipment analytics and generate reports</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : (
            <Tabs defaultValue="charts">
              <TabsList className="mb-6">
                <TabsTrigger value="charts" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Charts</span>
                </TabsTrigger>
                <TabsTrigger value="trends" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Trends</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Reports</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="charts" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Shipment Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Shipment Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="status"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, 'Shipments']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  {/* Shipments Over Time */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Shipments Over Time</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={timelineData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="shipments" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="trends">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipment Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={timelineData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="shipments" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="reports">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">Shipment Summary</CardTitle>
                      <CardDescription>Overall shipment statistics</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-gray-500 mb-4">
                        Comprehensive summary of all shipment activity including status breakdowns, transit times, and delivery performance.
                      </p>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button 
                        className="w-full bg-zim-green hover:bg-zim-green/90"
                        onClick={() => generateReport('Shipment Summary')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Generate Report
                      </Button>
                    </div>
                  </Card>
                  
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Report</CardTitle>
                      <CardDescription>Delivery times and efficiency</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-gray-500 mb-4">
                        Detailed analysis of delivery performance metrics including on-time delivery rates and average transit durations.
                      </p>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button 
                        className="w-full bg-zim-green hover:bg-zim-green/90"
                        onClick={() => generateReport('Performance Report')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Generate Report
                      </Button>
                    </div>
                  </Card>
                  
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Activity</CardTitle>
                      <CardDescription>User shipping patterns</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-gray-500 mb-4">
                        Analysis of customer shipping patterns, frequent destinations, and service utilization trends.
                      </p>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button 
                        className="w-full bg-zim-green hover:bg-zim-green/90"
                        onClick={() => generateReport('Customer Activity')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Generate Report
                      </Button>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsReports;
