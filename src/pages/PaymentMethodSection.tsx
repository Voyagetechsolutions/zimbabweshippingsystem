
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, BanknoteIcon, CalendarClock, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethodSectionProps {
  totalAmount?: number;
  onPaymentMethodSelect?: (method: string) => void;
  preSelectedMethod?: string;
  showSpecialDeals?: boolean;
  shipmentId?: string;
}

const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({ 
  totalAmount = 0,
  onPaymentMethodSelect,
  preSelectedMethod = '',
  showSpecialDeals = true,
  shipmentId
}) => {
  const [paymentMethod, setPaymentMethod] = useState(preSelectedMethod || 'card');
  const [loading, setLoading] = useState(false);
  const [specialDeals, setSpecialDeals] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch any special payment deals if applicable
  useEffect(() => {
    const fetchSpecialDeals = async () => {
      if (!showSpecialDeals) return;
      
      try {
        // Check if there are any active special deals
        const { data, error } = await supabase
          .from('special_deals')
          .select('*')
          .eq('is_active', true)
          .order('discount_percentage', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setSpecialDeals(data);
        }
      } catch (error: any) {
        console.error('Error fetching special deals:', error);
      }
    };
    
    fetchSpecialDeals();
  }, [showSpecialDeals]);

  // Handle payment method change
  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(value);
    }
  };

  // Handle payment process
  const handlePayment = async () => {
    if (!shipmentId) {
      toast({
        title: 'No shipment selected',
        description: 'Please go back and complete the booking process.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      let redirectUrl;
      
      switch (paymentMethod) {
        case 'card':
          // Process card payment through Stripe or another processor
          const { data, error } = await supabase.functions.invoke('create-payment', {
            body: { 
              shipment_id: shipmentId,
              success_url: `${window.location.origin}/payment-success`,
              cancel_url: `${window.location.origin}/payment-cancel`
            }
          });
          
          if (error) throw error;
          
          if (data && data.url) {
            window.location.href = data.url;
            return;
          } else {
            throw new Error('No payment URL was returned');
          }
        
        case 'paypal':
          // Process PayPal payment
          const { data: paypalData, error: paypalError } = await supabase.functions.invoke('create-paypal-payment', {
            body: { 
              shipment_id: shipmentId,
              return_url: `${window.location.origin}/payment-success`,
              cancel_url: `${window.location.origin}/payment-cancel`
            }
          });
          
          if (paypalError) throw paypalError;
          
          if (paypalData && paypalData.url) {
            window.location.href = paypalData.url;
            return;
          } else {
            throw new Error('No PayPal payment URL was returned');
          }
          
        case 'bank_transfer':
        case 'direct_debit':
        case 'cash':
          // Process offline payment methods by creating a pending payment record
          const { data: offlineData, error: offlineError } = await supabase
            .from(tableFrom('payments'))
            .insert({
              shipment_id: shipmentId,
              status: 'pending',
              amount: totalAmount,
              payment_method: paymentMethod,
              metadata: { payment_instructions_sent: new Date().toISOString() }
            })
            .select()
            .single();
            
          if (offlineError) throw offlineError;
          
          // Redirect to success page with payment ID
          navigate(`/payment-success?payment_id=${offlineData.id}`);
          return;

        case 'goods_arriving':
          // Process pay on goods arriving
          const { data: arrivingData, error: arrivingError } = await supabase
            .from(tableFrom('payments'))
            .insert({
              shipment_id: shipmentId,
              status: 'pending',
              amount: totalAmount * 1.2, // 20% premium for this payment method
              payment_method: 'goods_arriving',
              metadata: { premium_applied: '20%' }
            })
            .select()
            .single();
            
          if (arrivingError) throw arrivingError;
          
          // Redirect to success page with payment ID
          navigate(`/payment-success?payment_id=${arrivingData.id}`);
          return;
          
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'There was a problem processing your payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-6 w-6" />;
      case 'paypal':
        return <img src="/paypal-icon.png" alt="PayPal" className="h-6 w-auto" />;
      case 'bank_transfer':
      case 'cash':
      case 'direct_debit':
        return <BanknoteIcon className="h-6 w-6" />;
      case 'goods_arriving':
        return <Truck className="h-6 w-6" />;
      default:
        return <CalendarClock className="h-6 w-6" />;
    }
  };

  return (
    <Card className="shadow-md w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Choose Payment Method</CardTitle>
        <CardDescription>
          Select how you'd like to pay for your shipment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={paymentMethod} 
          onValueChange={handlePaymentMethodChange}
          className="space-y-4"
        >
          <div className={cn(
            "flex items-center space-x-2 rounded-md border p-4 transition-all",
            paymentMethod === 'card' 
              ? "border-zim-green bg-muted dark:bg-gray-800" 
              : "hover:border-zim-green hover:bg-muted/50 dark:hover:bg-gray-800/50"
          )}>
            <RadioGroupItem value="card" id="card" />
            <Label htmlFor="card" className="flex items-center justify-between w-full cursor-pointer">
              <div className="flex items-center gap-3">
                {getPaymentMethodIcon('card')}
                <div>
                  <p className="font-medium">Credit/Debit Card</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pay securely with your card</p>
                </div>
              </div>
            </Label>
          </div>

          <div className={cn(
            "flex items-center space-x-2 rounded-md border p-4 transition-all",
            paymentMethod === 'paypal' 
              ? "border-zim-green bg-muted dark:bg-gray-800" 
              : "hover:border-zim-green hover:bg-muted/50 dark:hover:bg-gray-800/50"
          )}>
            <RadioGroupItem value="paypal" id="paypal" />
            <Label htmlFor="paypal" className="flex items-center justify-between w-full cursor-pointer">
              <div className="flex items-center gap-3">
                {getPaymentMethodIcon('paypal')}
                <div>
                  <p className="font-medium">PayPal</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pay using your PayPal account</p>
                </div>
              </div>
            </Label>
          </div>

          <div className={cn(
            "flex items-center space-x-2 rounded-md border p-4 transition-all",
            paymentMethod === 'bank_transfer' 
              ? "border-zim-green bg-muted dark:bg-gray-800" 
              : "hover:border-zim-green hover:bg-muted/50 dark:hover:bg-gray-800/50"
          )}>
            <RadioGroupItem value="bank_transfer" id="bank_transfer" />
            <Label htmlFor="bank_transfer" className="flex items-center justify-between w-full cursor-pointer">
              <div className="flex items-center gap-3">
                {getPaymentMethodIcon('bank_transfer')}
                <div>
                  <p className="font-medium">Bank Transfer (30-day terms)</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pay via bank transfer within 30 days</p>
                </div>
              </div>
            </Label>
          </div>

          <div className={cn(
            "flex items-center space-x-2 rounded-md border p-4 transition-all",
            paymentMethod === 'goods_arriving' 
              ? "border-zim-green bg-muted dark:bg-gray-800" 
              : "hover:border-zim-green hover:bg-muted/50 dark:hover:bg-gray-800/50"
          )}>
            <RadioGroupItem value="goods_arriving" id="goods_arriving" />
            <Label htmlFor="goods_arriving" className="flex items-center justify-between w-full cursor-pointer">
              <div className="flex items-center gap-3">
                {getPaymentMethodIcon('goods_arriving')}
                <div>
                  <p className="font-medium">Pay on Goods Arriving</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pay when your goods arrive in Zimbabwe (20% premium)</p>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        <div className="w-full">
          <div className="flex justify-between mb-4">
            <span className="font-semibold">Total Amount:</span>
            <span className="font-bold">
              £{paymentMethod === 'goods_arriving' 
                ? (totalAmount * 1.2).toFixed(2) + ' (inc. 20% premium)' 
                : totalAmount.toFixed(2)}
            </span>
          </div>
          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-zim-green hover:bg-zim-green/90"
          >
            {loading ? "Processing..." : `Pay Now ${paymentMethod === 'goods_arriving' ? '(Later)' : ''}`}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PaymentMethodSection;
