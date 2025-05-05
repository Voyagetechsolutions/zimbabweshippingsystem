import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shipment } from '@/types/shipment';
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
  Legend
} from 'recharts';
import { 
  Package, 
  Users, 
  TrendingUp, 
  Calendar, 
  Search, 
  Filter, 
  Download,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ShipmentExporter from '@/components/ShipmentExporter';

// Define the columns for the shipments table
const shipmentsColumns: ColumnDef<Shipment>[] = [
  {
    accessorKey: 'tracking_number',
    header: 'Tracking #',
    cell: ({ row }) => {
      const value = row.getValue('tracking_number') as string;
      return <div className="font-medium">{value}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      
      let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
      
      switch (status) {
        case 'delivered':
          badgeVariant = 'default';
          break;
        case 'in_transit':
          badgeVariant = 'secondary';
          break;
        case 'pending':
        case 'pending_collection':
          badgeVariant = 'outline';
          break;
        case 'cancelled':
          badgeVariant = 'destructive';
          break;
        default:
          badgeVariant = 'outline';
      }
      
      return <Badge variant={badgeVariant}>{status.replace('_', ' ')}</Badge>;
    },
  },
  {
    accessorKey: 'origin',
    header: 'Origin',
    cell: ({ row }) => {
      const value = row.getValue('origin') as string;
      return <div className="truncate max-w-[200px]">{value}</div>;
    },
  },
  {
    accessorKey: 'destination',
    header: 'Destination',
    cell: ({ row }) => {
      const value = row.getValue('destination') as string;
      return <div className="truncate max-w-[200px]">{value}</div>;
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => {
      const value = row.getValue('created_at') as string;
      return <div>{format(new Date(value), 'dd/MM/yyyy')}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const shipment = row.original;
      
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            window.location.href = `/shipment/${shipment.id}`;
          }}
        >
          View
        </Button>
      );
    },
  },
];

// Define the columns for the users table
const usersColumns = [
  {
    accessorKey: 'full_name',
    header: 'Name',
    cell: ({ row }: any) => {
      const value = row.getValue('full_name') as string;
      return <div className="font-medium">{value || 'N/A'}</div>;
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }: any) => {
      const value = row.getValue('created_at') as string;
      return <div>{formatDistanceToNow(new Date(value), { addSuffix: true })}</div>;
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }: any) => {
      const role = row.getValue('role') as string;
      
      let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
      
      switch (role) {
        case 'admin':
          badgeVariant = 'destructive';
          break;
        case 'logistics':
        case 'driver':
        case 'support':
          badgeVariant = 'secondary';
          break;
        default:
          badgeVariant = 'outline';
      }
      
      return <Badge variant={badgeVariant}>{role || 'customer'}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }: any) => {
      const user = row.original;
      
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Handle user action
            console.log('View user', user);
          }}
        >
          View
        </Button>
      );
    },
  },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const navigate = useNavigate();
  
  // Fetch shipments data
  const { data: shipmentsData, isLoading: isLoadingShipments } = useQuery({
    queryKey: ['admin-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Cast the data to Shipment[] type
      return data as unknown as Shipment[];
    }
  });
  
  // Fetch users data
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data;
    }
  });
  
  // Filter shipments based on search term, status, and date
  const filteredShipments = React.useMemo(() => {
    if (!shipmentsData) return [];
    
    return shipmentsData.filter(shipment => {
      // Search filter
      const matchesSearch = 
        searchTerm === '' || 
        shipment.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.destination.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = 
        statusFilter === 'all' || 
        shipment.status === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const shipmentDate = new Date(shipment.created_at);
        const now = new Date();
        
        if (dateFilter === 'today') {
          matchesDate = shipmentDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = subDays(now, 7);
          matchesDate = shipmentDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = subDays(now, 30);
          matchesDate = shipmentDate >= monthAgo;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [shipmentsData, searchTerm, statusFilter, dateFilter]);
  
  // Prepare data for charts
  const statusData = React.useMemo(() => {
    if (!shipmentsData) return [];
    
    const statusCounts: Record<string, number> = {};
    
    shipmentsData.forEach(shipment => {
      const status = shipment.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value
    }));
  }, [shipmentsData]);
  
  const weeklyData = React.useMemo(() => {
    if (!shipmentsData) return [];
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'EEE'),
        count: 0
      };
    });
    
    shipmentsData.forEach(shipment => {
      const shipmentDate = new Date(shipment.created_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - shipmentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        const dayIndex = 7 - diffDays;
        if (dayIndex >= 0 && dayIndex < 7) {
          last7Days[dayIndex].count += 1;
        }
      }
    });
    
    return last7Days;
  }, [shipmentsData]);
  
  if (isLoadingShipments || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading dashboard...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage shipments, users, and system settings</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/gallery')}>
            Manage Gallery
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipmentsData?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{shipmentsData?.filter(s => {
                const createdAt = new Date(s.created_at);
                const weekAgo = subDays(new Date(), 7);
                return createdAt >= weekAgo;
              }).length || 0} this week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersData?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{usersData?.filter(u => {
                const createdAt = new Date(u.created_at);
                const monthAgo = subDays(new Date(), 30);
                return createdAt >= monthAgo;
              }).length || 0} new this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Collection</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipmentsData?.filter(s => s.status === 'pending_collection').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting pickup
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipmentsData?.filter(s => s.status === 'in_transit').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently shipping
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="shipments" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Shipments
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <CardTitle>Manage Shipments</CardTitle>
              <CardDescription>
                View and manage all shipments in the system
              </CardDescription>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by tracking #, origin, or destination..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <div className="w-40">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pending_collection">Pending Collection</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-40">
                    <Select
                      value={dateFilter}
                      onValueChange={setDateFilter}
                    >
                      <SelectTrigger>
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <ShipmentExporter shipments={filteredShipments} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={shipmentsColumns} 
                data={filteredShipments} 
                searchKey="tracking_number"
                showSearch={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>
                View and manage all users in the system
              </CardDescription>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-8"
                  />
                </div>
                
                <div className="flex gap-2">
                  <div className="w-40">
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="logistics">Logistics</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={usersColumns} 
                data={usersData || []} 
                searchKey="email"
                showSearch={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipments by Status</CardTitle>
                <CardDescription>
                  Distribution of shipments by current status
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Shipments This Week</CardTitle>
                <CardDescription>
                  Number of new shipments per day
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Shipments" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Current status of system components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center p-4 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <h3 className="font-medium">API Services</h3>
                      <p className="text-sm text-muted-foreground">Operational</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <h3 className="font-medium">Database</h3>
                      <p className="text-sm text-muted-foreground">Operational</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 border rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                    <div>
                      <h3 className="font-medium">Notification Service</h3>
                      <p className="text-sm text-muted-foreground">Degraded Performance</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
