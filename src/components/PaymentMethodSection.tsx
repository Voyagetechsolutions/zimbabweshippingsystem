
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Check, CreditCard, Banknote, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface PaymentMethodSectionProps {
  bookingData: any;
  totalAmount: number;
  onCancel: () => void;
  onComplete: (paymentData: any) => Promise<boolean>;
}

export function PaymentMethodSection({ bookingData, totalAmount, onCancel, onComplete }: PaymentMethodSectionProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const [selectedMethod, setSelectedMethod] = useState<string>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpecialDeal, setIsSpecialDeal] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [finalAmount, setFinalAmount] = useState(totalAmount);
  
  // Check for special deals
  useEffect(() => {
    const checkForSpecialDeals = async () => {
      if (session?.user?.id) {
        try {
          const { data, error } = await supabase
            .from('special_deals')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('active', true)
            .single();
          
          if (data && !error) {
            setIsSpecialDeal(true);
          }
        } catch (err) {
          console.error("Error checking for special deals:", err);
        }
      }
    };
    
    checkForSpecialDeals();
  }, [session]);
  
  // Apply cash on collection discount if applicable
  useEffect(() => {
    if (selectedMethod === 'cash_on_collection' && bookingData?.includeDrums && !discountApplied) {
      // Apply £20 discount per drum
      const drumQuantity = parseInt(bookingData.drumQuantity || '0');
      const discount = drumQuantity * 20;
      setFinalAmount(totalAmount - discount);
      setDiscountApplied(true);
    } else if (selectedMethod === 'goods_arriving' && !discountApplied) {
      // Add 20% premium for pay on goods arriving
      setFinalAmount(totalAmount * 1.2);
      setDiscountApplied(true);
    } else if (discountApplied && selectedMethod !== 'cash_on_collection' && selectedMethod !== 'goods_arriving') {
      // Reset to original amount if changing from discounted method
      setFinalAmount(totalAmount);
      setDiscountApplied(false);
    }
  }, [selectedMethod, bookingData, totalAmount, discountApplied]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Generate a unique receipt number
      const receiptNumber = `REC-${Date.now().toString().substring(6)}-${Math.floor(Math.random() * 10000)}`;
      
      // Create a shipment record if not already created
      let shipmentId = bookingData.shipment_id;
      if (!shipmentId) {
        shipmentId = `shp_${uuidv4()}`;
      }
      
      let userId = null;
      if (session?.user) {
        userId = session.user.id;
      } else if (bookingData.user_id) {
        userId = bookingData.user_id;
      }
      
      // Different behavior based on payment method
      if (selectedMethod === 'card') {
        // Process card payment (in real app, integrate with a payment processor)
        const paymentData = {
          method: selectedMethod,
          status: 'pending',
          finalAmount,
          currency: 'GBP',
          receiptNumber,
        };
        
        const success = await onComplete(paymentData);
        if (success) {
          navigate('/payment-success', { 
            state: { 
              paymentData,
              bookingData: {
                ...bookingData,
                shipment_id: shipmentId,
                paymentData
              } 
            }
          });
        }
      } else {
        // For non-card payment methods (e.g., cash, bank transfer)
        try {
          // Create a receipt in the database
          const { data: receiptData, error: receiptError } = await supabase
            .from('receipts')
            .insert({
              user_id: userId,
              shipment_id: shipmentId.startsWith('shp_') ? shipmentId.substring(4) : shipmentId,
              amount: finalAmount,
              currency: 'GBP',
              payment_method: selectedMethod,
              payment_status: 'pending',
              receipt_number: receiptNumber
            })
            .select('id')
            .single();
          
          if (receiptError) throw receiptError;
          
          const paymentData = {
            method: selectedMethod,
            status: 'pending',
            finalAmount,
            currency: 'GBP',
            receiptId: receiptData.id,
            receiptNumber
          };
          
          const success = await onComplete(paymentData);
          if (success) {
            navigate('/payment-success', { 
              state: { 
                receipt_id: receiptData.id,
                paymentData,
                bookingData: {
                  ...bookingData,
                  shipment_id: shipmentId,
                  paymentData
                } 
              },
              search: `?receipt_id=${receiptData.id}`
            });
          }
        } catch (err: any) {
          console.error("Error processing alternative payment:", err);
          throw err;
        }
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'There was a problem processing your payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCardSelected = selectedMethod === 'card';
  const isBankTransferSelected = selectedMethod === 'bank_transfer';
  const isCashSelected = selectedMethod === 'cash';
  const isGoodsArrivingSelected = selectedMethod === 'goods_arriving';
  const isCashOnCollectionSelected = selectedMethod === 'cash_on_collection';

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="p-6 md:p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-semibold">Choose Payment Method</h2>
            <p className="text-muted-foreground">Select how you'd like to pay for your shipment</p>
          </div>

          <div className="border-t border-b py-4">
            <div className="flex justify-between text-base mb-2">
              <span>Subtotal</span>
              <span>£{totalAmount.toFixed(2)}</span>
            </div>
            
            {discountApplied && selectedMethod === 'cash_on_collection' && (
              <div className="flex justify-between text-base text-green-600 mb-2">
                <span>Cash on Collection Discount</span>
                <span>-£{(totalAmount - finalAmount).toFixed(2)}</span>
              </div>
            )}
            
            {discountApplied && selectedMethod === 'goods_arriving' && (
              <div className="flex justify-between text-base text-amber-600 mb-2">
                <span>Pay on Arrival Premium (20%)</span>
                <span>+£{(finalAmount - totalAmount).toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-semibold mt-4">
              <span>Total</span>
              <span>£{finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handlePaymentSubmit}>
            <RadioGroup 
              value={selectedMethod} 
              onValueChange={setSelectedMethod}
              className="space-y-3"
            >
              <div className={cn(
                "flex items-center rounded-lg border p-4 cursor-pointer transition-colors",
                isCardSelected ? 
                  "border-primary bg-primary/5 dark:bg-primary/10" : 
                  "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="card" id="card" className="mr-3" />
                <Label htmlFor="card" className="flex items-center flex-1 cursor-pointer">
                  <CreditCard className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Credit/Debit Card</p>
                    <p className="text-sm text-muted-foreground">Pay now with your card</p>
                  </div>
                  {isCardSelected && <Check className="h-5 w-5 text-primary ml-2" />}
                </Label>
              </div>

              <div className={cn(
                "flex items-center rounded-lg border p-4 cursor-pointer transition-colors",
                isBankTransferSelected ? 
                  "border-primary bg-primary/5 dark:bg-primary/10" : 
                  "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="bank_transfer" id="bank_transfer" className="mr-3" />
                <Label htmlFor="bank_transfer" className="flex items-center flex-1 cursor-pointer">
                  <Banknote className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Bank Transfer (30-day terms)</p>
                    <p className="text-sm text-muted-foreground">Pay by bank transfer within 30 days</p>
                  </div>
                  {isBankTransferSelected && <Check className="h-5 w-5 text-primary ml-2" />}
                </Label>
              </div>
              
              <div className={cn(
                "flex items-center rounded-lg border p-4 cursor-pointer transition-colors",
                isCashSelected ? 
                  "border-primary bg-primary/5 dark:bg-primary/10" : 
                  "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="cash" id="cash" className="mr-3" />
                <Label htmlFor="cash" className="flex items-center flex-1 cursor-pointer">
                  <Banknote className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Cash Payment (30-day terms)</p>
                    <p className="text-sm text-muted-foreground">Pay in cash within 30 days</p>
                  </div>
                  {isCashSelected && <Check className="h-5 w-5 text-primary ml-2" />}
                </Label>
              </div>
              
              {bookingData?.includeDrums && (
                <div className={cn(
                  "flex items-center rounded-lg border p-4 cursor-pointer transition-colors",
                  isCashOnCollectionSelected ? 
                    "border-primary bg-primary/5 dark:bg-primary/10" : 
                    "hover:bg-muted/50"
                )}>
                  <RadioGroupItem value="cash_on_collection" id="cash_on_collection" className="mr-3" />
                  <Label htmlFor="cash_on_collection" className="flex items-center flex-1 cursor-pointer">
                    <Banknote className="h-5 w-5 mr-3 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium">Cash on Collection (Special Deal)</p>
                      <p className="text-sm text-muted-foreground">£20 discount per drum when paying in cash on collection</p>
                    </div>
                    {isCashOnCollectionSelected && <Check className="h-5 w-5 text-primary ml-2" />}
                  </Label>
                </div>
              )}
              
              <div className={cn(
                "flex items-center rounded-lg border p-4 cursor-pointer transition-colors",
                isGoodsArrivingSelected ? 
                  "border-primary bg-primary/5 dark:bg-primary/10" : 
                  "hover:bg-muted/50"
              )}>
                <RadioGroupItem value="goods_arriving" id="goods_arriving" className="mr-3" />
                <Label htmlFor="goods_arriving" className="flex items-center flex-1 cursor-pointer">
                  <Clock className="h-5 w-5 mr-3 text-amber-500" />
                  <div className="flex-1">
                    <p className="font-medium">Pay on Goods Arriving</p>
                    <p className="text-sm text-muted-foreground">Pay when your goods arrive in Zimbabwe (20% premium)</p>
                  </div>
                  {isGoodsArrivingSelected && <Check className="h-5 w-5 text-primary ml-2" />}
                </Label>
              </div>
            </RadioGroup>

            <div className="mt-8 flex flex-col md:flex-row justify-between gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
                className="md:w-auto"
              >
                Go Back
              </Button>
              
              <Button 
                type="submit"
                className="bg-zim-green hover:bg-zim-green/90 md:w-auto flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Complete Payment'}
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
