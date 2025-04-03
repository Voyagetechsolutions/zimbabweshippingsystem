
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Receipt from '@/components/Receipt';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
        // Get session_id and payment_intent from URL parameters (added by Stripe/PayPal redirect)
        const sessionId = searchParams.get('session_id');
        const paymentIntent = searchParams.get('payment_intent');
        const paymentId = searchParams.get('payment_id');
        const receiptId = searchParams.get('receipt_id');
        
        if (!sessionId && !paymentIntent && !paymentId && !receiptId) {
          throw new Error('No payment information found');
        }
        
        let receipt;
        
        // If we have a receipt ID directly
        if (receiptId) {
          // Use tableFrom helper to type-cast the table name
          const { data, error } = await supabase
            .from(tableFrom('receipts'))
            .select('*, payments(*), shipments(*)')
            .eq('id', receiptId)
            .single();
          
          if (error) throw error;
          receipt = data;
          setShipmentData(data.shipments);
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

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-zim-green mb-4" />
              <h2 className="text-2xl font-semibold">Loading Receipt...</h2>
              <p className="text-gray-500 mt-2">Please wait while we retrieve your payment information</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-red-700">Payment Verification Error</h2>
                <p className="text-gray-700 mt-2 mb-6">{error}</p>
                <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-8">
                <div className="bg-green-50 border border-green-200 rounded-full p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
              </div>
              
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Payment Successful!</h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Thank you for your payment. Your shipment has been confirmed and is being processed.
                </p>
              </div>
              
              {receiptData && <Receipt receipt={receiptData} shipment={shipmentData} />}
              
              <div className="flex justify-center mt-8">
                <Button 
                  className="bg-zim-green hover:bg-zim-green/90"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
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
