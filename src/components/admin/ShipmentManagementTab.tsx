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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  User,
  Calendar
} from 'lucide-react';

// Import postal code utilities and collection schedule data
import { postalCodeToRouteMap } from '@/utils/postalCodeUtils';
import { getDateByRoute, collectionSchedules } from '@/data/collectionSchedule';

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

// Enhanced function to extract postal code from shipment data
function extractPostalCode(shipment: Shipment): string | null {
  console.log('Extracting postal code from shipment:', shipment.id);
  
  // Try to get postal code from metadata
  if (shipment.metadata && typeof shipment.metadata === 'object') {
    // Check sender details first
    if (shipment.metadata.senderDetails?.address) {
      const address = shipment.metadata.senderDetails.address;
      console.log('Checking senderDetails address:', address);
      
      // Extract UK postal code pattern (e.g., "NN1 1AA" or "NN11AA")
      const ukPostalCodeMatch = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b/i);
      if (ukPostalCodeMatch) {
        const postalCode = ukPostalCodeMatch[1].toUpperCase();
        console.log('Found postal code from senderDetails:', postalCode);
        return postalCode;
      }
      
      // Fallback: try to extract just the prefix (e.g., "NN")
      const prefixMatch = address.match(/\b([A-Z]{1,2})\d/i);
      if (prefixMatch) {
        const prefix = prefixMatch[1].toUpperCase();
        console.log('Found postal code prefix from senderDetails:', prefix);
        return prefix;
      }
    }
    
    // Check sender object
    if (shipment.metadata.sender?.address) {
      const address = shipment.metadata.sender.address;
      console.log('Checking sender address:', address);
      
      const ukPostalCodeMatch = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b/i);
      if (ukPostalCodeMatch) {
        const postalCode = ukPostalCodeMatch[1].toUpperCase();
        console.log('Found postal code from sender:', postalCode);
        return postalCode;
      }
      
      const prefixMatch = address.match(/\b([A-Z]{1,2})\d/i);
      if (prefixMatch) {
        const prefix = prefixMatch[1].toUpperCase();
        console.log('Found postal code prefix from sender:', prefix);
        return prefix;
      }
    }
    
    // Check if there's a direct postal code field
    if (shipment.metadata.postalCode) {
      const postalCode = shipment.metadata.postalCode.toString().toUpperCase();
      console.log('Found direct postal code:', postalCode);
      return postalCode;
    }
  }
  
  // Try to extract from origin field as fallback
  if (shipment.origin) {
    console.log('Checking origin field:', shipment.origin);
    const ukPostalCodeMatch = shipment.origin.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b/i);
    if (ukPostalCodeMatch) {
      const postalCode = ukPostalCodeMatch[1].toUpperCase();
      console.log('Found postal code from origin:', postalCode);
      return postalCode;
    }
    
    const prefixMatch = shipment.origin.match(/\b([A-Z]{1,2})\d/i);
    if (prefixMatch) {
      const prefix = prefixMatch[1].toUpperCase();
      console.log('Found postal code prefix from origin:', prefix);
      return prefix;
    }
  }
  
  console.log('No postal code found for shipment:', shipment.id);
  return null;
}

// Enhanced function to get collection route from postal code
function getCollectionRoute(postalCode: string | null): string {
  if (!postalCode) {
    console.log('No postal code provided, returning default route');
    return 'Standard Collection Route';
  }
  
  console.log('Getting route for postal code:', postalCode);
  
  // Extract the alphabetic prefix from postal code (e.g., "NN" from "NN1")
  const prefix = postalCode.match(/^[A-Z]+/);
  if (!prefix) {
    console.log('Could not extract prefix from postal code:', postalCode);
    return 'Standard Collection Route';
  }
  
  const prefixCode = prefix[0];
  console.log('Extracted prefix:', prefixCode);
  
  // Use the postal code to route mapping
  const route = postalCodeToRouteMap[prefixCode];
  console.log('Mapped route:', route);
  
  return route || 'Standard Collection Route';
}

// Enhanced function to get collection date from route
function getCollectionDate(route: string): string {
  if (route === 'Standard Collection Route') {
    console.log('Using default route, returning default date');
    return 'Next available collection date';
  }
  
  console.log('Getting date for route:', route);
  
  // Find the route in collection schedules
  const schedule = collectionSchedules.find(s => s.route === route);
  if (schedule) {
    console.log('Found schedule for route:', route, 'Date:', schedule.date);
    return schedule.date;
  }
  
  // Fallback to the getDateByRoute function
  const date = getDateByRoute(route);
  console.log('Fallback date from getDateByRoute:', date);
  
  return date === 'No date available' ? 'Next available collection date' : date;
}

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
  const [activeTab, setActiveTab] = useState('allShipments');
  const [customQuotes, setCustomQuotes] = useState<any[]>([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [deletingShipment, setDeletingShipment] = useState<Shipment | null>(null);
  const [selectedShipments, setSelectedShipments] = useState<string[]>([]);

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

  const handleViewShipment = (shipment: Shipment) => {
    setViewingShipment(shipment);
    setSelectedStatus(shipment.status);
  };

  const handleUpdateStatus = async () => {
    if (!viewingShipment || !selectedStatus) return;
    
    try {
      console.log(`Updating shipment status for ID: ${viewingShipment.id} to "${selectedStatus}"`);
      
      // Update the shipment status
      const { error } = await supabase
        .from('shipments')
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', viewingShipment.id);

      if (error) {
        console.error('Error in Supabase update:', error);
        throw error;
      }

      toast({
        title: 'Status Updated',
        description: `Shipment ${viewingShipment.tracking_number} status updated to ${selectedStatus}`,
      });

      // Update the local state to reflect the change
      setShipments(shipments.map(s => 
        s.id === viewingShipment.id 
          ? {...s, status: selectedStatus, updated_at: new Date().toISOString()} 
          : s
      ));
      
      // Update the viewing shipment with the new status
      setViewingShipment({
        ...viewingShipment,
        status: selectedStatus,
        updated_at: new Date().toISOString()
      });

      // Reset state
      setEditingStatus(false);
      setStatusNote('');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteShipment = async () => {
    if (!deletingShipment) return;
    
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', deletingShipment.id);

      if (error) throw error;

      toast({
        title: 'Shipment Deleted',
        description: `Shipment ${deletingShipment.tracking_number} has been deleted successfully`,
      });

      // Remove from local state
      setShipments(shipments.filter(s => s.id !== deletingShipment.id));
      
      // Close dialogs
      setDeletingShipment(null);
      setViewingShipment(null);
    } catch (error: any) {
      console.error('Error deleting shipment:', error);
      toast({
        title: 'Error',
        description: `Failed to delete shipment: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSelectedShipments = async () => {
    if (selectedShipments.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .in('id', selectedShipments);

      if (error) throw error;

      toast({
        title: 'Shipments Deleted',
        description: `${selectedShipments.length} shipment(s) have been deleted successfully`,
      });

      // Remove from local state
      setShipments(shipments.filter(s => !selectedShipments.includes(s.id)));
      setSelectedShipments([]);
      
    } catch (error: any) {
      console.error('Error deleting shipments:', error);
      toast({
        title: 'Error',
        description: `Failed to delete shipments: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleSelectShipment = (shipmentId: string) => {
    setSelectedShipments(prev => 
      prev.includes(shipmentId) 
        ? prev.filter(id => id !== shipmentId)
        : [...prev, shipmentId]
    );
  };

  const handleSelectAllShipments = () => {
    if (selectedShipments.length === filteredShipments.length) {
      setSelectedShipments([]);
    } else {
      setSelectedShipments(filteredShipments.map(s => s.id));
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
  
  // Enhanced function to extract sender's name from metadata with improved fallbacks
  const getSenderName = (shipment: Shipment): string => {
    if (!shipment || !shipment.metadata) {
      return 'No Name Provided';
    }
    
    const metadata = shipment.metadata;
    
    // First check sender which is our primary path after refactoring
    if (metadata.sender) {
      if (metadata.sender.name) {
        return metadata.sender.name;
      }
      if (metadata.sender.firstName && metadata.sender.lastName) {
        return `${metadata.sender.firstName} ${metadata.sender.lastName}`;
      }
    }
    
    // Check senderDetails which is our secondary path
    if (metadata.senderDetails) {
      if (metadata.senderDetails.firstName && metadata.senderDetails.lastName) {
        return `${metadata.senderDetails.firstName} ${metadata.senderDetails.lastName}`;
      }
      if (metadata.senderDetails.name) {
        return metadata.senderDetails.name;
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
    
    if (metadata.sender?.email) {
      return metadata.sender.email;
    }
    
    if (metadata.senderDetails?.email) {
      return metadata.senderDetails.email;
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
    
    if (metadata.sender?.phone) {
      return metadata.sender.phone;
    }
    
    if (metadata.senderDetails?.phone) {
      return metadata.senderDetails.phone;
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
    
    if (metadata.recipient?.name) {
      return metadata.recipient.name;
    }
    
    if (metadata.recipientDetails?.name) {
      return metadata.recipientDetails.name;
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
    
    if (metadata.recipient?.phone) {
      return metadata.recipient.phone;
    }
    
    if (metadata.recipientDetails?.phone) {
      return metadata.recipientDetails.phone;
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

  // Fixed function to get collection information from postal code
  const getCollectionInfo = (shipment: Shipment) => {
    // Extract postal code from the shipment
    const postalCode = extractPostalCode(shipment);
    console.log('Postal code extracted for collection info:', postalCode);
    
    // Get the collection route based on postal code
    const route = getCollectionRoute(postalCode);
    console.log('Collection route determined:', route);
    
    // Get the collection date based on the route
    const date = getCollectionDate(route);
    console.log('Collection date determined:', date);
    
    // Determine if it's scheduled (not just booking confirmed)
    const scheduled = shipment.status !== 'Booking Confirmed';
    
    // Determine if collection is completed (advanced statuses)
    const completed = ['Processing in UK Warehouse', 'Customs Clearance', 'Processing in ZW Warehouse', 'Out for Delivery', 'Delivered'].includes(shipment.status);
    
    // Get notes from metadata or provide default
    const metadata = shipment.metadata || {};
    const notes = metadata.collectionNotes || 
                  metadata.specialInstructions ||
                  metadata.notes ||
                  'Standard collection procedure';
    
    return {
      route: route,
      date: date,
      scheduled: scheduled,
      completed: completed,
      notes: notes,
      postalCode: postalCode
    };
  };
  
  // Enhanced function to get payment amount from metadata
  const getPaymentAmount = (shipment: Shipment): string => {
    const metadata = shipment.metadata || {};
    
    // Check various places where payment amount might be stored
    if (metadata.payment?.amount) {
      return `£${metadata.payment.amount}`;
    } else if (metadata.paymentAmount) {
      return `£${metadata.paymentAmount}`;
    } else if (metadata.amount) {
      return `£${metadata.amount}`;
    } else if (metadata.totalAmount) {
      return `£${metadata.totalAmount}`;
    } else if (metadata.total) {
      return `£${metadata.total}`;
    } else if (metadata.pricing?.total) {
      return `£${metadata.pricing.total}`;
    } else if (metadata.cost) {
      return `£${metadata.cost}`;
    } else if (metadata.price) {
      return `£${metadata.price}`;
    } else if (metadata.quotedAmount) {
      return `£${metadata.quotedAmount}`;
    }
    
    return 'Amount to be confirmed';
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

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={selectedShipments.length === 0}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete ({selectedShipments.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Shipments</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedShipments.length} selected shipment(s)? 
                    This action cannot be undone and will permanently remove all shipment data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteSelectedShipments}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedShipments.length === filteredShipments.length && filteredShipments.length > 0}
                        onChange={handleSelectAllShipments}
                        className="rounded"
                      />
                    </TableHead>
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
                  {filteredShipments.map(shipment => (
                    <TableRow key={shipment.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedShipments.includes(shipment.id)}
                          onChange={() => handleSelectShipment(shipment.id)}
                          className="rounded"
                        />
                      </TableCell>
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
          {selectedShipments.length > 0 && (
            <span className="ml-2 font-medium">
              • {selectedShipments.length} selected
            </span>
          )}
        </div>
      </CardContent>

      {/* Enhanced View Shipment Details Dialog */}
      <Dialog open={!!viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)}>
        <DialogContent className="w-full h-full max-w-none max-h-none m-0 rounded-none sm:max-w-[900px] sm:h-auto sm:max-h-[90vh] sm:m-6 sm:rounded-lg">
          <div className="flex flex-col h-full">
            <DialogHeader className="flex-shrink-0 p-4 sm:p-6 border-b">
              <DialogTitle className="text-lg sm:text-xl">Shipment Details</DialogTitle>
              <DialogDescription className="break-all">
                Tracking Number: {viewingShipment?.tracking_number}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {viewingShipment && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Shipment Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Origin</h3>
                      <p className="break-words">{viewingShipment.origin || 'Not specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Destination</h3>
                      <p className="break-words">{viewingShipment.destination || 'Not specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                      <p>{format(new Date(viewingShipment.created_at), 'dd MMM yyyy HH:mm')}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Updated At</h3>
                      <p>{format(new Date(viewingShipment.updated_at), 'dd MMM yyyy HH:mm')}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Payment Amount</h3>
                      <p className="font-semibold text-green-600">{getPaymentAmount(viewingShipment)}</p>
                    </div>
                  </div>
                  
                  {/* Contact Details */}
                  <div>
                    <h3 className="text-base sm:text-lg font-medium mb-3">Contact Details</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-md">
                      <div className="space-y-3">
                        <h4 className="font-medium">Sender</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <User className="h-4 w-4 mt-1 mr-2 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium break-words">{getSenderName(viewingShipment)}</p>
                              <p className="text-sm text-gray-500 break-words">{getSenderEmail(viewingShipment)}</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Phone className="h-4 w-4 mt-1 mr-2 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="break-words">{getSenderPhone(viewingShipment)}</p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mt-1 mr-2 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm break-words">
                                {getPickupAddress(viewingShipment)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium">Receiver</h4>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <User className="h-4 w-4 mt-1 mr-2 text-gray-500 flex-shrink-0" />
                            <p className="font-medium break-words">{getReceiverName(viewingShipment)}</p>
                          </div>
                          <div className="flex items-start">
                            <Phone className="h-4 w-4 mt-1 mr-2 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="break-words">{getReceiverPhone(viewingShipment)}</p>
                              {viewingShipment.metadata?.additionalRecipientPhone && (
                                <p className="text-sm text-gray-500 break-words">Additional: {viewingShipment.metadata.additionalRecipientPhone}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mt-1 mr-2 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm break-words">
                                {getDeliveryAddress(viewingShipment)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Section */}
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-medium">Status</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <Badge variant="outline">{viewingShipment.status}</Badge>
                      {!editingStatus ? (
                        <Button variant="ghost" size="sm" onClick={() => setEditingStatus(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Status
                        </Button>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-full sm:w-[180px]">
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
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleUpdateStatus}>
                              Update
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingStatus(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {editingStatus && (
                      <div className="mt-2">
                        <Label htmlFor="statusNote">Add a note (optional)</Label>
                        <Textarea 
                          id="statusNote"
                          value={statusNote} 
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="Add a note about this status change"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Collection Information */}
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-medium">Collection Information</h3>
                    {(() => {
                      const collectionInfo = getCollectionInfo(viewingShipment);
                      return (
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-md">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium text-muted-foreground">Collection Route</h4>
                              <p className="font-medium break-words">{collectionInfo.route}</p>
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium text-muted-foreground">Collection Date</h4>
                              <p className="font-medium break-words">{collectionInfo.date}</p>
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
                              <div className="flex items-center">
                                <Badge variant={collectionInfo.scheduled ? "default" : "secondary"}>
                                  {collectionInfo.scheduled ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-medium text-muted-foreground">Collection Status</h4>
                              <div className="flex items-center">
                                <Badge variant={collectionInfo.completed ? "default" : "outline"}>
                                  {collectionInfo.completed ? 'Completed' : 'Pending'}
                                </Badge>
                              </div>
                            </div>
                            {collectionInfo.postalCode && (
                              <div className="space-y-1">
                                <h4 className="text-sm font-medium text-muted-foreground">Postal Code</h4>
                                <p className="text-sm bg-white dark:bg-gray-700 p-2 rounded border break-words">{collectionInfo.postalCode}</p>
                              </div>
                            )}
                            <div className="space-y-1 sm:col-span-2">
                              <h4 className="text-sm font-medium text-muted-foreground">Collection Notes</h4>
                              <p className="text-sm bg-white dark:bg-gray-700 p-2 rounded border break-words">{collectionInfo.notes}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 p-4 sm:p-6 border-t">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={() => setViewingShipment(null)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full sm:w-auto"
                      onClick={() => setDeletingShipment(viewingShipment)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Shipment
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete shipment {viewingShipment?.tracking_number}? 
                        This action cannot be undone and will permanently remove all shipment data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingShipment(null)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteShipment}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ShipmentManagementTab;
