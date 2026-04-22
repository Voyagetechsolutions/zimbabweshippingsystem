import React, { useState, useEffect } from 'react';
import TabHeader from '@/components/admin/TabHeader';
import { format, isValid } from 'date-fns';
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
  'Pending',
  'Confirmed',
  'Collected',
  'In Transit',
  'Zim Warehouse',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const STATUS_STEPS = [
  'Pending',
  'Confirmed',
  'Collected',
  'In Transit',
  'Zim Warehouse',
  'Out for Delivery',
  'Delivered'
];

// Collection schedule months for filtering
const COLLECTION_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ShipmentManagementTab = () => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [viewingShipment, setViewingShipment] = useState<Shipment | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedShipments, setSelectedShipments] = useState<string[]>([]);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [collectionPeriods, setCollectionPeriods] = useState<any[]>([]);

  useEffect(() => {
    fetchShipments();
    fetchCollectionPeriods();
  }, [sortField, sortDirection]);

  const fetchCollectionPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_periods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollectionPeriods(data || []);
    } catch (error: any) {
      console.error('Error fetching collection periods:', error);
    }
  };

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

      // Trigger WhatsApp status notification via edge function / webhook
      try {
        const whatsappNumber = viewingShipment.metadata?.whatsappNumber;
        if (whatsappNumber) {
          await supabase.functions.invoke('notify-shipment-status', {
            body: {
              phone_number: whatsappNumber,
              tracking_number: viewingShipment.tracking_number,
              status: selectedStatus,
            }
          });
        }
      } catch (notifyErr) {
        console.warn('WhatsApp notification failed (non-critical):', notifyErr);
      }

      toast({
        title: 'Status Updated',
        description: `Shipment ${viewingShipment.tracking_number} updated to ${selectedStatus}`,
      });

      setShipments(shipments.map(s =>
        s.id === viewingShipment.id
          ? { ...s, status: selectedStatus, updated_at: new Date().toISOString() }
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

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedShipments.length === 0) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          status: bulkStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedShipments);

      if (error) throw error;

      toast({
        title: 'Bulk Update Complete',
        description: `Updated ${selectedShipments.length} shipment(s) to ${bulkStatus}`,
      });

      // Refresh shipments
      await fetchShipments();
      
      // Reset selection
      setSelectedShipments([]);
      setShowBulkUpdate(false);
      setBulkStatus('');
    } catch (error: any) {
      console.error('Error bulk updating:', error);
      toast({
        title: 'Error',
        description: `Failed to bulk update: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdateByPeriod = async (periodId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('collection_period_id', periodId);

      if (error) throw error;

      const period = collectionPeriods.find(p => p.id === periodId);
      toast({
        title: 'Bulk Update Complete',
        description: `Updated all shipments in ${period?.name} to ${newStatus}`,
      });

      await fetchShipments();
    } catch (error: any) {
      console.error('Error bulk updating by period:', error);
      toast({
        title: 'Error',
        description: `Failed to bulk update: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleShipmentSelection = (shipmentId: string) => {
    setSelectedShipments(prev =>
      prev.includes(shipmentId)
        ? prev.filter(id => id !== shipmentId)
        : [...prev, shipmentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedShipments.length === filteredShipments.length) {
      setSelectedShipments([]);
    } else {
      setSelectedShipments(filteredShipments.map(s => s.id));
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
    let collectionData = metadata.collection || {};

    // Get pickup/postal code
    const postalCode = metadata.senderDetails?.postcode ||
      metadata.senderDetails?.postalCode ||
      metadata.sender?.postcode ||
      metadata.sender?.postalCode ||
      metadata.pickupPostcode ||
      metadata.postalCode ||
      metadata.postcode ||
      '';

    // Get pickup city/area
    const pickupCity = metadata.senderDetails?.city ||
      metadata.sender?.city ||
      metadata.pickupCity ||
      metadata.city ||
      '';

    // Get country
    const country = metadata.senderDetails?.country ||
      metadata.sender?.country ||
      metadata.pickupCountry ||
      metadata.country ||
      'England';

    return {
      route: collectionData.route || metadata.collectionRoute || metadata.route || 'Not assigned',
      date: collectionData.date || metadata.collectionDate || metadata.date || 'To be confirmed',
      scheduled: collectionData.scheduled || metadata.collectionScheduled || metadata.scheduled || false,
      completed: collectionData.completed || metadata.collectionCompleted ||
        (shipment.status !== 'Booking Confirmed' && shipment.status !== 'Ready for Pickup' && shipment.status !== 'Pending'),
      notes: collectionData.notes || metadata.collectionNotes || metadata.specialInstructions || '',
      postalCode: postalCode,
      city: pickupCity,
      country: country
    };
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
    const statusMap: Record<string, number> = {
      'pending': 0,
      'confirmed': 1,
      'collected': 2,
      'in transit': 3,
      'intransit': 3,
      'ontransit': 3,
      'zim warehouse': 4,
      'out for delivery': 5,
      'delivered': 6
    };
    
    const currentStep = statusMap[status?.toLowerCase()] ?? 0;
    return Math.round((currentStep / (STATUS_STEPS.length - 1)) * 100);
  };

  const getCurrentStepIndex = (status: string) => {
    const statusMap: Record<string, number> = {
      'pending': 0,
      'confirmed': 1,
      'collected': 2,
      'in transit': 3,
      'intransit': 3,
      'ontransit': 3,
      'zim warehouse': 4,
      'out for delivery': 5,
      'delivered': 6
    };
    return statusMap[status?.toLowerCase()] ?? 0;
  };

  // Helper to get collection month from shipment
  const getCollectionMonth = (shipment: Shipment): string | null => {
    const metadata = shipment.metadata || {};
    const collectionDate = metadata.collection?.date || metadata.collectionDate;

    if (!collectionDate) {
      // Fallback to created_at month
      const createdDate = new Date(shipment.created_at);
      return format(createdDate, 'MMMM');
    }

    try {
      const date = new Date(collectionDate);
      if (isValid(date)) {
        return format(date, 'MMMM');
      }
      // If date string contains month name, extract it
      for (const month of COLLECTION_MONTHS) {
        if (collectionDate.toLowerCase().includes(month.toLowerCase())) {
          return month;
        }
      }
    } catch {
      return null;
    }
    return null;
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

    const matchesCollection =
      collectionFilter === 'all' ||
      getCollectionMonth(shipment)?.toLowerCase() === collectionFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesCollection;
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
        <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <CheckCircle className="h-3 w-3" />
          {status}
        </Badge>
      );
    } else if (statusLower.includes('transit') || statusLower.includes('warehouse') || statusLower.includes('delivery') || statusLower.includes('collected')) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status}
        </Badge>
      );
    } else if (statusLower.includes('confirmed')) {
      return (
        <Badge className="flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
          <CheckCircle className="h-3 w-3" />
          {status}
        </Badge>
      );
    }

    return <Badge>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <TabHeader
        title="Shipment Management"
        description="Track and manage all customer shipments"
        actions={
          <div className="flex gap-2">
            {selectedShipments.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowBulkUpdate(true)}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                Bulk Update ({selectedShipments.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchShipments} className="h-8 text-xs">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search shipments..."
              className="pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
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

          <Select value={collectionFilter} onValueChange={setCollectionFilter}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <span>Collection Schedule</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collections</SelectItem>
              {COLLECTION_MONTHS.map((month) => (
                <SelectItem key={month.toLowerCase()} value={month.toLowerCase()}>
                  {month} Collection
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="shadow-none border border-gray-200 dark:border-gray-800">
            <CardHeader className="p-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">Total Shipments</CardTitle>
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">{shipments.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-none border border-gray-200 dark:border-gray-800">
            <CardHeader className="p-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">In Transit</CardTitle>
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">
                {shipments.filter(s =>
                  ['In Transit', 'InTransit', 'OnTransit', 'Zim Warehouse', 'Out for Delivery']
                    .some(status => s.status?.toLowerCase().includes(status.toLowerCase()))).length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-none border border-gray-200 dark:border-gray-800">
            <CardHeader className="p-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">Delivered</CardTitle>
                <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">
                {shipments.filter(s => s.status === 'Delivered').length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-none border border-gray-200 dark:border-gray-800">
            <CardHeader className="p-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">Cancelled</CardTitle>
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">
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
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedShipments.length === filteredShipments.length && filteredShipments.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
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
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedShipments.includes(shipment.id)}
                        onChange={() => toggleShipmentSelection(shipment.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
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

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-medium">{filteredShipments.length}</span> of{' '}
          <span className="font-medium">{shipments.length}</span> shipments
        </div>
      </div>

      {/* Shipment Details Dialog - Clean Admin Style */}
      <Dialog open={!!viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Shipment Details</DialogTitle>
            <DialogDescription className="text-xs">
              Tracking: {viewingShipment?.tracking_number}
            </DialogDescription>
          </DialogHeader>
          {viewingShipment && (
            <div className="space-y-4">
              {/* Status and Basic Info */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStatusBadge(viewingShipment.status)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium mt-1">{format(new Date(viewingShipment.updated_at), 'MMM d, yyyy')}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Progress</p>
                  <p className="text-xs text-muted-foreground">{getStatusProgress(viewingShipment.status)}%</p>
                </div>
                <Progress value={getStatusProgress(viewingShipment.status)} className="h-2" />
                <div className="flex justify-between mt-2">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = getCurrentStepIndex(viewingShipment.status) >= index;
                    return (
                      <span key={step} className={`text-[10px] ${isCompleted ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                        {step}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Sender & Receiver - Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground">Sender</p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{getSenderName(viewingShipment)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {getSenderEmail(viewingShipment)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {getSenderPhone(viewingShipment)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5" />
                      <span>{getPickupAddress(viewingShipment)}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground">Receiver</p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{getReceiverName(viewingShipment)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {getReceiverPhone(viewingShipment)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5" />
                      <span>{getDeliveryAddress(viewingShipment)}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Collection & Shipment Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 p-3 border rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground">Collection Details</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Route:</span>
                      <span className="font-medium">{getCollectionInfo(viewingShipment).route}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{getCollectionInfo(viewingShipment).date}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Postal Code:</span>
                      <span className="font-medium">{getCollectionInfo(viewingShipment).postalCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">City:</span>
                      <span className="font-medium">{getCollectionInfo(viewingShipment).city || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-3 border rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground">Shipment Info</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{getShipmentType(viewingShipment).type}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Origin:</span>
                      <span className="font-medium">{viewingShipment.origin || 'UK'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Destination:</span>
                      <span className="font-medium">{viewingShipment.destination || 'Zimbabwe'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Payment:</span>
                      <span className="font-medium">{getPaymentAmount(viewingShipment)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipment Contents */}
              {viewingShipment.metadata?.shipmentDetails && (
                <div className="p-3 border rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Shipment Contents</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold">{viewingShipment.metadata.shipmentDetails.quantity || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Drums</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold">{viewingShipment.metadata.shipmentDetails.wantMetalSeal ? '✓' : '—'}</p>
                      <p className="text-[10px] text-muted-foreground">Metal Seal</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-xs font-bold truncate">{viewingShipment.metadata.shipmentDetails.category || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">Category</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold">{viewingShipment.metadata.shipmentDetails.services?.length || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Add-ons</p>
                    </div>
                  </div>
                  {viewingShipment.metadata.shipmentDetails.description && (
                    <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
                      {viewingShipment.metadata.shipmentDetails.description}
                    </p>
                  )}
                </div>
              )}

              {/* Status Update Section */}
              <div className="pt-3 border-t">
                {editingStatus ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="status" className="text-xs">Update Status</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-full mt-1 h-9 text-sm">
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleUpdateStatus}
                        disabled={selectedStatus === viewingShipment.status || isUpdating}
                        className="h-8 text-xs"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Status'
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingStatus(false)} className="h-8 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Status Management</p>
                      <p className="text-sm font-medium">{viewingShipment.status}</p>
                    </div>
                    {viewingShipment.status !== 'Delivered' && viewingShipment.status !== 'Cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingStatus(true)}
                        className="h-8 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Update Status
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={showBulkUpdate} onOpenChange={setShowBulkUpdate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Status Update</DialogTitle>
            <DialogDescription>
              Update status for {selectedShipments.length} selected shipment(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bulk-status">New Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Select status" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkUpdate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus || isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update All'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShipmentManagementTab;
