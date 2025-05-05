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
  const [paymentData, setPaymentData] = useState<any>(null);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    document.title = 'Payment Successful | UK to Zimbabwe Shipping';
  }, []);
  
  useEffect(() => {
    const fetchPaymentData = async () => {
      setLoading(true);
      
      try {
        // Get parameters from URL 
        const sessionId = searchParams.get('session_id');
        const paymentIntent = searchParams.get('payment_intent');
        const paymentId = searchParams.get('payment_id');
        const shipmentId = searchParams.get('shipment_id');
        
        console.log("URL parameters:", { sessionId, paymentIntent, paymentId, shipmentId });
        
        if (!sessionId && !paymentIntent && !paymentId && !shipmentId) {
          throw new Error('No payment information found');
        }
        
        let payment;
        let shipment;
        
        // If we have a shipment ID directly
        if (shipmentId) {
          console.log("Fetching shipment by ID:", shipmentId);
          
          // Use tableFrom helper to type-cast the table name
          const { data, error } = await supabase
            .from(tableFrom('shipments'))
            .select('*')
            .eq('id', shipmentId)
            .single();
          
          if (error) {
            console.error("Error fetching shipment by ID:", error);
            throw error;
          }
          
          shipment = data;
          setShipmentData(data);
          console.log("Shipment data loaded:", data.id);
          
          // Also fetch the payment data
          const { data: paymentData, error: paymentError } = await supabase
            .from(tableFrom('payments'))
            .select('*')
            .eq('shipment_id', shipmentId)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (paymentError) {
            console.error("Error fetching payment data:", paymentError);
          } else if (paymentData && paymentData.length > 0) {
            payment = paymentData[0];
            setPaymentData(payment);
          }
        }
        // Otherwise verify with the payment processor and get payment
        else {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { 
              session_id: sessionId,
              payment_intent: paymentIntent,
              payment_id: paymentId
            }
          });
          
          if (error) throw error;
          
          if (!data || !data.paymentId) {
            throw new Error('Could not verify payment');
          }
          
          // Fetch the payment data
          const { data: paymentData, error: paymentError } = await supabase
            .from(tableFrom('payments'))
            .select('*')
            .eq('id', data.paymentId)
            .single();
            
          if (paymentError) throw paymentError;
          payment = paymentData;
          
          // Also fetch the shipment data
          if (payment.shipment_id) {
            const { data: shipmentData, error: shipmentError } = await supabase
              .from(tableFrom('shipments'))
              .select('*')
              .eq('id', payment.shipment_id)
              .single();
              
            if (shipmentError) {
              console.error("Error fetching shipment:", shipmentError);
            } else {
              shipment = shipmentData;
              setShipmentData(shipmentData);
            }
          }
        }
        
        setPaymentData(payment);
        
        // If shipment data is available, redirect to ConfirmBooking
        if (shipment) {
          setTimeout(() => {
            navigate(`/confirm-booking/${shipment.id}`, {
              state: { 
                shipmentId: shipment.id,
                bookingData: {
                  amount: payment?.amount,
                  paymentMethod: payment?.payment_method,
                  paymentCompleted: true
                }
              }
            });
          }, 2000); // Short delay to show success message
        }
      } catch (err: any) {
        console.error('Error fetching payment data:', err);
        setError(err.message || 'Failed to load payment data');
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message || "Could not load payment information"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentData();
  }, [searchParams, toast, navigate]);

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 py-8 px-4 md:py-12">
        <div className="container mx-auto max-w-5xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 md:py-16">
              <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-zim-green mb-4" />
              <h2 className="text-xl md:text-2xl font-semibold">Processing Your Payment...</h2>
              <p className="text-gray-500 mt-2 text-center">Please wait while we verify your payment information</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 md:py-16">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-semibold text-red-700">Payment Verification Error</h2>
                <p className="text-gray-700 mt-2 mb-4 md:mb-6">{error}</p>
                <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="bg-green-50 border border-green-200 rounded-full p-2 md:p-3">
                  <CheckCircle2 className="h-8 w-8 md:h-12 md:w-12 text-green-500" />
                </div>
              </div>
              
              <div className="text-center mb-6 md:mb-10">
                <h1 className="text-2xl md:text-4xl font-bold mb-2">Booking Successful!</h1>
                <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
                  Thank you for your booking. Your shipment has been confirmed and is being processed.
                </p>
                <p className="text-gray-600 mt-2 text-sm md:text-base">
                  You will be redirected to your booking confirmation...
                </p>
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
