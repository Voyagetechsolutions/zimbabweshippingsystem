'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPaymentMethodDisplay } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReceiptPDF from '@/components/ReceiptPDF';

export default function ReceiptPage() {
  const [receipt, setReceipt] = useState<any>({});
  const [shipment, setShipment] = useState<any>({});
  const [customQuoteData, setCustomQuoteData] = useState<any>({});
  const receiptRef = useRef(null);

  useEffect(() => {
    const savedReceipt = JSON.parse(localStorage.getItem('receipt') || '{}');
    const savedShipment = JSON.parse(localStorage.getItem('shipment') || '{}');
    const savedCustomQuote = JSON.parse(localStorage.getItem('customQuoteData') || '{}');

    setReceipt(savedReceipt);
    setShipment(savedShipment);
    setCustomQuoteData(savedCustomQuote);
  }, []);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="shadow-lg">
        <div className="p-3 sm:p-6" ref={receiptRef}>
          <h1 className="text-2xl font-bold mb-4 text-center">Receipt</h1>
          <p className="text-sm text-center mb-8">
            Thank you for your order. Below is your receipt.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="font-semibold mb-2">Sender Details</h2>
              <p><strong>Name:</strong> {receipt.sender_details?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {receipt.sender_details?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {receipt.sender_details?.phone || 'N/A'}</p>
              <p><strong>Address:</strong> {receipt.sender_details?.address || 'N/A'}</p>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Recipient Details</h2>
              <p><strong>Name:</strong> {receipt.recipient_details?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {receipt.recipient_details?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {receipt.recipient_details?.phone || 'N/A'}</p>
              <p><strong>Address:</strong> {receipt.recipient_details?.address || 'N/A'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-semibold mb-2">Shipment Details</h2>
            <p><strong>Tracking #:</strong> {shipment.tracking_number}</p>
            <p><strong>Origin:</strong> {shipment.origin}</p>
            <p><strong>Destination:</strong> {shipment.destination}</p>
            <p><strong>Status:</strong> {shipment.status}</p>
          </div>

          <div className="mb-6">
            <h2 className="font-semibold mb-2">Payment</h2>
            <p><strong>Amount:</strong> {receipt.currency} {receipt.amount?.toFixed(2)}</p>
            <p><strong>Method:</strong> {getPaymentMethodDisplay(receipt.payment_method)}</p>
          </div>

          {Object.keys(customQuoteData).length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold mb-2">Custom Quote</h2>
              <p><strong>Description:</strong> {customQuoteData.description || 'N/A'}</p>
              <p><strong>Weight:</strong> {customQuoteData.weight || 'N/A'} kg</p>
              <p><strong>Dimensions:</strong> {customQuoteData.dimensions || 'N/A'}</p>
              <p><strong>Quote Price:</strong> {receipt.currency} {customQuoteData.price || 'N/A'}</p>
            </div>
          )}

          <p className="text-sm mt-10 text-center">This receipt was generated on {new Date().toLocaleDateString()}.</p>
        </div>
      </Card>

      <div className="flex justify-center gap-4 mt-6 flex-wrap">
        <Button onClick={handlePrint}>Print</Button>
        <PDFDownloadLink
          document={<ReceiptPDF receipt={receipt} shipment={shipment} customQuoteData={customQuoteData} />}
          fileName="receipt.pdf"
        >
          {({ loading }) => (
            <Button disabled={loading}>
              {loading ? 'Preparing PDF...' : 'Download PDF'}
            </Button>
          )}
        </PDFDownloadLink>
      </div>
    </div>
  );
}
