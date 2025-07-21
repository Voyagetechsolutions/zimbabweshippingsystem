
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
import { Search, RefreshCcw, Calendar, DollarSign, User } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface PaymentScheduleRecord {
  id: string;
  receipt_number: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  payment_schedule: Array<{
    date: string;
    amount: number;
  }>;
  total_amount: number;
  currency: string;
  created_at: string;
  status: string;
  shipment_id?: string;
  tracking_number?: string;
}

const PaymentScheduleManagement = () => {
  const [records, setRecords] = useState<PaymentScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentSchedules();
  }, []);

  const fetchPaymentSchedules = async () => {
    try {
      setLoading(true);
      
      // Fetch receipts where payment method is 'standard' and payLaterMethod is 'payLater'
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select(`
          *,
          shipments (
            id,
            tracking_number,
            metadata,
            profiles (
              full_name,
              email
            )
          )
        `)
        .eq('payment_method', 'standard')
        .not('payment_info->paymentSchedule', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const scheduleRecords: PaymentScheduleRecord[] = receipts
        .filter(receipt => {
          const paymentInfo = receipt.payment_info as any;
          return paymentInfo?.payLaterMethod === 'payLater' && 
                 paymentInfo?.paymentSchedule && 
                 Array.isArray(paymentInfo.paymentSchedule);
        })
        .map(receipt => {
          const senderDetails = receipt.sender_details as any;
          const paymentInfo = receipt.payment_info as any;
          const shipment = receipt.shipments as any;
          
          // Get name from multiple sources
          let senderName = 'N/A';
          
          // Priority 1: From receipt sender_details
          if (senderDetails?.name) {
            senderName = senderDetails.name;
          } else if (senderDetails?.firstName && senderDetails?.lastName) {
            senderName = `${senderDetails.firstName} ${senderDetails.lastName}`;
          }
          // Priority 2: From shipment metadata
          else if (shipment?.metadata?.sender?.name) {
            senderName = shipment.metadata.sender.name;
          } else if (shipment?.metadata?.sender?.firstName && shipment?.metadata?.sender?.lastName) {
            senderName = `${shipment.metadata.sender.firstName} ${shipment.metadata.sender.lastName}`;
          } else if (shipment?.metadata?.senderDetails?.name) {
            senderName = shipment.metadata.senderDetails.name;
          } else if (shipment?.metadata?.senderDetails?.firstName && shipment?.metadata?.senderDetails?.lastName) {
            senderName = `${shipment.metadata.senderDetails.firstName} ${shipment.metadata.senderDetails.lastName}`;
          }
          // Priority 3: From profiles table
          else if (shipment?.profiles?.full_name) {
            senderName = shipment.profiles.full_name;
          }
          
          // Get email from multiple sources
          let senderEmail = 'N/A';
          if (senderDetails?.email) {
            senderEmail = senderDetails.email;
          } else if (shipment?.metadata?.sender?.email) {
            senderEmail = shipment.metadata.sender.email;
          } else if (shipment?.metadata?.senderDetails?.email) {
            senderEmail = shipment.metadata.senderDetails.email;
          } else if (shipment?.profiles?.email) {
            senderEmail = shipment.profiles.email;
          }
          
          return {
            id: receipt.id,
            receipt_number: receipt.receipt_number || 'N/A',
            sender_name: senderName,
            sender_email: senderEmail,
            sender_phone: senderDetails?.phone || shipment?.metadata?.sender?.phone || shipment?.metadata?.senderDetails?.phone || 'N/A',
            payment_schedule: paymentInfo.paymentSchedule || [],
            total_amount: paymentInfo.finalAmount || receipt.amount || 0,
            currency: paymentInfo.currency || receipt.currency || 'GBP',
            created_at: receipt.created_at,
            status: receipt.status || 'pending',
            shipment_id: receipt.shipment_id,
            tracking_number: shipment?.tracking_number || 'N/A'
          };
        });

      setRecords(scheduleRecords);
    } catch (error: any) {
      console.error('Error fetching payment schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payment schedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const searchLower = searchQuery.toLowerCase();
    return (
      record.sender_name.toLowerCase().includes(searchLower) ||
      record.sender_email.toLowerCase().includes(searchLower) ||
      record.sender_phone.includes(searchQuery) ||
      record.receipt_number.toLowerCase().includes(searchLower) ||
      record.tracking_number.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const isPaymentOverdue = (dateString: string) => {
    const paymentDate = new Date(dateString);
    const today = new Date();
    return paymentDate < today;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            30-Day Payment Plans
          </CardTitle>
          <CardDescription>
            Track customers who selected "Pay within 30 days" payment option
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Input
                placeholder="Search by name, email, phone, receipt number, or tracking number..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button 
              variant="outline"
              onClick={fetchPaymentSchedules}
              className="h-10 px-4"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center p-12">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No payment schedules found</h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? "Try adjusting your search terms" 
                  : "No customers have selected the 30-day payment option yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Info</TableHead>
                    <TableHead>Contact Details</TableHead>
                    <TableHead>Payment Schedule</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking #</TableHead>
                    <TableHead>Receipt #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{record.sender_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div>{record.sender_phone}</div>
                          <div className="text-gray-500">{record.sender_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {record.payment_schedule.map((payment, index) => (
                            <div 
                              key={index} 
                              className={`text-sm flex justify-between items-center p-2 rounded ${
                                isPaymentOverdue(payment.date) 
                                  ? 'bg-red-50 text-red-700 border border-red-200' 
                                  : 'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <span className="font-medium">{format(new Date(payment.date), 'dd MMM yyyy')}</span>
                              <span className="font-semibold">
                                {formatCurrency(payment.amount, record.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-lg">
                          {formatCurrency(record.total_amount, record.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(record.status)}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{record.tracking_number}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{record.receipt_number}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredRecords.length} payment schedule{filteredRecords.length !== 1 ? 's' : ''} 
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentScheduleManagement;
