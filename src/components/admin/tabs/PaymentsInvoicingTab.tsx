import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  Download,
  FileText,
  Filter,
  Mail,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Send,
  Trash,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Helper function to safely extract profile information
const extractProfileInfo = (profiles: any) => {
  if (!profiles) return { full_name: "Unknown", email: "Unknown" };
  
  // If it's a SelectQueryError, return default values
  if (profiles.error === true) {
    return { full_name: "Unknown", email: "Unknown" };
  }
  
  // Otherwise, extract the actual data
  return {
    full_name: profiles.full_name || "Unknown",
    email: profiles.email || "Unknown Email"
  };
};

const PaymentsInvoicingTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentTab, setCurrentTab] = useState('payments');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payments data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, profiles:user_id(*), shipments:shipment_id(*)');

      if (paymentsError) {
        throw paymentsError;
      }

      setPayments(paymentsData || []);

      // We can fetch invoices or use the same data and filter differently
      // For demo, we'll just use payments as invoices too
      setInvoices(paymentsData || []);
    } catch (error) {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            {status}
          </Badge>
        );
    }
  };

  // Filter payments based on search query and status
  const filteredPayments = payments.filter((payment) => {
    const profileInfo = extractProfileInfo(payment.profiles);
    
    // Always true if no filter selected
    let matchesFilter = statusFilter === 'all' || payment.payment_status === statusFilter;

    // Check if searchQuery matches any of the fields
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (payment.transaction_id && payment.transaction_id.toLowerCase().includes(query)) ||
        profileInfo.full_name.toLowerCase().includes(query) ||
        profileInfo.email.toLowerCase().includes(query) ||
        (payment.shipment_id && payment.shipment_id.toLowerCase().includes(query)) ||
        payment.payment_method.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    }

    return matchesFilter;
  });

  // Filter invoices similarly
  const filteredInvoices = invoices.filter((invoice) => {
    // Similar filtering logic for invoices
    // For now, they're the same as payments
    return true;
  });

  return (
    <Tabs
      value={currentTab}
      onValueChange={setCurrentTab}
      className="w-full"
    >
      <TabsList className="mb-6 grid grid-cols-2">
        <TabsTrigger value="payments" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          <span>Payments</span>
        </TabsTrigger>
        <TabsTrigger value="invoices" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Invoices</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="payments">
        <Card>
          <CardHeader>
            <CardTitle>Payment Transactions</CardTitle>
            <CardDescription>
              Manage all payment transactions in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payments table */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          No payment records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => {
                        const profileInfo = extractProfileInfo(payment.profiles);
                        
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono">
                              {payment.transaction_id || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{profileInfo.full_name}</div>
                              <div className="text-gray-500 text-sm">{profileInfo.email}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{`${payment.currency} ${payment.amount}`}</div>
                            </TableCell>
                            <TableCell>
                              <div className="capitalize">{payment.payment_method}</div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(payment.payment_status)}
                            </TableCell>
                            <TableCell>
                              {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => {
                                    window.open(payment.receipt_url, '_blank');
                                  }}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Email Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Trash className="h-4 w-4 mr-2" />
                                    Delete Record
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 flex justify-between">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Payments
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="invoices">
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              Manage all invoices in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Invoices table with similar layout to payments */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                          No invoice records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice, index) => {
                        const invoiceNumber = `INV-${String(index + 1000).padStart(4, '0')}`;
                        const profileInfo = extractProfileInfo(invoice.profiles);
                        
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono">
                              {invoiceNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{profileInfo.full_name}</div>
                              <div className="text-gray-500 text-sm">{profileInfo.email}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{`${invoice.currency} ${invoice.amount}`}</div>
                            </TableCell>
                            <TableCell>
                              {invoice.payment_status === 'completed' ? (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  Paid
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  Unpaid
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Invoice
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send to Customer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {invoice.payment_status !== 'completed' && (
                                    <DropdownMenuItem>
                                      <DollarSign className="h-4 w-4 mr-2" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PaymentsInvoicingTab;
