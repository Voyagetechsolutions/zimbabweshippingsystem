
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { 
  CreditCard, 
  Search, 
  MoreHorizontal, 
  User,
  Package,
  FileText,
  RefreshCw,
  CheckCircle,
  PoundSterling,
  Filter,
  Receipt,
  Loader2,
  Check,
  FileDown
} from 'lucide-react';
import { Label } from '@/components/ui/label';

interface Payment {
  id: string;
  shipment_id: string | null;
  user_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  receipt_url: string | null;
  created_at: string;
  shipment?: {
    tracking_number: string;
    status: string;
  };
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface PaymentFormData {
  shipment_id: string;
  amount: string;
  currency: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string;
  receipt_url: string;
}

// Type guard to check if a value is a valid object
function isValidObject(obj: any): obj is Record<string, any> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

const PaymentsInvoicingTab = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingShipments, setPendingShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('payments');
  
  // State for recording payment
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    shipment_id: '',
    amount: '',
    currency: 'GBP',
    payment_method: 'bank_transfer',
    payment_status: 'completed',
    transaction_id: '',
    receipt_url: ''
  });
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payments with related shipment and customer data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, shipment:shipment_id(tracking_number, status), profiles:user_id(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (paymentsError) throw paymentsError;
      
      // Process the payment data to ensure correct typing
      const processedPayments: Payment[] = (paymentsData || []).map(payment => {
        // Process profiles to ensure it matches the expected format
        let profilesData: { full_name: string | null; email: string } | undefined;
        
        if (payment.profiles) {
          if (typeof payment.profiles === 'object' && payment.profiles !== null) {
            // If profiles is an object (expected case)
            profilesData = {
              full_name: (payment.profiles as any).full_name || null,
              email: (payment.profiles as any).email || 'No email'
            };
          } else {
            // Handle unexpected cases
            profilesData = {
              full_name: null,
              email: 'Unknown email'
            };
          }
        }
        
        return {
          ...payment,
          profiles: profilesData
        };
      });
      
      setPayments(processedPayments);
      
      // Fetch shipments without payments (pending payment)
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select(`
          id,
          tracking_number,
          status,
          user_id,
          origin,
          destination,
          created_at,
          metadata,
          profiles:user_id(full_name, email)
        `)
        .in('status', ['Booking Confirmed'])
        .order('created_at', { ascending: false });
      
      if (shipmentsError) throw shipmentsError;
      
      // Filter out shipments that already have payments
      if (paymentsData && shipmentsData) {
        const shipmentIdsWithPayments = new Set(
          paymentsData
            .filter(p => p.shipment_id)
            .map(p => p.shipment_id)
        );
        
        const shipmentsWithoutPayments = shipmentsData.filter(
          s => !shipmentIdsWithPayments.has(s.id)
        );
        
        setPendingShipments(shipmentsWithoutPayments);
      } else {
        setPendingShipments(shipmentsData || []);
      }
      
    } catch (error: any) {
      console.error('Error fetching payment data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentForm = (shipment: any) => {
    setSelectedShipment(shipment);
    
    // Calculate price from metadata if possible
    let calculatedAmount = '';
    if (shipment.metadata && isValidObject(shipment.metadata)) {
      const payment = shipment.metadata.payment;
      if (payment && isValidObject(payment) && payment.basePrice) {
        calculatedAmount = String(payment.basePrice);
      }
    }
    
    setPaymentForm({
      shipment_id: shipment.id,
      amount: calculatedAmount,
      currency: 'GBP',
      payment_method: 'bank_transfer',
      payment_status: 'completed',
      transaction_id: '',
      receipt_url: ''
    });
    
    setShowPaymentForm(true);
  };

  const recordPayment = async () => {
    if (!selectedShipment) return;
    
    // Validate form
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          shipment_id: selectedShipment.id,
          user_id: selectedShipment.user_id,
          amount: parseFloat(paymentForm.amount),
          currency: paymentForm.currency,
          payment_method: paymentForm.payment_method,
          payment_status: paymentForm.payment_status,
          transaction_id: paymentForm.transaction_id || null,
          receipt_url: paymentForm.receipt_url || null
        })
        .select('*, shipment:shipment_id(tracking_number, status), profiles:user_id(full_name, email)')
        .single();
      
      if (paymentError) throw paymentError;
      
      // Update shipment status if needed
      if (selectedShipment.status === 'Booking Confirmed') {
        const { error: shipmentError } = await supabase
          .from('shipments')
          .update({ 
            status: 'Ready for Pickup',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedShipment.id);
        
        if (shipmentError) throw shipmentError;
      }
      
      // Create receipt
      const { error: receiptError } = await supabase
        .from('receipts')
        .insert({
          payment_id: paymentData.id,
          shipment_id: selectedShipment.id,
          user_id: selectedShipment.user_id,
          amount: parseFloat(paymentForm.amount),
          currency: paymentForm.currency,
          payment_method: paymentForm.payment_method,
          status: 'paid',
          receipt_number: `REC-${Date.now().toString().slice(-6)}`,
          sender_details: selectedShipment.metadata?.sender || selectedShipment.metadata?.senderDetails || {},
          recipient_details: selectedShipment.metadata?.recipient || selectedShipment.metadata?.recipientDetails || {},
          shipment_details: selectedShipment.metadata?.shipment || selectedShipment.metadata?.shipmentDetails || {},
          collection_info: selectedShipment.metadata?.collection || selectedShipment.metadata?.collectionDetails || {},
          payment_info: {
            method: paymentForm.payment_method,
            transaction_id: paymentForm.transaction_id,
            date: new Date().toISOString()
          }
        });
      
      if (receiptError) {
        console.error('Error creating receipt:', receiptError);
        // Continue even if receipt creation fails
      }
      
      // Create a properly formatted payment object
      const newPayment: Payment = {
        ...paymentData,
        profiles: paymentData.profiles ? {
          full_name: paymentData.profiles.full_name || null,
          email: paymentData.profiles.email || 'No email'
        } : undefined
      };
      
      // Update local state
      setPayments(prev => [newPayment, ...prev]);
      setPendingShipments(prev => prev.filter(s => s.id !== selectedShipment.id));
      
      // Close dialog and show success message
      setShowPaymentForm(false);
      setSelectedShipment(null);
      
      toast({
        title: 'Payment Recorded',
        description: `Payment of ${paymentForm.currency} ${paymentForm.amount} has been recorded for shipment ${selectedShipment.tracking_number}`,
      });
      
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter payments based on search query and status filter
  const filteredPayments = payments.filter(payment => {
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchLower)) ||
      (payment.shipment?.tracking_number && payment.shipment.tracking_number.toLowerCase().includes(searchLower)) ||
      (payment.profiles?.full_name && payment.profiles.full_name.toLowerCase().includes(searchLower)) ||
      (payment.profiles?.email && payment.profiles.email.toLowerCase().includes(searchLower));
    
    return matchesStatus && matchesSearch;
  });

  // Format amount with currency symbol
  const formatAmount = (amount: number, currency: string) => {
    let symbol = '£';
    if (currency === 'USD') symbol = '$';
    else if (currency === 'EUR') symbol = '€';
    
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Get payment status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6 grid w-full grid-cols-2">
        <TabsTrigger value="payments" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          <span>Payment Records</span>
        </TabsTrigger>
        <TabsTrigger value="pending" className="flex items-center gap-2">
          <PoundSterling className="h-4 w-4" />
          <span>Pending Payments</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="payments">
        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
            <CardDescription>
              View all payment transactions for shipments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by tracking #, transaction ID or customer..."
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
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  onClick={fetchData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button
                  onClick={() => {
                    // Export payments data
                    if (filteredPayments.length === 0) {
                      toast({
                        title: 'No data to export',
                        variant: 'destructive'
                      });
                      return;
                    }
                    
                    // Format data for CSV
                    const exportData = filteredPayments.map(payment => ({
                      Date: format(new Date(payment.created_at), 'yyyy-MM-dd'),
                      Amount: `${payment.amount}`,
                      Currency: payment.currency,
                      Method: payment.payment_method,
                      Status: payment.payment_status,
                      'Transaction ID': payment.transaction_id || '',
                      'Tracking Number': payment.shipment?.tracking_number || '',
                      Customer: payment.profiles?.full_name || payment.profiles?.email || ''
                    }));
                    
                    // Convert to CSV
                    const headers = Object.keys(exportData[0]);
                    const csv = [
                      headers.join(','),
                      ...exportData.map(row => 
                        headers.map(header => 
                          JSON.stringify((row as any)[header] || '')
                        ).join(',')
                      )
                    ].join('\n');
                    
                    // Create download link
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `payments_export_${format(new Date(), 'yyyyMMdd')}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    toast({
                      title: 'Export successful',
                      description: `Exported ${filteredPayments.length} payment records`
                    });
                  }}
                  disabled={filteredPayments.length === 0}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center p-12">
                <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No payments found</h3>
                <p className="text-gray-500">
                  {searchQuery || statusFilter !== 'all' ? 
                    "Try adjusting your filter criteria" : 
                    "There are no payment records in the system yet"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shipment</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {payment.profiles?.full_name || "Unnamed Customer"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.profiles?.email || "No email"}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.payment_status)}
                        </TableCell>
                        <TableCell>
                          {payment.shipment ? (
                            <div>
                              <div className="font-mono text-xs">
                                {payment.shipment.tracking_number}
                              </div>
                              <Badge variant="outline" className="mt-1">
                                {payment.shipment.status}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-gray-500">No shipment</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {payment.transaction_id || "N/A"}
                        </TableCell>
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
                              <DropdownMenuItem>
                                <Receipt className="h-4 w-4 mr-2" />
                                View Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!payment.receipt_url}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Download Receipt
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                disabled={payment.payment_status !== 'completed'}
                                className="text-red-600"
                              >
                                Issue Refund
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
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pending">
        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
            <CardDescription>
              Shipments awaiting payment confirmation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : pendingShipments.length === 0 ? (
              <div className="text-center p-12">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">All payments are up to date</h3>
                <p className="text-gray-500">
                  There are no shipments pending payment
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingShipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono">
                          {shipment.tracking_number}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {shipment.profiles?.full_name || "Unnamed Customer"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {shipment.profiles?.email || "No email"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {shipment.origin}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {shipment.destination}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm"
                            onClick={() => handleOpenPaymentForm(shipment)}
                          >
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          
          {/* Record Payment Dialog */}
          <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Enter payment details for shipment {selectedShipment?.tracking_number}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <div className="flex items-center mt-1">
                      <span className="bg-gray-100 px-3 py-2 border-y border-l border-gray-300 rounded-l-md">
                        {paymentForm.currency === 'GBP' && '£'}
                        {paymentForm.currency === 'USD' && '$'}
                        {paymentForm.currency === 'EUR' && '€'}
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={paymentForm.currency}
                      onValueChange={(value) => setPaymentForm({...paymentForm, currency: value})}
                    >
                      <SelectTrigger id="currency" className="mt-1">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(value) => setPaymentForm({...paymentForm, payment_method: value})}
                  >
                    <SelectTrigger id="payment_method" className="mt-1">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card_payment">Card Payment</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select
                    value={paymentForm.payment_status}
                    onValueChange={(value) => setPaymentForm({...paymentForm, payment_status: value})}
                  >
                    <SelectTrigger id="payment_status" className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="transaction_id">Transaction ID (Optional)</Label>
                  <Input
                    id="transaction_id"
                    placeholder="e.g. TXN-12345"
                    value={paymentForm.transaction_id}
                    onChange={(e) => setPaymentForm({...paymentForm, transaction_id: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="receipt_url">Receipt URL (Optional)</Label>
                  <Input
                    id="receipt_url"
                    placeholder="e.g. https://example.com/receipt.pdf"
                    value={paymentForm.receipt_url}
                    onChange={(e) => setPaymentForm({...paymentForm, receipt_url: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={recordPayment}
                  disabled={isSubmitting || !paymentForm.amount}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PaymentsInvoicingTab;
