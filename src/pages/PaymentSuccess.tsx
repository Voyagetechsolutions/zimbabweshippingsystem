
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    document.title = 'Payment Successful | UK to Zimbabwe Shipping';
  }, []);
  
  useEffect(() => {
    const fetchReceiptData = async () => {
      setLoading(true);
      
      try {
        // Get parameters from URL 
        const sessionId = searchParams.get('session_id');
        const paymentIntent = searchParams.get('payment_intent');
        const paymentId = searchParams.get('payment_id');
        const receiptId = searchParams.get('receipt_id');
        
        console.log("URL parameters:", { sessionId, paymentIntent, paymentId, receiptId });
        
        if (!sessionId && !paymentIntent && !paymentId && !receiptId) {
          throw new Error('No payment information found');
        }
        
        let receipt;
        
        // If we have a receipt ID directly
        if (receiptId) {
          console.log("Fetching receipt by ID:", receiptId);
          
          // Use tableFrom helper to type-cast the table name
          const { data, error } = await supabase
            .from(tableFrom('receipts'))
            .select('*, payments(*), shipments(*)')
            .eq('id', receiptId)
            .single();
          
          if (error) {
            console.error("Error fetching receipt by ID:", error);
            throw error;
          }
          
          receipt = data;
          setShipmentData(data.shipments);
          console.log("Receipt data loaded:", data.id);
        }
        // Otherwise verify with the payment processor and get receipt
        else {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { 
              session_id: sessionId,
              payment_intent: paymentIntent,
              payment_id: paymentId
            }
          });
          
          if (error) throw error;
          
          if (!data || !data.receiptId) {
            throw new Error('Could not verify payment');
          }
          
          // Fetch the receipt data using the tableFrom helper
          const { data: receiptData, error: receiptError } = await supabase
            .from(tableFrom('receipts'))
            .select('*, payments(*), shipments(*)')
            .eq('id', data.receiptId)
            .single();
            
          if (receiptError) throw receiptError;
          receipt = receiptData;
          setShipmentData(receiptData.shipments);
        }
        
        setReceiptData(receipt);
      } catch (err: any) {
        console.error('Error fetching receipt:', err);
        setError(err.message || 'Failed to load receipt data');
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message || "Could not load receipt information"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchReceiptData();
  }, [searchParams, toast]);

  // Helper function to get friendly payment method name
  const getPaymentMethodDisplay = () => {
    if (!receiptData || !receiptData.payment_method) return 'Standard Payment';
    
    const method = receiptData.payment_method;
    
    switch(method) {
      case 'goods_arriving':
        return 'Pay on Goods Arriving in Zimbabwe';
      case 'cashOnCollection':
      case 'cash_on_collection':
        return 'Cash on Collection (Special Deal)';
      case 'cash':
        return 'Cash Payment (30-day terms)';
      case 'bank_transfer':
        return 'Bank Transfer (30-day terms)';
      case 'direct_debit':
        return 'Direct Debit (30-day terms)';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 md:py-12 w-full">
        <div className="container mx-auto max-w-5xl w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 md:py-16">
              <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-zim-green mb-4" />
              <h2 className="text-xl md:text-2xl font-semibold">Loading Receipt...</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">Please wait while we retrieve your payment information</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 md:py-16 w-full">
              <Card className="bg-red-50 dark:bg-red-900/20 p-4 md:p-6 w-full">
                <h2 className="text-xl md:text-2xl font-semibold text-red-700 dark:text-red-400">Payment Verification Error</h2>
                <p className="text-gray-700 dark:text-gray-300 mt-2 mb-4 md:mb-6">{error}</p>
                <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              </Card>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full p-2 md:p-3">
                  <CheckCircle2 className="h-8 w-8 md:h-12 md:w-12 text-green-500" />
                </div>
              </div>
              
              <div className="text-center mb-6 md:mb-10">
                <h1 className="text-2xl md:text-4xl font-bold mb-2">Booking Successful!</h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-sm md:text-base">
                  Thank you for your booking. Your shipment has been confirmed and is being processed.
                </p>
                <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm md:text-base">
                  You can view your receipt details on your dashboard.
                </p>
                
                {receiptData && receiptData.payment_method && (
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-3 inline-block mx-auto">
                    <p className="font-medium text-blue-800 dark:text-blue-300">
                      Payment Method: {getPaymentMethodDisplay()}
                    </p>
                    {receiptData.payment_method === 'bank_transfer' && (
                      <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                        <p>Please transfer to: Zimbabwe Shipping Ltd</p>
                        <p>Account: 12345678 | Sort Code: 12-34-56</p>
                        <p>Reference: {receiptData.receipt_number}</p>
                      </div>
                    )}
                    {receiptData.payment_method === 'goods_arriving' && (
                      <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                        You'll pay when your goods arrive in Zimbabwe (20% premium included).
                      </p>
                    )}
                    {(receiptData.payment_method === 'cash_on_collection' || receiptData.payment_method === 'cashOnCollection') && (
                      <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                        Please have cash ready when we collect your items. £20 discount applied on each drum!
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <Card className="mt-6 p-4 md:p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-full">
                <h2 className="text-xl font-bold mb-4">Receipt Information</h2>
                {receiptData && (
                  <>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Receipt Number:</span> {receiptData.receipt_number}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Date:</span> {new Date(receiptData.created_at).toLocaleDateString()}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Amount:</span> {receiptData.currency || '£'}{receiptData.amount}</p>
                    <div className="mt-4">
                      <Button onClick={() => navigate(`/receipt/${receiptData.id}`)}>
                        View Full Receipt
                      </Button>
                    </div>
                  </>
                )}
              </Card>
              
              <div className="flex justify-center mt-6 md:mt-8">
                <Button 
                  className="bg-zim-green hover:bg-zim-green/90 w-full sm:w-auto"
                  onClick={() => navigate('/dashboard')}
                >
                  {isMobile ? 'Dashboard' : 'Go to Dashboard'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default PaymentSuccess;
