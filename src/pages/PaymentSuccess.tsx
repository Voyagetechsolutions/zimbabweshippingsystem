
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
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
      
      <main className="min-h-screen w-full bg-gray-50 py-8 px-4 md:py-12 dark:bg-gray-800">
        <div className="container mx-auto max-w-5xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 md:py-16">
              <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-zim-green mb-4" />
              <h2 className="text-xl md:text-2xl font-semibold dark:text-gray-100">Loading Receipt...</h2>
              <p className="text-gray-500 mt-2 text-center dark:text-gray-300">Please wait while we retrieve your payment information</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 md:py-16">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 dark:bg-red-900/20 dark:border-red-800">
                <h2 className="text-xl md:text-2xl font-semibold text-red-700 dark:text-red-300">Payment Verification Error</h2>
                <p className="text-gray-700 mt-2 mb-4 md:mb-6 dark:text-gray-300">{error}</p>
                <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="bg-green-50 border border-green-200 rounded-full p-2 md:p-3 dark:bg-green-900/20 dark:border-green-800">
                  <CheckCircle2 className="h-8 w-8 md:h-12 md:w-12 text-green-500" />
                </div>
              </div>
              
              <div className="text-center mb-6 md:mb-10">
                <h1 className="text-2xl md:text-4xl font-bold mb-2 dark:text-white">Booking Successful!</h1>
                <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base dark:text-gray-300">
                  Thank you for your booking. Your shipment has been confirmed and is being processed.
                </p>
                <p className="text-gray-600 mt-2 text-sm md:text-base dark:text-gray-300">
                  You can view your receipt details on your dashboard.
                </p>
                
                {receiptData && receiptData.payment_method && (
                  <div className="mt-4 bg-blue-50 border border-blue-100 rounded-md p-3 inline-block mx-auto dark:bg-blue-900/20 dark:border-blue-800">
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
                    {receiptData.payment_method === 'cash_on_collection' && (
                      <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                        Please have cash ready when we collect your items. £20 discount applied on each drum!
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-6 border border-gray-200 rounded-lg p-4 md:p-6 bg-white dark:bg-gray-700 dark:border-gray-600">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Receipt Information</h2>
                {receiptData && (
                  <>
                    <p className="text-gray-700 dark:text-gray-200"><span className="font-medium">Receipt Number:</span> {receiptData.receipt_number}</p>
                    <p className="text-gray-700 dark:text-gray-200"><span className="font-medium">Date:</span> {new Date(receiptData.created_at).toLocaleDateString()}</p>
                    <p className="text-gray-700 dark:text-gray-200"><span className="font-medium">Amount:</span> {receiptData.currency || '£'}{receiptData.amount}</p>
                    <div className="mt-4">
                      <Button onClick={() => navigate(`/receipt/${receiptData.id}`)}>
                        View Full Receipt
                      </Button>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-center mt-6 md:mt-8">
                <Button 
                  className="bg-zim-green hover:bg-zim-green/90 w-full md:w-auto"
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
