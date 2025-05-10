import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Shipment } from '@/types/shipment';
import { formatCurrency } from '@/utils/formatters';
import type { Receipt as ReceiptType } from '@/types/receipt';

const Receipt = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentId = params.get('payment_id');
    
    if (paymentId) {
      fetchReceipt(paymentId);
    } else {
      setLoading(false);
    }
  }, [location.search]);

  const fetchReceipt = async (paymentId: string) => {
    try {
      // First check if a receipt exists for this payment
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .select('*')
        .eq('payment_id', paymentId)
        .maybeSingle();
      
      if (receiptError) throw receiptError;
      
      // If receipt exists
      if (receiptData) {
        setReceipt(receiptData as ReceiptType);
        
        // Get the associated shipment
        if (receiptData.shipment_id) {
          const { data: shipmentData, error: shipmentError } = await supabase
            .from('shipments')
            .select('*')
            .eq('id', receiptData.shipment_id)
            .maybeSingle();
            
          if (shipmentError) throw shipmentError;
          
          if (shipmentData) {
            setShipment(shipmentData as Shipment);
          }
        }
      } else {
        // No receipt found, get payment details directly
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select(`
            *,
            shipment:shipment_id (*)
          `)
          .eq('id', paymentId)
          .single();
          
        if (paymentError) throw paymentError;
        
        if (paymentData && paymentData.shipment) {
          setShipment(paymentData.shipment as Shipment);
        }
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  if (!receipt && !shipment) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Receipt Not Found</h3>
              <p className="text-gray-500">No receipt found for this payment.</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="bg-white shadow-md rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Receipt</h2>

            {receipt && (
              <>
                <div className="mb-4">
                  <strong>Receipt Number:</strong> {receipt.receipt_number}
                </div>
                <div className="mb-4">
                  <strong>Date:</strong> {new Date(receipt.created_at).toLocaleDateString()}
                </div>
                <div className="mb-4">
                  <strong>Payment Method:</strong> {receipt.payment_method}
                </div>
                <div className="mb-4">
                  <strong>Amount:</strong> {formatCurrency(receipt.amount || 0, receipt.currency || 'USD')}
                </div>
              </>
            )}

            {shipment && (
              <>
                <h3 className="text-xl font-semibold mt-8 mb-4">Shipment Details</h3>
                <div className="mb-4">
                  <strong>Tracking Number:</strong> {shipment.tracking_number}
                </div>
                <div className="mb-4">
                  <strong>Origin:</strong> {shipment.origin}
                </div>
                <div className="mb-4">
                  <strong>Destination:</strong> {shipment.destination}
                </div>
                <div className="mb-4">
                  <strong>Status:</strong> {shipment.status}
                </div>
              </>
            )}

            {!receipt && shipment && (
              <p className="text-gray-500">
                A receipt has not yet been generated for this payment.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Receipt;
