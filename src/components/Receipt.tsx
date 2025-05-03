
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Download, Mail, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Receipt component that displays detailed shipment receipt information
 * @param {Object} props - Component props
 * @param {Object} props.receipt - Receipt data including sender, recipient, and payment details
 * @param {Object} props.shipment - Shipment data related to this receipt
 */
const Receipt = ({ receipt, shipment }: { receipt: any; shipment?: any }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
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
      pdf.save(`shipping-receipt-${receipt?.id || 'download'}.pdf`);
      
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

  console.log("ReceiptComponent received data:", receipt);

  // If we have no data to display, show a message
  if (!receipt) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Receipt data not available</p>
      </div>
    );
  }

  // Extract sender details from receipt data - try different possible data structures
  const senderDetails = receipt.sender_details || receipt.senderDetails || {};
  
  // Extract recipient details from receipt data
  const recipientDetails = receipt.recipient_details || receipt.recipientDetails || {};
  
  // Extract shipment details from receipt data
  const shipmentDetails = shipment || receipt.shipment_details || receipt.shipmentDetails || {};
  
  // Extract payment information from receipt data
  const paymentInfo = receipt.payment_info || receipt.paymentData || {};
  
  // Collection information
  const collectionInfo = receipt.collection_info || {
    pickup_address: receipt.pickupAddress,
    pickup_postcode: receipt.pickupPostcode,
    pickup_country: receipt.pickupCountry,
    date: receipt.collectionDate || "Next available collection date",
    area: receipt.collectionArea || "Collection area not specified"
  };

  return (
    <div id="receipt-to-print" ref={receiptRef} className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
      {/* Company logo and header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div className="flex items-center">
          {/* Company Logo */}
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
          <p className="text-sm text-gray-600">Receipt #{receipt.receipt_number || receipt.id?.substring(0, 8) || "N/A"}</p>
          <p className="text-sm text-gray-600">Date: {formatDate(receipt.created_at || receipt.date || new Date())}</p>
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
          <p className="text-sm"><span className="font-medium">Name:</span> {senderDetails.name || `${receipt.firstName || ""} ${receipt.lastName || ""}`.trim() || "Not provided"}</p>
          <p className="text-sm"><span className="font-medium">Email:</span> {senderDetails.email || receipt.email || "Not provided"}</p>
          <p className="text-sm"><span className="font-medium">Phone:</span> {senderDetails.phone || receipt.phone || "Not provided"}</p>
          <p className="text-sm"><span className="font-medium">Address:</span> {senderDetails.address || receipt.pickupAddress || "Not provided"}</p>
        </div>
        
        {/* Recipient Details */}
        <div className="border rounded-md p-4">
          <h3 className="text-md font-semibold mb-2">Recipient Details</h3>
          <p className="text-sm"><span className="font-medium">Name:</span> {recipientDetails.name || receipt.recipientName || "Not provided"}</p>
          <p className="text-sm"><span className="font-medium">Phone:</span> {recipientDetails.phone || receipt.recipientPhone || "Not provided"}</p>
          <p className="text-sm"><span className="font-medium">Additional Phone:</span> {recipientDetails.additionalPhone || receipt.additionalRecipientPhone || "Not provided"}</p>
          <p className="text-sm"><span className="font-medium">Address:</span> {recipientDetails.address || receipt.deliveryAddress || "Not provided"}</p>
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
                {shipmentDetails.type === 'other' 
                  ? (shipmentDetails.description || "Custom quote requested")
                  : shipmentDetails.type === 'drum' 
                    ? `${shipmentDetails.quantity || receipt.drumQuantity || 0} Drum${(shipmentDetails.quantity || receipt.drumQuantity || 0) > 1 ? 's' : ''}` 
                    : "Other items"
                }
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium">Payment Status</p>
              <p className={`text-sm font-medium ${paymentInfo.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                {paymentInfo.status === 'completed' ? 'Paid' : 'Pending'}
              </p>
            </div>
            
            {(shipmentDetails.type === 'drum' || receipt.includeDrums) && (
              <>
                <div>
                  <p className="text-sm font-medium">Metal Seal</p>
                  <p className="text-sm">{(shipmentDetails.services?.some((s: any) => s.name.includes('Metal Seal')) || receipt.wantMetalSeal) ? 'Yes' : 'No'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Door to Door</p>
                  <p className="text-sm">{(shipmentDetails.services?.some((s: any) => s.name.includes('Door to Door')) || receipt.doorToDoor) ? 'Yes' : 'No'}</p>
                </div>
              </>
            )}
            
            {shipmentDetails.type === 'other' && (
              <div>
                <p className="text-sm font-medium">Category</p>
                <p className="text-sm">{shipmentDetails.category || receipt.itemCategory || "Not specified"}</p>
              </div>
            )}
          </div>
          
          {/* Payment Information */}
          {paymentInfo && Object.keys(paymentInfo).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-md font-semibold mb-2">Payment Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-sm">{formatCurrency(paymentInfo.finalAmount || paymentInfo.amount || 0, paymentInfo.currency || 'GBP')}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Method</p>
                  <p className="text-sm capitalize">{paymentInfo.method || receipt.paymentMethod || "Not specified"}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm">{formatDate(paymentInfo.date || receipt.created_at || new Date())}</p>
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
              {senderDetails.address || receipt.pickupAddress || collectionInfo.pickup_address || "Not provided"}
            </p>
          </div>
          
          {/* Delivery Address - highlighted in red as requested */}
          <div className="mb-3">
            <p className="text-sm font-medium">Delivery Address</p>
            <p className="text-red-600 font-medium">
              {recipientDetails.address || receipt.deliveryAddress || "Not provided"}
            </p>
          </div>
          
          {/* Collection Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Collection Date</p>
              <p className="text-sm">{collectionInfo.date || "Next available collection date"}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium">Collection Area</p>
              <p className="text-sm">{collectionInfo.area || collectionInfo.pickup_country || receipt.pickupCountry || "Collection area not specified"}</p>
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
  );
};

export default Receipt;
