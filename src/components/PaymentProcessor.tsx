
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';

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
  
  const handleStripePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get session from the Stripe edge function
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: totalAmount * 100, // Convert to cents for Stripe
          bookingData,
          paymentMethod: 'stripe'
        }
      });
      
      if (sessionError) throw new Error(sessionError.message);
      
      // Redirect to the Stripe Checkout page
      window.location.href = sessionData.url;
      
    } catch (err: any) {
      console.error('Payment error:', err);
      setError('Failed to process payment. Please try again.');
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: err.message || 'An error occurred during payment processing',
      });
    }
  };
  
  const handlePayPalPayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get session from the PayPal edge function
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-paypal-payment', {
        body: {
          amount: totalAmount,
          bookingData,
          paymentMethod: 'paypal'
        }
      });
      
      if (sessionError) throw new Error(sessionError.message);
      
      // Redirect to PayPal
      window.location.href = sessionData.url;
      
    } catch (err: any) {
      console.error('PayPal payment error:', err);
      setError('Failed to process PayPal payment. Please try again.');
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: err.message || 'An error occurred during PayPal payment processing',
      });
    }
  };
  
  const handleOfflinePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Handle manual/offline payment
      const { data: paymentData, error: paymentError } = await supabase.from('payments').insert({
        amount: totalAmount,
        payment_method: 'offline',
        payment_status: 'pending',
        shipment_id: bookingData.shipment_id,
        user_id: bookingData.user_id,
        currency: 'GBP'
      }).select('id').single();
      
      if (paymentError) throw paymentError;
      
      // Generate receipt
      const receiptNumber = `RCT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const { data: receiptData, error: receiptError } = await supabase.from('receipts').insert({
        payment_id: paymentData.id,
        shipment_id: bookingData.shipment_id,
        receipt_number: receiptNumber,
        payment_method: 'offline',
        amount: totalAmount,
        sender_details: bookingData.senderDetails,
        recipient_details: bookingData.recipientDetails,
        shipment_details: bookingData.shipmentDetails,
        status: 'pending_payment'
      }).select('id').single();
      
      if (receiptError) throw receiptError;
      
      // Call the onPaymentComplete callback with payment and receipt IDs
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
            onClick={handleStripePayment}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 mr-3 text-blue-600" />
              <div>
                <p className="font-medium">Pay with Credit Card</p>
                <p className="text-sm text-gray-500">Secure payment via Stripe</p>
              </div>
            </div>
            <div className="text-lg font-semibold">£{totalAmount.toFixed(2)}</div>
          </button>
          
          <button 
            onClick={handlePayPalPayment}
            disabled={loading}
            className="w-full flex items-center justify-between p-4 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="#0070BA">
                <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 4.876-.024.15a.79.79 0 0 1-.784.68h-2.762a.483.483 0 0 1-.477-.558l1.53-9.252.23-.135a.483.483 0 0 1 .477-.558h3.24c.34 0 .63.23.716.558l.02.135a.805.805 0 0 0 .794.68h.5c2.306 0 4.11-.957 4.743-3.73.268-1.198.096-2.186-.795-2.873M9.6 7.3c.053-.166.183-.398.4-.398h5.56c.66 0 1.27.037 1.827.144.153.028.285.06.405.093 1.347.376 2.112 1.264 2.296 2.287-.885-.39-2.04-.607-3.5-.607h-4.64c-.4 0-.736.294-.798.688L9.6 7.3zM7.404 13.883l1.35-8.56c.06-.378.378-.64.76-.64h4.814c1.164 0 2.013.023 2.674.18.137.034.28.073.425.116-.137-.014-.27-.023-.405-.023h-5.56c-.4 0-.738.294-.8.688l-1.35 8.56c-.052.325-.095.636-.132.938-.248 1.597-.49 3.146-2.88 3.146h-1.88c-.46 0-.843-.342-.915-.798L2 5.885c-.06-.378.183-.687.566-.75l5.483-.805c.378-.55.696.175.756.55l1.171 7.3-.688 4.267c.04-1.236.1-1.735.114-1.882" />
              </svg>
              <div>
                <p className="font-medium">Pay with PayPal</p>
                <p className="text-sm text-gray-500">Fast and secure checkout</p>
              </div>
            </div>
            <div className="text-lg font-semibold">£{totalAmount.toFixed(2)}</div>
          </button>
          
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
