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

  const getShipmentType = (shipment: Shipment): { type: string; details: string } => {
    const metadata = shipment.metadata || {};
    const shipmentDetails = metadata.shipmentDetails || {};
    
    const types: string[] = [];
    const details: string[] = [];
    
    if (shipmentDetails.includeDrums) {
      const qty = shipmentDetails.quantity || 0;
      types.push('Drums');
      details.push(`${qty} drum${qty !== 1 ? 's' : ''}`);
      if (shipmentDetails.wantMetalSeal) {
        details.push('with metal seals');
      }
    }
    
    if (shipmentDetails.includeOtherItems || shipmentDetails.includeBoxes) {
      types.push('Boxes/Items');
      if (shipmentDetails.category) {
        details.push(shipmentDetails.category);
      }
    }
    
    if (types.length === 0) {
      // Fallback to metadata type
      if (metadata.shipmentType) {
        return { type: metadata.shipmentType, details: '' };
      }
      return { type: 'Standard Shipment', details: '' };
    }
    
    return { 
      type: types.join(' + '), 
      details: details.join(', ')
    };
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

      {/* Shipment Details Dialog - Modern Youthful Design */}
      <Dialog open={!!viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>Shipment Details</DialogTitle>
            <DialogDescription>View and manage shipment information</DialogDescription>
          </DialogHeader>
          {viewingShipment && (
            <div className="flex flex-col">
              {/* Header with Gradient */}
              <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Package className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-medium">Tracking Number</p>
                        <h2 className="text-2xl font-bold tracking-wide">{viewingShipment.tracking_number}</h2>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-sm px-4 py-1.5 font-semibold ${
                      viewingShipment.status === 'Delivered' ? 'bg-green-600' :
                      viewingShipment.status === 'Cancelled' ? 'bg-red-500' :
                      viewingShipment.status === 'InTransit to Zimbabwe' ? 'bg-blue-500' :
                      'bg-white/20 backdrop-blur-sm'
                    }`}>
                      {viewingShipment.status}
                    </Badge>
                    <p className="text-white/70 text-xs mt-2">
                      Created {format(new Date(viewingShipment.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Timeline - Modern Style */}
              <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-b">
                <div className="flex items-center justify-between relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${getStatusProgress(viewingShipment.status)}%` }}
                    />
                  </div>
                  
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = STATUS_STEPS.indexOf(viewingShipment.status) >= index;
                    const isCurrent = STATUS_STEPS.indexOf(viewingShipment.status) === index;
                    return (
                      <div key={step} className="relative z-10 flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-emerald-500/30 scale-110' : ''}`}>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                        <span className={`text-xs mt-2 text-center max-w-[80px] ${
                          isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'
                        }`}>
                          {step.replace('InTransit to Zimbabwe', 'In Transit').replace('Processing in ZW Warehouse', 'Processing')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Content */}
              <div className="p-6 space-y-6">
                {/* Shipment Type Banner */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-white/70 text-xs font-medium">Shipment Type</p>
                        <p className="text-lg font-bold">{getShipmentType(viewingShipment).type}</p>
                        {getShipmentType(viewingShipment).details && (
                          <p className="text-white/60 text-sm">{getShipmentType(viewingShipment).details}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-xs">Origin → Destination</p>
                      <p className="font-medium">{viewingShipment.origin || 'UK'} → {viewingShipment.destination || 'Zimbabwe'}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-4 border border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Truck className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Route</p>
                        <p className="font-semibold text-blue-900 dark:text-blue-100">{getCollectionInfo(viewingShipment).route || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-xl p-4 border border-purple-100 dark:border-purple-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Collection</p>
                        <p className="font-semibold text-purple-900 dark:text-purple-100">{getCollectionInfo(viewingShipment).date || 'TBC'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 rounded-xl p-4 border border-amber-100 dark:border-amber-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500 rounded-lg">
                        <FileSpreadsheet className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Payment</p>
                        <p className="font-semibold text-amber-900 dark:text-amber-100">{getPaymentAmount(viewingShipment)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Updated</p>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-100">{format(new Date(viewingShipment.updated_at), 'MMM d')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sender & Receiver Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sender Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Sender Details
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold">{getSenderName(viewingShipment)}</p>
                          <p className="text-sm text-muted-foreground">{getSenderEmail(viewingShipment)}</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{getSenderPhone(viewingShipment)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{getPickupAddress(viewingShipment)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Receiver Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Receiver Details
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                          <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold">{getReceiverName(viewingShipment)}</p>
                          <p className="text-sm text-muted-foreground">Zimbabwe</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{getReceiverPhone(viewingShipment)}</span>
                          {viewingShipment.metadata?.additionalRecipientPhone && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              Alt: {viewingShipment.metadata.additionalRecipientPhone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{getDeliveryAddress(viewingShipment)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipment Items */}
                {viewingShipment.metadata?.shipmentDetails && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Shipment Contents
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-2xl font-bold text-amber-600">
                            {viewingShipment.metadata.shipmentDetails.quantity || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">Drums</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">
                            {viewingShipment.metadata.shipmentDetails.wantMetalSeal ? '✓' : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">Metal Seal</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-lg font-bold text-purple-600 truncate">
                            {viewingShipment.metadata.shipmentDetails.category || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">Category</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-lg font-bold text-blue-600">
                            {viewingShipment.metadata.shipmentDetails.services?.length || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Add-ons</p>
                        </div>
                      </div>
                      {viewingShipment.metadata.shipmentDetails.description && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Description:</strong> {viewingShipment.metadata.shipmentDetails.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Update Section */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Status Management
                    </h3>
                    {!editingStatus && viewingShipment.status !== 'Delivered' && viewingShipment.status !== 'Cancelled' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => setEditingStatus(true)}
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                      >
                        Update Status
                      </Button>
                    )}
                  </div>
                  <div className="p-4">
                    {editingStatus ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="status" className="text-sm font-medium">New Status</Label>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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
                            <Label htmlFor="note" className="text-sm font-medium">Note (Optional)</Label>
                            <Textarea
                              id="note"
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              placeholder="Add notes..."
                              className="mt-2 h-[42px] min-h-[42px]"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleUpdateStatus}
                            disabled={selectedStatus === viewingShipment.status || isUpdating}
                            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
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
                          <Button variant="outline" onClick={() => setEditingStatus(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Status</p>
                          <p className="font-semibold">{viewingShipment.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Last Updated</p>
                          <p className="font-medium">{format(new Date(viewingShipment.updated_at), 'PPpp')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ShipmentManagementTab;
