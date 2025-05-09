import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Icons
import { 
  Search, 
  RefreshCcw,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  Trash,
  AlertTriangle,
  FileSpreadsheet,
  Package,
  Truck,
  ChevronRight,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

// Define the shipment and status update types
interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  metadata?: {
    sender_name?: string;
    sender_phone?: string;
    receiver_name?: string;
    receiver_phone?: string;
    shipment_type?: string;
    drums_quantity?: number;
    metal_seals?: number;
    additional_contacts?: any;
    pickup_zone?: string;
  };
}

const STATUS_OPTIONS = [
  'Booking Confirmed',
  'Ready for Pickup',
  'Processing in UK Warehouse',
  'Customs Clearance',
  'Processing in ZW Warehouse',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const ShipmentManagementTab = () => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingShipment, setViewingShipment] = useState<Shipment | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('allShipments');
  const [customQuotes, setCustomQuotes] = useState<any[]>([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchShipments();
    fetchCustomQuotes();
  }, [sortField, sortDirection]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (error) throw error;

      console.log('Shipments fetched:', data);
      setShipments(data || []);
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipments: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching custom quotes:', error);
    }
  };

  const fetchStatusHistory = async (shipmentId: string) => {
    setLoadingHistory(true);
    try {
      // Instead of querying a non-existent table, we'll simulate this with the shipment's own data
      // In a real application, you would create this table or query relevant data
      const { data, error } = await supabase
        .from('shipments')
        .select('status, updated_at')
        .eq('id', shipmentId)
        .single();

      if (error) throw error;

      // Create a mock status history
      const mockHistory = [
        {
          id: '1',
          status: data.status,
          created_at: data.updated_at,
          created_by: 'System',
          notes: 'Status updated',
        }
      ];

      setStatusHistory(mockHistory);
    } catch (error: any) {
      console.error('Error fetching status history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load status history',
        variant: 'destructive',
      });
      setStatusHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewShipment = (shipment: Shipment) => {
    setViewingShipment(shipment);
    setSelectedStatus(shipment.status);
    fetchStatusHistory(shipment.id);
  };

  const handleUpdateStatus = async () => {
    if (!viewingShipment || !selectedStatus) return;
    
    try {
      // Update the shipment status
      const { error } = await supabase
        .from('shipments')
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', viewingShipment.id);

      if (error) throw error;

      // In a real application, you would also record this in a status_updates table
      // For now, we'll just show a success message

      toast({
        title: 'Status Updated',
        description: `Shipment ${viewingShipment.tracking_number} status updated to ${selectedStatus}`,
      });

      // Refresh shipments
      fetchShipments();
      
      // Reset state
      setEditingStatus(false);
      setStatusNote('');
      
      // Close the dialog
      setViewingShipment(null);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  // Function to handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter shipments based on search and status filter
  const filteredShipments = shipments.filter(shipment => {
    const metadata = shipment.metadata || {};
    
    const matchesSearch = 
      searchQuery === '' ||
      shipment.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metadata.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metadata.receiver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      shipment.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Helper function to render status badge
  const renderStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let variant: "default" | "destructive" | "outline" | "secondary" = "default";
    
    if (statusLower.includes('cancelled')) {
      variant = "destructive";
    } else if (statusLower.includes('delivered')) {
      variant = "secondary";
    } else if (statusLower.includes('processing') || statusLower.includes('pickup') || statusLower.includes('transit')) {
      variant = "outline";
    }
    
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment Management</CardTitle>
        <CardDescription>
          View and manage all shipments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by tracking #, sender, receiver, origin, destination..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <span>Status</span>
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
            
            <Button variant="outline" onClick={fetchShipments}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Shipments Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No shipments found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('tracking_number')}>
                      Tracking #
                      {sortField === 'tracking_number' && (
                        <ArrowUpDown className="inline-block ml-1 h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead>Sender Name</TableHead>
                    <TableHead>Receiver Name</TableHead>
                    <TableHead>Sender number</TableHead>
                    <TableHead>Receiver Number</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('origin')}>
                      Origin
                      {sortField === 'origin' && (
                        <ArrowUpDown className="inline-block ml-1 h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('destination')}>
                      Destination
                      {sortField === 'destination' && (
                        <ArrowUpDown className="inline-block ml-1 h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('created_at')}>
                      Created
                      {sortField === 'created_at' && (
                        <ArrowUpDown className="inline-block ml-1 h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.map(shipment => {
                    const metadata = shipment.metadata || {};
                    
                    return (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{metadata.sender_name || 'N/A'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{metadata.receiver_name || 'N/A'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{metadata.sender_phone || 'N/A'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{metadata.receiver_phone || 'N/A'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{shipment.origin}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{shipment.destination}</TableCell>
                        <TableCell>{renderStatusBadge(shipment.status)}</TableCell>
                        <TableCell>{format(new Date(shipment.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewShipment(shipment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground mt-2">
          Showing {filteredShipments.length} of {shipments.length} shipments
        </div>
      </CardContent>

      {/* View Shipment Details Dialog */}
      <Dialog open={!!viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)}>
        <DialogContent className="max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Shipment Details</DialogTitle>
            <DialogDescription>
              Tracking Number: {viewingShipment?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          
          {viewingShipment && (
            <div className="space-y-6 py-4">
              {/* Shipment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Origin</h3>
                  <p>{viewingShipment.origin || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Destination</h3>
                  <p>{viewingShipment.destination || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                  <p>{format(new Date(viewingShipment.created_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Updated At</h3>
                  <p>{format(new Date(viewingShipment.updated_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
                {viewingShipment.metadata && (
                  <>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Sender Name</h3>
                      <p>{viewingShipment.metadata.sender_name || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Receiver Name</h3>
                      <p>{viewingShipment.metadata.receiver_name || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Sender Phone</h3>
                      <p>{viewingShipment.metadata.sender_phone || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Receiver Phone</h3>
                      <p>{viewingShipment.metadata.receiver_phone || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Shipment Type</h3>
                      <p>{viewingShipment.metadata.shipment_type || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Pickup Zone</h3>
                      <p>{viewingShipment.metadata.pickup_zone || 'N/A'}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Status Section */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Status</h3>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{viewingShipment.status}</Badge>
                  {!editingStatus ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingStatus(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Status
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={handleUpdateStatus}>
                        Update
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingStatus(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status History */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Status History</h3>
                {loadingHistory ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : statusHistory.length === 0 ? (
                  <div className="text-center py-4">
                    <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <h4 className="text-sm font-medium">No status history found</h4>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {statusHistory.map(item => (
                      <Card key={item.id}>
                        <CardHeader>
                          <CardTitle>Status: {item.status}</CardTitle>
                          <CardDescription>
                            Updated by {item.created_by} on {format(new Date(item.created_at), 'dd MMM yyyy HH:mm')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>{item.notes || 'No notes provided.'}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewingShipment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ShipmentManagementTab;
