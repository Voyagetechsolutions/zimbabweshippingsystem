
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shipment } from '@/types/shipment';
import { 
  Search,
  Filter,
  RefreshCcw,
  Package,
  Eye, 
  Edit,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const STATUS_OPTIONS = [
  'Booking Confirmed',
  'Ready for Pickup',
  'Processing in Warehouse (UK)',
  'In Transit',
  'Customs Clearance',
  'Processing in Warehouse (ZW)',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const ShipmentManagementTab = () => {
  const [activeTab, setActiveTab] = useState('allShipments');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchShipments();
  }, []);

  useEffect(() => {
    filterShipments();
  }, [shipments, searchQuery, statusFilter, dateRangeFilter, activeTab]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      // First get all shipments
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      // Then get all profiles for lookup
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');
        
      if (profilesError) throw profilesError;

      // Create a lookup object for profiles
      const profilesLookup: Record<string, {email: string, full_name: string | null}> = {};
      if (profilesData) {
        profilesData.forEach((profile: any) => {
          profilesLookup[profile.id] = {
            email: profile.email,
            full_name: profile.full_name
          };
        });
      }

      // Combine the data
      const formattedShipments = shipmentsData.map((shipment: any) => {
        const userProfile = shipment.user_id ? profilesLookup[shipment.user_id] : null;
        
        return {
          ...shipment,
          profiles: userProfile ? {
            email: userProfile.email,
            full_name: userProfile.full_name
          } : null
        };
      });

      setShipments(formattedShipments);
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterShipments = () => {
    let filtered = [...shipments];

    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(s => 
        s.status === 'Booking Confirmed' || 
        s.status === 'Ready for Pickup'
      );
    } else if (activeTab === 'active') {
      filtered = filtered.filter(s => 
        s.status === 'Processing in Warehouse (UK)' || 
        s.status === 'In Transit' || 
        s.status === 'Customs Clearance' || 
        s.status === 'Processing in Warehouse (ZW)' || 
        s.status === 'Out for Delivery'
      );
    } else if (activeTab === 'delivered') {
      filtered = filtered.filter(s => s.status === 'Delivered');
    } else if (activeTab === 'cancelled') {
      filtered = filtered.filter(s => s.status === 'Cancelled');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.tracking_number.toLowerCase().includes(query) ||
        s.origin.toLowerCase().includes(query) ||
        s.destination.toLowerCase().includes(query) ||
        s.status.toLowerCase().includes(query) ||
        (s.profiles?.email && s.profiles.email.toLowerCase().includes(query)) ||
        (s.profiles?.full_name && s.profiles.full_name.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      if (dateRangeFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateRangeFilter === 'week') {
        filterDate.setDate(filterDate.getDate() - 7);
      } else if (dateRangeFilter === 'month') {
        filterDate.setMonth(filterDate.getMonth() - 1);
      }

      filtered = filtered.filter(s => new Date(s.created_at) >= filterDate);
    }

    setFilteredShipments(filtered);
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

      // Update local state
      setShipments(shipments.map(s => 
        s.id === editingShipment.id 
          ? { ...s, status: newStatus, updated_at: new Date().toISOString() } 
          : s
      ));

      // Show success message
      toast({
        title: 'Status Updated',
        description: `Shipment ${editingShipment.tracking_number} status updated to ${newStatus}`,
      });

      // Create notification for status change
      await createStatusChangeNotification(editingShipment.id, editingShipment.user_id, newStatus);

      // Reset edit state
      setEditingShipment(null);
      setNewStatus('');
    } catch (error: any) {
      console.error('Error updating shipment status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shipment status',
        variant: 'destructive'
      });
    }
  };

  const createStatusChangeNotification = async (shipmentId: string, userId: string, status: string) => {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Shipment Status Updated',
        message: `Your shipment has been updated to: ${status}`,
        type: 'status_update',
        related_id: shipmentId
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('booking') || statusLower.includes('ready')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (statusLower.includes('processing')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (statusLower.includes('transit')) {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    } else if (statusLower.includes('customs')) {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    } else if (statusLower.includes('out for delivery')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    } else if (statusLower.includes('delivered')) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (statusLower.includes('cancelled')) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipment Management</CardTitle>
          <CardDescription>Track and manage all shipments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtering controls */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search by tracking #, origin, destination, or customer"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <div className="flex gap-4 flex-wrap">
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
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date range" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateRangeFilter('all');
                  fetchShipments();
                }}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Shipment tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 mb-6">
              <TabsTrigger value="allShipments">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>

            {/* Tab content */}
            {['allShipments', 'pending', 'active', 'delivered', 'cancelled'].map((tab) => (
              <TabsContent key={tab} value={tab} className="pt-4 px-0">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                  </div>
                ) : filteredShipments.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No shipments found</h3>
                    <p className="text-gray-500">
                      {searchQuery || statusFilter !== 'all' || dateRangeFilter !== 'all'
                        ? "Try adjusting your search filters"
                        : tab === 'allShipments'
                        ? "No shipments have been created yet"
                        : `No ${tab === 'pending' ? 'pending' : tab === 'active' ? 'active' : tab === 'delivered' ? 'delivered' : 'cancelled'} shipments found`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Tracking #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Origin</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Collection Info</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShipments.map((shipment) => {
                          // Extract collection info from metadata
                          const metadata = shipment.metadata || {};
                          const collectionInfo = metadata.collection || {};
                          const collectionDate = collectionInfo.date || 'Not scheduled';
                          const collectionRoute = collectionInfo.route || 'Not assigned';
                          
                          return (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                              <TableCell>
                                {shipment.profiles?.full_name || 'N/A'}
                                <div className="text-xs text-muted-foreground">{shipment.profiles?.email || 'No email'}</div>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">{shipment.origin}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{shipment.destination}</TableCell>
                              <TableCell>
                                <Badge className={getStatusBadgeClass(shipment.status)}>
                                  {shipment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{format(new Date(shipment.created_at), 'MMM d, yyyy')}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div><span className="font-medium">Route:</span> {collectionRoute}</div>
                                  <div><span className="font-medium">Date:</span> {collectionDate}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // Navigate to shipment detail (would typically use a router)
                                      window.location.href = `/shipment/${shipment.id}`;
                                    }}
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
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit shipment status modal */}
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
              <Select value={newStatus} onValueChange={setNewStatus}>
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

export default ShipmentManagementTab;
