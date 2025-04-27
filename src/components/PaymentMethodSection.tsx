import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeftCircle, Tag, PoundSterling, CalendarClock, BanknoteIcon, Building, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface PaymentMethodSectionProps {
  bookingData: any;
  totalAmount: number;
  onCancel: () => void;
  onComplete: (paymentData: any) => void;
}

export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({
  bookingData,
  totalAmount,
  onCancel,
  onComplete
}) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('standard');
  const [payLaterMethod, setPayLaterMethod] = useState('cash');
  const [isSpecialDeal, setIsSpecialDeal] = useState(false);
  const [isPayOnArrival, setIsPayOnArrival] = useState(false);

  const drumQuantity = bookingData?.shipmentDetails?.quantity || 0;
  const specialDealDiscount = drumQuantity * 20;
  const payOnArrivalPremium = totalAmount * 0.2;
  const finalAmount = isSpecialDeal 
    ? totalAmount - specialDealDiscount 
    : isPayOnArrival 
    ? totalAmount + payOnArrivalPremium 
    : totalAmount;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const paymentData = {
        method: selectedPaymentMethod,
        payLaterMethod: selectedPaymentMethod === 'standard' ? payLaterMethod : null,
        finalAmount,
        isSpecialDeal,
        isPayOnArrival,
        originalAmount: totalAmount,
        discount: isSpecialDeal ? specialDealDiscount : 0,
        premium: isPayOnArrival ? payOnArrivalPremium : 0
      };

      await onComplete(paymentData);
      
      navigate('/receipt', { 
        state: { 
          bookingData: {
            ...bookingData,
            payment: paymentData,
            totalAmount: finalAmount
          }
        }
      });
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
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
