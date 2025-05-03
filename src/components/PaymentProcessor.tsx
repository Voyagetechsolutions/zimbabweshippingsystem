
import React, { useState, useEffect } from 'react';
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
import { 
  CalendarClock, 
  BanknoteIcon, 
  PoundSterling, 
  AlertCircle, 
  ArrowLeftCircle, 
  CheckCircle2,
  Building,
  CreditCard,
  Tag
} from 'lucide-react';
import { generateUniqueId } from '@/lib/utils';

interface PaymentProcessorProps {
  bookingData: any;
  totalAmount: number;
  onPaymentComplete?: (paymentId: string, receiptId: string) => void;
  onCancel: () => void;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ 
  bookingData, 
  totalAmount, 
  onCancel
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('standard');
  const [payLaterMethod, setPayLaterMethod] = useState<string>('cash');
  const [isSpecialDeal, setIsSpecialDeal] = useState<boolean>(false);
  const [isPayOnArrival, setIsPayOnArrival] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  const drumQuantity = bookingData?.shipmentDetails?.type === 'drum' ? bookingData.shipmentDetails.quantity : 0;
  const specialDealDiscount = bookingData?.shipmentDetails?.type === 'drum' ? drumQuantity * 20 : 0;
  const payOnArrivalPremium = bookingData?.shipmentDetails?.type === 'drum' ? totalAmount * 0.2 : 0;

  let finalAmount = totalAmount;
  if (isSpecialDeal && bookingData?.shipmentDetails?.type === 'drum') {
    finalAmount -= specialDealDiscount;
  } else if (isPayOnArrival && bookingData?.shipmentDetails?.type === 'drum') {
    finalAmount += payOnArrivalPremium;
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkUser();
  }, []);
  
  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let paymentMethod = selectedPaymentMethod;
      if (selectedPaymentMethod === 'standard') {
        paymentMethod = payLaterMethod;
      }

      const transactionId = generateUniqueId('TX-');
      const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
      
      const currentUserId = user?.id || userId || bookingData.user_id || null;
      
      let shipmentUuid = bookingData.shipment_id;
      if (shipmentUuid && typeof shipmentUuid === 'string' && shipmentUuid.startsWith('shp_')) {
        shipmentUuid = shipmentUuid.substring(4);
      }
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!shipmentUuid || !uuidRegex.test(shipmentUuid)) {
        console.error('Invalid shipment ID format:', shipmentUuid);
        throw new Error('Invalid shipment ID format');
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: currentUserId,
          shipment_id: shipmentUuid,
          amount: finalAmount,
          currency: 'GBP',
          payment_method: paymentMethod,
          payment_status: 'pending',
          transaction_id: transactionId
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Payment error:', paymentError);
        throw paymentError;
      }

      // Prepare receipt data for both the database and React Router navigation
      const completeReceiptData = {
        shipment_id: shipmentUuid,
        payment_id: paymentData.id,
        receipt_number: receiptNumber,
        amount: finalAmount,
        currency: 'GBP',
        payment_method: paymentMethod,
        status: 'pending',
        sender_details: bookingData.senderDetails || {},
        recipient_details: bookingData.recipientDetails || {},
        shipment_details: bookingData.shipmentDetails || {},
        collection_info: {
          pickup_address: bookingData.pickupAddress,
          pickup_postcode: bookingData.pickupPostcode,
          pickup_country: bookingData.pickupCountry
        },
        payment_info: {
          finalAmount,
          method: paymentMethod,
          status: 'pending',
          date: new Date().toISOString(),
          receipt_number: receiptNumber,
          transaction_id: transactionId
        }
      };
      
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: currentUserId,
          ...completeReceiptData
        })
        .select()
        .single();

      if (receiptError) {
        console.error('Receipt error:', receiptError);
        throw receiptError;
      }

      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({ 
          status: 'pending_collection',
          user_id: currentUserId,
          metadata: {
            ...bookingData.shipmentDetails,
            payment_status: 'pending'
          }
        })
        .eq('id', shipmentUuid);

      if (shipmentError) {
        console.error('Shipment update error:', shipmentError);
        throw shipmentError;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          title: 'New Shipment Ready for Collection',
          message: `New shipment ${receiptNumber} is ready for collection.`,
          type: 'shipment_collection',
          related_id: shipmentUuid
        });

      toast({
        title: 'Booking Confirmed',
        description: 'Your shipment has been booked successfully.',
      });
      
      // Navigate to receipt page with complete data
      navigate('/receipt', {
        state: { 
          bookingData: {
            ...bookingData,
            paymentCompleted: true
          },
          receiptData: completeReceiptData,
          paymentData: completeReceiptData.payment_info
        }
      });
    } catch (error: any) {
      console.error('Error processing payment selection:', error);
      toast({
        title: 'Error',
        description: error.message || 'There was a problem processing your selection. Please try again.',
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
            Choose how you would like to pay for your shipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedPaymentMethod}
            onValueChange={(value) => {
              setSelectedPaymentMethod(value);
              setIsSpecialDeal(value === 'cashOnCollection');
              setIsPayOnArrival(value === 'payOnArrival');
            }}
            className="space-y-4"
          >
            {bookingData?.shipmentDetails?.type === 'drum' && (
              <>
                <div className={`flex items-start space-x-3 border-2 rounded-md p-4 ${selectedPaymentMethod === 'cashOnCollection' ? 'bg-green-50 border-green-400' : 'border-dashed border-yellow-400'}`}>
                  <RadioGroupItem value="cashOnCollection" id="cashOnCollection" />
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="cashOnCollection" className="flex items-center text-lg font-medium">
                        <Tag className="h-5 w-5 mr-2 text-green-600" />
                        Special Deal: Cash on Collection
                      </Label>
                      <span className="bg-yellow-400 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">SAVE £{specialDealDiscount}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Pay cash when we collect your drums and receive a £20 discount on each drum from your shipment.
                    </p>
                    {selectedPaymentMethod === 'cashOnCollection' && (
                      <div className="mt-3 p-3 bg-green-100 rounded-md">
                        <h4 className="font-medium flex items-center text-green-800">
                          <PoundSterling className="h-4 w-4 mr-1" /> 
                          Your Discount
                        </h4>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                          <span className="text-green-700">Original Price:</span>
                          <span className="text-right font-medium">£{totalAmount.toFixed(2)}</span>
                          <span className="text-green-700">Cash Discount:</span>
                          <span className="text-right font-medium">-£{specialDealDiscount.toFixed(2)}</span>
                          <span className="text-green-800 font-medium pt-1 border-t border-green-200">Final Total:</span>
                          <span className="text-right font-bold pt-1 border-t border-green-200">£{(totalAmount - specialDealDiscount).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`flex items-start space-x-3 border-2 rounded-md p-4 ${selectedPaymentMethod === 'payOnArrival' ? 'bg-blue-50 border-blue-400' : 'border-dashed border-blue-300'}`}>
                  <RadioGroupItem value="payOnArrival" id="payOnArrival" />
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="payOnArrival" className="flex items-center text-lg font-medium">
                        <Tag className="h-5 w-5 mr-2 text-blue-700" />
                        Pay on Arrival <span className="ml-2 text-blue-700 font-bold">(20% Premium)</span>
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600">
                      Pay in Zimbabwe when your drums arrive—attracts a 20% premium on your total.
                    </p>
                    {selectedPaymentMethod === 'payOnArrival' && (
                      <div className="mt-3 p-3 bg-blue-100 rounded-md">
                        <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                          <span className="text-blue-700">Original Price:</span>
                          <span className="text-right font-medium">£{totalAmount.toFixed(2)}</span>
                          <span className="text-blue-700">Pay on Arrival Premium (20%):</span>
                          <span className="text-right font-medium">+£{payOnArrivalPremium.toFixed(2)}</span>
                          <span className="text-blue-900 font-medium pt-1 border-t border-blue-200">Final Total:</span>
                          <span className="text-right font-bold pt-1 border-t border-blue-200">£{(totalAmount + payOnArrivalPremium).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            <div className={`flex items-start space-x-3 border rounded-md p-4 ${selectedPaymentMethod === 'standard' ? 'bg-gray-50 border-gray-300' : ''}`}>
              <RadioGroupItem value="standard" id="standard" />
              <div className="space-y-2 w-full">
                <Label htmlFor="standard" className="flex items-center text-lg font-medium">
                  <CalendarClock className="h-5 w-5 mr-2 text-gray-600" />
                  Standard Payment
                </Label>
                <p className="text-sm text-gray-600">
                  Make a payment within 30 days of collection date.
                </p>
                {selectedPaymentMethod === 'standard' && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm font-medium text-gray-700">Select your preferred payment method:</p>
                    <RadioGroup
                      value={payLaterMethod}
                      onValueChange={setPayLaterMethod}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2 border rounded p-2 pl-3">
                        <RadioGroupItem value="cash" id="method-cash" />
                        <Label htmlFor="method-cash" className="flex items-center">
                          <BanknoteIcon className="h-4 w-4 mr-2 text-green-600" />
                          Cash Payment
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 border rounded p-2 pl-3">
                        <RadioGroupItem value="bank_transfer" id="method-bank" />
                        <Label htmlFor="method-bank" className="flex items-center">
                          <Building className="h-4 w-4 mr-2 text-blue-600" />
                          Bank Transfer
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 border rounded p-2 pl-3">
                        <RadioGroupItem value="direct_debit" id="method-dd" />
                        <Label htmlFor="method-dd" className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-purple-600" />
                          Direct Debit
                        </Label>
                      </div>
                    </RadioGroup>
                    {payLaterMethod === 'bank_transfer' && (
                      <div className="mt-2 p-3 bg-gray-100 rounded text-sm">
                        <p className="font-medium">For Bank Transfer Details please contact Mr Moyo at +44 7984 099041. Reference: Your tracking number or Surname and Initials </p>                        
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
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
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-zim-green hover:bg-zim-green/90 text-white flex items-center w-full md:w-auto"
            type="button"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Payment
              </>
            )}
          </Button>
        </CardFooter>
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
            {isSpecialDeal && bookingData?.shipmentDetails?.type === 'drum' && (
              <div className="flex justify-between">
                <span className="text-green-600">Cash on Collection Discount</span>
                <span className="text-green-600">-£{specialDealDiscount.toFixed(2)}</span>
              </div>
            )}
            {isPayOnArrival && bookingData?.shipmentDetails?.type === 'drum' && (
              <div className="flex justify-between">
                <span className="text-blue-700">Pay on Arrival Premium</span>
                <span className="text-blue-700">+£{payOnArrivalPremium.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 font-bold">
              <span>Total</span>
              <span className="text-zim-green">£{finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentProcessor;
