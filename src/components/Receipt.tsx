
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Download, Printer, Mail } from 'lucide-react';
import Logo from '@/components/Logo';
import { formatDate } from '@/utils/formatters';
import { supabase } from '@/integrations/supabase/client';
import html2pdf from 'html2pdf.js';

interface ReceiptProps {
  receipt: {
    receipt_number: string;
    created_at: string;
    amount: number;
    currency: string;
    payment_method: string;
    sender_details: any;
    recipient_details: any;
    shipment_details: any;
    payment_details?: any;
    status: string;
  };
  shipment?: {
    tracking_number: string;
    origin: string;
    destination: string;
    status: string;
  };
}

const Receipt: React.FC<ReceiptProps> = ({ receipt, shipment }) => {
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
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
    
    // Apply print-specific styling
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
      
      // Wait for PDF to be generated and downloaded
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
      // Get the user's email from sender_details or fall back to a prompt
      let email = receipt.sender_details?.email;
      
      if (!email) {
        // If email is not available in receipt, prompt the user
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
      
      // Call the Supabase Edge Function to send the email
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

  const getPaymentMethodText = (method: string) => {
    switch(method) {
      case 'cash-collection':
        return 'Cash on Collection';
      case '30-day':
        return '30-Day Payment';
      case 'goods-arriving':
        return 'Pay on Goods Arriving';
      case 'stripe':
        return 'Credit Card';
      case 'paypal':
        return 'PayPal';
      default:
        return method;
    }
  };

  const getPaymentTypeText = (type: string) => {
    switch(type) {
      case 'cash':
        return 'Cash';
      case 'bank-transfer':
        return 'Bank Transfer';
      case 'direct-debit':
        return 'Direct Debit';
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 max-w-4xl">
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
              <h3 className="font-bold text-sm mb-1 sm:mb-2">From</h3>
              <p className="text-sm">{receipt.sender_details.name}</p>
              <p className="text-sm">{receipt.sender_details.address}</p>
              <p className="text-sm">{receipt.sender_details.phone}</p>
              <p className="text-sm">{receipt.sender_details.email}</p>
            </div>
            
            <div className="border rounded-md p-3 sm:p-4">
              <h3 className="font-bold text-sm mb-1 sm:mb-2">To</h3>
              <p className="text-sm">{receipt.recipient_details.name}</p>
              <p className="text-sm">{receipt.recipient_details.address}</p>
              <p className="text-sm">{receipt.recipient_details.phone}</p>
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
                    <td className="p-2 sm:p-3 text-xs sm:text-sm break-all sm:break-normal">{shipment?.tracking_number || receipt.shipment_details.tracking_number}</td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                      {receipt.shipment_details.type === 'drum'
                        ? `${receipt.shipment_details.quantity} x 200L Drums`
                        : receipt.shipment_details.type === 'parcel' 
                          ? `Other Items (${receipt.shipment_details.weight}kg)`
                          : `Custom Item: ${receipt.shipment_details.item_description || 'No description'}`
                      }
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">{shipment?.status || receipt.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mb-4 sm:mb-6">
            <h3 className="font-bold text-sm mb-1 sm:mb-2">Payment Details</h3>
            <div className="border rounded-md p-3 sm:p-4 bg-gray-50 mb-4">
              <p className="text-sm font-medium">
                Payment Method: {getPaymentMethodText(receipt.payment_method)}
                {receipt.payment_method === '30-day' && receipt.payment_details?.paymentType && 
                  ` (${getPaymentTypeText(receipt.payment_details.paymentType)})`
                }
              </p>
              
              {receipt.payment_method === '30-day' && receipt.payment_details?.dueDate && (
                <p className="text-sm text-gray-600 mt-1">
                  Payment Due Date: {formatDate(receipt.payment_details.dueDate)}
                </p>
              )}
              
              <p className="text-sm text-gray-600 mt-1">
                Payment Status: {receipt.status === 'issued' ? 'Paid' : 'Pending'}
              </p>
            </div>
            
            {receipt.payment_details && (
              <div className="mb-4">
                <div className="flex justify-between py-2 sm:py-3 border-b text-sm">
                  <span className="font-medium">Base Amount</span>
                  <span>£{(receipt.payment_details.baseAmount || receipt.amount).toFixed(2)}</span>
                </div>
                
                {receipt.payment_details.additionalCost > 0 && (
                  <div className="flex justify-between py-2 sm:py-3 border-b text-sm">
                    <span className="font-medium">
                      {receipt.payment_method === 'goods-arriving' ? 'Pay on Arrival Premium (20%)' : 'Additional Charges'}
                    </span>
                    <span>£{receipt.payment_details.additionalCost.toFixed(2)}</span>
                  </div>
                )}
                
                {receipt.shipment_details.services && receipt.shipment_details.services.length > 0 && (
                  <>
                    {receipt.shipment_details.services.map((service: any, index: number) => (
                      <div key={index} className="flex justify-between py-2 sm:py-3 border-b text-sm">
                        <span className="font-medium">{service.name}</span>
                        <span>£{service.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}
                
                <div className="flex justify-between py-3 sm:py-4 font-bold text-base sm:text-lg">
                  <span>Total</span>
                  <span>£{receipt.amount.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            {!receipt.payment_details && (
              <div className="mb-4">
                <div className="flex justify-between py-2 sm:py-3 border-b text-sm">
                  <span className="font-medium">Shipping Cost</span>
                  <span>£{(receipt.amount * 0.9).toFixed(2)}</span>
                </div>
                
                {receipt.shipment_details.services && receipt.shipment_details.services.length > 0 && (
                  <div className="flex justify-between py-2 sm:py-3 border-b text-sm">
                    <span className="font-medium">Additional Services</span>
                    <span>£{(receipt.amount * 0.1).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-3 sm:py-4 font-bold text-base sm:text-lg">
                  <span>Total</span>
                  <span>£{receipt.amount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-center text-gray-500 text-xs sm:text-sm mt-8 sm:mt-12 pt-3 sm:pt-4 border-t">
            <p>Thank you for choosing Zimbabwe Shipping</p>
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

export default Receipt;
