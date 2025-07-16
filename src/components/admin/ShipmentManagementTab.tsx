import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shipment } from '@/types/shipment';

// UI Components
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icons
import { 
  Search, 
  RefreshCw,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  Trash,
  FileSpreadsheet,
  Package,
  Truck,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  User,
  Info,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const STATUS_OPTIONS = [
  'Booking Confirmed',
  'Ready for Pickup',
  'InTransit to Zimbabwe',
  'Goods Arrived in Zimbabwe',
  'Processing in ZW Warehouse',
  'Delivered',
  'Cancelled',
];

const STATUS_STEPS = [
  'Booking Confirmed',
  'Ready for Pickup',
  'InTransit to Zimbabwe',
  'Goods Arrived in Zimbabwe',
  'Processing in ZW Warehouse',
  'Delivered'
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
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, [sortField, sortDirection]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (error) throw error;

      const typedData = data?.map(item => ({
        ...item,
        metadata: item.metadata || {},
        can_cancel: item.can_cancel !== undefined ? item.can_cancel : true,
        can_modify: item.can_modify !== undefined ? item.can_modify : true
      } as Shipment)) || [];
      
      setShipments(typedData);
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

  const handleViewShipment = (shipment: Shipment) => {
    setViewingShipment(shipment);
    setSelectedStatus(shipment.status);
  };

  const handleUpdateStatus = async () => {
    if (!viewingShipment || !selectedStatus) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', viewingShipment.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Shipment ${viewingShipment.tracking_number} status updated to ${selectedStatus}`,
      });

      setShipments(shipments.map(s => 
        s.id === viewingShipment.id 
          ? {...s, status: selectedStatus, updated_at: new Date().toISOString()} 
          : s
      ));
      
      setViewingShipment({
        ...viewingShipment,
        status: selectedStatus,
        updated_at: new Date().toISOString()
      });

      setEditingStatus(false);
      setStatusNote('');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const getSenderName = (shipment: Shipment): string => {
    if (!shipment?.metadata) return 'No Name';
    
    const metadata = shipment.metadata;
    
    if (metadata.sender?.name) return metadata.sender.name;
    if (metadata.sender?.firstName && metadata.sender.lastName) {
      return `${metadata.sender.firstName} ${metadata.sender.lastName}`;
    }
    if (metadata.senderDetails?.firstName && metadata.senderDetails.lastName) {
      return `${metadata.senderDetails.firstName} ${metadata.senderDetails.lastName}`;
    }
    if (metadata.senderDetails?.name) return metadata.senderDetails.name;
    if (metadata.firstName && metadata.lastName) return `${metadata.firstName} ${metadata.lastName}`;
    if (metadata.sender_name) return metadata.sender_name;
    if (metadata.sender_details?.name) return metadata.sender_details.name;
    
    return 'No Name';
  };
  
  const getSenderEmail = (shipment: Shipment): string => {
    if (!shipment?.metadata) return 'No Email';
    
    const metadata = shipment.metadata;
    return metadata.sender?.email || 
           metadata.senderDetails?.email || 
           metadata.email || 
           metadata.sender_email || 
           'No Email';
  };
  
  const getSenderPhone = (shipment: Shipment): string => {
    if (!shipment?.metadata) return 'No Phone';
    
    const metadata = shipment.metadata;
    return metadata.sender?.phone || 
           metadata.senderDetails?.phone || 
           metadata.phone || 
           metadata.sender_phone || 
           metadata.sender_details?.phone || 
           metadata.sender?.additionalPhone || 
           metadata.additionalPhone || 
           'No Phone';
  };
  
  const getReceiverName = (shipment: Shipment): string => {
    if (!shipment?.metadata) return 'No Name';
    
    const metadata = shipment.metadata;
    return metadata.recipient?.name || 
           metadata.recipientDetails?.name || 
           metadata.recipientName || 
           metadata.receiver_name || 
           metadata.recipient_details?.name || 
           'No Name';
  };
  
  const getReceiverPhone = (shipment: Shipment): string => {
    if (!shipment?.metadata) return 'No Phone';
    
    const metadata = shipment.metadata;
    return metadata.recipient?.phone || 
           metadata.recipientDetails?.phone || 
           metadata.recipientPhone || 
           metadata.receiver_phone || 
           metadata.recipient_details?.phone || 
           metadata.additionalRecipientPhone || 
           metadata.recipient?.additionalPhone || 
           'No Phone';
  };
  
  const getDeliveryAddress = (shipment: Shipment): string => {
    const metadata = shipment.metadata || {};
    return metadata.recipientDetails?.address || 
           metadata.recipient?.address || 
           metadata.deliveryAddress || 
           shipment.destination || 
           'No Address';
  };
  
  const getPickupAddress = (shipment: Shipment): string => {
    const metadata = shipment.metadata || {};
    return metadata.senderDetails?.address || 
           metadata.sender?.address || 
           metadata.pickupAddress || 
           shipment.origin || 
           'No Address';
  };

  const getCollectionInfo = (shipment: Shipment) => {
    const metadata = shipment.metadata || {};
    let collectionData = metadata.collection;
    
    if (!collectionData) {
      collectionData = {
        route: metadata.collectionRoute || metadata.route || 'Standard Route',
        date: metadata.collectionDate || metadata.date || 'Next available date',
        scheduled: metadata.collectionScheduled || metadata.scheduled || false,
        completed: metadata.collectionCompleted || 
                 (shipment.status !== 'Booking Confirmed' && shipment.status !== 'Ready for Pickup'),
        notes: metadata.collectionNotes || 
              metadata.specialInstructions ||
              'No additional notes'
      };
    }
    
    return collectionData;
  };
  
  const getPaymentAmount = (shipment: Shipment): string => {
    const metadata = shipment.metadata || {};
    const amount = metadata.payment?.amount || 
                  metadata.paymentAmount || 
                  metadata.amount || 
                  metadata.totalAmount || 
                  metadata.total || 
                  metadata.pricing?.total || 
                  metadata.cost || 
                  metadata.price || 
                  metadata.quotedAmount;
    
    return amount ? `£${amount}` : 'Amount to be confirmed';
  };

  const getStatusProgress = (status: string) => {
    const currentStep = STATUS_STEPS.indexOf(status);
    return currentStep >= 0 ? Math.round((currentStep / (STATUS_STEPS.length - 1)) * 100) : 0;
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      searchQuery === '' ||
      shipment.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSenderName(shipment).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getReceiverName(shipment).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSenderPhone(shipment).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSenderEmail(shipment).toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      shipment.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const renderStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('cancelled')) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {status}
        </Badge>
      );
    } else if (statusLower.includes('delivered')) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {status}
        </Badge>
      );
    } else if (statusLower.includes('processing') || statusLower.includes('pickup') || statusLower.includes('transit') || statusLower.includes('arrived')) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status}
        </Badge>
      );
    }
    
    return <Badge>{status}</Badge>;
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Shipment Management</CardTitle>
            <CardDescription>
              Track and manage all customer shipments
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchShipments}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shipments..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <span>Filter by status</span>
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
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipments</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{shipments.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">
                {shipments.filter(s => 
                  ['InTransit to Zimbabwe', 'Goods Arrived in Zimbabwe', 'Processing in ZW Warehouse']
                  .includes(s.status)).length}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">
                {shipments.filter(s => s.status === 'Delivered').length}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">
                {shipments.filter(s => s.status === 'Cancelled').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Shipments Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading shipments...</p>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4 border rounded-lg">
            <Package className="h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-medium">No shipments found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Tracking #</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map(shipment => (
                  <TableRow key={shipment.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">{shipment.tracking_number}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to view details</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getSenderName(shipment)}</span>
                        <span className="text-sm text-muted-foreground">{getSenderPhone(shipment)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getReceiverName(shipment)}</span>
                        <span className="text-sm text-muted-foreground">{getReceiverPhone(shipment)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(shipment.status)}
                        {shipment.status === 'Delivered' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delivered on {format(new Date(shipment.updated_at), 'PPP')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {shipment.status === 'Cancelled' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cancelled on {format(new Date(shipment.updated_at), 'PPP')}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewShipment(shipment)}
                        className="text-primary hover:text-primary"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{filteredShipments.length}</span> of{' '}
          <span className="font-medium">{shipments.length}</span> shipments
        </div>
      </CardContent>

      {/* Shipment Details Dialog */}
      <Dialog open={!!viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          {viewingShipment && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center gap-2">
                  <DialogTitle>Shipment Details</DialogTitle>
                  {renderStatusBadge(viewingShipment.status)}
                </div>
                <DialogDescription>
                  Tracking Number: {viewingShipment.tracking_number}
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  {/* Progress Tracker */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Shipment Progress</h3>
                    <Progress value={getStatusProgress(viewingShipment.status)} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {STATUS_STEPS.map((step, index) => (
                        <div 
                          key={step} 
                          className={`text-center ${STATUS_STEPS.indexOf(viewingShipment.status) >= index ? 'text-primary' : ''}`}
                        >
                          <div className="mx-auto mb-1">
                            {STATUS_STEPS.indexOf(viewingShipment.status) >= index ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                            )}
                          </div>
                          <span className="hidden md:inline break-words">{step}</span>
                          <span className="md:hidden">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Information Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Dates</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="break-words">{format(new Date(viewingShipment.created_at), 'PPp')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Updated</p>
                          <p className="break-words">{format(new Date(viewingShipment.updated_at), 'PPp')}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>Route</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Origin</p>
                          <div className="text-sm bg-blue-50 p-2 rounded border-l-2 border-blue-400 break-words">
                            {viewingShipment.origin || 'Not specified'}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Destination</p>
                          <div className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-400 break-words">
                            {viewingShipment.destination || 'Not specified'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>Payment</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold break-words">{getPaymentAmount(viewingShipment)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Sender</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                          <div className="flex items-start gap-3">
                            <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium break-words">{getSenderName(viewingShipment)}</p>
                              <p className="text-sm text-muted-foreground break-words">{getSenderEmail(viewingShipment)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Phone className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <p className="break-words">{getSenderPhone(viewingShipment)}</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="text-sm bg-blue-50 p-2 rounded border-l-2 border-blue-400 break-words min-w-0 flex-1">
                              {getPickupAddress(viewingShipment)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Receiver</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                          <div className="flex items-start gap-3">
                            <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium break-words">{getReceiverName(viewingShipment)}</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <Phone className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="break-words">{getReceiverPhone(viewingShipment)}</p>
                              {viewingShipment.metadata?.additionalRecipientPhone && (
                                <p className="text-sm text-muted-foreground break-words">Alt: {viewingShipment.metadata.additionalRecipientPhone}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-400 break-words min-w-0 flex-1">
                              {getDeliveryAddress(viewingShipment)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Shipment Details */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Shipment Details</h3>
                    <Card>
                      <CardContent className="p-6">
                        {viewingShipment.metadata?.shipmentDetails ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-2">Type</h4>
                              <p className="break-words">{viewingShipment.metadata.shipmentDetails.type || 'Standard'}</p>
                            </div>
                            
                            {viewingShipment.metadata.shipmentDetails.includeDrums && (
                              <>
                                <div>
                                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Drum Quantity</h4>
                                  <p className="break-words">{viewingShipment.metadata.shipmentDetails.quantity || 'Not specified'}</p>
                                </div>
                                
                                {viewingShipment.metadata.shipmentDetails.wantMetalSeal && (
                                  <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Metal Seals</h4>
                                    <p>Yes</p>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {viewingShipment.metadata.shipmentDetails.includeOtherItems && (
                              <>
                                <div>
                                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Item Category</h4>
                                  <p className="break-words">{viewingShipment.metadata.shipmentDetails.category || 'Not specified'}</p>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                                  <p className="break-words">{viewingShipment.metadata.shipmentDetails.description || 'Not provided'}</p>
                                </div>
                              </>
                            )}
                            
                            {viewingShipment.metadata.shipmentDetails.services?.length > 0 && (
                              <div className="col-span-2">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Additional Services</h4>
                                <ul className="space-y-1">
                                  {viewingShipment.metadata.shipmentDetails.services.map((service: any, idx: number) => (
                                    <li key={idx} className="flex justify-between">
                                      <span className="break-words">{service.name}</span>
                                      <span>£{service.price}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No detailed shipment information available</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Status Update Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Status Management</h3>
                      {!editingStatus ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingStatus(true)}
                          disabled={viewingShipment.status === 'Delivered' || viewingShipment.status === 'Cancelled'}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Update Status
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditingStatus(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingStatus ? (
                      <Card>
                        <CardContent className="p-6 space-y-4">
                          <div>
                            <Label htmlFor="status">New Status</Label>
                            <Select 
                              value={selectedStatus} 
                              onValueChange={setSelectedStatus}
                            >
                              <SelectTrigger className="w-full mt-2">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((status) => (
                                  <SelectItem 
                                    key={status} 
                                    value={status}
                                    disabled={status === viewingShipment.status}
                                  >
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="note">Update Note (Optional)</Label>
                            <Textarea
                              id="note"
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              placeholder="Add any notes about this status change..."
                              className="mt-2"
                            />
                          </div>
                          
                          <Button 
                            onClick={handleUpdateStatus}
                            disabled={selectedStatus === viewingShipment.status || isUpdating}
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Confirm Update'
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Current Status</h4>
                              <p className="text-muted-foreground text-sm">
                                Last updated: {format(new Date(viewingShipment.updated_at), 'PPpp')}
                              </p>
                            </div>
                            <Badge variant="outline">{viewingShipment.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Collection Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Collection Information</h3>
                    <Card>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Collection Route</h4>
                            <div className="text-sm bg-blue-50 p-2 rounded border-l-2 border-blue-400 break-words">
                              {getCollectionInfo(viewingShipment).route}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Collection Date</h4>
                            <p className="break-words">{getCollectionInfo(viewingShipment).date}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Scheduled</h4>
                            <Badge variant={getCollectionInfo(viewingShipment).scheduled ? "default" : "secondary"}>
                              {getCollectionInfo(viewingShipment).scheduled ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
                            <Badge variant={getCollectionInfo(viewingShipment).completed ? "default" : "outline"}>
                              {getCollectionInfo(viewingShipment).completed ? 'Completed' : 'Pending'}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                            <p className="whitespace-pre-line break-words">{getCollectionInfo(viewingShipment).notes}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ShipmentManagementTab;
