
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
import { 
  Loader2, 
  AlertCircle, 
  Bug, 
  Wallet, 
  CreditCard, 
  BanknoteIcon,
  Building,
  Clock
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [payOnArrival, setPayOnArrival] = useState<boolean>(false);
  
  // Calculate pay on arrival amount (additional 20%)
  const payOnArrivalAmount = totalAmount * 1.2;
  
  const handlePaymentSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Processing payment with method:", {
        paymentMethod: selectedPaymentMethod,
        payOnArrival,
        shipment_id: bookingData.shipment_id,
        amount: payOnArrival ? payOnArrivalAmount : totalAmount
      });
      
      // Get the payment status based on the selected method
      const paymentStatus = payOnArrival 
        ? 'pending_arrival' 
        : (selectedPaymentMethod === '30day' ? 'pending_30day' : 'pending');
      
      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase.from('payments').insert({
        amount: payOnArrival ? payOnArrivalAmount : totalAmount,
        payment_method: selectedPaymentMethod,
        payment_status: paymentStatus,
        shipment_id: bookingData.shipment_id,
        user_id: bookingData.user_id || null,
        currency: 'GBP'
      }).select('id').single();
      
      if (paymentError) {
        console.error('Payment error details:', paymentError);
        throw paymentError;
      }
      
      console.log("Created payment record:", paymentData);
      
      const receiptNumber = `RCT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      // Create receipt record
      const { data: receiptData, error: receiptError } = await supabase.from('receipts').insert({
        payment_id: paymentData.id,
        shipment_id: bookingData.shipment_id,
        receipt_number: receiptNumber,
        payment_method: selectedPaymentMethod + (payOnArrival ? '_on_arrival' : ''),
        amount: payOnArrival ? payOnArrivalAmount : totalAmount,
        currency: 'GBP',
        sender_details: bookingData.senderDetails,
        recipient_details: bookingData.recipientDetails,
        shipment_details: {
          ...bookingData.shipmentDetails,
          pay_on_arrival: payOnArrival
        },
        status: payOnArrival ? 'pending_arrival' : (selectedPaymentMethod === '30day' ? 'pending_30day' : 'pending_payment')
      }).select('id').single();
      
      if (receiptError) {
        console.error('Receipt error details:', receiptError);
        throw new Error(`Receipt creation failed: ${receiptError.message}`);
      }
      
      console.log("Created receipt record:", receiptData);
      
      // Update shipment status
      const shipmentStatus = payOnArrival 
        ? 'Pay on Arrival' 
        : (selectedPaymentMethod === '30day' ? '30-Day Payment' : 'Payment Pending');
      
      const { error: updateError } = await supabase.from('shipments')
        .update({ status: shipmentStatus })
        .eq('id', bookingData.shipment_id);
      
      if (updateError) {
        console.error('Error updating shipment status:', updateError);
        // We'll continue anyway since the payment and receipt were created
      } else {
        console.log(`Updated shipment status to ${shipmentStatus}`);
      }
      
      // Navigate to success page with receipt
      onPaymentComplete(paymentData.id, receiptData.id);
      
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setError('Failed to process your payment request. Please try again.');
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
          user_id: bookingData.user_id || null,
          tracking_number: `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          metadata: {
            sender_name: bookingData.senderDetails?.name || 'Test Sender',
            sender_email: bookingData.senderDetails?.email || 'test@example.com',
            sender_phone: bookingData.senderDetails?.phone || '+1234567890',
            recipient_name: bookingData.recipientDetails?.name || 'Test Recipient',
            recipient_phone: bookingData.recipientDetails?.phone || '+1234567890',
            shipment_type: bookingData.shipmentDetails?.type || 'drum',
            drum_quantity: bookingData.shipmentDetails?.quantity || 1,
          }
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
        user_id: bookingData.user_id || null,
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
          type: 'drum',
          quantity: 1,
          weight: null,
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
        <CardTitle>Payment Options</CardTitle>
        <CardDescription>
          Choose how you would like to pay for your shipment
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="standard">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard">Pay Now</TabsTrigger>
            <TabsTrigger value="arrival">Pay on Goods Arriving</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard" className="space-y-4 pt-4">
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h3 className="text-lg font-medium flex items-center">
                <Wallet className="h-5 w-5 mr-2 text-blue-600" />
                Standard Payment
              </h3>
              <p className="text-sm mt-1">
                Choose your preferred payment method to pay for your shipping now.
              </p>
              <div className="mt-3 flex items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="ml-2 text-lg font-bold">£{totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <RadioGroup 
              defaultValue="cash" 
              className="space-y-3"
              onValueChange={(value) => {
                setSelectedPaymentMethod(value);
                setPayOnArrival(false);
              }}
            >
              <div className="bg-white border rounded-md p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="cash" id="cash" className="mt-1" />
                  <div>
                    <Label htmlFor="cash" className="font-medium flex items-center">
                      <BanknoteIcon className="h-4 w-4 mr-2 text-green-600" />
                      Cash Payment
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Make a cash payment at our collection point. You'll receive a receipt immediately.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded-md p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" className="mt-1" />
                  <div>
                    <Label htmlFor="bank_transfer" className="font-medium flex items-center">
                      <Building className="h-4 w-4 mr-2 text-blue-600" />
                      Bank Transfer
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Transfer the amount to our bank account. You'll receive payment details after booking.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded-md p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="direct_debit" id="direct_debit" className="mt-1" />
                  <div>
                    <Label htmlFor="direct_debit" className="font-medium flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-purple-600" />
                      Direct Debit
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Set up a direct debit payment. Our team will contact you with the details.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded-md p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="30day" id="30day" className="mt-1" />
                  <div>
                    <Label htmlFor="30day" className="font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-orange-600" />
                      Pay Later (30 Days)
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Pay within 30 days from the collection date. You'll receive an invoice.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </TabsContent>
          
          <TabsContent value="arrival" className="space-y-4 pt-4">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4">
              <h3 className="text-lg font-medium flex items-center text-yellow-800">
                <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                Pay on Goods Arriving
              </h3>
              <p className="text-sm mt-1 text-yellow-800">
                Pay when your goods arrive in Zimbabwe with a 20% premium on the standard price.
              </p>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base Amount:</span>
                  <span>£{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Premium (20%):</span>
                  <span>£{(totalAmount * 0.2).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-yellow-800">
                  <span>Total to Pay on Arrival:</span>
                  <span>£{payOnArrivalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <RadioGroup 
              defaultValue="cash_on_arrival" 
              className="space-y-3"
              onValueChange={(value) => {
                setSelectedPaymentMethod(value);
                setPayOnArrival(true);
              }}
            >
              <div className="bg-white border rounded-md p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="cash_on_arrival" id="cash_on_arrival" className="mt-1" />
                  <div>
                    <Label htmlFor="cash_on_arrival" className="font-medium flex items-center">
                      <BanknoteIcon className="h-4 w-4 mr-2 text-green-600" />
                      Cash Payment on Arrival
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Pay with cash when your goods arrive in Zimbabwe. 
                      The recipient will need to pay before collecting the goods.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded-md p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="bank_transfer_on_arrival" id="bank_transfer_on_arrival" className="mt-1" />
                  <div>
                    <Label htmlFor="bank_transfer_on_arrival" className="font-medium flex items-center">
                      <Building className="h-4 w-4 mr-2 text-blue-600" />
                      Bank Transfer on Arrival
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Make a bank transfer when your goods arrive in Zimbabwe.
                      Our team in Zimbabwe will provide the local bank details.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
            
            <Alert className="mt-4 bg-yellow-50 text-yellow-800 border-yellow-300">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>Important Notice</AlertTitle>
              <AlertDescription>
                <p>When choosing "Pay on Arrival":</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Goods will be held in Zimbabwe until payment is received</li>
                  <li>The recipient must present ID matching the details provided</li>
                  <li>Payment must be made within 14 days of arrival or storage fees may apply</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
        
        <button 
          onClick={handleDebugPayment}
          disabled={loading}
          className="w-full flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors mt-8"
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
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Back
        </Button>
        
        <Button
          onClick={handlePaymentSubmit}
          disabled={loading}
          className="bg-zim-green hover:bg-zim-green/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Complete Booking'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PaymentProcessor;
