
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

// Icons
import { 
  Search, 
  Package, 
  RefreshCcw,
  Filter,
  ChevronDown,
  Edit,
  Eye,
  Mail,
  Plus,
  X,
  Check
} from 'lucide-react';

// Constants
const SHIPMENT_TYPES = ['Drums', 'Boxes', 'Documents', 'Electronics', 'Clothing', 'Other'];

const SHIPMENT_STATUS_OPTIONS = [
  'Booking Confirmed',
  'Ready for Pickup',
  'Processing in UK Warehouse',
  'Customs Clearance',
  'Processing in ZW Warehouse',
  'Out for Delivery',
  'Delivered',
  'Cancelled'
];

const PAYMENT_STATUS_OPTIONS = [
  'Pending Payment',
  'Paid',
  'Unpaid',
  'Partially Paid'
];

const ShipmentManagementTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State variables for tab management
  const [activeTab, setActiveTab] = useState('all');
  
  // State variables for data
  const [shipments, setShipments] = useState<any[]>([]);
  const [customQuotes, setCustomQuotes] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State variables for filtering and searching
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  
  // State variables for dialog management
  const [viewingShipment, setViewingShipment] = useState<any | null>(null);
  const [editingShipment, setEditingShipment] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [viewingHistory, setViewingHistory] = useState<any | null>(null);
  
  // State variables for quote management
  const [editingQuote, setEditingQuote] = useState<any | null>(null);
  const [quotedAmount, setQuotedAmount] = useState('');
  
  // Fetch data on component mount and tab change
  useEffect(() => {
    if (activeTab === 'all' || activeTab === 'status') {
      fetchShipments();
    } else if (activeTab === 'quotes') {
      fetchQuotes();
    }
  }, [activeTab]);
  
  // Fetch shipments from the database
  const fetchShipments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, profiles(email, full_name)')
        .order('created_at', { ascending: false });

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

  // Fetch custom quotes from the database
  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Custom quotes fetched:', data);
      setCustomQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom quotes: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch status history for a shipment
  const fetchStatusHistory = async (shipmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('status_updates')
        .select('*, profiles(full_name)')
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStatusHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching status history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load status history: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  // Update a shipment's status
  const updateShipmentStatus = async () => {
    if (!editingShipment || !newStatus) return;
    
    try {
      // Update the shipment's status
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingShipment.id);

      if (updateError) throw updateError;

      // Log the status change in status_updates table
      const { error: logError } = await supabase
        .from('status_updates')
        .insert({
          shipment_id: editingShipment.id,
          previous_status: editingShipment.status,
          new_status: newStatus,
          updated_by: user?.id,
          notes: statusNote,
          created_at: new Date().toISOString()
        });

      if (logError) throw logError;

      toast({
        title: 'Status Updated',
        description: `Shipment status updated to ${newStatus}.`,
      });

      // Refresh shipments data
      fetchShipments();
      
      // Reset state
      setEditingShipment(null);
      setNewStatus('');
      setStatusNote('');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  // Update quoted amount for a custom quote
  const updateQuotedAmount = async () => {
    if (!editingQuote || !quotedAmount) return;
    
    try {
      const amount = parseFloat(quotedAmount);
      if (isNaN(amount)) throw new Error('Invalid amount');
      
      const { error } = await supabase
        .from('custom_quotes')
        .update({
          quoted_amount: amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingQuote.id);

      if (error) throw error;

      toast({
        title: 'Quote Updated',
        description: `Quoted amount updated to £${amount}.`,
      });

      // Refresh quotes data
      fetchQuotes();
      
      // Reset state
      setEditingQuote(null);
      setQuotedAmount('');
    } catch (error: any) {
      console.error('Error updating quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quote: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  // Send quote email to customer
  const sendQuoteEmail = async (quote: any) => {
    try {
      // This would call an API or edge function to send an email
      // For demo purposes, just show success message
      toast({
        title: 'Quote Sent',
        description: `Quote sent to ${quote.sender_details?.email || quote.email}`,
      });
    } catch (error: any) {
      console.error('Error sending quote email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  // Convert custom quote to shipment
  const convertQuoteToShipment = async (quote: any) => {
    try {
      if (!quote.quoted_amount) {
        toast({
          title: 'Missing Quote Amount',
          description: 'Please provide a quoted amount before converting to shipment.',
          variant: 'destructive',
        });
        return;
      }
      
      // Generate a tracking number
      const trackingNumber = `ZIMSHIP-${Math.floor(10000 + Math.random() * 90000)}`;
      
      // Create shipment from quote data
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          tracking_number: trackingNumber,
          status: 'Booking Confirmed',
          origin: quote.sender_details?.address || 'Unknown',
          destination: quote.recipient_details?.address || 'Unknown',
          user_id: quote.user_id,
          metadata: {
            sender_details: quote.sender_details,
            recipient_details: quote.recipient_details,
            shipment_details: {
              type: quote.category || 'Other',
              specific_item: quote.specific_item,
              description: quote.description,
            },
            payment: {
              status: 'Pending Payment',
              basePrice: quote.quoted_amount
            }
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update quote status to converted
      const { error: updateError } = await supabase
        .from('custom_quotes')
        .update({
          status: 'converted',
          shipment_id: data.id
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      toast({
        title: 'Quote Converted',
        description: `Quote converted to shipment with tracking number ${trackingNumber}.`,
      });

      // Refresh quotes data
      fetchQuotes();
    } catch (error: any) {
      console.error('Error converting quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to convert quote: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter shipments based on search and filter criteria
  const filteredShipments = shipments.filter(shipment => {
    const metadata = shipment.metadata || {};
    const senderDetails = metadata.sender || metadata.senderDetails || {};
    const recipientDetails = metadata.recipient || metadata.recipientDetails || {};
    const paymentDetails = metadata.payment || {};
    
    const matchesSearch = 
      searchQuery === '' ||
      shipment.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      senderDetails.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      senderDetails.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      senderDetails.phone?.includes(searchQuery) ||
      recipientDetails.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipientDetails.phone?.includes(searchQuery) ||
      shipment.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    
    const matchesPaymentStatus = paymentStatusFilter === 'all' || 
      (paymentDetails.status?.toLowerCase() === paymentStatusFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  // Similarly filter quotes
  const filteredQuotes = customQuotes.filter(quote => {
    const matchesSearch = 
      searchQuery === '' ||
      quote.sender_details?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.sender_details?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.phone_number?.includes(searchQuery) ||
      quote.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.specific_item?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Helper function to get contact information
  const getContactInfo = (shipment: any) => {
    const metadata = shipment.metadata || {};
    const senderDetails = metadata.sender || metadata.senderDetails || {};
    const recipientDetails = metadata.recipient || metadata.recipientDetails || {};
    
    return {
      senderName: `${senderDetails.firstName || ''} ${senderDetails.lastName || ''}`.trim() || 'N/A',
      senderPhone: senderDetails.phone || 'N/A',
      senderAddress: shipment.origin || 'N/A',
      receiverName: recipientDetails.name || 'N/A',
      receiverPhone: recipientDetails.phone || 'N/A',
      receiverAddress: shipment.destination || 'N/A'
    };
  };

  // Helper function to get shipment details
  const getShipmentDetails = (shipment: any) => {
    const metadata = shipment.metadata || {};
    const shipmentDetails = metadata.shipment || metadata.shipmentDetails || {};
    const paymentDetails = metadata.payment || {};
    
    return {
      type: shipmentDetails.type || 'N/A',
      quantity: shipmentDetails.quantity,
      metalSeals: shipmentDetails.metalSeals,
      includeDrums: shipmentDetails.includeDrums,
      includeOtherItems: shipmentDetails.includeOtherItems,
      additionalContacts: metadata.additionalContacts || [],
      paymentStatus: paymentDetails.status || 'Unpaid',
      paymentAmount: paymentDetails.basePrice || 0,
      pickupZone: getPickupZone(shipment.origin)
    };
  };

  // Helper function to determine pickup zone based on address
  const getPickupZone = (address: string) => {
    if (!address) return 'Unknown';
    
    const addressLower = address.toLowerCase();
    
    if (addressLower.includes('london')) return 'London';
    if (addressLower.includes('manchester')) return 'Manchester';
    if (addressLower.includes('birmingham')) return 'Birmingham';
    if (addressLower.includes('leeds')) return 'Leeds';
    if (addressLower.includes('glasgow')) return 'Glasgow';
    if (addressLower.includes('liverpool')) return 'Liverpool';
    if (addressLower.includes('edinburgh')) return 'Edinburgh';
    if (addressLower.includes('sheffield')) return 'Sheffield';
    if (addressLower.includes('cardiff')) return 'Cardiff';
    
    return 'Other';
  };

  // Helper function to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Booking Confirmed':
        return <Badge className="bg-blue-100 text-blue-800">Booking Confirmed</Badge>;
      case 'Ready for Pickup':
        return <Badge className="bg-yellow-100 text-yellow-800">Ready for Pickup</Badge>;
      case 'Processing in UK Warehouse':
        return <Badge className="bg-purple-100 text-purple-800">UK Warehouse</Badge>;
      case 'Customs Clearance':
        return <Badge className="bg-orange-100 text-orange-800">Customs</Badge>;
      case 'Processing in ZW Warehouse':
        return <Badge className="bg-indigo-100 text-indigo-800">ZW Warehouse</Badge>;
      case 'Out for Delivery':
        return <Badge className="bg-cyan-100 text-cyan-800">Out for Delivery</Badge>;
      case 'Delivered':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'Cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Helper function to render payment status badge
  const renderPaymentBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'Pending Payment':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Payment</Badge>;
      case 'Partially Paid':
        return <Badge className="bg-blue-100 text-blue-800">Partially Paid</Badge>;
      case 'Unpaid':
        return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment Management</CardTitle>
        <CardDescription>
          Manage shipments, update statuses, and handle custom quotes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tabs Navigation */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="all">All Shipments</TabsTrigger>
            <TabsTrigger value="status">Update Status</TabsTrigger>
            <TabsTrigger value="quotes">Custom Quotes</TabsTrigger>
          </TabsList>
          
          {/* All Shipments Tab */}
          <TabsContent value="all">
            <div className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by tracking #, name, phone..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <span>Status</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {SHIPMENT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <span>Payment</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
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
                  <p className="text-muted-foreground">Try adjusting your filters or creating new shipments</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Tracking #</TableHead>
                          <TableHead>Sender</TableHead>
                          <TableHead>Receiver</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Pickup Zone</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShipments.map((shipment) => {
                          const contact = getContactInfo(shipment);
                          const details = getShipmentDetails(shipment);
                          
                          return (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-mono text-sm">
                                {shipment.tracking_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">{contact.senderName}</div>
                                <div className="text-xs text-muted-foreground">{contact.senderPhone}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">{contact.receiverName}</div>
                                <div className="text-xs text-muted-foreground">{contact.receiverPhone}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{details.type}</div>
                                {details.type === 'Drums' && details.quantity && (
                                  <div className="text-xs text-muted-foreground">
                                    Qty: {details.quantity}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {renderStatusBadge(shipment.status)}
                              </TableCell>
                              <TableCell>
                                {renderPaymentBadge(details.paymentStatus)}
                                <div className="text-xs text-muted-foreground mt-1">
                                  £{details.paymentAmount.toFixed(2)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{details.pickupZone}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setViewingShipment(shipment)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      setEditingShipment(shipment);
                                      setNewStatus(shipment.status);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      setViewingHistory(shipment);
                                      fetchStatusHistory(shipment.id);
                                    }}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </div>
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
            </div>
          </TabsContent>
          
          {/* Update Status Tab */}
          <TabsContent value="status">
            <div className="space-y-4">
              {/* Search Controls */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by tracking number..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <span>Status</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {SHIPMENT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" onClick={fetchShipments}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* Status Update Table */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No shipments found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or creating new shipments</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Tracking #</TableHead>
                          <TableHead>Sender</TableHead>
                          <TableHead>Receiver</TableHead>
                          <TableHead>Current Status</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShipments.map((shipment) => {
                          const contact = getContactInfo(shipment);
                          
                          return (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-mono text-sm">
                                {shipment.tracking_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">{contact.senderName}</div>
                                <div className="text-xs text-muted-foreground">{contact.senderPhone}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">{contact.receiverName}</div>
                                <div className="text-xs text-muted-foreground">{contact.receiverPhone}</div>
                              </TableCell>
                              <TableCell>
                                {renderStatusBadge(shipment.status)}
                              </TableCell>
                              <TableCell>
                                {format(new Date(shipment.updated_at), 'dd MMM yyyy HH:mm')}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => {
                                    setEditingShipment(shipment);
                                    setNewStatus(shipment.status);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                  Update Status
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
            </div>
          </TabsContent>
          
          {/* Custom Quotes Tab */}
          <TabsContent value="quotes">
            <div className="space-y-4">
              {/* Search Controls */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, description..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Button variant="outline" onClick={fetchQuotes}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              {/* Quotes Table */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredQuotes.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No custom quotes found</h3>
                  <p className="text-muted-foreground">No custom quote requests have been submitted</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Item Details</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Quoted Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuotes.map((quote) => {
                          const fullName = quote.sender_details ? 
                            `${quote.sender_details.firstName || ''} ${quote.sender_details.lastName || ''}`.trim() : 
                            'N/A';
                            
                          return (
                            <TableRow key={quote.id}>
                              <TableCell>{fullName}</TableCell>
                              <TableCell>{quote.phone_number}</TableCell>
                              <TableCell>
                                <div className="text-sm">{quote.category || 'N/A'}</div>
                                {quote.specific_item && (
                                  <div className="text-xs text-muted-foreground">{quote.specific_item}</div>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {quote.description}
                              </TableCell>
                              <TableCell>
                                {quote.quoted_amount ? (
                                  <div className="font-medium">£{quote.quoted_amount.toFixed(2)}</div>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingQuote(quote);
                                      setQuotedAmount('');
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Quote
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    quote.status === 'converted' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {quote.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {quote.quoted_amount && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => sendQuoteEmail(quote)}
                                        disabled={quote.status === 'converted'}
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => convertQuoteToShipment(quote)}
                                        disabled={quote.status === 'converted'}
                                      >
                                        <Package className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingQuote(quote);
                                      setQuotedAmount(quote.quoted_amount?.toString() || '');
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
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* View Shipment Details Dialog */}
      {viewingShipment && (
        <Dialog open={!!viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)}>
          <DialogContent className="max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Shipment Details</DialogTitle>
              <DialogDescription>
                Tracking Number: <span className="font-mono">{viewingShipment.tracking_number}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Sender Details</h3>
                <div className="space-y-1">
                  <div className="font-medium">{getContactInfo(viewingShipment).senderName}</div>
                  <div>{getContactInfo(viewingShipment).senderPhone}</div>
                  <div className="text-sm">{getContactInfo(viewingShipment).senderAddress}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Recipient Details</h3>
                <div className="space-y-1">
                  <div className="font-medium">{getContactInfo(viewingShipment).receiverName}</div>
                  <div>{getContactInfo(viewingShipment).receiverPhone}</div>
                  <div className="text-sm">{getContactInfo(viewingShipment).receiverAddress}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Shipment Details</h3>
                <div className="space-y-1">
                  <div>Type: {getShipmentDetails(viewingShipment).type}</div>
                  
                  {getShipmentDetails(viewingShipment).type === 'Drums' && (
                    <div>Quantity: {getShipmentDetails(viewingShipment).quantity || 'N/A'}</div>
                  )}
                  
                  {getShipmentDetails(viewingShipment).metalSeals && (
                    <div>Metal Seals: Yes</div>
                  )}
                  
                  <div>Pickup Zone: {getShipmentDetails(viewingShipment).pickupZone}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Payment Information</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    Status: {renderPaymentBadge(getShipmentDetails(viewingShipment).paymentStatus)}
                  </div>
                  <div>Amount: £{getShipmentDetails(viewingShipment).paymentAmount.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="col-span-2 space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Current Status</h3>
                <div className="flex items-center gap-2">
                  {renderStatusBadge(viewingShipment.status)}
                  <span className="text-sm text-muted-foreground">
                    Last updated: {format(new Date(viewingShipment.updated_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>
              
              {getShipmentDetails(viewingShipment).additionalContacts?.length > 0 && (
                <div className="col-span-2 space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Additional Contacts</h3>
                  <div className="space-y-2">
                    {getShipmentDetails(viewingShipment).additionalContacts.map((contact: any, index: number) => (
                      <div key={index} className="p-2 bg-muted rounded-md">
                        <div>{contact.address}</div>
                        {contact.phone && <div>{contact.phone}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setViewingHistory(viewingShipment);
                  fetchStatusHistory(viewingShipment.id);
                  setViewingShipment(null);
                }}
              >
                View History
              </Button>
              <Button 
                onClick={() => {
                  setEditingShipment(viewingShipment);
                  setNewStatus(viewingShipment.status);
                  setViewingShipment(null);
                }}
              >
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Shipment Status Dialog */}
      {editingShipment && (
        <Dialog open={!!editingShipment} onOpenChange={(open) => !open && setEditingShipment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Shipment Status</DialogTitle>
              <DialogDescription>
                Tracking Number: <span className="font-mono">{editingShipment.tracking_number}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Status</Label>
                <div>{renderStatusBadge(editingShipment.status)}</div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="new-status">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status-note">Notes (optional)</Label>
                <Textarea 
                  id="status-note"
                  placeholder="Add any additional notes about this status change"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingShipment(null)}>
                Cancel
              </Button>
              <Button onClick={updateShipmentStatus} disabled={newStatus === editingShipment.status}>
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Status History Dialog */}
      {viewingHistory && (
        <Dialog open={!!viewingHistory} onOpenChange={(open) => !open && setViewingHistory(null)}>
          <DialogContent className="max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Status History</DialogTitle>
              <DialogDescription>
                Tracking Number: <span className="font-mono">{viewingHistory.tracking_number}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-1 mb-4">
                <div className="text-sm text-muted-foreground">Current Status</div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge(viewingHistory.status)}
                  <span className="text-sm">
                    Updated: {format(new Date(viewingHistory.updated_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>
              
              <h3 className="font-medium mb-2">Status Change History</h3>
              
              {statusHistory.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No status change history available
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {statusHistory.map((update, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-4 py-2">
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(update.new_status)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(update.created_at), 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="text-sm mt-1">
                        Changed from: {update.previous_status}
                      </div>
                      <div className="text-sm mt-1">
                        Updated by: {update.profiles?.full_name || 'Admin'}
                      </div>
                      {update.notes && (
                        <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                          <div className="font-medium text-xs text-muted-foreground mb-1">Notes:</div>
                          {update.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button onClick={() => setViewingHistory(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Quote Dialog */}
      {editingQuote && (
        <Dialog open={!!editingQuote} onOpenChange={(open) => !open && setEditingQuote(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingQuote.quoted_amount ? 'Edit Quote' : 'Add Quote'}
              </DialogTitle>
              <DialogDescription>
                {editingQuote.category || 'Item'} quote for {editingQuote.sender_details?.firstName || ''} {editingQuote.sender_details?.lastName || ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Phone Number</div>
                    <div>{editingQuote.phone_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div>{editingQuote.sender_details?.email || 'N/A'}</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Item Description</div>
                <div>{editingQuote.description}</div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="quoted-amount">Quoted Amount (£)</Label>
                <Input
                  id="quoted-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={quotedAmount}
                  onChange={(e) => setQuotedAmount(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingQuote(null)}>
                Cancel
              </Button>
              <Button 
                onClick={updateQuotedAmount}
                disabled={!quotedAmount || isNaN(parseFloat(quotedAmount))}
              >
                {editingQuote.quoted_amount ? 'Update Quote' : 'Add Quote'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default ShipmentManagementTab;
