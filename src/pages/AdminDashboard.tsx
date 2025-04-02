
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Package, Truck, Users, Search, 
  RefreshCcw, Filter, Eye, Edit
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SetupAdmin } from '@/components/SetupAdmin';

// Status options for updating shipments
const STATUS_OPTIONS = [
  'Processing',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Delayed',
  'Returned',
];

// Define the shipment type
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
}

// Map status to badge color
const getStatusBadgeClass = (status: string) => {
  const statusLower = status.toLowerCase();
  
  switch (true) {
    case statusLower.includes('processing'):
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case statusLower.includes('transit'):
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case statusLower.includes('out for delivery'):
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case statusLower.includes('delivered'):
      return 'bg-green-100 text-green-800 border-green-300';
    case statusLower.includes('delayed'):
      return 'bg-red-100 text-red-800 border-red-300';
    case statusLower.includes('returned'):
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-500';
  }
};

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    inTransit: 0,
    delivered: 0,
  });

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized Access",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }

    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      // Fetch all shipments for admin view
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setShipments(data as Shipment[]);
        // Calculate stats
        const totalCount = data.length;
        const processingCount = data.filter(s => s.status.toLowerCase() === 'processing').length;
        const inTransitCount = data.filter(s => s.status.toLowerCase() === 'in transit').length;
        const deliveredCount = data.filter(s => s.status.toLowerCase() === 'delivered').length;
        
        setStats({
          total: totalCount,
          processing: processingCount,
          inTransit: inTransitCount,
          delivered: deliveredCount,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching shipments',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

      toast({
        title: 'Status Updated',
        description: `Shipment ${editingShipment.tracking_number} status updated to ${newStatus}`,
      });

      // Refresh shipments list
      fetchShipments();
      
      // Reset editing state
      setEditingShipment(null);
      setNewStatus('');
      
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter shipments based on search and status filter
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-500">Manage all shipments and track their progress</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          </div>

          {/* Filters and Search */}
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

          {/* Shipments Table */}
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
            <CardFooter className="flex justify-between py-4">
              <p className="text-sm text-gray-500">
                Showing {filteredShipments.length} out of {shipments.length} shipments
              </p>
            </CardFooter>
          </Card>
          
          {/* Edit Status Modal */}
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
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
