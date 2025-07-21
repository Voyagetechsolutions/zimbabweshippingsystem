
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, AlertCircle, CreditCard, Wallet, CalendarClock, Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateUniqueId } from '@/utils/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PaymentMethodSectionProps {
  bookingData: any;
  totalAmount: number;
  onCancel: () => void;
  onComplete: (paymentData: any) => void;
}

interface PaymentSchedule {
  date: Date;
  amount: number;
}

export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({
  bookingData,
  totalAmount,
  onCancel,
  onComplete
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'standard' | 'cashOnCollection' | 'payOnArrival'>('standard');
  const [payLaterMethod, setPayLaterMethod] = useState<'payLater'>('payLater');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([]);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [tempAmount, setTempAmount] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
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

  const getRemainingAmount = () => {
    const scheduledTotal = paymentSchedule.reduce((sum, payment) => sum + payment.amount, 0);
    return finalAmount - scheduledTotal;
  };

  const isPaymentScheduleComplete = () => {
    return getRemainingAmount() === 0;
  };

  const addPaymentSchedule = () => {
    if (!tempDate || !tempAmount || parseFloat(tempAmount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a date and enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(tempAmount);
    const remaining = getRemainingAmount();

    if (amount > remaining) {
      toast({
        title: "Amount Too High",
        description: `Amount cannot exceed the remaining balance of £${remaining.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    const newSchedule: PaymentSchedule = {
      date: tempDate,
      amount: amount
    };

    setPaymentSchedule([...paymentSchedule, newSchedule]);
    setTempDate(undefined);
    setTempAmount('');
    setIsDatePickerOpen(false);
  };

  const removePaymentSchedule = (index: number) => {
    const newSchedule = [...paymentSchedule];
    newSchedule.splice(index, 1);
    setPaymentSchedule(newSchedule);
  };

  const handleConfirm = async () => {
    if (selectedPaymentMethod === 'standard' && payLaterMethod === 'payLater' && !isPaymentScheduleComplete()) {
      toast({
        title: "Incomplete Payment Schedule",
        description: "Please schedule payments for the full amount or enter the remaining balance.",
        variant: "destructive",
      });
      return;
    }

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
        receipt_number: receiptNumber,
        paymentSchedule: selectedPaymentMethod === 'standard' && payLaterMethod === 'payLater' ? paymentSchedule : null
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
      
      // Call the parent component's onComplete handler
      await onComplete(paymentData);
      
      // Navigate to confirmation page with all the necessary data
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">Pay by card or within 30 days</p>
              
              {selectedPaymentMethod === 'standard' && (
                <div className="border-t dark:border-gray-600 pt-3 mt-2">
                  <div className="flex items-center">
                    <RadioGroupItem value="payLater" id="payLater" />
                    <label htmlFor="payLater" className="ml-2 text-sm font-medium">Pay within 30 days</label>
                  </div>
                  
                  {payLaterMethod === 'payLater' && (
                    <div className="mt-4 space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                        <h4 className="font-medium mb-3">Payment Schedule</h4>
                        
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1">
                              <Label htmlFor="payment-date" className="text-sm">Payment Date</Label>
                              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !tempDate && "text-muted-foreground"
                                    )}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {tempDate ? format(tempDate, "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <CalendarComponent
                                    mode="single"
                                    selected={tempDate}
                                    onSelect={(date) => {
                                      setTempDate(date);
                                      setIsDatePickerOpen(false);
                                    }}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            <div className="flex-1">
                              <Label htmlFor="payment-amount" className="text-sm">Amount (£)</Label>
                              <Input
                                id="payment-amount"
                                type="number"
                                step="0.01"
                                min="0"
                                max={getRemainingAmount()}
                                value={tempAmount}
                                onChange={(e) => setTempAmount(e.target.value)}
                                placeholder="Enter amount"
                              />
                            </div>
                            
                            <div className="flex items-end">
                              <Button 
                                type="button" 
                                onClick={addPaymentSchedule}
                                disabled={!tempDate || !tempAmount}
                                className="w-full sm:w-auto"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                          
                          {paymentSchedule.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm">Scheduled Payments:</h5>
                              {paymentSchedule.map((payment, index) => (
                                <div key={index} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border">
                                  <span className="text-sm">
                                    {format(payment.date, "PPP")} - £{payment.amount.toFixed(2)}
                                  </span>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => removePaymentSchedule(index)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                              
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Remaining: £{getRemainingAmount().toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                  Pay Full on Collection
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
