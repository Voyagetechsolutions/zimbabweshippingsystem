
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Package, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye,
  Clipboard, 
  Trash2, 
  RefreshCw,
  Loader2,
  Check
} from 'lucide-react';
import { Shipment } from '@/types/shipment';

const shipmentStatuses = [
  'Booking Confirmed',
  'Ready for Pickup',
  'Processing in UK Warehouse',
  'Departed UK',
  'Customs Clearance',
  'Processing in ZW Warehouse',
  'Out for Delivery',
  'Delivered',
  'Failed Attempt',
  'Cancelled'
];

const ShipmentManagementTab = () => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // State for viewing shipment details
  const [viewShipment, setViewShipment] = useState<Shipment | null>(null);
  
  // State for updating shipment status
  const [updatingShipment, setUpdatingShipment] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, profiles:user_id(email, full_name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setShipments(data || []);
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipment data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to update shipment status
  const updateShipmentStatus = async () => {
    if (!updatingShipment || !newStatus) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatingShipment.id);
      
      if (error) throw error;
      
      // Update local state
      setShipments(prevShipments =>
        prevShipments.map(shipment =>
          shipment.id === updatingShipment.id
            ? { ...shipment, status: newStatus }
            : shipment
        )
      );
      
      // Show success message and close dialog
      toast({
        title: 'Status Updated',
        description: `Shipment ${updatingShipment.tracking_number} status has been updated to ${newStatus}`,
      });
      setUpdatingShipment(null);
      
      // If status is now "Out for Delivery", make sure it has delivery details
      if (newStatus === 'Out for Delivery') {
        await ensureDeliveryDetails(updatingShipment.id);
      }
      
    } catch (error: any) {
      console.error('Error updating shipment status:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update shipment status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Make sure shipment has delivery details when set to "Out for Delivery"
  const ensureDeliveryDetails = async (shipmentId: string) => {
    try {
      // First get the shipment to check existing metadata
      const { data: shipment, error: fetchError } = await supabase
        .from('shipments')
        .select('metadata')
        .eq('id', shipmentId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Create/update delivery details in metadata
      const metadata = shipment.metadata || {};
      if (!metadata.delivery) {
        metadata.delivery = {
          date: new Date().toISOString(),
          isLate: false,
        };
        
        // Update the metadata
        const { error: updateError } = await supabase
          .from('shipments')
          .update({ metadata })
          .eq('id', shipmentId);
          
        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error ensuring delivery details:', error);
    }
  };
  
  // Filter shipments based on search and filter criteria
  const filteredShipments = shipments.filter(shipment => {
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    
    const matchesSearch = 
      shipment.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shipment.profiles?.email && shipment.profiles.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (shipment.profiles?.full_name && shipment.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  // Function to copy tracking number to clipboard
  const copyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    toast({
      title: 'Copied',
      description: 'Tracking number copied to clipboard',
    });
  };

  // Function to delete a shipment
  const deleteShipment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipment? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Remove from local state
      setShipments(shipments.filter(s => s.id !== id));
      
      toast({
        title: 'Shipment Deleted',
        description: 'The shipment has been permanently deleted',
      });
    } catch (error: any) {
      console.error('Error deleting shipment:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete shipment',
        variant: 'destructive',
      });
    }
  };

  // Function to get appropriate badge color for status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Booking Confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Booking Confirmed</Badge>;
      case 'Ready for Pickup':
        return <Badge className="bg-purple-100 text-purple-800 border border-purple-300">Ready for Pickup</Badge>;
      case 'Processing in UK Warehouse':
        return <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-300">UK Warehouse</Badge>;
      case 'Departed UK':
        return <Badge className="bg-sky-100 text-sky-800 border border-sky-300">Departed UK</Badge>;
      case 'Customs Clearance':
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Customs Clearance</Badge>;
      case 'Processing in ZW Warehouse':
        return <Badge className="bg-orange-100 text-orange-800 border border-orange-300">ZW Warehouse</Badge>;
      case 'Out for Delivery':
        return <Badge className="bg-cyan-100 text-cyan-800 border border-cyan-300">Out for Delivery</Badge>;
      case 'Delivered':
        return <Badge className="bg-green-100 text-green-800 border border-green-300">Delivered</Badge>;
      case 'Failed Attempt':
        return <Badge className="bg-red-100 text-red-800 border border-red-300">Failed Attempt</Badge>;
      case 'Cancelled':
        return <Badge variant="outline" className="text-gray-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment Management</CardTitle>
        <CardDescription>View and manage all shipments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by tracking #, origin, destination or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-4">
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {shipmentStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                fetchShipments();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
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
                ? "Try adjusting your filters to see more results"
                : "There are no shipments in the system yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                    <TableCell>
                      {shipment.profiles?.full_name || shipment.profiles?.email || "Unknown User"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{shipment.origin}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{shipment.destination}</TableCell>
                    <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                    <TableCell>{format(new Date(shipment.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setViewShipment(shipment)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setUpdatingShipment(shipment);
                            setNewStatus(shipment.status);
                          }}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Update Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyTrackingNumber(shipment.tracking_number)}>
                            <Clipboard className="h-4 w-4 mr-2" />
                            Copy Tracking #
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => deleteShipment(shipment.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* View Shipment Details Dialog */}
        {viewShipment && (
          <Dialog open={!!viewShipment} onOpenChange={(open) => !open && setViewShipment(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Shipment Details</DialogTitle>
                <DialogDescription>
                  Tracking Number: {viewShipment.tracking_number}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">General Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500">Status:</span>
                        <span>{getStatusBadge(viewShipment.status)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500">Created:</span>
                        <span>{format(new Date(viewShipment.created_at), 'PPP')}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500">Last Updated:</span>
                        <span>{format(new Date(viewShipment.updated_at), 'PPP')}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500">Origin:</span>
                        <span className="text-right">{viewShipment.origin}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500">Destination:</span>
                        <span className="text-right">{viewShipment.destination}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-gray-500">Customer:</span>
                        <span>{viewShipment.profiles?.full_name || viewShipment.profiles?.email || "Unknown User"}</span>
                      </div>
                      
                      {/* Collection Information */}
                      {(viewShipment.metadata?.collection || viewShipment.metadata?.collectionDetails) && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium mb-1">Collection Information</h4>
                          <div className="border p-2 rounded-md bg-gray-50">
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-gray-500">Route:</span>
                              <span>{viewShipment.metadata?.collection?.route || viewShipment.metadata?.collectionDetails?.route || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-gray-500">Collection Date:</span>
                              <span>{viewShipment.metadata?.collection?.date || viewShipment.metadata?.collectionDetails?.date || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Sender & Recipient</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium">Sender</h4>
                        {viewShipment.metadata?.sender || viewShipment.metadata?.senderDetails ? (
                          <div>
                            <p className="text-sm font-medium">
                              {viewShipment.metadata?.sender?.name || 
                               viewShipment.metadata?.senderDetails?.name ||
                               `${viewShipment.metadata?.sender?.firstName || viewShipment.metadata?.senderDetails?.firstName || ''} ${viewShipment.metadata?.sender?.lastName || viewShipment.metadata?.senderDetails?.lastName || ''}`}
                            </p>
                            <p className="text-xs text-gray-500">{viewShipment.metadata?.sender?.email || viewShipment.metadata?.senderDetails?.email}</p>
                            <p className="text-xs text-gray-500">{viewShipment.metadata?.sender?.phone || viewShipment.metadata?.senderDetails?.phone}</p>
                            <p className="text-xs text-gray-500">{viewShipment.metadata?.sender?.address || viewShipment.metadata?.senderDetails?.address}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No sender details</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium">Recipient</h4>
                        {viewShipment.metadata?.recipient || viewShipment.metadata?.recipientDetails ? (
                          <div>
                            <p className="text-sm font-medium">
                              {viewShipment.metadata?.recipient?.name || 
                               viewShipment.metadata?.recipientDetails?.name ||
                               `${viewShipment.metadata?.recipient?.firstName || viewShipment.metadata?.recipientDetails?.firstName || ''} ${viewShipment.metadata?.recipient?.lastName || viewShipment.metadata?.recipientDetails?.lastName || ''}`}
                            </p>
                            <p className="text-xs text-gray-500">{viewShipment.metadata?.recipient?.phone || viewShipment.metadata?.recipientDetails?.phone}</p>
                            <p className="text-xs text-gray-500">{viewShipment.metadata?.recipient?.address || viewShipment.metadata?.recipientDetails?.address}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No recipient details</p>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-medium mt-4 mb-2">Shipment Contents</h3>
                    {viewShipment.metadata?.shipment || viewShipment.metadata?.shipmentDetails ? (
                      <div className="space-y-2">
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-500">Type:</span>
                          <span>{viewShipment.metadata?.shipment?.type || viewShipment.metadata?.shipmentDetails?.type || "N/A"}</span>
                        </div>
                        {(viewShipment.metadata?.shipment?.quantity || viewShipment.metadata?.shipmentDetails?.quantity) && (
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-gray-500">Quantity:</span>
                            <span>{viewShipment.metadata?.shipment?.quantity || viewShipment.metadata?.shipmentDetails?.quantity}</span>
                          </div>
                        )}
                        {(viewShipment.metadata?.shipment?.weight || viewShipment.metadata?.shipmentDetails?.weight) && (
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-gray-500">Weight:</span>
                            <span>{viewShipment.metadata?.shipment?.weight || viewShipment.metadata?.shipmentDetails?.weight}</span>
                          </div>
                        )}
                        {(viewShipment.metadata?.shipment?.dimensions || viewShipment.metadata?.shipmentDetails?.dimensions) && (
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-gray-500">Dimensions:</span>
                            <span>{viewShipment.metadata?.shipment?.dimensions || viewShipment.metadata?.shipmentDetails?.dimensions}</span>
                          </div>
                        )}
                        {(viewShipment.metadata?.shipment?.description || viewShipment.metadata?.shipmentDetails?.description) && (
                          <div className="flex flex-col border-b pb-1">
                            <span className="text-gray-500">Description:</span>
                            <span className="text-sm mt-1">{viewShipment.metadata?.shipment?.description || viewShipment.metadata?.shipmentDetails?.description}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No shipment content details</p>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewShipment(null)}>Close</Button>
                <Button onClick={() => {
                  setUpdatingShipment(viewShipment);
                  setNewStatus(viewShipment.status);
                  setViewShipment(null);
                }}>
                  Update Status
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Update Status Dialog */}
        <Dialog open={!!updatingShipment} onOpenChange={(open) => !open && setUpdatingShipment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Shipment Status</DialogTitle>
              <DialogDescription>
                Change status for tracking number: {updatingShipment?.tracking_number}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {shipmentStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setUpdatingShipment(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={updateShipmentStatus}
                disabled={isUpdating || newStatus === updatingShipment?.status}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Update Status
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ShipmentManagementTab;
