
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, BarChart3, PieChart, LineChart, ArrowUpRight, Download, 
  Calendar, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

const ReportsAnalyticsTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('reports');
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('week');

  // Sample data
  const [shipmentData, setShipmentData] = useState([
    { name: 'Mon', shipments: 12 },
    { name: 'Tue', shipments: 19 },
    { name: 'Wed', shipments: 15 },
    { name: 'Thu', shipments: 22 },
    { name: 'Fri', shipments: 30 },
    { name: 'Sat', shipments: 14 },
    { name: 'Sun', shipments: 8 },
  ]);

  const [revenueData, setRevenueData] = useState([
    { name: 'Mon', revenue: 950 },
    { name: 'Tue', revenue: 1200 },
    { name: 'Wed', revenue: 800 },
    { name: 'Thu', revenue: 1400 },
    { name: 'Fri', revenue: 2200 },
    { name: 'Sat', revenue: 900 },
    { name: 'Sun', revenue: 750 },
  ]);

  const [pickupZonesData, setPickupZonesData] = useState([
    { name: 'London', value: 35 },
    { name: 'Manchester', value: 25 },
    { name: 'Birmingham', value: 20 },
    { name: 'Leeds', value: 15 },
    { name: 'Other', value: 5 },
  ]);

  const [shipmentTypeData, setShipmentTypeData] = useState([
    { name: 'Drums', value: 45 },
    { name: 'Boxes', value: 30 },
    { name: 'Suitcases', value: 15 },
    { name: 'Other', value: 10 },
  ]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const generateReport = (type: string) => {
    toast({
      title: 'Report Generated',
      description: `Your ${type} report has been generated and is ready to download.`,
    });
  };

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span>Exportable Reports</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>KPIs Dashboard</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Exportable Reports</CardTitle>
              <CardDescription>Generate and download various reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Shipment Report</CardTitle>
                    <CardDescription>Daily, weekly, or monthly shipment statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Choose period:</span>
                        </div>
                        <select 
                          className="text-sm border rounded p-1"
                          value={reportPeriod}
                          onChange={(e) => setReportPeriod(e.target.value)}
                        >
                          <option value="day">Daily</option>
                          <option value="week">Weekly</option>
                          <option value="month">Monthly</option>
                        </select>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateReport('shipment')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Revenue Report</CardTitle>
                    <CardDescription>Financial breakdown by time period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Choose period:</span>
                        </div>
                        <select 
                          className="text-sm border rounded p-1"
                          value={reportPeriod}
                          onChange={(e) => setReportPeriod(e.target.value)}
                        >
                          <option value="day">Daily</option>
                          <option value="week">Weekly</option>
                          <option value="month">Monthly</option>
                        </select>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateReport('revenue')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Pickup Zones Report</CardTitle>
                    <CardDescription>Activity by pickup location</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <PieChart className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Choose period:</span>
                        </div>
                        <select 
                          className="text-sm border rounded p-1"
                          value={reportPeriod}
                          onChange={(e) => setReportPeriod(e.target.value)}
                        >
                          <option value="day">Daily</option>
                          <option value="week">Weekly</option>
                          <option value="month">Monthly</option>
                        </select>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateReport('pickup-zones')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Delivery Success Report</CardTitle>
                    <CardDescription>Delivery performance statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <LineChart className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Choose period:</span>
                        </div>
                        <select 
                          className="text-sm border rounded p-1"
                          value={reportPeriod}
                          onChange={(e) => setReportPeriod(e.target.value)}
                        >
                          <option value="day">Daily</option>
                          <option value="week">Weekly</option>
                          <option value="month">Monthly</option>
                        </select>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateReport('delivery-success')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Real-time business metrics and KPIs</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center p-24">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Weekly Shipments</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart
                            data={shipmentData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="shipments" fill="#3B82F6" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Weekly Revenue (£)</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart
                            data={revenueData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Pickup Zones Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pickupZonesData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {pickupZonesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Shipment Types</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={shipmentTypeData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {shipmentTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default ReportsAnalyticsTab;
