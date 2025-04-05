
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Bug } from 'lucide-react';

interface PaymentProcessorProps {
  bookingData: any;
  totalAmount: number;
  onPaymentComplete: (paymentId: string, receiptId: string) => void;
  onCancel: () => void;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  bookingData,
  totalAmount,
  onPaymentComplete,
  onCancel
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleOfflinePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: paymentData, error: paymentError } = await supabase.from('payments').insert({
        amount: totalAmount,
        payment_method: 'offline',
        payment_status: 'pending',
        shipment_id: bookingData.shipment_id,
        user_id: bookingData.user_id,
        currency: 'GBP'
      }).select('id').single();
      
      if (paymentError) throw paymentError;
      
      const receiptNumber = `RCT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const { data: receiptData, error: receiptError } = await supabase.from(tableFrom('receipts')).insert({
        payment_id: paymentData.id,
        shipment_id: bookingData.shipment_id,
        receipt_number: receiptNumber,
        payment_method: 'offline',
        amount: totalAmount,
        currency: 'GBP',
        sender_details: bookingData.senderDetails,
        recipient_details: bookingData.recipientDetails,
        shipment_details: bookingData.shipmentDetails,
        status: 'pending_payment'
      }).select('id').single();
      
      if (receiptError) throw receiptError;
      
      onPaymentComplete(paymentData.id, receiptData.id);
      
    } catch (err: any) {
      console.error('Offline payment error:', err);
      setError('Failed to process your request. Please try again.');
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: err.message || 'An error occurred during payment processing',
      });
    }
  };

  const handleDebugPayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to create the shipment if it doesn't exist (this is just for the debug mode)
      if (!bookingData.shipment_id) {
        toast({
          title: "Missing shipment ID",
          description: "Creating a test shipment for you first",
        });
        
        // Create a test shipment
        const { data: shipmentData, error: shipmentError } = await supabase.from('shipments').insert({
          origin: bookingData.senderDetails?.address || 'Test Origin Address',
          destination: bookingData.recipientDetails?.address || 'Test Destination Address',
          status: 'Booked',
          user_id: bookingData.user_id || (await supabase.auth.getUser()).data.user?.id || null,
          tracking_number: `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          metadata: {
            sender_name: bookingData.senderDetails?.name || 'Test Sender',
            sender_email: bookingData.senderDetails?.email || 'test@example.com',
            sender_phone: bookingData.senderDetails?.phone || '+1234567890',
            recipient_name: bookingData.recipientDetails?.name || 'Test Recipient',
            recipient_phone: bookingData.recipientDetails?.phone || '+1234567890',
            shipment_type: bookingData.shipmentDetails?.type || 'parcel',
            drum_quantity: bookingData.shipmentDetails?.quantity || 1,
          },
          weight: bookingData.shipmentDetails?.weight || 10,
        }).select('id').single();
        
        if (shipmentError) throw shipmentError;
        
        bookingData.shipment_id = shipmentData.id;
      }

      // Now create the test payment
      const { data: paymentData, error: paymentError } = await supabase.from('payments').insert({
        amount: totalAmount,
        payment_method: 'test',
        payment_status: 'completed',
        shipment_id: bookingData.shipment_id,
        user_id: bookingData.user_id || (await supabase.auth.getUser()).data.user?.id || null,
        currency: 'GBP',
        transaction_id: `test-${Date.now()}`
      }).select('id').single();
      
      if (paymentError) {
        console.error('Payment error details:', paymentError);
        throw new Error(`Payment creation failed: ${paymentError.message}`);
      }
      
      const receiptNumber = `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Create a receipt for the test payment
      const { data: receiptData, error: receiptError } = await supabase.from(tableFrom('receipts')).insert({
        payment_id: paymentData.id,
        shipment_id: bookingData.shipment_id,
        receipt_number: receiptNumber,
        payment_method: 'test',
        amount: totalAmount,
        currency: 'GBP',
        sender_details: bookingData.senderDetails || {
          name: 'Test Sender',
          email: 'test@example.com',
          phone: '+1234567890',
          address: 'Test Origin Address'
        },
        recipient_details: bookingData.recipientDetails || {
          name: 'Test Recipient',
          phone: '+1234567890',
          address: 'Test Destination Address'
        },
        shipment_details: bookingData.shipmentDetails || {
          tracking_number: `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          type: 'parcel',
          quantity: 1,
          weight: 10,
          services: []
        },
        status: 'issued'
      }).select('id').single();
      
      if (receiptError) {
        console.error('Receipt error details:', receiptError);
        throw new Error(`Receipt creation failed: ${receiptError.message}`);
      }
      
      // Update the shipment status to Paid
      await supabase
        .from('shipments')
        .update({ status: 'Paid' })
        .eq('id', bookingData.shipment_id);
      
      onPaymentComplete(paymentData.id, receiptData.id);
      
    } catch (err: any) {
      console.error('Debug payment error:', err);
      setError(`Failed to process test payment: ${err.message}`);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Test Payment Error",
        description: err.message || 'An error occurred during test payment processing',
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>
          Choose how you would like to pay for your shipment
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <button 
            onClick={handleOfflinePayment}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-3 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h18v18H3V3m15 3H6v9h12V6m-1 7H7v-5h10v5z" />
              </svg>
              <div>
                <p className="font-medium">Pay Later</p>
                <p className="text-sm text-gray-500">You'll receive a payment invoice</p>
              </div>
            </div>
            <div className="text-lg font-semibold">£{totalAmount.toFixed(2)}</div>
          </button>
          
          <button 
            onClick={handleDebugPayment}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center">
              <Bug className="h-5 w-5 mr-3 text-amber-600" />
              <div>
                <p className="font-medium">Test Payment (Skip Payment Flow)</p>
                <p className="text-sm text-amber-700">For testing receipt page only</p>
              </div>
            </div>
            <div className="text-lg font-semibold">£{totalAmount.toFixed(2)}</div>
          </button>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Back
        </Button>
        
        {loading && (
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentProcessor;
