import React, { useEffect, useRef, useState } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { supabase } from '@/integrations/supabase/client';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Download, Mail, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReceiptComponent from '@/components/Receipt';

/**
 * Receipt page component that displays a receipt for a shipment
 * It gets data from:
 * 1. location.state passed from BookShipment.tsx
 * 2. URL params if accessed directly with receipt ID
 */
const Receipt = () => {
  // Get data passed from BookShipment.tsx via react-router's useLocation
  const location = useLocation();
  const { bookingData, paymentData, customQuoteData, receiptData } = location.state || {};
  
  // Get receipt ID from URL params
  const { id: receiptId } = useParams();
  
  // Reference for the receipt to be printed/downloaded
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // State for storing receipt data from database if needed
  const [fetchedReceiptData, setFetchedReceiptData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  console.log("Receipt page mounted with data:", { bookingData, paymentData, customQuoteData, receiptData });

  // Effect to fetch data from Supabase if not passed via location
  useEffect(() => {
    document.title = 'Payment Receipt | UK Shipping Service';
    
    // If we don't have data from navigation state, we try to load it from URL params
    const fetchReceipt = async () => {
      if ((!bookingData && !receiptData) && receiptId) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .eq('id', receiptId)
            .single();
            
          if (error) {
            throw error;
          }
          
          if (data) {
            console.log("Fetched receipt data:", data);
            setFetchedReceiptData(data);
          } else {
            // Handle case when no data is found
            toast({
              title: 'Receipt not found',
              description: 'We could not find the receipt you requested',
              variant: 'destructive'
            });
          }
        } catch (error: any) {
          console.error('Error fetching receipt:', error);
          toast({
            title: 'Error loading receipt',
            description: error.message || 'Failed to load receipt data',
            variant: 'destructive'
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchReceipt();
  }, [receiptId, bookingData, toast]);

  // Helper function to print the receipt
  const handlePrint = () => {
    const printContent = document.getElementById('receipt-to-print');
    const originalContents = document.body.innerHTML;
    
    if (printContent) {
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React functionality
    } else {
      toast({
        title: "Print Error",
        description: "Could not prepare receipt for printing",
        variant: "destructive"
      });
    }
  };

  // Helper function to download the receipt as PDF
  const handleDownload = async () => {
    if (!receiptRef.current) return;
    
    try {
      setIsLoading(true);
      toast({
        title: "Preparing Download",
        description: "Generating your receipt PDF...",
      });
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      
      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`shipping-receipt-${bookingData?.shipment_id || receiptData?.id || 'download'}.pdf`);
      
      toast({
        title: "Download Complete",
        description: "Your receipt has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed",
        description: "There was an error generating your receipt PDF.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to email the receipt
  const handleEmail = async () => {
    // In a real implementation, this would call a serverless function to send an email
    toast({
      title: "Email Sent",
      description: "Receipt has been emailed to your registered email address.",
    });
  };

  // Use receiptData from location.state (from PaymentProcessor) or fetchedReceiptData from database
  // or directly use bookingData and paymentData to construct receipt data
  const data = receiptData || fetchedReceiptData || {
    ...bookingData,
    payment_info: paymentData,
    sender_details: bookingData?.senderDetails || {},
    recipient_details: bookingData?.recipientDetails || {},
    shipment_details: bookingData?.shipmentDetails || {},
    collection_info: {
      pickup_address: bookingData?.pickupAddress,
      pickup_postcode: bookingData?.pickupPostcode,
      pickup_country: bookingData?.pickupCountry
    }
  };
  
  // If we have no data to display and still loading, show loading state
  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold mb-4">Loading Receipt...</h1>
            <p className="mb-6">Please wait while we load your receipt information.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
  // If we have no data to display and not loading, show error message
  if (!data && !bookingData) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold mb-4">Receipt Not Found</h1>
            <p className="mb-6">The receipt you're looking for couldn't be loaded. Please check your booking details.</p>
            <Link to="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  console.log("Final data being passed to ReceiptComponent:", data);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">Shipping Receipt</h1>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handlePrint}
                disabled={isLoading}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownload}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button 
                variant="outline" 
                onClick={handleEmail}
                disabled={isLoading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
          
          {/* Receipt content - using the receipt component */}
          <div ref={receiptRef}>
            <ReceiptComponent 
              receipt={data} 
              shipment={bookingData?.shipmentDetails} 
            />
          </div>
          
          {/* Action buttons below receipt */}
          <div className="mt-6 flex justify-center">
            <Link to="/dashboard">
              <Button variant="outline" className="mr-2">Go to Dashboard</Button>
            </Link>
            <Link to="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Receipt;
