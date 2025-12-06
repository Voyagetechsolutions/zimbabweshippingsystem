import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Send, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  trackingNumber: string;
  shipmentType: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface InvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
  onInvoiceSent?: () => void;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  isOpen,
  onClose,
  invoiceData,
  onInvoiceSent
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [invoiceSent, setInvoiceSent] = useState(false);
  const { toast } = useToast();

  const currencySymbol = invoiceData.currency === 'USD' ? '$' : '£';

  // Generate PDF from invoice
  const generatePDF = async (): Promise<Blob | null> => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      if (!invoiceRef.current) {
        throw new Error('Invoice element not found');
      }

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  };

  // Download PDF
  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      if (!invoiceRef.current) {
        throw new Error('Invoice element not found');
      }

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      pdf.save(`Invoice-${invoiceData.invoiceNumber}.pdf`);

      toast({
        title: 'Invoice Downloaded',
        description: `Invoice ${invoiceData.invoiceNumber} has been downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Send invoice via email
  const handleSendEmail = async () => {
    if (!invoiceData.customerEmail || invoiceData.customerEmail === 'N/A') {
      toast({
        title: 'Cannot Send Invoice',
        description: 'Customer email address is not available.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Generate PDF blob
      const pdfBlob = await generatePDF();
      if (!pdfBlob) {
        throw new Error('Failed to generate PDF');
      }

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      // Call edge function to send email
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: invoiceData.customerEmail,
          customerName: invoiceData.customerName,
          invoiceNumber: invoiceData.invoiceNumber,
          amount: `${currencySymbol}${invoiceData.amount.toFixed(2)}`,
          pdfBase64: pdfBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      setInvoiceSent(true);
      toast({
        title: 'Invoice Sent',
        description: `Invoice has been sent to ${invoiceData.customerEmail}`,
      });

      if (onInvoiceSent) {
        onInvoiceSent();
      }
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Failed to Send Invoice',
        description: error.message || 'Could not send invoice email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
          <DialogDescription>
            Review the invoice before downloading or sending to the customer.
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Preview */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <div ref={invoiceRef} className="p-8 bg-white" style={{ minWidth: '600px' }}>
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                {/* Company Logo */}
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src="/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png" 
                    alt="Zimbabwe Shipping" 
                    className="h-14 w-auto"
                    crossOrigin="anonymous"
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Zimbabwe Shipping</h1>
                    <p className="text-sm text-gray-500">UK to Zimbabwe Express</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>London, United Kingdom</p>
                  <p>support@zimbabweshipping.com</p>
                  <p>www.zimbabweshipping.com</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-green-600 mb-2">INVOICE</h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Invoice #:</span> {invoiceData.invoiceNumber}</p>
                  <p><span className="font-medium">Date:</span> {format(new Date(invoiceData.paymentDate), 'MMMM d, yyyy')}</p>
                  <p><span className="font-medium">Tracking #:</span> {invoiceData.trackingNumber}</p>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
              <div className="text-gray-900">
                <p className="font-semibold text-lg">{invoiceData.customerName}</p>
                <p className="text-gray-600">{invoiceData.customerEmail}</p>
                <p className="text-gray-600">{invoiceData.customerPhone}</p>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Description</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Qty</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Unit Price</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items && invoiceData.items.length > 0 ? (
                    invoiceData.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-2">{item.description}</td>
                        <td className="py-3 px-2 text-center">{item.quantity}</td>
                        <td className="py-3 px-2 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-medium">{currencySymbol}{item.total.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{invoiceData.shipmentType || 'Shipping Service'}</p>
                          <p className="text-sm text-gray-500">Payment via {invoiceData.paymentMethod}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">1</td>
                      <td className="py-3 px-2 text-right">{currencySymbol}{invoiceData.amount.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right font-medium">{currencySymbol}{invoiceData.amount.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{currencySymbol}{invoiceData.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 text-lg font-bold">
                  <span>Total Paid</span>
                  <span className="text-green-600">{currencySymbol}{invoiceData.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Payment Received</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Thank you for your payment. This invoice has been paid in full.
              </p>
            </div>

            {/* Footer */}
            <div className="border-t pt-6 text-center text-sm text-gray-500">
              <p className="font-medium text-gray-700 mb-2">Thank you for your business!</p>
              <p>Zimbabwe Shipping Nexus | www.zimbabweshipping.com</p>
              <p>For questions, contact support@zimbabweshipping.com</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isSending || invoiceSent || !invoiceData.customerEmail || invoiceData.customerEmail === 'N/A'}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : invoiceSent ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Invoice Sent
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to Customer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceGenerator;
