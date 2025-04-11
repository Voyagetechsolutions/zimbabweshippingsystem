
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeftRight,
  Calendar,
  CreditCard,
  DollarSign,
  Landmark,
  LoaderCircle,
  Clock,
  Cash,
  ReceiptText,
  CreditCard as DirectDebit,
  CircleAlert,
  Info
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
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');
  const [activeTab, setActiveTab] = useState<string>("standard");
  const [paymentAmount, setPaymentAmount] = useState<number>(totalAmount);
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    baseAmount: totalAmount,
    additionalCharge: 0,
    totalAmount: totalAmount
  });

  // Set the default tab based on bookingData payment option
  useEffect(() => {
    if (bookingData?.shipmentDetails?.payment_option === 'payLater') {
      setActiveTab('payLater');
    }
  }, [bookingData]);

  // Calculate payment amount based on payment method
  useEffect(() => {
    let baseAmount = totalAmount;
    let additionalCharge = 0;
    let finalAmount = totalAmount;

    // If "Pay on Goods Arriving" is selected, add 20% charge
    if (selectedPaymentMethod === 'payOnArrival') {
      additionalCharge = baseAmount * 0.2;
      finalAmount = baseAmount + additionalCharge;
    }

    setCalculatedAmounts({
      baseAmount,
      additionalCharge,
      totalAmount: finalAmount
    });

    setPaymentAmount(finalAmount);
  }, [selectedPaymentMethod, totalAmount]);

  // Handle payment processing
  const handlePaymentProcess = async () => {
    setIsProcessing(true);

    try {
      let paymentMethodDescription = '';
      let paymentStatus = '';

      // Set payment method description and status based on selection
      switch (selectedPaymentMethod) {
        case 'card':
          paymentMethodDescription = 'Credit/Debit Card';
          paymentStatus = 'completed';
          break;
        case 'bank':
          paymentMethodDescription = 'Bank Transfer';
          paymentStatus = 'pending';
          break;
        case 'directDebit':
          paymentMethodDescription = 'Direct Debit';
          paymentStatus = 'pending';
          break;
        case 'payLater':
          paymentMethodDescription = 'Pay Later (30 Days)';
          paymentStatus = 'pending';
          break;
        case 'payOnArrival':
          paymentMethodDescription = 'Pay on Goods Arriving';
          paymentStatus = 'pending';
          break;
        default:
          paymentMethodDescription = 'Other';
          paymentStatus = 'pending';
      }

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          amount: paymentAmount,
          currency: 'GBP',
          shipment_id: bookingData.shipment_id,
          payment_method: paymentMethodDescription,
          payment_status: paymentStatus,
          user_id: bookingData.user_id || null
        })
        .select('id')
        .single();

      if (paymentError) throw paymentError;

      // Update shipment status
      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({ 
          status: 'Paid',
          // Add payment information to metadata
          metadata: { 
            ...bookingData.shipmentDetails,
            payment_method: paymentMethodDescription,
            payment_amount: paymentAmount,
            payment_status: paymentStatus
          }
        })
        .eq('id', bookingData.shipment_id);

      if (shipmentError) throw shipmentError;

      // Generate receipt
      const receiptNumber = `R-${Date.now().toString().substring(7)}`;
      
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          shipment_id: bookingData.shipment_id,
          payment_id: paymentData.id,
          receipt_number: receiptNumber,
          payment_method: paymentMethodDescription,
          amount: paymentAmount,
          currency: 'GBP',
          status: paymentStatus === 'completed' ? 'issued' : 'pending',
          sender_details: bookingData.senderDetails,
          recipient_details: bookingData.recipientDetails,
          shipment_details: {
            ...bookingData.shipmentDetails,
            payment_method: paymentMethodDescription,
            payment_status: paymentStatus,
            tracking_number: bookingData.shipmentDetails.tracking_number,
            services: [
              ...(bookingData.metalSeal ? [{ name: 'Metal Seal', price: 5 }] : []),
              ...(bookingData.doorToDoorDelivery ? [{ name: 'Door-to-Door Delivery', price: 25 }] : [])
            ]
          }
        })
        .select('id')
        .single();

      if (receiptError) throw receiptError;

      // Process completed
      setIsProcessing(false);
      
      // Call the completion handler
      onPaymentComplete(paymentData.id, receiptData.id);
      
    } catch (error: any) {
      console.error('Payment processing error:', error);
      setIsProcessing(false);
      toast({
        title: 'Payment Error',
        description: error.message || 'An error occurred during payment processing. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle payment cancellation
  const handleCancel = () => {
    if (isProcessing) return; // Prevent cancellation during processing
    onCancel();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Payment Options</CardTitle>
          <CardDescription>
            Select your preferred payment method to complete your booking
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Standard Payment
              </TabsTrigger>
              <TabsTrigger value="special" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Special Payment Options
              </TabsTrigger>
            </TabsList>
            
            {/* Standard Payment Options Tab */}
            <TabsContent value="standard" className="space-y-6 pt-4">
              <div className="space-y-4">
                <Label>Select Payment Method</Label>
                <RadioGroup 
                  value={selectedPaymentMethod} 
                  onValueChange={setSelectedPaymentMethod}
                  className="space-y-3"
                >
                  {/* Credit/Debit Card Option */}
                  <div className={`border rounded-lg p-4 transition-colors ${selectedPaymentMethod === 'card' ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="card" id="card" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <Label htmlFor="card" className="font-medium cursor-pointer flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                            Credit / Debit Card
                          </Label>
                          <span className="text-sm font-medium text-green-600">£{calculatedAmounts.totalAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Secure payment processed by Stripe
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bank Transfer Option */}
                  <div className={`border rounded-lg p-4 transition-colors ${selectedPaymentMethod === 'bank' ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="bank" id="bank" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <Label htmlFor="bank" className="font-medium cursor-pointer flex items-center">
                            <Landmark className="h-4 w-4 mr-2 text-blue-600" />
                            Bank Transfer
                          </Label>
                          <span className="text-sm font-medium text-green-600">£{calculatedAmounts.totalAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Make a manual bank transfer to our account
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Direct Debit Option */}
                  <div className={`border rounded-lg p-4 transition-colors ${selectedPaymentMethod === 'directDebit' ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="directDebit" id="directDebit" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <Label htmlFor="directDebit" className="font-medium cursor-pointer flex items-center">
                            <DirectDebit className="h-4 w-4 mr-2 text-blue-600" />
                            Direct Debit
                          </Label>
                          <span className="text-sm font-medium text-green-600">£{calculatedAmounts.totalAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Set up automatic payment from your bank account
                        </p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
            
            {/* Special Payment Options Tab */}
            <TabsContent value="special" className="space-y-6 pt-4">
              <div className="space-y-4">
                <Label>Select Special Payment Method</Label>
                <RadioGroup 
                  value={selectedPaymentMethod} 
                  onValueChange={setSelectedPaymentMethod}
                  className="space-y-3"
                >
                  {/* Pay Later Option */}
                  <div className={`border rounded-lg p-4 transition-colors ${selectedPaymentMethod === 'payLater' ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="payLater" id="payLater" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <Label htmlFor="payLater" className="font-medium cursor-pointer flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-blue-600" />
                            Pay Later (30 Days)
                          </Label>
                          <span className="text-sm font-medium text-green-600">£{calculatedAmounts.totalAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Flexible 30-day payment period from the collection date
                        </p>
                        {selectedPaymentMethod === 'payLater' && (
                          <Alert className="mt-2">
                            <Info className="h-4 w-4" />
                            <AlertTitle>30-Day Payment Terms</AlertTitle>
                            <AlertDescription className="text-xs">
                              You'll have 30 days from the collection date to complete your payment. We'll send you a reminder 5 days before the due date.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Pay on Goods Arriving Option */}
                  <div className={`border rounded-lg p-4 transition-colors ${selectedPaymentMethod === 'payOnArrival' ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="payOnArrival" id="payOnArrival" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <Label htmlFor="payOnArrival" className="font-medium cursor-pointer flex items-center">
                            <Cash className="h-4 w-4 mr-2 text-blue-600" />
                            Pay on Goods Arriving
                          </Label>
                          <span className="text-sm font-medium text-green-600">£{calculatedAmounts.totalAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Pay when your shipment arrives in Zimbabwe (20% additional charge)
                        </p>
                        
                        {selectedPaymentMethod === 'payOnArrival' && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <h4 className="text-sm font-medium flex items-center">
                              <ReceiptText className="h-4 w-4 mr-1 text-gray-600" />
                              Price Breakdown
                            </h4>
                            <div className="mt-2 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Base Amount:</span>
                                <span>£{calculatedAmounts.baseAmount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Additional Charge (20%):</span>
                                <span>£{calculatedAmounts.additionalCharge.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-medium pt-1 border-t">
                                <span>Total Amount:</span>
                                <span>£{calculatedAmounts.totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              
              {selectedPaymentMethod === 'payOnArrival' && (
                <Alert variant="warning" className="mt-4">
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>Important Notice</AlertTitle>
                  <AlertDescription>
                    When choosing "Pay on Goods Arriving", you agree to pay the full amount when your shipment arrives in Zimbabwe. 
                    Failure to pay may result in your goods being held until payment is received.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Payment Summary */}
          <div className="mt-8 p-5 bg-gray-50 rounded-lg border">
            <h3 className="font-semibold text-lg mb-3">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipment Type:</span>
                <span className="font-medium">{bookingData?.shipmentDetails?.type === 'drum' ? 'Drum Shipping' : 'Other Items'}</span>
              </div>
              
              {bookingData?.shipmentDetails?.type === 'drum' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantity:</span>
                  <span>{bookingData?.shipmentDetails?.quantity} drum(s)</span>
                </div>
              )}
              
              {bookingData?.metalSeal && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Metal Seal:</span>
                  <span>£5.00</span>
                </div>
              )}
              
              {bookingData?.doorToDoorDelivery && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Door-to-Door Delivery:</span>
                  <span>£25.00</span>
                </div>
              )}
              
              {selectedPaymentMethod === 'payOnArrival' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Additional Charge (20%):</span>
                  <span>£{calculatedAmounts.additionalCharge.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-medium text-lg pt-2 border-t mt-2">
                <span>Total:</span>
                <span className="text-green-600">£{paymentAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            disabled={isProcessing}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" /> Change Details
          </Button>
          
          <Button 
            onClick={handlePaymentProcess}
            disabled={isProcessing}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            {isProcessing ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" /> Complete Payment
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentProcessor;
