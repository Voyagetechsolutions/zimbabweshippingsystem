
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  Search,
  RefreshCcw,
  Filter,
  CreditCard,
  Check,
  X,
  AlertCircle,
  Download,
  CheckCircle,
  Receipt,
  UserCheck,
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  transaction_id: string | null;
  receipt_url: string | null;
  user_id: string | null;
  shipment_id: string | null;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
  shipments?: {
    tracking_number: string;
    status: string;
  } | null;
}

const PaymentsInvoicingTab = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, statusFilter, activeTab]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Enhance payments with related data
      const enhancedPayments = await Promise.all((paymentsData || []).map(async (payment) => {
        let profileData = null;
        let shipmentData = null;
        
        // Get profile data
        if (payment.user_id) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', payment.user_id)
            .single();
            
          if (!profileError) {
            profileData = profile;
          }
        }
        
        // Get shipment data
        if (payment.shipment_id) {
          const { data: shipment, error: shipmentError } = await supabase
            .from('shipments')
            .select('tracking_number, status')
            .eq('id', payment.shipment_id)
            .single();
            
          if (!shipmentError) {
            shipmentData = shipment;
          }
        }
        
        return {
          ...payment,
          profiles: profileData,
          shipments: shipmentData
        };
      }));

      setPayments(enhancedPayments as Payment[]);
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
    let filtered = [...payments];

    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(p => p.payment_status?.toLowerCase() === 'pending');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(p => p.payment_status?.toLowerCase() === 'completed');
    } else if (activeTab === 'failed') {
      filtered = filtered.filter(p => p.payment_status?.toLowerCase() === 'failed');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.transaction_id?.toLowerCase().includes(query) ||
        payment.shipments?.tracking_number?.toLowerCase().includes(query) ||
        payment.profiles?.email?.toLowerCase().includes(query) ||
        payment.profiles?.full_name?.toLowerCase().includes(query) ||
        payment.payment_method?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_status?.toLowerCase() === statusFilter.toLowerCase());
    }

    setFilteredPayments(filtered);
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: newStatus })
        .eq('id', paymentId);
        
      if (error) throw error;
      
      // Update local state
      setPayments(payments.map(payment => 
        payment.id === paymentId ? { ...payment, payment_status: newStatus } : payment
      ));
      
      toast({
        title: 'Payment Updated',
        description: `Payment status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment status',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Refunded</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>All Payments</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Pending</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Completed</span>
          </TabsTrigger>
          <TabsTrigger value="failed" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            <span>Failed</span>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle>Payments & Invoicing</CardTitle>
            <CardDescription>Manage all payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Input
                  placeholder="Search by transaction ID, customer or shipment..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Payment status" />
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
                  onClick={fetchPayments}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
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
                  {searchQuery || statusFilter !== 'all' 
                    ? "Try adjusting your search filters" 
                    : "No payment records available"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Shipment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">
                          {payment.transaction_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {payment.profiles ? (
                            <div>
                              <div className="font-medium">{payment.profiles.full_name || 'Unnamed'}</div>
                              <div className="text-xs text-muted-foreground">{payment.profiles.email}</div>
                            </div>
                          ) : (
                            "No customer data"
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.shipments ? (
                            <div className="font-mono">{payment.shipments.tracking_number}</div>
                          ) : (
                            "No shipment"
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.currency} {payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {payment.payment_method || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.payment_status)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {payment.payment_status?.toLowerCase() === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updatePaymentStatus(payment.id, 'Completed')}
                                className="flex items-center gap-1"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span className="hidden md:inline">Mark Paid</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (payment.receipt_url) {
                                  window.open(payment.receipt_url, '_blank');
                                } else {
                                  // Navigate to generate receipt page
                                  window.location.href = `/receipt/${payment.id}`;
                                }
                              }}
                              className="flex items-center gap-1"
                            >
                              <Receipt className="h-4 w-4" />
                              <span className="hidden md:inline">Receipt</span>
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
      </Tabs>
    </div>
  );
};

export default PaymentsInvoicingTab;
