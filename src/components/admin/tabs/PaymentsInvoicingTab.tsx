
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCcw,
  Download,
  FileText,
  Edit,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

interface Payment {
  id: string;
  user_id: string | null;
  shipment_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  receipt_url: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
  shipments?: {
    tracking_number: string;
  } | null;
}

const PaymentsInvoicingTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, statusFilter, dateFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Fetch all payments with user and shipment information
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          profiles:user_id (email, full_name),
          shipments:shipment_id (tracking_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedPayments = (data as Payment[]) || [];
      setPayments(formattedPayments);
      
      // Set pending payments separately for easy access
      setPendingPayments(formattedPayments.filter(p => p.payment_status === 'pending'));
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    if (payments.length === 0) {
      setFilteredPayments([]);
      return;
    }

    let filtered = [...payments];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.profiles?.full_name?.toLowerCase().includes(query) ||
        payment.profiles?.email.toLowerCase().includes(query) ||
        payment.shipments?.tracking_number.toLowerCase().includes(query) ||
        (payment.transaction_id && payment.transaction_id.toLowerCase().includes(query))
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      if (dateFilter === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateFilter === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      
      filtered = filtered.filter(payment => new Date(payment.created_at) >= startDate);
    }
    
    setFilteredPayments(filtered);
  };

  const handlePaymentAction = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentMethod(payment.payment_method || 'Credit Card');
    setTransactionId(payment.transaction_id || '');
    setIsPaymentDialogOpen(true);
  };

  const markAsPaid = async () => {
    if (!selectedPayment) return;
    
    try {
      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'paid',
          payment_method: paymentMethod,
          transaction_id: transactionId || null
        })
        .eq('id', selectedPayment.id);
        
      if (updateError) throw updateError;
      
      // Create a receipt entry
      const { error: receiptError } = await supabase
        .from('receipts')
        .insert({
          payment_id: selectedPayment.id,
          shipment_id: selectedPayment.shipment_id,
          receipt_number: `RECEIPT-${Date.now().toString().substring(5)}`,
          payment_method: paymentMethod,
          amount: selectedPayment.amount,
          currency: selectedPayment.currency,
          status: 'completed',
          created_at: new Date().toISOString()
        });
        
      if (receiptError) throw receiptError;
      
      // Update notification for payment
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedPayment.user_id,
          title: 'Payment Confirmed',
          message: `Your payment of ${selectedPayment.currency} ${selectedPayment.amount} has been confirmed.`,
          type: 'payment_confirmation',
          related_id: selectedPayment.id
        });
      
      toast({
        title: 'Payment Updated',
        description: 'Payment has been marked as paid and receipt generated',
      });
      
      fetchPayments();
      setIsPaymentDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update payment',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Refunded</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>All Payments</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Pending Payments</span>
            {pendingPayments.length > 0 && (
              <Badge className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                {pendingPayments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Invoices & Receipts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>Manage and track all payment transactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Search by customer, tracking number, or transaction ID"
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="flex gap-4 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Payment Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[150px]">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Date" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={fetchPayments}
                    className="flex items-center gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No payments found</h3>
                  <p className="text-gray-500">
                    {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                      ? "Try adjusting your search filters"
                      : "No payment records available"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.profiles?.full_name || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">{payment.profiles?.email || 'No email'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {payment.shipments?.tracking_number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{payment.currency} {payment.amount.toFixed(2)}</div>
                          </TableCell>
                          <TableCell>{payment.payment_method || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {payment.transaction_id || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              {payment.payment_status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => handlePaymentAction(payment)}
                                >
                                  <Check className="h-4 w-4" />
                                  <span>Mark as Paid</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost" 
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => {
                                  // View receipt/details
                                  if (payment.receipt_url) {
                                    window.open(payment.receipt_url, '_blank');
                                  } else {
                                    toast({
                                      title: 'Receipt Not Available',
                                      description: 'No receipt has been generated for this payment yet'
                                    });
                                  }
                                }}
                              >
                                <FileText className="h-4 w-4" />
                                <span>Receipt</span>
                              </Button>
                            </div>
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
              <CardDescription>Review and process payments awaiting confirmation</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                </div>
              ) : pendingPayments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending payments</h3>
                  <p className="text-gray-500">All payments have been processed</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.profiles?.full_name || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">{payment.profiles?.email || 'No email'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {payment.shipments?.tracking_number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{payment.currency} {payment.amount.toFixed(2)}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="default"
                              size="sm"
                              className="bg-zim-green hover:bg-zim-green/90 flex items-center gap-1"
                              onClick={() => handlePaymentAction(payment)}
                            >
                              <Check className="h-4 w-4" />
                              <span>Mark as Paid</span>
                            </Button>
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

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices & Receipts</CardTitle>
              <CardDescription>Manage all invoice and receipt documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Receipt Management</h3>
                <p className="text-gray-500 mb-6">
                  View and download payment receipts for all transactions
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: 'Download Started',
                      description: 'Generating receipt archive for download'
                    });
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Download All Receipts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription>
              Enter payment details to confirm this transaction
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Amount</p>
                <p className="text-xl font-bold">{selectedPayment.currency} {selectedPayment.amount.toFixed(2)}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Customer</p>
                <p>{selectedPayment.profiles?.full_name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{selectedPayment.profiles?.email || 'No email'}</p>
              </div>
              
              {selectedPayment.shipments?.tracking_number && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Tracking Number</p>
                  <p className="font-mono">{selectedPayment.shipments.tracking_number}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="PayPal">PayPal</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                <Input
                  id="transactionId"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction reference"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-zim-green hover:bg-zim-green/90"
              onClick={markAsPaid}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsInvoicingTab;
