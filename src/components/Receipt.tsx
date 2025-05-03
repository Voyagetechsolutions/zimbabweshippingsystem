
import React from 'react';
import { format } from 'date-fns';
import { Receipt as ReceiptType } from '@/types/receipt';
import { Shipment } from '@/types/shipment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, Download, Mail } from 'lucide-react';
import Logo from '@/components/Logo';
import html2pdf from 'html2pdf.js';
import { formatDate, formatCurrency } from '@/utils/formatters';

interface ReceiptProps {
  receipt: ReceiptType;
  shipment?: Shipment | null;
}

/**
 * Receipt component that displays shipment and payment information in a printable format.
 * 
 * This component takes receipt data and renders:
 * - Sender details
 * - Recipient details
 * - Shipment information
 * - Collection and delivery information
 * - Payment details
 * 
 * It also provides buttons to print, download as PDF, or email the receipt.
 */
const Receipt: React.FC<ReceiptProps> = ({ receipt, shipment }) => {
  const { toast } = useToast();
  
  // Function to handle printing the receipt
  const handlePrint = () => {
    window.print();
  };
  
  // Function to handle downloading the receipt as PDF
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
  
  // Function to handle emailing the receipt
  const handleEmail = () => {
    // In a real implementation, this would call an API to send the email
    toast({
      title: "Receipt Emailed",
      description: "Your receipt has been sent to your email address."
    });
  };
  
  // Extract data from receipt for easier access
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
    <div className="space-y-6">
      {/* Receipt Content - This div will be used for printing/PDF generation */}
      <div className="bg-white shadow-md rounded-lg p-6 md:p-8 print:shadow-none print:p-0" id="receipt">
        {/* Receipt Header with Logo and Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6">
          <div>
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
      
      {/* Receipt Action Buttons */}
      <div className="grid md:grid-cols-3 gap-4 print:hidden">
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
    </div>
  );
};

export default Receipt;
