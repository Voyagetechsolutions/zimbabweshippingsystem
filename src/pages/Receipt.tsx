
import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import { Receipt as ReceiptType } from '@/types/receipt';
import { Shipment } from '@/types/shipment';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { Printer, Download, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import Logo from '@/components/Logo';

// This page has multiple data sources:
// 1. From URL state when navigating from the booking/payment flow
// 2. From URL params when viewing a specific receipt by ID
// 3. From the database when neither of the above are available

const Receipt = () => {
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
  
  // Handle print receipt
  const handlePrint = () => {
    window.print();
  };
  
  // Handle download receipt as PDF
  const handleDownload = () => {
    const receiptElement = document.getElementById('receipt');
    if (!receiptElement) return;
    
    const options = {
      margin: 10,
      filename: `receipt-${receipt?.receipt_number || 'zimbabwe-shipping'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().from(receiptElement).set(options).save();
    
    toast({
      title: "Receipt Downloaded",
      description: "Your receipt has been downloaded as a PDF file."
    });
  };
  
  // Handle email receipt
  const handleEmail = () => {
    // In a real implementation, this would call an API to send the email
    toast({
      title: "Receipt Emailed",
      description: "Your receipt has been sent to your email address."
    });
  };
  
  // Extract data from the receipt object
  const receiptNumber = receipt?.receipt_number;
  const createdAt = receipt?.created_at;
  const senderDetails = receipt?.sender_details as any;
  const recipientDetails = receipt?.recipient_details as any;
  const shipmentDetails = receipt?.shipment_details as any;
  const collectionInfo = receipt?.collection_info as any;
  const paymentInfo = receipt?.payment_info as any;
  
  // Format payment method display
  const getPaymentMethodDisplay = () => {
    if (!receipt?.payment_method && !paymentInfo?.method) return 'Standard Payment';
    
    const method = receipt?.payment_method || paymentInfo?.method;
    
    switch(method) {
      case 'payOnArrival':
        return 'Pay on Arrival (20% Premium)';
      case 'cashOnCollection':
        return 'Cash on Collection';
      case 'bankTransfer':
        return 'Bank Transfer';
      case 'payLater':
        return '30-Day Payment Terms';
      default:
        return method?.charAt(0).toUpperCase() + method?.slice(1).replace(/_/g, ' ');
    }
  };

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
            <div className="bg-white shadow-md rounded-lg p-6 md:p-8 mb-6" id="receipt">
              {/* Receipt Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6">
                <div>
                  {/* Logo */}
                  <Logo size="medium" />
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <h2 className="text-2xl font-bold text-gray-800">RECEIPT</h2>
                  <p className="text-gray-600">#{receiptNumber}</p>
                  <p className="text-gray-600">Date: {formatDate(createdAt || new Date().toISOString())}</p>
                </div>
              </div>
              
              {/* Sender and Recipient Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Sender Details */}
                <div className="border rounded-md p-4">
                  <h3 className="text-md font-semibold mb-2">Sender Details</h3>
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {senderDetails?.name || `${senderDetails?.firstName || ''} ${senderDetails?.lastName || ''}`.trim() || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Email:</span> {senderDetails?.email || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Phone:</span> {senderDetails?.phone || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Address:</span> {senderDetails?.address || 'N/A'}
                  </p>
                </div>
                
                {/* Recipient Details */}
                <div className="border rounded-md p-4">
                  <h3 className="text-md font-semibold mb-2">Recipient Details</h3>
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {recipientDetails?.name || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Phone:</span> {recipientDetails?.phone || 'N/A'}
                  </p>
                  {recipientDetails?.additionalPhone && (
                    <p className="text-sm">
                      <span className="font-medium">Additional Phone:</span> {recipientDetails.additionalPhone}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Address:</span> {recipientDetails?.address || 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Shipment Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Shipment Details</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Tracking Number</p>
                      <p className="text-sm">{shipmentDetails?.tracking_number || shipment?.tracking_number || 'Not assigned yet'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm">
                        {shipmentDetails?.type === 'drum' 
                          ? `${shipmentDetails.quantity || 1} x Drum${(shipmentDetails.quantity || 1) > 1 ? 's' : ''}` 
                          : (shipmentDetails?.description || 'Custom shipment')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Payment Status</p>
                      <p className="text-sm">{(paymentInfo?.status || receipt?.status || 'Pending').charAt(0).toUpperCase() + (paymentInfo?.status || receipt?.status || 'Pending').slice(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Payment Method</p>
                      <p className="text-sm">{getPaymentMethodDisplay()}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Collection & Delivery Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Collection & Delivery Information</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Collection Date</p>
                      <p className="text-sm">{collectionInfo?.date || 'To be scheduled'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Collection Area</p>
                      <p className="text-sm">{collectionInfo?.area || collectionInfo?.pickup_country || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pickup Address</p>
                      <p className="text-sm text-red-600 font-medium">{collectionInfo?.pickup_address || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Delivery Address</p>
                      <p className="text-sm text-red-600 font-medium">{recipientDetails?.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Amount</p>
                      <p className="text-sm">{formatCurrency(paymentInfo?.finalAmount || receipt?.amount || 0, paymentInfo?.currency || receipt?.currency || 'GBP')}</p>
                    </div>
                    {paymentInfo?.originalAmount && paymentInfo.originalAmount !== paymentInfo.finalAmount && (
                      <div>
                        <p className="text-sm font-medium">Original Amount</p>
                        <p className="text-sm">{formatCurrency(paymentInfo.originalAmount, paymentInfo.currency || 'GBP')}</p>
                      </div>
                    )}
                    {paymentInfo?.discount > 0 && (
                      <div>
                        <p className="text-sm font-medium">Discount</p>
                        <p className="text-sm text-green-600">-{formatCurrency(paymentInfo.discount, paymentInfo.currency || 'GBP')}</p>
                      </div>
                    )}
                    {paymentInfo?.premium > 0 && (
                      <div>
                        <p className="text-sm font-medium">Premium</p>
                        <p className="text-sm text-amber-600">+{formatCurrency(paymentInfo.premium, paymentInfo.currency || 'GBP')}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm">{formatDate(paymentInfo?.date || receipt?.created_at || new Date().toISOString())}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Terms and Conditions */}
              <div className="text-xs text-gray-500 mt-6 border-t pt-4">
                <p className="mb-1">Thank you for choosing Zimbabwe Shipping Ltd for your shipping needs.</p>
                <p>For any queries related to this receipt, please contact us at support@zimbabwe-shipping.co.uk or call +44 7984 099041.</p>
              </div>
            </div>
          )}
          
          {/* Receipt Actions */}
          {!loading && !error && (
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                onClick={handlePrint}
                className="flex items-center justify-center"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" /> 
                Print Receipt
              </Button>
              
              <Button 
                onClick={handleDownload}
                className="flex items-center justify-center"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" /> 
                Download PDF
              </Button>
              
              <Button 
                onClick={handleEmail}
                className="flex items-center justify-center"
                variant="outline"
              >
                <Mail className="h-4 w-4 mr-2" /> 
                Email Receipt
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </>
  );
};

export default Receipt;
