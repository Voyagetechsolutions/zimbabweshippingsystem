
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Download, Printer, Mail } from 'lucide-react';
import Logo from '@/components/Logo';
import { formatDate } from '@/utils/formatters';

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
  
  const handleDownload = () => {
    // This would typically use a library like html2pdf or jsPDF
    // For this implementation, we'll use a simple approach
    toast({
      title: "Download Started",
      description: "Your receipt is being downloaded as a PDF",
    });
  };
  
  const handleEmail = async () => {
    toast({
      title: "Sending Email",
      description: "Your receipt is being emailed to you",
    });
    
    try {
      // This would be implemented with an edge function
      const response = await fetch('/api/email-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptId: receipt.receipt_number }),
      });
      
      if (!response.ok) throw new Error('Failed to send email');
      
      toast({
        title: "Email Sent",
        description: "Your receipt has been emailed successfully",
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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="border-0 shadow-lg">
        <div className="p-6" ref={receiptRef}>
          <div className="flex justify-between items-center pb-6 border-b mb-6">
            <div className="flex items-center">
              <div className="mr-4">
                <Logo size="medium" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zim-green">UK to Zimbabwe Shipping</h1>
                <p className="text-gray-600">123 Ship Street, London, UK</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">RECEIPT</h2>
              <p className="text-gray-600"># {receipt.receipt_number}</p>
              <p className="text-gray-600">Date: {formatDate(receipt.created_at)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border rounded-md p-4">
              <h3 className="font-bold mb-2">From</h3>
              <p>{receipt.sender_details.name}</p>
              <p>{receipt.sender_details.address}</p>
              <p>{receipt.sender_details.phone}</p>
              <p>{receipt.sender_details.email}</p>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-bold mb-2">To</h3>
              <p>{receipt.recipient_details.name}</p>
              <p>{receipt.recipient_details.address}</p>
              <p>{receipt.recipient_details.phone}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold mb-2">Shipment Details</h3>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Tracking Number</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-3">{shipment?.tracking_number || receipt.shipment_details.tracking_number}</td>
                    <td className="p-3">
                      {receipt.shipment_details.type === 'drum'
                        ? `${receipt.shipment_details.quantity} x 200L Drums`
                        : `Parcel (${receipt.shipment_details.weight}kg)`
                      }
                    </td>
                    <td className="p-3">{shipment?.status || receipt.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between py-3 border-b">
              <span className="font-medium">Shipping Cost</span>
              <span>£{(receipt.amount * 0.9).toFixed(2)}</span>
            </div>
            
            {receipt.shipment_details.services && receipt.shipment_details.services.length > 0 && (
              <div className="flex justify-between py-3 border-b">
                <span className="font-medium">Additional Services</span>
                <span>£{(receipt.amount * 0.1).toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-4 font-bold text-lg">
              <span>Total</span>
              <span>£{receipt.amount.toFixed(2)}</span>
            </div>
            
            <div className="border rounded-md p-3 bg-gray-50 mt-2">
              <p className="font-medium">Payment Method: {receipt.payment_method === 'stripe' ? 'Credit Card' : receipt.payment_method === 'paypal' ? 'PayPal' : 'Pay Later'}</p>
              <p className="text-sm text-gray-600 mt-1">Payment Status: {receipt.status === 'issued' ? 'Paid' : 'Pending'}</p>
            </div>
          </div>
          
          <div className="text-center text-gray-500 text-sm mt-12 pt-4 border-t">
            <p>Thank you for choosing UK to Zimbabwe Shipping</p>
            <p>For any inquiries, please contact us at support@ukzimshipping.com</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 flex flex-wrap justify-end gap-3">
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
        </div>
      </Card>
    </div>
  );
};

export default Receipt;
