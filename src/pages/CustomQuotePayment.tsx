
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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
  ArrowLeftCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CreditCard,
  Building,
  BanknoteIcon
} from 'lucide-react';
import { generateUniqueId } from '@/lib/utils';

const CustomQuotePayment = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [paymentData, setPaymentData] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Retrieve payment data from localStorage
    const storedData = localStorage.getItem('customQuotePayment');
    if (!storedData) {
      toast({
        title: 'Error',
        description: 'No payment data found. Please start from the custom quote page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }
    
    try {
      const parsedData = JSON.parse(storedData);
      setPaymentData(parsedData);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing payment data:', error);
      toast({
        title: 'Error',
        description: 'Invalid payment data. Please start from the custom quote page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [navigate, toast]);
  
  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to complete your payment.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }
      
      const transactionId = generateUniqueId('TX-');
      
      // Create payment record in the database
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          shipment_id: paymentData.shipment_id,
          amount: paymentData.quoted_amount,
          currency: 'GBP',
          payment_method: selectedPaymentMethod,
          payment_status: 'completed',
          transaction_id: transactionId
        })
        .select()
        .single();
      
      if (paymentError) {
        throw paymentError;
      }
      
      const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
      
      // Create receipt record
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          shipment_id: paymentData.shipment_id,
          payment_id: paymentRecord.id,
          receipt_number: receiptNumber,
          amount: paymentData.quoted_amount,
          currency: 'GBP',
          payment_method: selectedPaymentMethod,
          status: 'completed',
          sender_details: paymentData.senderDetails,
          recipient_details: paymentData.recipientDetails,
          shipment_details: {
            ...paymentData.shipmentDetails,
            custom_quote: true,
            quoted_amount: paymentData.quoted_amount
          }
        })
        .select()
        .single();
      
      if (receiptError) {
        throw receiptError;
      }
      
      // Update custom quote status to accepted
      await supabase
        .from('custom_quotes')
        .update({ status: 'accepted' })
        .eq('id', paymentData.custom_quote_id);
      
      // Update shipment status
      await supabase
        .from('shipments')
        .update({ 
          status: 'pending_collection',
          metadata: {
            ...paymentData.shipmentDetails,
            payment_status: 'completed',
            custom_quote: true,
            quoted_amount: paymentData.quoted_amount
          }
        })
        .eq('id', paymentData.shipment_id);
      
      // Create notification for admin
      await supabase.from('notifications').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Admin placeholder
        title: 'Custom Quote Payment',
        message: `Payment received for custom quote: ${paymentData.quoted_amount.toFixed(2)} GBP`,
        type: 'payment',
        related_id: paymentRecord.id,
        is_read: false
      });
      
      // Clear the localStorage data
      localStorage.removeItem('customQuotePayment');
      
      toast({
        title: 'Payment Successful',
        description: 'Your payment has been processed successfully.',
      });
      
      navigate(`/payment-success?receipt_id=${receiptData.id}`);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'There was a problem processing your payment. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-zim-green mb-4" />
            <p className="text-xl">Loading payment details...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
  if (!paymentData) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>Payment information not found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-4">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <p className="mb-6">
                  We couldn't find the payment information. Please return to your dashboard and try again.
                </p>
                <Button onClick={() => navigate('/dashboard')} className="bg-zim-green hover:bg-zim-green/90">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <Link to="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeftCircle className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
            
            <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">
              Complete Your Payment
            </h1>
            <p className="text-gray-600 max-w-2xl">
              Choose your payment method to complete the custom quote payment
            </p>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Select how you would like to pay for your custom quote
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onValueChange={setSelectedPaymentMethod}
                  className="space-y-4"
                >
                  <div className={`flex items-start space-x-3 border rounded-md p-4 ${selectedPaymentMethod === 'card' ? 'bg-blue-50 border-blue-300' : ''}`}>
                    <RadioGroupItem value="card" id="card" />
                    <div className="space-y-2 w-full">
                      <Label htmlFor="card" className="flex items-center text-lg font-medium">
                        <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                        Pay by Card
                      </Label>
                      <p className="text-sm text-gray-600">
                        Make a secure payment using your credit or debit card
                      </p>
                    </div>
                  </div>
                  
                  <div className={`flex items-start space-x-3 border rounded-md p-4 ${selectedPaymentMethod === 'bank_transfer' ? 'bg-blue-50 border-blue-300' : ''}`}>
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <div className="space-y-2 w-full">
                      <Label htmlFor="bank_transfer" className="flex items-center text-lg font-medium">
                        <Building className="h-5 w-5 mr-2 text-blue-600" />
                        Bank Transfer
                      </Label>
                      <p className="text-sm text-gray-600">
                        Pay via bank transfer using our banking details
                      </p>
                      
                      {selectedPaymentMethod === 'bank_transfer' && (
                        <div className="mt-2 p-3 bg-blue-100 rounded text-sm">
                          <p className="font-medium">Bank Transfer Details:</p>
                          <p>Account Name: Zimbabwe Shipping Ltd</p>
                          <p>Account Number: 12345678</p>
                          <p>Sort Code: 12-34-56</p>
                          <p>Reference: Your tracking number</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex items-start space-x-3 border rounded-md p-4 ${selectedPaymentMethod === 'cash' ? 'bg-blue-50 border-blue-300' : ''}`}>
                    <RadioGroupItem value="cash" id="cash" />
                    <div className="space-y-2 w-full">
                      <Label htmlFor="cash" className="flex items-center text-lg font-medium">
                        <BanknoteIcon className="h-5 w-5 mr-2 text-blue-600" />
                        Cash on Collection
                      </Label>
                      <p className="text-sm text-gray-600">
                        Pay in cash when we collect your items
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
              <CardFooter className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={isProcessing}
                  className="flex items-center"
                >
                  <ArrowLeftCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="bg-zim-green hover:bg-zim-green/90 text-white flex items-center w-full md:w-auto"
                  type="button"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
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
                  <div className="flex justify-between">
                    <span className="text-gray-600">Custom Quote</span>
                    <span>£{paymentData.quoted_amount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t font-bold">
                    <span>Total</span>
                    <span className="text-zim-green">£{paymentData.quoted_amount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CustomQuotePayment;
