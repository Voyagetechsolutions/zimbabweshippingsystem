
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  BanknoteIcon, 
  ArrowRight, 
  PoundSterling, 
  Calendar, 
  AlertCircle, 
  ArrowLeftCircle, 
  CheckCircle2,
  Building,
  CreditCard as PaypalIcon
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');
  const [isGoodsArriving, setIsGoodsArriving] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const premiumAmount = totalAmount * 0.2;
  const totalWithPremium = isGoodsArriving ? totalAmount + premiumAmount : totalAmount;
  
  const handleStripePayment = async () => {
    try {
      // Convert pounds to pennies for Stripe
      const amountInPennies = Math.round(totalWithPremium * 100);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { 
          amount: amountInPennies,
          bookingData,
          paymentMethod: selectedPaymentMethod
        }
      });
      
      if (error) throw error;
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Error creating payment. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };
  
  const handlePayPalPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-payment', {
        body: { 
          amount: totalWithPremium,
          bookingData
        }
      });
      
      if (error) throw error;
      
      // Redirect to PayPal
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error('PayPal payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Error creating PayPal payment. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };
  
  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // For card payments, use Stripe
      if (selectedPaymentMethod === 'card' && !isGoodsArriving) {
        await handleStripePayment();
        return; // Don't proceed further, as we're redirecting to Stripe
      }
      
      // For PayPal payments
      if (selectedPaymentMethod === 'paypal' && !isGoodsArriving) {
        await handlePayPalPayment();
        return; // Don't proceed further, as we're redirecting to PayPal
      }
      
      // For all other payment methods or goods arriving, create local records
      const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
      
      const paymentStatus = selectedPaymentMethod === 'pay_later' || isGoodsArriving ? 'pending' : 'completed';
      
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user?.id || bookingData.user_id || null,
          shipment_id: bookingData.shipment_id,
          amount: totalWithPremium,
          currency: 'GBP',
          payment_method: selectedPaymentMethod,
          payment_status: paymentStatus,
          transaction_id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          shipment_id: bookingData.shipment_id,
          payment_id: paymentData.id,
          receipt_number: receiptNumber,
          amount: totalWithPremium,
          currency: 'GBP',
          payment_method: isGoodsArriving ? 'goods_arriving' : selectedPaymentMethod,
          status: paymentStatus === 'completed' ? 'issued' : 'pending',
          sender_details: bookingData.senderDetails,
          recipient_details: bookingData.recipientDetails,
          shipment_details: bookingData.shipmentDetails
        })
        .select()
        .single();
      
      if (receiptError) throw receiptError;
      
      await supabase
        .from('shipments')
        .update({ 
          status: paymentStatus === 'completed' ? 'booking_confirmed' : 'pending_payment',
          user_id: user?.id || bookingData.user_id || null
        })
        .eq('id', bookingData.shipment_id);
      
      toast({
        title: 'Payment Processed',
        description: paymentStatus === 'completed' 
          ? 'Your payment was successful. Your shipment is confirmed.' 
          : 'Your booking is confirmed. Payment will be processed later.',
      });
      
      onPaymentComplete(paymentData.id, receiptData.id);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'There was a problem processing your payment. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Select your preferred payment method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-4">
              <input
                type="checkbox"
                id="goodsArriving"
                checked={isGoodsArriving}
                onChange={() => setIsGoodsArriving(!isGoodsArriving)}
                className="h-4 w-4 rounded border-gray-300 text-zim-green focus:ring-zim-green"
              />
              <label htmlFor="goodsArriving" className="font-medium cursor-pointer">
                Pay on Goods Arriving (20% premium)
              </label>
            </div>
            
            {isGoodsArriving && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-800" />
                <AlertTitle className="text-blue-800">Payment on Goods Arriving</AlertTitle>
                <AlertDescription className="text-blue-700">
                  You'll pay when your goods arrive in Zimbabwe. This option includes a 20% premium on the standard shipping cost.
                  We'll contact you when your goods arrive to arrange payment.
                </AlertDescription>
              </Alert>
            )}
            
            <RadioGroup
              value={selectedPaymentMethod}
              onValueChange={setSelectedPaymentMethod}
              className="space-y-3"
              disabled={isGoodsArriving}
            >
              <div className={`flex items-start space-x-3 border rounded-md p-3 ${selectedPaymentMethod === 'card' && !isGoodsArriving ? 'bg-gray-50 border-zim-green' : ''}`}>
                <RadioGroupItem value="card" id="card" disabled={isGoodsArriving} />
                <div className="space-y-1">
                  <Label htmlFor="card" className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Credit/Debit Card
                  </Label>
                  <p className="text-sm text-gray-500">Pay securely using your credit or debit card</p>
                </div>
              </div>
              
              <div className={`flex items-start space-x-3 border rounded-md p-3 ${selectedPaymentMethod === 'paypal' && !isGoodsArriving ? 'bg-gray-50 border-zim-green' : ''}`}>
                <RadioGroupItem value="paypal" id="paypal" disabled={isGoodsArriving} />
                <div className="space-y-1">
                  <Label htmlFor="paypal" className="flex items-center">
                    <PaypalIcon className="h-5 w-5 mr-2" />
                    PayPal
                  </Label>
                  <p className="text-sm text-gray-500">Pay quickly and securely using your PayPal account</p>
                </div>
              </div>
              
              <div className={`flex items-start space-x-3 border rounded-md p-3 ${selectedPaymentMethod === 'bank_transfer' && !isGoodsArriving ? 'bg-gray-50 border-zim-green' : ''}`}>
                <RadioGroupItem value="bank_transfer" id="bank_transfer" disabled={isGoodsArriving} />
                <div className="space-y-1">
                  <Label htmlFor="bank_transfer" className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Bank Transfer
                  </Label>
                  <p className="text-sm text-gray-500">Make a direct bank transfer to our account</p>
                  {selectedPaymentMethod === 'bank_transfer' && !isGoodsArriving && (
                    <div className="mt-2 p-3 bg-gray-100 rounded text-sm">
                      <p className="font-medium">Bank Transfer Details:</p>
                      <p>Account Name: Zimbabwe Shipping Ltd</p>
                      <p>Account Number: 12345678</p>
                      <p>Sort Code: 12-34-56</p>
                      <p>Reference: Your tracking number</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`flex items-start space-x-3 border rounded-md p-3 ${selectedPaymentMethod === 'cash' && !isGoodsArriving ? 'bg-gray-50 border-zim-green' : ''}`}>
                <RadioGroupItem value="cash" id="cash" disabled={isGoodsArriving} />
                <div className="space-y-1">
                  <Label htmlFor="cash" className="flex items-center">
                    <BanknoteIcon className="h-5 w-5 mr-2" />
                    Cash Payment
                  </Label>
                  <p className="text-sm text-gray-500">Pay in cash when we collect your shipment</p>
                </div>
              </div>
              
              <div className={`flex items-start space-x-3 border rounded-md p-3 ${selectedPaymentMethod === 'pay_later' && !isGoodsArriving ? 'bg-gray-50 border-zim-green' : ''}`}>
                <RadioGroupItem value="pay_later" id="pay_later" disabled={isGoodsArriving} />
                <div className="space-y-1">
                  <Label htmlFor="pay_later" className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Pay Later (30 Days)
                  </Label>
                  <p className="text-sm text-gray-500">Pay within 30 days of the collection date</p>
                  
                  {selectedPaymentMethod === 'pay_later' && !isGoodsArriving && bookingData?.paymentOption === 'standard' && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Standard Payment Selected</AlertTitle>
                      <AlertDescription>
                        You selected standard payment during booking. Switching to Pay Later may result in additional charges.
                        Please go back and choose "30-Day Payment Terms" during booking for the correct pricing.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bookingData?.shipmentDetails?.type === 'drum' && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {bookingData.shipmentDetails.quantity} x Drum{bookingData.shipmentDetails.quantity > 1 ? 's' : ''}
                </span>
                <span>£{(totalAmount - (bookingData.shipmentDetails.services?.reduce((acc: number, service: any) => acc + service.price, 0) || 0)).toFixed(2)}</span>
              </div>
            )}
            
            {bookingData?.shipmentDetails?.services?.map((service: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span className="text-gray-600">{service.name}</span>
                <span>£{service.price.toFixed(2)}</span>
              </div>
            ))}
            
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Subtotal</span>
              <span>£{totalAmount.toFixed(2)}</span>
            </div>
            
            {isGoodsArriving && (
              <div className="flex justify-between">
                <span className="text-gray-600">Arrival Payment Premium (20%)</span>
                <span>£{premiumAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between pt-2 font-bold">
              <span>Total</span>
              <span className="text-zim-green">£{totalWithPremium.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex items-center"
          >
            <ArrowLeftCircle className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="bg-zim-green hover:bg-zim-green/90 text-white flex items-center"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isGoodsArriving 
                  ? "Confirm Payment on Arrival" 
                  : selectedPaymentMethod === 'pay_later'
                    ? "Confirm 30-Day Payment"
                    : "Complete Payment"
                }
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentProcessor;
