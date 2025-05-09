
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { 
  Search, 
  Filter, 
  RefreshCcw, 
  Download, 
  Mail, 
  CreditCard,
  FileText, 
  FileMinus, 
  FilePlus
} from 'lucide-react';

// Define types for payment data
interface Payment {
  id: string;
  tracking_number: string;
  customer_name: string;
  customer_email: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

const PaymentsInvoicingTab = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // Simulated data - in a real app, this would come from the database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real implementation, you would fetch this data from your database
        // For demo purposes, we'll use mock data
        const mockPayments: Payment[] = [
          {
            id: 'p1',
            tracking_number: 'ZIMSHIP-12345',
            customer_name: 'Alice Moyo',
            customer_email: 'alice@example.com',
            payment_method: 'Cash on Collection',
            amount: 125,
            currency: 'GBP',
            status: 'Paid',
            created_at: '2025-05-07T14:30:00'
          },
          {
            id: 'p2',
            tracking_number: 'ZIMSHIP-23456',
            customer_name: 'Thomas Ncube',
            customer_email: 'thomas@example.com',
            payment_method: 'Standard Payment',
            amount: 240,
            currency: 'GBP',
            status: 'Paid',
            created_at: '2025-05-08T09:15:00'
          },
          {
            id: 'p3',
            tracking_number: 'ZIMSHIP-34567',
            customer_name: 'Grace Mutasa',
            customer_email: 'grace@example.com',
            payment_method: 'Cash on Delivery',
            amount: 85,
            currency: 'GBP',
            status: 'Pending',
            created_at: '2025-05-09T11:45:00'
          },
          {
            id: 'p4',
            tracking_number: 'ZIMSHIP-45678',
            customer_name: 'David Shumba',
            customer_email: 'david@example.com',
            payment_method: 'Standard Payment',
            amount: 180,
            currency: 'GBP',
            status: 'Failed',
            created_at: '2025-05-06T16:30:00'
          }
        ];

        // In production, you'd fetch from Supabase here
        // const { data: paymentsData, error: paymentsError } = await supabase
        //   .from('payments')
        //   .select('*');
        
        // if (paymentsError) throw paymentsError;
        
        setPayments(mockPayments);
      } catch (error) {
        console.error('Error fetching payment data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load payment data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchQuery === '' || 
      payment.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.customer_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPaymentMethod = paymentMethodFilter === 'all' || 
      payment.payment_method.toLowerCase() === paymentMethodFilter.toLowerCase();
    
    const matchesStatus = statusFilter === 'all' || 
      payment.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesPaymentMethod && matchesStatus;
  });

  const generateInvoice = (paymentId: string) => {
    toast({
      title: 'Invoice generated',
      description: 'The invoice has been generated and is ready to download',
    });
  };

  const emailInvoice = (paymentId: string, customerEmail: string) => {
    toast({
      title: 'Invoice sent',
      description: `The invoice has been emailed to ${customerEmail}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments & Invoicing</CardTitle>
        <CardDescription>Manage payments and generate invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Input
              placeholder="Search by tracking #, customer name or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <div className="flex flex-wrap gap-4">
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Payment method" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash on collection">Cash on Collection</SelectItem>
                <SelectItem value="standard payment">Standard Payment</SelectItem>
                <SelectItem value="cash on delivery">Cash on Delivery</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Payment status" />
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
            <Button 
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setPaymentMethodFilter('all');
                setStatusFilter('all');
              }}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center p-12">
            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments found</h3>
            <p className="text-gray-500">
              Try adjusting your filters to see more results
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono">{payment.tracking_number}</TableCell>
                    <TableCell>
                      <div>
                        <div>{payment.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{payment.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>{payment.currency} {payment.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => generateInvoice(payment.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Invoice
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => emailInvoice(payment.id, payment.customer_email)}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          <div>
            <p className="text-sm text-gray-500">
              Showing {filteredPayments.length} out of {payments.length} payments
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
            <Button variant="default">
              <FilePlus className="h-4 w-4 mr-2" />
              Generate Bulk Invoices
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentsInvoicingTab;
