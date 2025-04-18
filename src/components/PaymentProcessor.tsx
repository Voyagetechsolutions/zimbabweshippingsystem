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
import { 
  CalendarClock, 
  BanknoteIcon, 
  PoundSterling, 
  Calendar, 
  AlertCircle, 
  ArrowLeftCircle, 
  CheckCircle2,
  Building,
  Truck,
  CreditCard
} from 'lucide-react';

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
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('standard');
  const [payLaterMethod, setPayLaterMethod] = useState<string>('cash');
  const [isGoodsArriving, setIsGoodsArriving] = useState<boolean>(false);
  const [isSpecialDeal, setIsSpecialDeal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const premiumAmount = totalAmount * 0.2;
  const specialDealDiscount = bookingData?.shipmentDetails?.type === 'drum' ? 15 : 0;
  
  let finalAmount = totalAmount;
  if (isGoodsArriving) {
    finalAmount += premiumAmount;
  }
  if (isSpecialDeal && bookingData?.shipmentDetails?.type === 'drum') {
    finalAmount -= specialDealDiscount;
  }
  
  const collectionDate = new Date();
  const paymentDeadline = new Date(collectionDate);
  paymentDeadline.setDate(paymentDeadline.getDate() + 30);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  const handleConfirm = async () => {
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const paymentMethod = isGoodsArriving 
        ? 'goods_arriving' 
        : (selectedPaymentMethod === 'standard' ? payLaterMethod : selectedPaymentMethod);
      
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user?.id || bookingData.user_id || null,
          shipment_id: bookingData.shipment_id,
          amount: finalAmount,
          currency: 'GBP',
          payment_method: paymentMethod,
          payment_status: 'pending',
          transaction_id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
      
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          shipment_id: bookingData.shipment_id,
          payment_id: paymentData.id,
          receipt_number: receiptNumber,
          amount: finalAmount,
          currency: 'GBP',
          payment_method: paymentMethod,
          status: 'pending',
          sender_details: bookingData.senderDetails,
          recipient_details: bookingData.recipientDetails,
          shipment_details: bookingData.shipmentDetails
        })
        .select()
        .single();
      
      if (receiptError) throw receiptError;
      
      await supabase
        .from('shipments')
        .update({ status: 'pending_payment' })
        .eq('id', bookingData.shipment_id);
      
      toast({
        title: 'Payment Method Selected',
        description: isGoodsArriving 
          ? 'You will pay when your goods arrive in Zimbabwe.' 
          : selectedPaymentMethod === 'cashOnCollection'
            ? 'You will pay cash on collection with our special discount.'
            : 'Your booking is confirmed with 30-day payment terms.',
      });
      
      navigate(`/payment-success?receipt_id=${receiptData.id}`);
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
          <div className="space-y-6">
            <RadioGroup
              value={selectedPaymentMethod}
              onValueChange={(value) => {
                setSelectedPaymentMethod(value);
                setIsGoodsArriving(value === 'goods_arriving');
                setIsSpecialDeal(value === 'cashOnCollection');
              }}
              className="space-y-4"
            >
              <div className={`flex items-start space-x-3 border rounded-md p-4 ${selectedPaymentMethod === 'goods_arriving' ? 'bg-blue-50 border-blue-300' : ''}`}>
                <RadioGroupItem value="goods_arriving" id="goods_arriving" />
                <div className="space-y-2 w-full">
                  <Label htmlFor="goods_arriving" className="flex items-center text-lg font-medium">
                    <Truck className="h-5 w-5 mr-2 text-blue-600" />
                    Pay on Goods Arriving (20% premium)
                  </Label>
                  <p className="text-sm text-gray-600">
                    Pay when your goods arrive in Zimbabwe. A 20% premium is added to the standard shipping cost.
                  </p>
                  
                  {selectedPaymentMethod === 'goods_arriving' && (
                    <div className="mt-3 p-3 bg-blue-100 rounded-md">
                      <h4 className="font-medium flex items-center text-blue-800">
                        <AlertCircle className="h-4 w-4 mr-1" /> 
                        Price Calculation
                      </h4>
                      <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                        <span className="text-blue-700">Base Amount:</span>
                        <span className="text-right font-medium">£{totalAmount.toFixed(2)}</span>
                        
                        <span className="text-blue-700">20% Premium:</span>
                        <span className="text-right font-medium">£{premiumAmount.toFixed(2)}</span>
                        
                        <span className="text-blue-800 font-medium pt-1 border-t border-blue-200">Total:</span>
                        <span className="text-right font-bold pt-1 border-t border-blue-200">£{(totalAmount + premiumAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {bookingData?.shipmentDetails?.type === 'drum' && (
                <div className={`flex items-start space-x-3 border-2 rounded-md p-4 ${selectedPaymentMethod === 'cashOnCollection' ? 'bg-green-50 border-green-400' : 'border-dashed border-yellow-400'}`}>
                  <RadioGroupItem value="cashOnCollection" id="cashOnCollection" />
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="cashOnCollection" className="flex items-center text-lg font-medium">
                        <Tag className="h-5 w-5 mr-2 text-green-600" />
                        Special Deal: Cash on Collection
                      </Label>
                      <span className="bg-yellow-400 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">SAVE £15</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Pay cash when we collect your drums and receive a £15 discount on your shipment. Limited time offer!
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
              )}
              
              <div className={`flex items-start space-x-3 border rounded-md p-4 ${selectedPaymentMethod === 'standard' ? 'bg-gray-50 border-gray-300' : ''}`}>
                <RadioGroupItem value="standard" id="standard" />
                <div className="space-y-2 w-full">
                  <Label htmlFor="standard" className="flex items-center text-lg font-medium">
                    <CalendarClock className="h-5 w-5 mr-2 text-gray-600" />
                    Standard Payment
                  </Label>
                  <p className="text-sm text-gray-600">
                    Make a payment within 30 days of collection date ({formatDate(paymentDeadline)}).
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
                          <p className="font-medium">Bank Transfer Details:</p>
                          <p>Account Name: Zimbabwe Shipping Ltd</p>
                          <p>Account Number: 12345678</p>
                          <p>Sort Code: 12-34-56</p>
                          <p>Reference: Your tracking number</p>
                        </div>
                      )}
                    </div>
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
            
            {isSpecialDeal && bookingData?.shipmentDetails?.type === 'drum' && (
              <div className="flex justify-between">
                <span className="text-green-600">Cash on Collection Discount</span>
                <span className="text-green-600">-£{specialDealDiscount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between pt-2 font-bold">
              <span>Total</span>
              <span className="text-zim-green">£{finalAmount.toFixed(2)}</span>
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
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-zim-green hover:bg-zim-green/90 text-white flex items-center"
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
    </div>
  );
};

export default PaymentProcessor;
