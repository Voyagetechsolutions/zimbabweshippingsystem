import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Package,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Package2,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const ShipmentManagementTab = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShipments, setSelectedShipments] = useState(new Set());
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*');

      if (error) {
        toast({
          title: 'Error fetching shipments',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setShipments(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchShipments();
  };

  const handleStatusUpdate = async (shipmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus })
        .eq('id', shipmentId);

      if (error) {
        toast({
          title: 'Error updating status',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Status updated',
          description: 'Shipment status updated successfully.',
        });
        fetchShipments(); // Refresh shipments
      }
    } finally {
      setIsEditDialogOpen(false); // Close the dialog
    }
  };

  const handleDeleteShipments = async () => {
    if (selectedShipments.size === 0) {
      toast({
        title: 'No shipments selected',
        description: 'Please select shipments to delete.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .in('id', Array.from(selectedShipments));

      if (error) {
        toast({
          title: 'Error deleting shipments',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Shipments deleted',
          description: `${selectedShipments.size} shipment(s) deleted successfully.`,
        });
        fetchShipments(); // Refresh shipments
      }
    } finally {
      setSelectedShipments(new Set()); // Clear selected shipments
    }
  };

  const getStatusIcon = (status) => {
    const s = status.toLowerCase();
    if (s.includes('delivered')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (s.includes('processing')) return <Clock className="w-4 h-4 text-orange-600" />;
    if (s.includes('cancelled') || s.includes('delayed')) return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <Package className="w-4 h-4 text-blue-600" />;
  };

  const getStatusColorClass = (status) => {
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 'bg-green-100 text-green-800 border-green-300';
    if (s.includes('cancelled') || s.includes('delayed')) return 'bg-red-100 text-red-800 border-red-300';
    if (s.includes('processing')) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const formatAddress = (address) => {
    if (!address) return 'Not specified';
    return address;
  };

  const ShipmentDetailDialog = ({ shipment, open, onOpenChange }) => {
    if (!shipment) return null;

    const metadata = shipment.metadata || {};
    const senderDetails = metadata.senderDetails || metadata.sender || {};
    const recipientDetails = metadata.recipientDetails || metadata.recipient || {};
    const shipmentDetails = metadata.shipmentDetails || metadata.shipment || {};
    const collectionDetails = metadata.collection || {};

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Shipment Details - {shipment.tracking_number}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package2 className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Tracking Number</Label>
                      <p className="text-sm font-mono bg-gray-50 p-2 rounded">{shipment.tracking_number}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Status</Label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(shipment.status)}
                        <Badge className={`${getStatusColorClass(shipment.status)} border`}>
                          {shipment.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Created At</Label>
                      <p className="text-sm">{format(new Date(shipment.created_at), 'PPP p')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                      <p className="text-sm">{format(new Date(shipment.updated_at), 'PPP p')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Origin
                      </Label>
                      <p className="text-sm bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                        {formatAddress(shipment.origin)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Destination
                      </Label>
                      <p className="text-sm bg-gray-50 p-3 rounded border-l-4 border-green-500">
                        {formatAddress(shipment.destination)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contact Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sender */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base border-b pb-2">Sender</h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Name</Label>
                          <p className="text-sm">{senderDetails.firstName || senderDetails.name || 'Not provided'}</p>
                        </div>
                        {senderDetails.email && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Email
                            </Label>
                            <p className="text-sm break-all">{senderDetails.email}</p>
                          </div>
                        )}
                        {senderDetails.phone && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Phone
                            </Label>
                            <p className="text-sm">{senderDetails.phone}</p>
                          </div>
                        )}
                        {senderDetails.address && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Address
                            </Label>
                            <p className="text-sm bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                              {senderDetails.address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Receiver */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base border-b pb-2">Receiver</h4>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Name</Label>
                          <p className="text-sm">{recipientDetails.firstName || recipientDetails.name || 'Not provided'}</p>
                        </div>
                        {recipientDetails.phone && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Phone
                            </Label>
                            <p className="text-sm">{recipientDetails.phone}</p>
                          </div>
                        )}
                        {recipientDetails.address && (
                          <div>
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Address
                            </Label>
                            <p className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-400">
                              {recipientDetails.address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package2 className="w-5 h-5" />
                    Shipment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Shipment Type</Label>
                      <p className="text-sm">{shipmentDetails.type || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Quantity</Label>
                      <p className="text-sm">{shipmentDetails.quantity || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Category</Label>
                      <p className="text-sm">{shipmentDetails.category || 'Not specified'}</p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <Label className="text-sm font-medium text-gray-600">Description</Label>
                      <p className="text-sm bg-gray-50 p-3 rounded">{shipmentDetails.description || 'Not provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Collection Information */}
              {collectionDetails && Object.keys(collectionDetails).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Collection Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Collection Route</Label>
                        <p className="text-sm bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                          {collectionDetails.route || shipment.origin}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Collection Date</Label>
                        <p className="text-sm">{collectionDetails.date || 'Not scheduled'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Scheduled</Label>
                        <p className="text-sm">{collectionDetails.scheduled ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Collection Status</Label>
                        <p className="text-sm">{collectionDetails.completed ? 'Completed' : 'Pending'}</p>
                      </div>
                      {collectionDetails.notes && (
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-600">Collection Notes</Label>
                          <p className="text-sm bg-gray-50 p-3 rounded">{collectionDetails.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = shipment.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shipment Management</h2>
          <p className="text-gray-600">Manage and track all shipments</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <Button 
            onClick={fetchShipments} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {selectedShipments.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedShipments.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Shipments</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedShipments.size} shipment(s)? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteShipments} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by tracking number, origin, or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shipments List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No shipments found</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredShipments.map((shipment) => (
                <div key={shipment.id} className="border-b last:border-b-0 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedShipments.has(shipment.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedShipments);
                        if (checked) {
                          newSelected.add(shipment.id);
                        } else {
                          newSelected.delete(shipment.id);
                        }
                        setSelectedShipments(newSelected);
                      }}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-mono text-sm font-semibold truncate">
                              {shipment.tracking_number}
                            </p>
                            <Badge className={`${getStatusColorClass(shipment.status)} border text-xs`}>
                              {shipment.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-start gap-1">
                              <MapPin className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                              <span className="text-xs text-gray-500">From:</span>
                              <span className="text-blue-700 break-words">{formatAddress(shipment.origin)}</span>
                            </div>
                            <div className="flex items-start gap-1">
                              <MapPin className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                              <span className="text-xs text-gray-500">To:</span>
                              <span className="text-green-700 break-words">{formatAddress(shipment.destination)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className="text-xs">Created: {format(new Date(shipment.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                View
                              </Button>
                            </DialogTrigger>
                            <ShipmentDetailDialog 
                              shipment={shipment} 
                              open={true} 
                              onOpenChange={() => {}} 
                            />
                          </Dialog>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setEditingStatus(shipment.status);
                              setIsEditDialogOpen(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Status Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shipment Status</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div>
                <Label>Tracking Number</Label>
                <p className="font-mono text-sm bg-gray-50 p-2 rounded">{selectedShipment.tracking_number}</p>
              </div>
              <div>
                <Label>Current Status</Label>
                <Select value={editingStatus} onValueChange={setEditingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="ready for pickup">Ready for Pickup</SelectItem>
                    <SelectItem value="out for delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleStatusUpdate(selectedShipment?.id, editingStatus)}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShipmentManagementTab;
