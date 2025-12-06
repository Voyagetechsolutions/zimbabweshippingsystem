
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
import { Search, RefreshCcw, Calendar, DollarSign, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface PaymentInstallment {
  id: string;
  date: string;
  amount: number;
  paid: boolean;
  paidAmount?: number;
  paidDate?: string;
}

interface PaymentScheduleRecord {
  id: string;
  receipt_number: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  payment_schedule: PaymentInstallment[];
  total_amount: number;
  total_paid: number;
  remaining_balance: number;
  currency: string;
  created_at: string;
  status: string;
  shipment_id?: string;
  tracking_number?: string;
  has_schedule: boolean;
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
      
      // Fetch all receipts with 'standard' payment method (Pay within 30 days)
      const { data: receipts, error: receiptsError } = await supabase
        .from('receipts')
        .select('*')
        .eq('payment_method', 'standard')
        .eq('status', 'pending') // Only show unpaid
        .order('created_at', { ascending: false });

      if (receiptsError) {
        console.error('Error fetching receipts:', receiptsError);
        throw receiptsError;
      }

      if (!receipts || receipts.length === 0) {
        setRecords([]);
        return;
      }

      // All 'standard' payment method receipts are 30-day payment customers
      const filteredReceipts = receipts;

      // Get shipment IDs to fetch tracking numbers
      const shipmentIds = filteredReceipts
        .map(receipt => receipt.shipment_id)
        .filter(id => id !== null);

      // Fetch shipments data
      let shipmentsData: any[] = [];
      if (shipmentIds.length > 0) {
        const { data: shipments, error: shipmentsError } = await supabase
          .from('shipments')
          .select('id, tracking_number, metadata, user_id')
          .in('id', shipmentIds);

        if (shipmentsError) {
          console.error('Error fetching shipments:', shipmentsError);
        } else {
          shipmentsData = shipments || [];
        }
      }

      // Get user IDs to fetch profiles
      const userIds = [
        ...filteredReceipts.map(receipt => receipt.user_id),
        ...shipmentsData.map(shipment => shipment.user_id)
      ].filter(id => id !== null);

      // Fetch profiles data
      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      // Process the data
      const scheduleRecords: PaymentScheduleRecord[] = filteredReceipts.map(receipt => {
        const senderDetails = receipt.sender_details as any;
        const paymentInfo = receipt.payment_info as any;
        
        // Find related shipment
        const shipment = shipmentsData.find(s => s.id === receipt.shipment_id);
        
        // Find related profile
        const profile = profilesData.find(p => p.id === receipt.user_id || p.id === shipment?.user_id);
        
        // Get sender name from multiple sources
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
        else if (profile?.full_name) {
          senderName = profile.full_name;
        }
        
        // Get email from multiple sources
        let senderEmail = 'N/A';
        if (senderDetails?.email) {
          senderEmail = senderDetails.email;
        } else if (shipment?.metadata?.sender?.email) {
          senderEmail = shipment.metadata.sender.email;
        } else if (shipment?.metadata?.senderDetails?.email) {
          senderEmail = shipment.metadata.senderDetails.email;
        } else if (profile?.email) {
          senderEmail = profile.email;
        }
        
        // Calculate payment totals
        const receiptAny = receipt as any;
        const schedule = paymentInfo?.paymentSchedule || receiptAny.payment_schedule || [];
        const hasSchedule = paymentInfo?.usePaymentSchedule === true && schedule.length > 0;
        const totalAmount = paymentInfo?.finalAmount || receipt.amount || 0;
        const totalPaid = schedule.reduce((sum: number, inst: any) => sum + (inst.paidAmount || 0), 0);
        const remainingBalance = totalAmount - totalPaid;
        
        return {
          id: receipt.id,
          receipt_number: receipt.receipt_number || 'N/A',
          sender_name: senderName,
          sender_email: senderEmail,
          sender_phone: senderDetails?.phone || shipment?.metadata?.sender?.phone || shipment?.metadata?.senderDetails?.phone || 'N/A',
          payment_schedule: schedule.map((inst: any) => ({
            id: inst.id || `inst-${Math.random()}`,
            date: inst.date,
            amount: inst.amount,
            paid: inst.paid || false,
            paidAmount: inst.paidAmount || 0,
            paidDate: inst.paidDate || null
          })),
          total_amount: totalAmount,
          total_paid: totalPaid,
          remaining_balance: remainingBalance,
          currency: paymentInfo?.currency || receipt.currency || 'GBP',
          created_at: receipt.created_at,
          status: remainingBalance <= 0 ? 'completed' : (receipt.status || 'pending'),
          shipment_id: receipt.shipment_id,
          tracking_number: shipment?.tracking_number || 'N/A',
          has_schedule: hasSchedule
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
                    <TableHead>Total / Paid / Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking #</TableHead>
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
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total:</span>
                            <span className="font-semibold">{formatCurrency(record.total_amount, record.currency)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Paid:</span>
                            <span className="font-medium">{formatCurrency(record.total_paid, record.currency)}</span>
                          </div>
                          <div className="flex justify-between text-orange-600 font-medium border-t pt-1">
                            <span>Remaining:</span>
                            <span>{formatCurrency(record.remaining_balance, record.currency)}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min((record.total_paid / record.total_amount) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(record.status)}>
                          {record.status === 'completed' ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-mono text-sm block">{record.tracking_number}</span>
                          <span className="font-mono text-xs text-gray-500 block">{record.receipt_number}</span>
                        </div>
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
