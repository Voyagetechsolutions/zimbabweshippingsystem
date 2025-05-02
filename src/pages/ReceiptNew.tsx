
import React, { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Download, Printer, Mail, Drum, Package, PackageCheck, Home, Search, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { formatDate } from '@/utils/formatters';
import { supabase } from '@/integrations/supabase/client';
import html2pdf from 'html2pdf.js';
import { useLocation, Link, useNavigate } from 'react-router-dom';

interface ReceiptProps {
  receipt?: {
    receipt_number: string;
    created_at: string;
    amount: number;
    currency: string;
    payment_method: string;
    sender_details: any;
    recipient_details: any;
    shipment_details: any;
    status: string;
  };
  shipment?: {
    tracking_number: string;
    origin: string;
    destination: string;
    status: string;
  };
  customQuote?: any;
  bookingData?: any;
  paymentData?: any;
}

const ReceiptNew: React.FC<ReceiptProps> = ({ 
  receipt: propReceipt, 
  shipment: propShipment
}) => {
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const location = useLocation();
  const stateData = location.state || {};
  const navigate = useNavigate();
  
  // Ensure we properly extract data from props or location state
  // Extract all data from location state
  const bookingData = stateData.bookingData || {};
  const paymentData = bookingData.paymentData || {};
  const formData = bookingData.formData || {};
  const customQuoteData = propCustomQuote || stateData.customQuoteData || {};
  
  console.log("ReceiptNew component data:", {
    locationState: location.state,
    bookingData,
    paymentData,
    customQuoteData
  });
  
  // Create default receipt data if not provided
    // Create complete receipt data
  const receipt = propReceipt || {
    receipt_number: `ZIM-${Date.now().toString().substring(8)}`,
    created_at: new Date().toISOString(),
    amount: paymentData.finalAmount || 0,
    currency: 'GBP',
    payment_method: paymentData.method || 'standard',
    sender_details: bookingData.senderDetails || {},
    recipient_details: bookingData.recipientDetails || {},
    shipment_details: bookingData.shipmentDetails || {},
    status: paymentData.method ? 'Paid' : 'Pending Payment'
  };

  const shipment = propShipment || {
    tracking_number: bookingData.shipmentDetails?.tracking_number || 'Pending',
    origin: bookingData.senderDetails?.address || 'Not specified',
    destination: bookingData.recipientDetails?.address || 'Not specified',
    status: paymentData.method ? 'Processing' : 'Pending Payment'
  };

  const generateUniqueId = (prefix: string = '') => {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`;
  };

  useEffect(() => {
    document.title = `Receipt ${receipt.receipt_number} | Zimbabwe Shipping`;
    
    // Log the data to help debug
    console.log("Receipt details:", {
      receipt,
      shipment,
      senderDetails: receipt.sender_details,
      recipientDetails: receipt.recipient_details,
      shipmentDetails: receipt.shipment_details
    });

    const createReceiptRecord = async () => {
      if (bookingData && paymentData && !propReceipt && bookingData.shipment_id) {
        try {
          const paymentId = generateUniqueId('pmt_');
          
          await supabase.from('receipts').insert({
            receipt_number: receipt.receipt_number,
            payment_id: paymentId,
            amount: paymentData.finalAmount,
            currency: 'GBP',
            payment_method: getPaymentMethodValue(paymentData.method, paymentData.payLaterMethod),
            shipment_id: bookingData.shipment_id,
            sender_details: bookingData.senderDetails,
            recipient_details: bookingData.recipientDetails,
            shipment_details: bookingData.shipmentDetails,
            status: 'Pending Payment'
          });

          await supabase.from('notifications').insert({
            user_id: '00000000-0000-0000-0000-000000000000',
            title: 'New Shipment Booked',
            message: `A new shipment has been booked with tracking number: ${shipment.tracking_number}`,
            type: 'shipment',
            related_id: bookingData.shipment_id,
            is_read: false
          });
        } catch (error) {
          console.error('Error saving receipt:', error);
        }
      }
    };

    createReceiptRecord();
  }, [bookingData, paymentData, propReceipt]);
  
  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup blocker settings.",
        variant: "destructive",
      });
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${receipt.receipt_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
            }
            .receipt {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #ddd;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #006400;
            }
            .receipt-number {
              font-size: 18px;
              color: #333;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .details {
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 15px 0;
              font-weight: bold;
              border-top: 2px solid #ddd;
              font-size: 18px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${content.innerHTML}
          </div>
          <script>
            window.onload = function() { window.print(); window.setTimeout(function() { window.close(); }, 500); }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };
  
  const handleDownload = async () => {
    const content = receiptRef.current;
    if (!content) return;
    
    toast({
      title: "Preparing Download",
      description: "Your receipt is being prepared for download...",
    });
    
    try {
      const options = {
        margin: 10,
        filename: `receipt-${receipt.receipt_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().from(content).set(options).save();
      
      toast({
        title: "Download Complete",
        description: "Your receipt has been downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "There was a problem downloading your receipt. Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  const handleEmail = async () => {
    toast({
      title: "Sending Email",
      description: "Your receipt is being emailed...",
    });
    
    try {
      let email = receipt.sender_details?.email;
      
      if (!email) {
        const userEmail = window.prompt("Please enter your email address to receive the receipt:");
        if (!userEmail) {
          toast({
            title: "Email Cancelled",
            description: "Email sending was cancelled.",
          });
          return;
        }
        email = userEmail;
      }
      
      const { data, error } = await supabase.functions.invoke('email-receipt', {
        body: { 
          receiptId: receipt.receipt_number,
          email: email,
          receiptData: receipt,
          shipmentData: shipment
        }
      });
      
      if (error) throw new Error(error.message || 'Failed to send email');
      
      toast({
        title: "Email Sent",
        description: `Your receipt has been emailed to ${email}`,
      });
    } catch (error) {
      console.error("Email error:", error);
      toast({
        title: "Email Failed",
        description: "There was a problem sending your receipt. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleTrackShipment = () => {
    const trackingNumber = shipment.tracking_number || receipt.shipment_details?.tracking_number;
    if (trackingNumber && trackingNumber !== 'Pending') {
      navigate('/track', { state: { trackingNumber } });
    } else {
      toast({
        title: "Tracking Not Available",
        description: "Tracking information is not yet available for this shipment.",
      });
    }
  };

  const getPaymentMethodDisplay = (method: string) => {
    switch(method) {
      case 'stripe':
      case 'card':
        return 'Credit/Debit Card';
      case 'paypal':
        return 'PayPal';
      case 'bankTransfer':
        return 'Bank Transfer';
      case 'payLater':
        return '30-Day Payment Terms';
      case 'cashOnCollection':
        return 'Cash on Collection';
      case 'payOnArrival':
        return 'Pay on Arrival';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };
  
  const getPaymentMethodValue = (method: string, payLaterMethod?: string) => {
    if (method === 'standard' && payLaterMethod) {
      return payLaterMethod;
    }
    return method;
  };

  // Safeguard against undefined properties
  const senderDetails = receipt.sender_details || {};
  const recipientDetails = receipt.recipient_details || {};
  const shipmentDetails = receipt.shipment_details || {};

  return (
    <div className="container mx-auto px-2 sm:px-4 max-w-4xl py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between">
        <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 mb-4 sm:mb-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Back to Home</span>
        </Link>
        
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center" 
            onClick={() => navigate('/')}
          >
            <Home className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
            <span>Home</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center" 
            onClick={handleTrackShipment}
          >
            <Search className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
            <span>Track Shipment</span>
          </Button>
        </div>
      </div>
      
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="p-3 sm:p-6" ref={receiptRef}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-4 sm:pb-6 border-b mb-4 sm:mb-6 gap-3">
            <div className="flex items-center">
              <div className="mr-3 hidden sm:block">
                <Logo size={isMobile ? "small" : "medium"} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-zim-green">Zimbabwe Shipping</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Pastures Lodge Farm, Raunds Road
Chelveston, Wellingborough, NN9 6AA</p>
              </div>
            </div>
            <div className="text-left sm:text-right mt-2 sm:mt-0">
              <h2 className="text-lg sm:text-xl font-bold">RECEIPT</h2>
              <p className="text-gray-600 text-xs sm:text-sm"># {receipt.receipt_number}</p>
              <p className="text-gray-600 text-xs sm:text-sm">Date: {formatDate(receipt.created_at)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="border rounded-md p-3 sm:p-4">
              <h3 className="font-bold text-sm mb-1 sm:mb-2">Sender Details</h3>
              <p className="text-sm"><span className="font-medium">Name:</span> {senderDetails.name || "Not provided"}</p>
              <p className="text-sm"><span className="font-medium">Address:</span> {senderDetails.address || "Not provided"}</p>
              <p className="text-sm"><span className="font-medium">Phone:</span> {senderDetails.phone || "Not provided"}</p>
              <p className="text-sm"><span className="font-medium">Email:</span> {senderDetails.email || "Not provided"}</p>
            </div>
            
            <div className="border rounded-md p-3 sm:p-4">
              <h3 className="font-bold text-sm mb-1 sm:mb-2">Receiver Details</h3>
              <p className="text-sm"><span className="font-medium">Name:</span> {recipientDetails.name || "Not provided"}</p>
              <p className="text-sm"><span className="font-medium">Address:</span> {recipientDetails.address || "Not provided"}</p>
              <p className="text-sm"><span className="font-medium">Phone:</span> {recipientDetails.phone || "Not provided"}</p>
              {recipientDetails.additionalPhone && (
                <p className="text-sm"><span className="font-medium">Additional Phone:</span> {recipientDetails.additionalPhone}</p>
              )}
            </div>
          </div>
          
          <div className="mb-4 sm:mb-6">
            <h3 className="font-bold text-sm mb-1 sm:mb-2">Shipment Details</h3>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Tracking Number</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Description</th>
                    <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-2 sm:p-3 text-xs sm:text-sm break-all sm:break-normal">
                      {shipment.tracking_number || shipmentDetails.tracking_number || "Pending"}
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                      <div className="flex flex-col">
                        {shipmentDetails.includeDrums && (
                          <div className="flex items-center mb-1">
                            <Drum className="h-4 w-4 mr-1 text-zim-green" />
                            {shipmentDetails.quantity || 0} x 200L-220L Drums
                          </div>
                        )}
                        {shipmentDetails.includeOtherItems && (
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-1 text-zim-green" />
                            {shipmentDetails.category && shipmentDetails.specificItem ? (
                              `${shipmentDetails.category} - ${shipmentDetails.specificItem}`
                            ) : (
                              `Custom Item - ${customQuoteData.description || shipmentDetails.description || 'Pending quote'}`
                            )}
                          </div>
                        )}
                        {!shipmentDetails.includeDrums && !shipmentDetails.includeOtherItems && (
                          `${shipmentDetails.type || 'Custom Item'}`
                        )}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">{shipment.status || receipt.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mb-4 sm:mb-6">
            <h3 className="font-bold text-sm mb-1 sm:mb-2">Collection & Delivery Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-md p-3">
                <p className="text-sm"><span className="font-medium">Pickup Address:</span> {shipment.origin || senderDetails.address || "Not specified"}</p>
              </div>
              <div className="border rounded-md p-3">
                <p className="text-sm"><span className="font-medium">Delivery Address:</span> {shipment.destination || recipientDetails.address || "Not specified"}</p>
              </div>
            </div>
            
            {/* Collection Date Information */}
            <div className="border rounded-md p-3 mt-3">
              <p className="text-sm"><span className="font-medium">Collection Date:</span> {bookingData.collectionDate || "To be scheduled"}</p>
              <p className="text-sm"><span className="font-medium">Collection Location:</span> {bookingData.senderDetails?.address || shipment.origin || "Not specified"}</p>
            </div>
          </div>
          
          {shipmentDetails.includeDrums && (
            <div className="mb-4 sm:mb-6">
              <h3 className="font-bold text-sm mb-1 sm:mb-2">Payment Details</h3>
              
              <div className="flex justify-between py-2 sm:py-3 border-b text-sm">
                <span className="font-medium">Shipping Cost</span>
                <span>£{((receipt.amount || 0) * 0.9).toFixed(2)}</span>
              </div>
              
              {shipmentDetails.services && shipmentDetails.services.length > 0 && (
                <>
                  {shipmentDetails.services.map((service: any, index: number) => (
                    <div key={index} className="flex justify-between py-2 sm:py-3 border-b text-sm">
                      <span className="font-medium">{service.name}</span>
                      <span>£{service.price.toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}
              
              {paymentData && paymentData.discount > 0 && (
                <div className="flex justify-between py-2 sm:py-3 border-b text-sm text-green-600">
                  <span className="font-medium">Cash Discount</span>
                  <span>-£{paymentData.discount.toFixed(2)}</span>
                </div>
              )}
              
              {paymentData && paymentData.premium > 0 && (
                <div className="flex justify-between py-2 sm:py-3 border-b text-sm text-amber-600">
                  <span className="font-medium">Pay on Arrival Premium (20%)</span>
                  <span>+£{paymentData.premium.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between py-3 sm:py-4 font-bold text-base sm:text-lg">
                <span>Total</span>
                <span>£{(receipt.amount || 0).toFixed(2)}</span>
              </div>
              
              <div className="border rounded-md p-2 sm:p-3 bg-gray-50 mt-2">
                <p className="font-medium text-sm">Payment Method: {getPaymentMethodDisplay(receipt.payment_method)}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Payment Status: {receipt.status}</p>
              </div>
            </div>
          )}
          
          {shipmentDetails.includeDrums && (
            <div className="mb-4 sm:mb-6">
              <h3 className="font-bold text-sm mb-1 sm:mb-2">Drum Information</h3>
              <div className="border rounded-md p-3">
                <p className="text-sm"><span className="font-medium">Number of Drums:</span> {shipmentDetails.quantity || 0}</p>
                <p className="text-sm"><span className="font-medium">Drum Capacity:</span> 200L-220L</p>
                {shipmentDetails.wantMetalSeal && (
                  <p className="text-sm"><span className="font-medium">Security:</span> Metal Coded Seals</p>
                )}
              </div>
            </div>
          )}
          
          {(shipmentDetails.includeOtherItems || (customQuoteData && customQuoteData.id)) && (
            <div className="mb-4 sm:mb-6">
              <h3 className="font-bold text-sm mb-1 sm:mb-2">Other Item Details</h3>
              <div className="border rounded-md p-3">
                {shipmentDetails.category && (
                  <p className="text-sm"><span className="font-medium">Item Category:</span> {shipmentDetails.category}</p>
                )}
                {shipmentDetails.specificItem && (
                  <p className="text-sm"><span className="font-medium">Specific Item:</span> {shipmentDetails.specificItem}</p>
                )}
                {(shipmentDetails.description || (customQuoteData && customQuoteData.description)) && (
                  <p className="text-sm"><span className="font-medium">Description:</span> {(customQuoteData && customQuoteData.description) || shipmentDetails.description}</p>
                )}
                {customQuoteData && customQuoteData.id && (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <PackageCheck className="h-4 w-4 mr-1.5" />
                    <span>Custom quote request submitted successfully</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="text-center text-gray-500 text-xs sm:text-sm mt-8 sm:mt-12 pt-3 sm:pt-4 border-t">
            <p>Thank you for choosing our shipping service</p>
            <p>For any inquiries, please contact us at +44 7584 100552</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 sm:p-4 flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3">
          {isMobile ? (
            <>
              <Button variant="outline" size="sm" className="flex items-center text-xs" onClick={handlePrint}>
                <Printer className="mr-1 h-3 w-3" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="flex items-center text-xs" onClick={handleDownload}>
                <Download className="mr-1 h-3 w-3" />
                Download
              </Button>
              <Button variant="outline" size="sm" className="flex items-center text-xs" onClick={handleEmail}>
                <Mail className="mr-1 h-3 w-3" />
                Email
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="flex items-center" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="flex items-center" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" size="sm" className="flex items-center" onClick={handleEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ReceiptNew;
