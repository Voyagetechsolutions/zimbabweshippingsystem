
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
  
  console.log("RECEIPT DATA RECEIVED:", receipt);
  console.log("SHIPMENT DATA RECEIVED:", shipment);

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
  
  // Get tracking number directly from the booking form data or the metadata
  const trackingNumber = receipt.tracking_number || 
                        shipmentDetails?.tracking_number || 
                        receipt.metadata?.tracking_number ||
                        "Not assigned yet";
  
  // Extract payment information from receipt data
  const paymentInfo = receipt.payment_info || receipt.paymentData || {};
  
  // Collection information
  const collectionInfo = receipt.collection_info || {
    pickup_address: receipt.pickupAddress,
    pickup_postcode: receipt.pickupPostcode,
    pickup_country: receipt.pickupCountry,
    date: receipt.collectionDate || "Next available collection date",
    area: receipt.collectionArea || receipt.pickupCountry || "Collection area not specified"
  };

  // Combine sender details with potential flat properties in the receipt
  const fullSenderDetails = {
    ...senderDetails,
    name: senderDetails.name || 
          (receipt.firstName && receipt.lastName ? `${receipt.firstName} ${receipt.lastName}`.trim() : '') || 
          receipt.fullName || 
          "Not provided",
    email: senderDetails.email || receipt.email || "Not provided",
    phone: senderDetails.phone || receipt.phone || "Not provided",
    address: senderDetails.address || receipt.pickupAddress || "Not provided"
  };

  // Combine recipient details with potential flat properties in the receipt
  const fullRecipientDetails = {
    ...recipientDetails,
    name: recipientDetails.name || receipt.recipientName || "Not provided",
    phone: recipientDetails.phone || receipt.recipientPhone || "Not provided",
    additionalPhone: recipientDetails.additionalPhone || receipt.additionalRecipientPhone || "Not provided",
    address: recipientDetails.address || receipt.deliveryAddress || "Not provided"
  };

  // Ensure shipment details has all the required fields
  const fullShipmentDetails = {
    ...shipmentDetails,
    tracking_number: trackingNumber,
    type: shipmentDetails.type || (receipt.includeDrums ? "drum" : "other"),
    quantity: shipmentDetails.quantity || (receipt.includeDrums ? parseInt(receipt.drumQuantity || "1") : 1),
    services: shipmentDetails.services || [],
    metadata: shipmentDetails.metadata || receipt.metadata || {}
  };
  
  // Get door to door and metal seal info from various locations
  const wantMetalSeal = receipt.wantMetalSeal || 
                       receipt.metadata?.wantMetalSeal ||
                       shipmentDetails.metadata?.wantMetalSeal || 
                       fullShipmentDetails.services?.some((s: any) => s?.name?.includes('Metal Seal')) || 
                       false;

  const doorToDoor = receipt.doorToDoor || 
                    receipt.metadata?.doorToDoor || 
                    shipmentDetails.metadata?.doorToDoor || 
                    fullShipmentDetails.services?.some((s: any) => s?.name?.includes('Door to Door')) || 
                    false;

  return (
    <div id="receipt-to-print" ref={receiptRef} className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
      {/* Company logo and header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div className="flex items-center">
          {/* Company Logo - Using the Zimbabwe Shipping logo */}
          <div className="w-20 h-20 mr-4">
            <AspectRatio ratio={1/1}>
              <img 
                src="/lovable-uploads/78cfc0fd-e229-403f-89ae-d65d40e6befc.png" 
                alt="Zimbabwe Shipping Logo" 
                className="rounded-full object-contain"
              />
            </AspectRatio>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Zimbabwe Shipping</h2>
            <p className="text-sm text-gray-600">UK to Zimbabwe Express</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-600">Receipt #{receipt.receipt_number || receipt.id?.substring(0, 8) || "N/A"}</p>
          <p className="text-sm text-gray-600">Date: {formatDate(receipt.created_at || receipt.date || new Date())}</p>
          <p className="text-sm text-gray-600">
            Tracking #: {trackingNumber}
          </p>
        </div>
      </div>
      
      {/* Sender and Recipient Information */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Sender Details */}
        <div className="border rounded-md p-4">
          <h3 className="text-md font-semibold mb-2">Sender Details</h3>
          <p className="text-sm"><span className="font-medium">Name:</span> {fullSenderDetails.name}</p>
          <p className="text-sm"><span className="font-medium">Email:</span> {fullSenderDetails.email}</p>
          <p className="text-sm"><span className="font-medium">Phone:</span> {fullSenderDetails.phone}</p>
          <p className="text-sm"><span className="font-medium">Address:</span> {fullSenderDetails.address}</p>
        </div>
        
        {/* Recipient Details */}
        <div className="border rounded-md p-4">
          <h3 className="text-md font-semibold mb-2">Recipient Details</h3>
          <p className="text-sm"><span className="font-medium">Name:</span> {fullRecipientDetails.name}</p>
          <p className="text-sm"><span className="font-medium">Phone:</span> {fullRecipientDetails.phone}</p>
          <p className="text-sm"><span className="font-medium">Additional Phone:</span> {fullRecipientDetails.additionalPhone}</p>
          <p className="text-sm"><span className="font-medium">Address:</span> {fullRecipientDetails.address}</p>
        </div>
      </div>
      
      {/* Shipment Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Shipment Details</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Tracking Number</p>
              <p className="text-sm">{fullShipmentDetails.tracking_number}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm">
                {fullShipmentDetails.type === 'other' 
                  ? (fullShipmentDetails.description || "Custom quote requested")
                  : fullShipmentDetails.type === 'drum' 
                    ? `${fullShipmentDetails.quantity || 0} Drum${(fullShipmentDetails.quantity || 0) > 1 ? 's' : ''}` 
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
            
            {(fullShipmentDetails.type === 'drum' || receipt.includeDrums) && (
              <>
                <div>
                  <p className="text-sm font-medium">Metal Seal</p>
                  <p className="text-sm">{wantMetalSeal ? 'Yes' : 'No'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Door to Door</p>
                  <p className="text-sm">{doorToDoor ? 'Yes' : 'No'}</p>
                </div>
              </>
            )}
            
            {fullShipmentDetails.type === 'other' && (
              <div>
                <p className="text-sm font-medium">Category</p>
                <p className="text-sm">{fullShipmentDetails.category || receipt.itemCategory || "Not specified"}</p>
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
                  <p className="text-sm">{formatCurrency(paymentInfo.finalAmount || paymentInfo.amount || receipt.metadata?.amountPaid || 0, paymentInfo.currency || 'GBP')}</p>
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
              {collectionInfo.pickup_address || fullSenderDetails.address}
            </p>
          </div>
          
          {/* Delivery Address - highlighted in red as requested */}
          <div className="mb-3">
            <p className="text-sm font-medium">Delivery Address</p>
            <p className="text-red-600 font-medium">
              {fullRecipientDetails.address}
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
          Thank you for choosing Zimbabwe Shipping. For any inquiries, please contact our customer service.
        </p>
        <p className="text-xs text-gray-500 text-center mt-2">
          This receipt was generated automatically. Please keep it for your records.
        </p>
      </div>
    </div>
  );
};

export default Receipt;
