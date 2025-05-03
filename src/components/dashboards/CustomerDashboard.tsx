import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, PaymentInfo } from '@/types/receipt';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

interface CustomerDashboardProps {
  // You can define props here if needed
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
    case 'completed':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Completed</span>;
    case 'failed':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Failed</span>;
    default:
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Unknown</span>;
  }
};

const CustomerDashboard: React.FC<CustomerDashboardProps> = () => {
  const { user } = useAuth();

  const fetchReceipts = async () => {
    try {
      console.log('Fetching receipts for user ID:', user?.id);
      
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user?.id);
        
      if (error) {
        console.error('Error fetching receipts:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('No receipts found for user');
        return [];
      }
      
      // Map the receipts to ensure they match the Receipt interface
      const typedReceipts = data.map(receipt => {
        const paymentInfo = receipt.payment_info as PaymentInfo | null;
        
        return {
          id: receipt.id,
          user_id: receipt.user_id,
          shipment_id: receipt.shipment_id,
          payment_id: paymentInfo?.payment_id,
          receipt_number: typeof paymentInfo === 'object' && paymentInfo 
            ? paymentInfo.receipt_number || receipt.id.substring(0, 8)
            : receipt.id.substring(0, 8),
          amount: typeof paymentInfo === 'object' && paymentInfo && 'amount' in paymentInfo 
            ? paymentInfo.amount 
            : undefined,
          currency: typeof paymentInfo === 'object' && paymentInfo && 'currency' in paymentInfo 
            ? paymentInfo.currency 
            : 'GBP',
          payment_method: typeof paymentInfo === 'object' && paymentInfo && 'method' in paymentInfo 
            ? paymentInfo.method 
            : undefined,
          status: typeof paymentInfo === 'object' && paymentInfo && 'status' in paymentInfo 
            ? paymentInfo.status 
            : 'completed',
          created_at: receipt.created_at,
          updated_at: receipt.updated_at,
          sender_details: receipt.sender_details,
          recipient_details: receipt.recipient_details,
          shipment_details: receipt.shipment_details,
          collection_info: receipt.collection_info,
          payment_info: receipt.payment_info
        } as Receipt;
      });
      
      console.log('Fetched customer receipts:', typedReceipts.length);
      return typedReceipts || [];
    } catch (error) {
      console.error('Error in fetchReceipts:', error);
      return [];
    }
  };

  const { data: receipts, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['customerReceipts', user?.id],
    queryFn: fetchReceipts,
    enabled: !!user?.id
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Receipts</h2>
      {isLoadingReceipts ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      ) : (
        <>
          {receipts && receipts.length > 0 ? (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-medium">Receipt #{receipt.receipt_number || receipt.id.substring(0, 8)}</h4>
                    <Link to={`/receipt/${receipt.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Receipt
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Amount</p>
                      <p className="text-sm">
                        {receipt.amount !== undefined 
                          ? formatCurrency(receipt.amount, receipt.currency || 'GBP') 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payment Method</p>
                      <p className="text-sm capitalize">{receipt.payment_method || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <p className="text-sm">{receipt.status || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date</p>
                      <p className="text-sm">{formatDate(receipt.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoadingReceipts ? (
            <EmptyState 
              icon={<Receipt className="h-12 w-12 text-gray-400" />}
              title="No Receipts Yet"
              description="When you make a payment, your receipt will appear here."
              action={
                <Link to="/book-shipment">
                  <Button>Book a Shipment</Button>
                </Link>
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
};

export default CustomerDashboard;
