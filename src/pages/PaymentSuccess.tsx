import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shipment } from '@/types/shipment';
import { Button } from '@/components/ui/button';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);

  // Parse the query parameters to get the payment ID
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('payment_id');
    setPaymentId(id);

    if (id) {
      getPaymentDetails(id);
    } else {
      setLoading(false);
    }
  }, [location.search]);

  const getPaymentDetails = async (id: string) => {
    try {
      // Get payment and related shipment
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          shipment:shipment_id (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (payment && payment.shipment) {
        setShipment(payment.shipment as Shipment);
      }
    } catch (err) {
      console.error('Error fetching payment details:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = () => {
    if (paymentId) {
      navigate(`/receipt?payment_id=${paymentId}`);
    }
  };

  const viewShipment = () => {
    if (shipment) {
      navigate(`/shipment/${shipment.id}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-8">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Payment Successful!</h1>
            {loading ? (
              <div className="text-center">Loading payment details...</div>
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Thank you for your payment. Your transaction was successful.
                </p>
                {shipment && (
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Shipment Details</h2>
                    <p className="text-gray-700 dark:text-gray-300">
                      Tracking Number: {shipment.tracking_number}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Status: {shipment.status}
                    </p>
                  </div>
                )}
                <div className="flex justify-between">
                  <Button onClick={viewReceipt}>View Receipt</Button>
                  {shipment && (
                    <Button onClick={viewShipment}>View Shipment</Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
