
import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import { Receipt as ReceiptType } from '@/types/receipt';
import { Shipment } from '@/types/shipment';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Receipt from '@/components/Receipt';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

// This page has multiple data sources:
// 1. From URL state when navigating from the booking/payment flow
// 2. From URL params when viewing a specific receipt by ID
// 3. From the database when neither of the above are available

const ReceiptPage = () => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for receipt data and loading status
  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Receipt data can come from navigation state or URL param
  const receiptData = location.state?.receiptData;
  const receiptId = params.id;
  
  useEffect(() => {
    document.title = 'Receipt | Zimbabwe Shipping';
  }, []);
  
  useEffect(() => {
    async function fetchReceiptData() {
      try {
        setLoading(true);
        
        // Case 1: Data from navigation state
        if (receiptData) {
          console.log('Using receipt data from navigation state:', receiptData);
          setReceipt(receiptData as ReceiptType);
          
          if (receiptData.shipment_id) {
            const { data: shipmentData } = await supabase
              .from(tableFrom('shipments'))
              .select('*')
              .eq('id', receiptData.shipment_id)
              .single();
              
            if (shipmentData) setShipment(shipmentData as Shipment);
          }
          
          return;
        }
        
        // Case 2: Fetch receipt by ID from URL
        if (receiptId) {
          console.log('Fetching receipt data by ID:', receiptId);
          
          const { data: receiptFromDb, error: receiptError } = await supabase
            .from(tableFrom('receipts'))
            .select('*')
            .eq('id', receiptId)
            .single();
          
          if (receiptError) {
            console.error('Error fetching receipt:', receiptError);
            setError('Receipt not found');
            return;
          }
          
          setReceipt(receiptFromDb as ReceiptType);
          
          if (receiptFromDb.shipment_id) {
            const { data: shipmentData } = await supabase
              .from(tableFrom('shipments'))
              .select('*')
              .eq('id', receiptFromDb.shipment_id)
              .single();
              
            if (shipmentData) setShipment(shipmentData as Shipment);
          }
          
          return;
        }
        
        // Case 3: No receipt data available
        setError('No receipt information found');
      } catch (err) {
        console.error('Error loading receipt:', err);
        setError('Failed to load receipt information');
      } finally {
        setLoading(false);
      }
    }
    
    fetchReceiptData();
  }, [receiptData, receiptId]);

  return (
    <>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50 py-8 px-4 md:py-12">
        <div className="container mx-auto max-w-4xl">
          {/* Back button */}
          <div className="mb-6">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
              <span className="ml-3 text-lg">Loading receipt...</span>
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
              <p className="mb-4">{error}</p>
              <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </Card>
          ) : (
            receipt && <Receipt receipt={receipt} shipment={shipment} />
          )}
        </div>
      </div>
      
      <Footer />
    </>
  );
};

export default ReceiptPage;
