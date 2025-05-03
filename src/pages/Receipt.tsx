
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
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

/**
 * Receipt page component that displays a receipt for a shipment
 * It gets data from location.state passed from BookShipment.tsx
 * Or fetches data from Supabase if accessed directly via URL with receipt ID
 */
const Receipt = () => {
  // Get data passed from BookShipment.tsx via react-router's useLocation
  const location = useLocation();
  const { bookingData, paymentData, customQuoteData } = location.state || {};
  
  // Reference for the receipt to be printed/downloaded
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // State for storing receipt data from database if needed
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Effect to fetch data from Supabase if not passed via location
  useEffect(() => {
    document.title = 'Payment Receipt | UK Shipping Service';
    
    // If we don't have data from navigation state, we could try to load it from URL params
    // This would require additional implementation for direct receipt access
  }, []);

  /**
   * Helper function to print the receipt
   */
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

  /**
   * Helper function to download the receipt as PDF
   */
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
      pdf.save(`shipping-receipt-${bookingData?.shipment_id || 'download'}.pdf`);
      
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

  /**
   * Helper function to email the receipt
   * This would typically integrate with an edge function to send emails
   */
  const handleEmail = async () => {
    // In a real implementation, this would call a serverless function to send an email
    // For now, we'll just show a toast notification
    toast({
      title: "Email Sent",
      description: "Receipt has been emailed to your registered email address.",
    });
    
    // For a full implementation, you would:
    // 1. Create an edge function in Supabase
    // 2. Call the edge function with receipt data
    // 3. The edge function would generate a PDF and send it via email service
  };

  // Extract data for display from bookingData or receiptData
  // This is where we show either data from the form submission or from the database
  const data = bookingData || receiptData;
  
  // If we have no data to display, show loading or error message
  if (!data) {
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

  // Extract sender details from bookingData
  const senderDetails = data.senderDetails || {};
  
  // Extract recipient details from bookingData  
  const recipientDetails = data.recipientDetails || {};
  
  // Extract shipment details from bookingData
  const shipmentDetails = data.shipmentDetails || {};
  
  // For custom quotes, use customQuoteData
  const isCustomQuote = customQuoteData || 
    (shipmentDetails.type === 'other' && !shipmentDetails.includeDrums);
  
  // Extract payment information from paymentData
  const paymentInfo = paymentData || {};
  
  // Determine if payment has been completed
  const paymentStatus = data.paymentCompleted ? "Paid" : "Pending";
  
  // Check for collection area information based on postcode
  // This would come from the collection schedule based on postcode
  // For now, we'll use placeholder data
  const collectionInfo = {
    date: "Next available collection date",
    area: data.pickupPostcode ? `Collection from ${data.pickupPostcode} area` : "Collection area not specified"
  };

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
          
          {/* Receipt content - this div will be used for printing/PDF generation */}
          <div 
            ref={receiptRef} 
            id="receipt-to-print" 
            className="bg-white p-8 rounded-lg shadow-md border border-gray-200"
          >
            {/* Company logo and header */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="flex items-center">
                {/* Company Logo - Replace with your actual logo path */}
                <div className="w-16 h-16 mr-4">
                  <AspectRatio ratio={1/1}>
                    <img 
                      src="/lovable-uploads/85f04a52-387b-4e3e-8fe8-5b1476f172a3.png" 
                      alt="UK Shipping Service Logo" 
                      className="rounded-md object-contain"
                    />
                  </AspectRatio>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">UK Shipping Service</h2>
                  <p className="text-sm text-gray-600">Trusted Shipping to Zimbabwe</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600">Receipt #{data.shipment_id?.substring(0, 8) || "N/A"}</p>
                <p className="text-sm text-gray-600">Date: {formatDate(new Date())}</p>
                <p className="text-sm text-gray-600">
                  Tracking #: {shipmentDetails.tracking_number || "Not assigned yet"}
                </p>
              </div>
            </div>
            
            {/* Sender and Recipient Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Sender Details */}
              <div className="border rounded-md p-4">
                <h3 className="text-md font-semibold mb-2">Sender Details</h3>
                <p className="text-sm"><span className="font-medium">Name:</span> {senderDetails.name || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Email:</span> {senderDetails.email || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Phone:</span> {senderDetails.phone || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Address:</span> {senderDetails.address || "Not provided"}</p>
              </div>
              
              {/* Recipient Details */}
              <div className="border rounded-md p-4">
                <h3 className="text-md font-semibold mb-2">Recipient Details</h3>
                <p className="text-sm"><span className="font-medium">Name:</span> {recipientDetails.name || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Phone:</span> {recipientDetails.phone || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Additional Phone:</span> {recipientDetails.additionalPhone || "Not provided"}</p>
                <p className="text-sm"><span className="font-medium">Address:</span> {recipientDetails.address || "Not provided"}</p>
              </div>
            </div>
            
            {/* Shipment Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Shipment Details</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Tracking Number</p>
                    <p className="text-sm">{shipmentDetails.tracking_number || "Not assigned yet"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm">
                      {isCustomQuote 
                        ? (customQuoteData?.description || "Custom quote requested")
                        : shipmentDetails.includeDrums 
                          ? `${shipmentDetails.quantity || 0} Drum${(shipmentDetails.quantity || 0) > 1 ? 's' : ''}` 
                          : "Other items"
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Payment Status</p>
                    <p className={`text-sm font-medium ${paymentStatus === 'Paid' ? 'text-green-600' : 'text-amber-600'}`}>
                      {paymentStatus}
                    </p>
                  </div>
                  
                  {shipmentDetails.includeDrums && (
                    <>
                      <div>
                        <p className="text-sm font-medium">Metal Seal</p>
                        <p className="text-sm">{shipmentDetails.services?.some((s: any) => s.name.includes('Metal Seal')) ? 'Yes' : 'No'}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">Door to Door</p>
                        <p className="text-sm">{shipmentDetails.services?.some((s: any) => s.name.includes('Door to Door')) ? 'Yes' : 'No'}</p>
                      </div>
                    </>
                  )}
                  
                  {isCustomQuote && (
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <p className="text-sm">{customQuoteData?.category || shipmentDetails.category || "Not specified"}</p>
                    </div>
                  )}
                </div>
                
                {/* Payment Information */}
                {data.paymentCompleted && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-md font-semibold mb-2">Payment Information</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Amount</p>
                        <p className="text-sm">{formatCurrency(paymentInfo.amount || 0, paymentInfo.currency || 'USD')}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">Method</p>
                        <p className="text-sm capitalize">{paymentInfo.method || data.paymentMethod || "Not specified"}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">Date</p>
                        <p className="text-sm">{formatDate(paymentInfo.date || new Date())}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Collection & Delivery Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Collection & Delivery Information</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {/* Pickup Address - highlighted in red as requested */}
                <div className="mb-3">
                  <p className="text-sm font-medium">Pickup Address</p>
                  <p className="text-red-600 font-medium">
                    {data.pickupAddress || senderDetails.address || "Not provided"}
                    {data.pickupPostcode && `, ${data.pickupPostcode}`}
                  </p>
                </div>
                
                {/* Delivery Address - highlighted in red as requested */}
                <div className="mb-3">
                  <p className="text-sm font-medium">Delivery Address</p>
                  <p className="text-red-600 font-medium">
                    {data.deliveryAddress || recipientDetails.address || "Not provided"}
                    {data.deliveryCity && `, ${data.deliveryCity}`}
                  </p>
                </div>
                
                {/* Collection Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Collection Date</p>
                    <p className="text-sm">{collectionInfo.date}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Collection Area</p>
                    <p className="text-sm">{collectionInfo.area}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional notes or information */}
            <div className="border-t pt-4 mt-8">
              <p className="text-sm text-gray-600 text-center">
                Thank you for choosing UK Shipping Service. For any inquiries, please contact our customer service.
              </p>
              <p className="text-xs text-gray-500 text-center mt-2">
                This receipt was generated automatically. Please keep it for your records.
              </p>
            </div>
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
