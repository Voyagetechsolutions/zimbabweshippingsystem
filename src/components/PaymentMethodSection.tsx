
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, AlertCircle, CreditCard, Wallet, CalendarClock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateUniqueId } from '@/utils/utils';

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'standard' | 'cashOnCollection' | 'payOnArrival'>('standard');
  const [payLaterMethod, setPayLaterMethod] = useState<'bankTransfer' | 'payLater'>('bankTransfer');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const isSpecialDeal = selectedPaymentMethod === 'cashOnCollection';
  const drumQuantity = bookingData?.shipmentDetails?.type === 'drum' ? (bookingData?.shipmentDetails?.quantity || 1) : 0;
  const specialDealDiscount = isSpecialDeal ? (20 * drumQuantity) : 0;
  
  const isPayOnArrival = selectedPaymentMethod === 'payOnArrival';
  const baseAmount = totalAmount - specialDealDiscount;
  const payOnArrivalPremium = isPayOnArrival ? (baseAmount * 0.20) : 0;
  
  const finalAmount = isSpecialDeal ? (totalAmount - specialDealDiscount) : 
                      isPayOnArrival ? (totalAmount + payOnArrivalPremium) : 
                      totalAmount;
  
  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      // Generate a receipt number
      const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
      
      // Generate a tracking number if one doesn't exist
      const trackingNumber = bookingData?.shipmentDetails?.tracking_number || 
                            `ZIM${Date.now().toString().substring(6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      
      // Create payment data with all necessary information
      const paymentData = {
        method: selectedPaymentMethod,
        payLaterMethod: selectedPaymentMethod === 'standard' ? payLaterMethod : null,
        finalAmount,
        currency: 'GBP',
        isSpecialDeal,
        isPayOnArrival,
        originalAmount: totalAmount,
        discount: isSpecialDeal ? specialDealDiscount : 0,
        premium: isPayOnArrival ? payOnArrivalPremium : 0,
        status: 'pending',
        date: new Date().toISOString(),
        receipt_number: receiptNumber
      };

      // Ensure the shipment details have all required information including tracking number
      const enhancedShipmentDetails = {
        ...(bookingData.shipmentDetails || {}),
        tracking_number: trackingNumber,
        type: bookingData?.shipmentDetails?.type || (bookingData?.includeDrums ? 'drum' : 'other'),
        quantity: bookingData?.shipmentDetails?.quantity || 
                 (bookingData?.includeDrums ? parseInt(bookingData?.drumQuantity || '1') : 1),
        services: [
          ...(bookingData?.shipmentDetails?.services || []),
          ...(bookingData?.wantMetalSeal ? [{
            name: `Metal Seal${parseInt(bookingData?.drumQuantity || '1') > 1 ? 's' : ''} (${parseInt(bookingData?.drumQuantity || '1')} x £5)`,
            price: 5 * parseInt(bookingData?.drumQuantity || '1')
          }] : []),
          ...(bookingData?.doorToDoor ? [{
            name: 'Door to Door Delivery',
            price: 25
          }] : [])
        ]
      };
      
      // Ensure sender details are complete
      const enhancedSenderDetails = {
        name: bookingData.senderDetails?.name || `${bookingData.firstName || ""} ${bookingData.lastName || ""}`.trim(),
        email: bookingData.senderDetails?.email || bookingData.email,
        phone: bookingData.senderDetails?.phone || bookingData.phone,
        address: bookingData.senderDetails?.address || bookingData.pickupAddress
      };
      
      // Ensure recipient details are complete
      const enhancedRecipientDetails = {
        name: bookingData.recipientDetails?.name || bookingData.recipientName,
        phone: bookingData.recipientDetails?.phone || bookingData.recipientPhone,
        additionalPhone: bookingData.recipientDetails?.additionalPhone || bookingData.additionalRecipientPhone,
        address: bookingData.recipientDetails?.address || bookingData.deliveryAddress
      };

      // Merge all booking data for the confirmation
      const finalBookingData = {
        ...bookingData,
        receipt_number: receiptNumber,
        paymentCompleted: true,
        paymentData,
        shipmentDetails: enhancedShipmentDetails,
        senderDetails: enhancedSenderDetails,
        recipientDetails: enhancedRecipientDetails,
      };

      console.log("Payment confirmation data:", { 
        bookingData: finalBookingData, 
        paymentData,
        shipmentDetails: enhancedShipmentDetails,
        senderDetails: enhancedSenderDetails,
        recipientDetails: enhancedRecipientDetails
      });
      
      // Call the parent component's onComplete handler with payment data
      await onComplete(paymentData);
      
      // Navigate directly to the confirm-booking route
      navigate('/confirm-booking', { 
        state: { 
          bookingData: finalBookingData,
          paymentData,
        }
      });
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Error",
        description: "There was a problem processing your payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6 w-full shadow-none border-none md:border md:shadow-md dark:bg-gray-800">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Choose Payment Method</h3>
        <p className="text-gray-600 dark:text-gray-400">Select how you would like to pay for your shipment</p>
      </div>
      
      <RadioGroup 
        value={selectedPaymentMethod} 
        onValueChange={(value) => setSelectedPaymentMethod(value as 'standard' | 'cashOnCollection' | 'payOnArrival')}
        className="space-y-4"
      >
        <div className={`border rounded-lg p-4 transition ${selectedPaymentMethod === 'standard' ? 'border-zim-green bg-green-50 dark:bg-green-900/20 dark:border-green-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
          <div className="flex items-start">
            <RadioGroupItem value="standard" id="standard" className="mt-1" />
            <div className="ml-3 w-full">
              <label htmlFor="standard" className="font-medium flex items-center justify-between">
                <span className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Standard Payment
                </span>
                <span className="text-zim-green dark:text-green-400 font-semibold">£{totalAmount.toFixed(2)}</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">Pay by card or bank transfer before collection</p>
              
              {selectedPaymentMethod === 'standard' && (
                <div className="border-t dark:border-gray-600 pt-3 mt-2">
                  <RadioGroup 
                    value={payLaterMethod} 
                    onValueChange={(value) => setPayLaterMethod(value as 'bankTransfer' | 'payLater')}
                    className="space-y-3"
                  >
                    <div className="flex items-center">
                      <RadioGroupItem value="bankTransfer" id="bankTransfer" />
                      <label htmlFor="bankTransfer" className="ml-2 text-sm font-medium">Bank Transfer</label>
                    </div>
                    
                    <div className="flex items-center">
                      <RadioGroupItem value="payLater" id="payLater" />
                      <label htmlFor="payLater" className="ml-2 text-sm font-medium">30-Day Payment Terms (For Business Clients)</label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className={`border rounded-lg p-4 transition ${selectedPaymentMethod === 'cashOnCollection' ? 'border-zim-green bg-green-50 dark:bg-green-900/20 dark:border-green-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
          <div className="flex items-start">
            <RadioGroupItem value="cashOnCollection" id="cashOnCollection" className="mt-1" />
            <div className="ml-3 w-full">
              <label htmlFor="cashOnCollection" className="font-medium flex items-center justify-between">
                <span className="flex items-center">
                  <Wallet className="mr-2 h-4 w-4" />
                  Cash on Collection
                </span>
                {isSpecialDeal && drumQuantity > 0 ? (
                  <div className="text-right">
                    <span className="text-gray-500 dark:text-gray-400 line-through mr-2">£{totalAmount.toFixed(2)}</span>
                    <span className="text-zim-green dark:text-green-400 font-semibold">£{(totalAmount - specialDealDiscount).toFixed(2)}</span>
                  </div>
                ) : (
                  <span className="text-zim-green dark:text-green-400 font-semibold">£{totalAmount.toFixed(2)}</span>
                )}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pay with cash when your items are collected</p>
              
              {isSpecialDeal && drumQuantity > 0 && (
                <div className="mt-3 flex items-start rounded-md bg-green-100 dark:bg-green-900/30 p-2 text-sm">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-green-700 dark:text-green-400">
                    Special deal: £20 discount per drum for cash payments!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className={`border rounded-lg p-4 transition ${selectedPaymentMethod === 'payOnArrival' ? 'border-zim-green bg-green-50 dark:bg-green-900/20 dark:border-green-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
          <div className="flex items-start">
            <RadioGroupItem value="payOnArrival" id="payOnArrival" className="mt-1" />
            <div className="ml-3 w-full">
              <label htmlFor="payOnArrival" className="font-medium flex items-center justify-between">
                <span className="flex items-center">
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Pay on Arrival (20% Premium)
                </span>
                <div className="text-right">
                  <span className="text-gray-500 dark:text-gray-400 line-through mr-2">£{totalAmount.toFixed(2)}</span>
                  <span className="text-zim-green dark:text-green-400 font-semibold">£{finalAmount.toFixed(2)}</span>
                </div>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pay when your shipment reaches the destination</p>
              
              <div className="mt-3 flex items-start rounded-md bg-amber-100 dark:bg-amber-900/30 p-2 text-sm">
                <AlertCircle className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-amber-700 dark:text-amber-400">
                  This option adds a 20% premium to the total cost.
                </span>
              </div>
            </div>
          </div>
        </div>
      </RadioGroup>
      
      <div className="border-t dark:border-gray-600 mt-6 pt-6">
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span>£{totalAmount.toFixed(2)}</span>
          </div>
          
          {isSpecialDeal && (
            <div className="flex justify-between mb-2 text-green-600 dark:text-green-400">
              <span>Cash discount:</span>
              <span>-£{specialDealDiscount.toFixed(2)}</span>
            </div>
          )}
          
          {isPayOnArrival && (
            <div className="flex justify-between mb-2 text-amber-600 dark:text-amber-400">
              <span>Pay on arrival premium (20%):</span>
              <span>+£{payOnArrivalPremium.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold text-lg mt-2">
            <span>Total:</span>
            <span>£{finalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Back
          </Button>
          <Button
            type="button"
            className="bg-zim-green hover:bg-zim-green/90"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Complete Payment'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
