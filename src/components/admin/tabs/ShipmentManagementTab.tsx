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
  MapPin,
  User
} from 'lucide-react';

// Define the Json type to match Supabase's Json type
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Define the status history type
interface StatusHistory {
  id: string;
  status: string;
  created_at: string;
  created_by: string;
  notes: string;
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
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
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
      // Cast the data to ensure type compatibility
      const typedData = data?.map(item => {
        // Ensure metadata is in the correct shape for Shipment type
        return {
          ...item,
          metadata: item.metadata || {},
          // Add required fields from the Shipment type that might be missing
          can_cancel: item.can_cancel !== undefined ? item.can_cancel : true,
          can_modify: item.can_modify !== undefined ? item.can_modify : true
        } as Shipment;
      }) || [];
      
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
      // Fetch status history from shipment updates if available
      const { data, error } = await supabase
        .from('shipments')
        .select('status, updated_at')
        .eq('id', shipmentId)
        .single();

      if (error) throw error;

      // Create a history from available data
      const history: StatusHistory[] = [
        {
          id: '1',
          status: data.status,
          created_at: data.updated_at,
          created_by: 'System',
          notes: 'Status updated',
        }
      ];

      setStatusHistory(history);
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
  
  // Enhanced function to extract sender's name from metadata
  const getSenderName = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Name Provided';
    }
    
    const metadata = shipment.metadata;
    
    // First check senderDetails which should be our primary path
    if (metadata.senderDetails) {
      if (metadata.senderDetails.firstName && metadata.senderDetails.lastName) {
        return `${metadata.senderDetails.firstName} ${metadata.senderDetails.lastName}`;
      }
      if (metadata.senderDetails.name) {
        return metadata.senderDetails.name;
      }
    }
    
    // Then check sender which is the second most common path
    if (metadata.sender) {
      if (metadata.sender.firstName && metadata.sender.lastName) {
        return `${metadata.sender.firstName} ${metadata.sender.lastName}`;
      }
      if (metadata.sender.name) {
        return metadata.sender.name;
      }
    }
    
    // Check for directly nested properties
    if (metadata.firstName && metadata.lastName) {
      return `${metadata.firstName} ${metadata.lastName}`;
    }
    
    // Check other possible paths
    if (metadata.sender_name) {
      return metadata.sender_name;
    }
    
    if (metadata.sender_details?.name) {
      return metadata.sender_details.name;
    }
    
    return 'No Name Provided';
  };
  
  // Enhanced function to extract sender's email from metadata
  const getSenderEmail = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Email Provided';
    }
    
    const metadata = shipment.metadata;
    
    if (metadata.senderDetails?.email) {
      return metadata.senderDetails.email;
    }
    
    if (metadata.sender?.email) {
      return metadata.sender.email;
    }
    
    if (metadata.email) {
      return metadata.email;
    }
    
    if (metadata.sender_email) {
      return metadata.sender_email;
    }
    
    return 'No Email Provided';
  };
  
  // Enhanced function to extract sender's phone from metadata
  const getSenderPhone = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Phone Provided';
    }
    
    const metadata = shipment.metadata;
    
    if (metadata.senderDetails?.phone) {
      return metadata.senderDetails.phone;
    }
    
    if (metadata.sender?.phone) {
      return metadata.sender.phone;
    }
    
    if (metadata.phone) {
      return metadata.phone;
    }
    
    if (metadata.sender_phone) {
      return metadata.sender_phone;
    }
    
    if (metadata.sender_details?.phone) {
      return metadata.sender_details.phone;
    }
    
    if (metadata.sender?.additionalPhone) {
      return metadata.sender.additionalPhone;
    }
    
    if (metadata.additionalPhone) {
      return metadata.additionalPhone;
    }
    
    return 'No Phone Provided';
  };
  
  // Enhanced function to extract receiver's name from metadata
  const getReceiverName = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Name Provided';
    }
    
    const metadata = shipment.metadata;
    
    if (metadata.recipientDetails?.name) {
      return metadata.recipientDetails.name;
    }
    
    if (metadata.recipient?.name) {
      return metadata.recipient.name;
    }
    
    if (metadata.recipientName) {
      return metadata.recipientName;
    }
    
    if (metadata.receiver_name) {
      return metadata.receiver_name;
    }
    
    if (metadata.recipient_details?.name) {
      return metadata.recipient_details.name;
    }
    
    return 'No Name Provided';
  };
  
  // Enhanced function to extract receiver's phone from metadata
  const getReceiverPhone = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Phone Provided';
    }
    
    const metadata = shipment.metadata;
    
    if (metadata.recipientDetails?.phone) {
      return metadata.recipientDetails.phone;
    }
    
    if (metadata.recipient?.phone) {
      return metadata.recipient.phone;
    }
    
    if (metadata.recipientPhone) {
      return metadata.recipientPhone;
    }
    
    if (metadata.receiver_phone) {
      return metadata.receiver_phone;
    }
    
    if (metadata.recipient_details?.phone) {
      return metadata.recipient_details.phone;
    }
    
    if (metadata.additionalRecipientPhone) {
      return metadata.additionalRecipientPhone;
    }
    
    if (metadata.recipient?.additionalPhone) {
      return metadata.recipient.additionalPhone;
    }
    
    return 'No Phone Provided';
  };
  
  // Function to get delivery address
  const getDeliveryAddress = (shipment: Shipment): string => {
    const metadata = shipment.metadata || {};
    
    if (metadata.recipientDetails?.address) {
      return metadata.recipientDetails.address;
    } else if (metadata.recipient?.address) {
      return metadata.recipient.address;
    } else if (metadata.deliveryAddress) {
      return metadata.deliveryAddress;
    } else if (shipment.destination) {
      return shipment.destination;
    }
    
    return 'No Address Provided';
  };
  
  // Function to get pickup address
  const getPickupAddress = (shipment: Shipment): string => {
    const metadata = shipment.metadata || {};
    
    if (metadata.senderDetails?.address) {
      return metadata.senderDetails.address;
    } else if (metadata.sender?.address) {
      return metadata.sender.address;
    } else if (metadata.pickupAddress) {
      const address = metadata.pickupAddress;
      const city = metadata.pickupCity || '';
      const postcode = metadata.pickupPostcode || '';
      const country = metadata.pickupCountry || '';
      
      return [address, city, postcode, country].filter(Boolean).join(', ');
    } else if (shipment.origin) {
      return shipment.origin;
    }
    
    return 'No Address Provided';
  };
  
  // Filter shipments based on search and status filter
  const filteredShipments = shipments.filter(shipment => {
    const metadata = shipment.metadata || {};
    const senderName = getSenderName(shipment);
    const receiverName = getReceiverName(shipment);
    const senderPhone = getSenderPhone(shipment);
    const receiverPhone = getReceiverPhone(shipment);
    const senderEmail = getSenderEmail(shipment);
    
    const matchesSearch = 
      searchQuery === '' ||
      shipment.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      senderPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      shipment.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Helper function to render status badge
  const renderStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
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
                    <TableHead className="cursor-pointer" onClick={()={() => handleSort('destination')}}>
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
                  {filteredShipments.map(shipment => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-mono">{shipment.tracking_number}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{getSenderName(shipment)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{getReceiverName(shipment)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{getSenderPhone(shipment)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{getReceiverPhone(shipment)}</TableCell>
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
                  ))}
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
                  <p>{viewingShipment.origin || 'Not specified'}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Destination</h3>
                  <p>{viewingShipment.destination || 'Not specified'}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                  <p>{format(new Date(viewingShipment.created_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Updated At</h3>
                  <p>{format(new Date(viewingShipment.updated_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
              
              {/* Sender and Recipient Details */}
              <div>
                <h3 className="text-lg font-medium mb-3">Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <div>
                    <h4 className="font-medium">Sender</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-start">
                        <User className="h-4 w-4 mt-1 mr-2 text-gray-500" />
                        <div>
                          <p className="font-medium">{getSenderName(viewingShipment)}</p>
                          <p className="text-sm text-gray-500">{getSenderEmail(viewingShipment)}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Phone className="h-4 w-4 mt-1 mr-2 text-gray-500" />
                        <div>
                          <p>{getSenderPhone(viewingShipment)}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mt-1 mr-2 text-gray-500" />
                        <div>
                          <p className="text-sm">
                            {getPickupAddress(viewingShipment)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">Receiver</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-start">
                        <User className="h-4 w-4 mt-1 mr-2 text-gray-500" />
                        <p className="font-medium">{getReceiverName(viewingShipment)}</p>
                      </div>
                      <div className="flex items-start">
                        <Phone className="h-4 w-4 mt-1 mr-2 text-gray-500" />
                        <div>
                          <p>{getReceiverPhone(viewingShipment)}</p>
                          {viewingShipment.metadata?.additionalRecipientPhone && (
                            <p className="text-sm text-gray-500">Additional: {viewingShipment.metadata.additionalRecipientPhone}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mt-1 mr-2 text-gray-500" />
                        <div>
                          <p className="text-sm">
                            {getDeliveryAddress(viewingShipment)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Shipment Details Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">Shipment Details</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  {viewingShipment.metadata?.shipmentDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground">Shipment Type</h4>
                        <p>{viewingShipment.metadata.shipmentDetails.type || 'Not specified'}</p>
                      </div>
                      
                      {viewingShipment.metadata.shipmentDetails.includeDrums && (
                        <>
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Drum Quantity</h4>
                            <p>{viewingShipment.metadata.shipmentDetails.quantity || 'Not specified'}</p>
                          </div>
                          
                          {viewingShipment.metadata.shipmentDetails.wantMetalSeal && (
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium text-muted-foreground">Metal Seals</h4>
                              <p>Yes</p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {viewingShipment.metadata.shipmentDetails.includeOtherItems && (
                        <>
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Item Category</h4>
                            <p>{viewingShipment.metadata.shipmentDetails.category || 'Not specified'}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Specific Item</h4>
                            <p>{viewingShipment.metadata.shipmentDetails.specificItem || 'Not specified'}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                            <p>{viewingShipment.metadata.shipmentDetails.description || 'Not provided'}</p>
                          </div>
                        </>
                      )}
                      
                      {viewingShipment.metadata.shipmentDetails.doorToDoor && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-muted-foreground">Door to Door</h4>
                          <p>Yes</p>
                          
                          {viewingShipment.metadata.shipmentDetails.additionalAddresses && 
                           viewingShipment.metadata.shipmentDetails.additionalAddresses.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-sm font-medium">Additional Delivery Addresses:</h5>
                              <ul className="list-disc pl-5 text-sm">
                                {viewingShipment.metadata.shipmentDetails.additionalAddresses.map((addr: string, idx: number) => (
                                  <li key={idx}>{addr}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {viewingShipment.metadata.shipmentDetails.services && 
                       viewingShipment.metadata.shipmentDetails.services.length > 0 && (
                        <div className="space-y-1 col-span-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Additional Services</h4>
                          <ul className="list-disc pl-5">
                            {viewingShipment.metadata.shipmentDetails.services.map((service: any, idx: number) => (
                              <li key={idx}>{service.name} - £{service.price}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!viewingShipment.metadata?.shipmentDetails && viewingShipment.metadata?.shipment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground">Shipment Type</h4>
                        <p>{viewingShipment.metadata.shipment.type || 'Not specified'}</p>
                      </div>
                      
                      {viewingShipment.metadata.shipment.includeDrums && (
                        <>
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Drum Quantity</h4>
                            <p>{viewingShipment.metadata.shipment.quantity || 'Not specified'}</p>
                          </div>
                        </>
                      )}
                      
                      {viewingShipment.metadata.shipment.includeOtherItems && (
                        <>
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Item Category</h4>
                            <p>{viewingShipment.metadata.shipment.category || 'Not specified'}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                            <p>{viewingShipment.metadata.shipment.description || 'Not provided'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {!viewingShipment.metadata?.shipmentDetails && !viewingShipment.metadata?.shipment && (
                    <p className="text-gray-500">No detailed shipment information available</p>
                  )}
                </div>
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
                ) :
