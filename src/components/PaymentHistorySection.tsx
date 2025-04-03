
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CreditCard, DownloadCloud, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  receipt_url: string | null;
  created_at: string;
  shipment_id: string | null;
}

const PaymentHistorySection = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await (supabase
          .from('payments' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }) as any);

        if (error) throw error;

        if (data) {
          setPayments(data);
        }
      } catch (error: any) {
        console.error('Error fetching payment history:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="bg-zim-green/10 p-3 rounded-full">
            <CreditCard className="h-6 w-6 text-zim-green" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Payment History</CardTitle>
            <CardDescription>View your previous transactions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading payment history...</p>
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: payment.currency,
                      }).format(payment.amount)}
                    </TableCell>
                    <TableCell className="capitalize">{payment.payment_method.replace('_', ' ')}</TableCell>
                    <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                    <TableCell className="text-right">
                      {payment.receipt_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                          asChild
                        >
                          <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                            <DownloadCloud className="h-4 w-4 mr-1" />
                            Receipt
                          </a>
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">Not available</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10">
            <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No payment history found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistorySection;
