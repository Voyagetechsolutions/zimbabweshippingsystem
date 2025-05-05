
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Package, 
  Truck, 
  Users, 
  Search, 
  RefreshCcw, 
  Filter, 
  Eye, 
  Edit, 
  User,
  Settings, 
  Activity, 
  Calendar,
  FileText, 
  BarChart3, 
  ImageIcon, 
  MessageSquare, 
  Megaphone,
  FileSpreadsheet,
  Menu
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SetupAdmin } from '@/components/SetupAdmin';
import UserManagement from '@/components/admin/UserManagement';
import AnalyticsReports from '@/components/admin/AnalyticsReports';
import SettingsManagement from '@/components/admin/SettingsManagement';
import ContentManagement from '@/components/admin/ContentManagement';
import CollectionScheduleManagement from '@/components/admin/CollectionScheduleManagement';
import SupportTickets from '@/components/admin/SupportTickets';
import CustomQuoteManagement from '@/components/admin/CustomQuoteManagement';

const STATUS_OPTIONS = [
  'Booking Confirmed',
  'Ready for Pickup',
  'Processing in Warehouse (UK)',
  'Customs Clearance',
  'Processing in Warehouse (ZW)',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  carrier: string | null;
  weight: number | null;
  dimensions: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  metadata: any | null;
}

const getStatusBadgeClass = (status: string) => {
  const statusLower = status.toLowerCase();
  
  switch (true) {
    case statusLower.includes('booking confirmed'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('ready for pickup'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('processing'):
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case statusLower.includes('customs'):
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case statusLower.includes('transit'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('out for delivery'):
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case statusLower.includes('delivered'):
      return 'bg-green-100 text-green-800 border-green-300';
    case statusLower.includes('cancelled'):
      return 'bg-red-100 text-red-800 border-red-300';
    case statusLower.includes('delayed'):
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-500';
  }
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { hasPermission } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isMounted = useRef(true);
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showFullMenu, setShowFullMenu] = useState(false);
  
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    inTransit: 0,
    delivered: 0,
    quotes: 0,
  });

  // Clean up useEffect to prevent memory leaks
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const checkIfAdminExists = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        return;
      }

      if (!isMounted.current) return;

      if (data) {
        setAdminExists(true);
      } else {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true)
          .limit(1);

        if (profilesError) {
          console.error('Error checking if any admin exists:', profilesError);
          return;
        }

        if (!isMounted.current) return;
        setAdminExists(profilesData && profilesData.length > 0);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  useEffect(() => {
    checkIfAdminExists();
    if (hasPermission('admin') || adminExists) {
      fetchShipments();
      fetchStats();
    }

    return () => {
      isMounted.current = false;
    };
  }, [user, navigate]);

  const fetchStats = async () => {
    if (!isMounted.current) return;

    try {
      const { data: quotesData, error: quotesError } = await supabase
        .from('custom_quotes')
        .select('id', { count: 'exact' });
      
      if (quotesError) throw quotesError;
      
      if (isMounted.current) {
        setStats(prev => ({
          ...prev,
          quotes: quotesData ? quotesData.length : 0
        }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchShipments = async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    try {
      console.log("Admin: Fetching all shipments");
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching shipments:", error);
        throw error;
      }

      if (data && isMounted.current) {
        console.log("Admin: Fetched shipments count:", data.length);
        setShipments(data as Shipment[]);
        const totalCount = data.length;
        const processingCount = data.filter(s => s.status.toLowerCase() === 'processing').length;
        const inTransitCount = data.filter(s => s.status.toLowerCase() === 'in transit').length;
        const deliveredCount = data.filter(s => s.status.toLowerCase() === 'delivered').length;
        
        setStats(prev => ({
          ...prev,
          total: totalCount,
          processing: processingCount,
          inTransit: inTransitCount,
          delivered: deliveredCount,
        }));
      }
    } catch (error: any) {
      console.error("Error in fetchShipments:", error);
      if (isMounted.current) {
        toast({
          title: 'Error fetching shipments',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  if (adminExists === false) {
    return <SetupAdmin />;
  }

  const updateShipmentStatus = async () => {
    if (!editingShipment || !newStatus) return;
    
    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingShipment.id);

      if (error) throw error;

      if (isMounted.current) {
        toast({
          title: 'Status Updated',
          description: `Shipment ${editingShipment.tracking_number} status updated to ${newStatus}`,
        });

        fetchShipments();
        
        setEditingShipment(null);
        setNewStatus('');
      }
      
    } catch (error: any) {
      if (isMounted.current) {
        toast({
          title: 'Error updating status',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      searchQuery === '' ||
      shipment.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      shipment.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {isMobile && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFullMenu(!showFullMenu)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <Tabs 
        defaultValue="overview" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-8"
      >
        {isMobile && !showFullMenu ? (
          <TabsList className="grid grid-cols-2 gap-2 mb-4">
            <TabsTrigger value="overview" className="flex items-center justify-center gap-2 p-3">
              <Activity className="h-5 w-5" />
              <span>Overview</span>
            </TabsTrigger>
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="h-full">
                <div className="flex items-center">
                  <span>More</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shipments">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Shipments m</span>
                  </div>
                </SelectItem>
                <SelectItem value="quotes">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Custom Quotes</span>
                  </div>
                </SelectItem>
                <SelectItem value="users">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Users</span>
                  </div>
                </SelectItem>
                <SelectItem value="analytics">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Analytics</span>
                  </div>
                </SelectItem>
                <SelectItem value="schedule">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Schedule</span>
                  </div>
                </SelectItem>
                <SelectItem value="settings">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </div>
                </SelectItem>
                <SelectItem value="more">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>More</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </TabsList>
        ) : (
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className={isMobile ? "" : "hidden sm:inline"}>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="shipments" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className={isMobile ? "" : "hidden sm:inline"}>Shipments</span>
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className={isMobile ? "" : "hidden sm:inline"}>Custom Quotes</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className={isMobile ? "" : "hidden sm:inline"}>Users</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className={isMobile ? "" : "hidden sm:inline"}>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className={isMobile ? "" : "hidden sm:inline"}>Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className={isMobile ? "" : "hidden sm:inline"}>Settings</span>
            </TabsTrigger>
            <TabsTrigger value="more" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className={isMobile ? "" : "hidden sm:inline"}>More</span>
            </TabsTrigger>
          </TabsList>
        )}
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Shipments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-zim-green mr-3" />
                  <div className="text-2xl font-bold">{stats.total}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-yellow-500 mr-3" />
                  <div className="text-2xl font-bold">{stats.processing}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">In Transit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Truck className="h-8 w-8 text-blue-500 mr-3" />
                  <div className="text-2xl font-bold">{stats.inTransit}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-green-500 mr-3" />
                  <div className="text-2xl font-bold">{stats.delivered}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Custom Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <FileSpreadsheet className="h-8 w-8 text-purple-500 mr-3" />
                  <div className="text-2xl font-bold">{stats.quotes}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recent Shipments</CardTitle>
              <CardDescription>Quick overview of the latest shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Tracking #</TableHead>
                      <TableHead>Sender Name</TableHead>
                      <TableHead>Receiver Name</TableHead>
                      <TableHead>Sender number</TableHead>
                      <TableHead>Receiver Number</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.slice(0, 5).map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{shipment.origin}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{shipment.destination}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(shipment.status)}>
                            {shipment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/shipment/${shipment.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardContent className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setActiveTab('shipments')}>
                View All Shipments
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('quotes')}>
                View Custom Quotes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="shipments">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">Shipments Management</CardTitle>
              <CardDescription>View and manage all shipments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Search by tracking #, origin, or destination"
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="flex gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.toLowerCase()} value={status.toLowerCase()}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline"
                    onClick={fetchShipments}
                    className="h-10 px-4"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center p-12">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No shipments found</h3>
                  <p className="text-gray-500">
                    {searchQuery || statusFilter !== 'all' 
                      ? "Try adjusting your filters" 
                      : "There are no shipments in the system yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Tracking #</TableHead>
                        <TableHead>Origin</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Est. Delivery</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{shipment.origin}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{shipment.destination}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {shipment.estimated_delivery 
                              ? format(new Date(shipment.estimated_delivery), 'MMM d, yyyy')
                              : "Not specified"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/shipment/${shipment.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingShipment(shipment);
                                  setNewStatus(shipment.status);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardContent className="flex justify-between py-4">
              <p className="text-sm text-gray-500">
                Showing {filteredShipments.length} out of {shipments.length} shipments
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="quotes">
          <CustomQuoteManagement />
        </TabsContent>
        
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsReports />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsManagement />
        </TabsContent>

        <TabsContent value="schedule">
          <CollectionScheduleManagement />
        </TabsContent>

        <TabsContent value="more">
          <Tabs defaultValue="support">
            <TabsList className="mb-6">
              <TabsTrigger value="support" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Support Tickets</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Media Library</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="support">
              <SupportTickets />
            </TabsContent>
            
            <TabsContent value="media">
              <ContentManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      
      {editingShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Update Shipment Status</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Tracking Number</p>
              <p className="font-medium font-mono">{editingShipment.tracking_number}</p>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Current Status</p>
              <Badge className={getStatusBadgeClass(editingShipment.status)}>
                {editingShipment.status}
              </Badge>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">New Status</label>
              <Select
                value={newStatus}
                onValueChange={setNewStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setEditingShipment(null);
                  setNewStatus('');
                }}
              >
                Cancel
              </Button>
              <Button 
                className="bg-zim-green hover:bg-zim-green/90"
                onClick={updateShipmentStatus}
              >
                Update Status
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
