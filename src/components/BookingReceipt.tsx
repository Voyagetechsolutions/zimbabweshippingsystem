import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Share2, Package, MapPin, User, CreditCard, Calendar, CalendarClock, Truck } from 'lucide-react';

interface BookingReceiptProps {
  receiptNumber: string;
  trackingNumber: string;
  amount: number;
  senderFirstName: string;
  senderLastName: string;
  senderEmail: string;
  senderPhone: string;
  pickupAddress: string;
  pickupCity: string;
  pickupPostcode: string;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  drumQuantity?: number;
  includeBoxes?: boolean;
  boxesDescription?: string;
  wantMetalSeal?: boolean;
  paymentMethod: string;
  collectionRoute?: string | null;
  collectionDate?: string | null;
  onNewBooking: () => void;
}

const BookingReceipt: React.FC<BookingReceiptProps> = ({
  receiptNumber,
  trackingNumber,
  amount,
  senderFirstName,
  senderLastName,
  senderEmail,
  senderPhone,
  pickupAddress,
  pickupCity,
  pickupPostcode,
  receiverName,
  receiverPhone,
  deliveryAddress,
  deliveryCity,
  drumQuantity,
  includeBoxes,
  boxesDescription,
  wantMetalSeal,
  paymentMethod,
  collectionRoute,
  collectionDate,
  onNewBooking
}) => {
  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case 'cashOnCollection':
        return 'Pay Cash on Collection';
      case 'payOnArrival':
        return 'Pay on Arrival';
      default:
        return 'Standard Payment';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Zimbabwe Shipping Receipt',
          text: `Receipt #${receiptNumber} | Tracking: ${trackingNumber}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 print:space-y-4">
      {/* Success Header */}
      <div className="text-center space-y-4 print:space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 print:bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white print:text-black">Booking Confirmed!</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 print:text-gray-700">
            Your shipment has been successfully booked
          </p>
        </div>
      </div>

      {/* Receipt Card */}
      <Card className="print:shadow-none print:border-2">
        <CardHeader className="bg-gradient-to-r from-zim-green to-green-600 text-white print:bg-none print:text-black print:border-b-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2 print:text-black">Receipt</CardTitle>
              <p className="text-sm opacity-90 print:text-gray-700">
                #{receiptNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90 print:text-gray-700">Date</p>
              <p className="font-semibold print:text-black">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Tracking Number - Prominent */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 print:bg-gray-50 print:border-gray-300">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700">Tracking Number</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 print:text-black">{trackingNumber}</p>
              </div>
            </div>
          </div>

          {/* Sender Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-zim-green" />
              <h3 className="font-semibold text-lg">Collection Details</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm print:bg-white print:border">
              <p><strong>{senderFirstName} {senderLastName}</strong></p>
              <p className="text-gray-600 dark:text-gray-400 print:text-gray-700">{senderEmail}</p>
              <p className="text-gray-600 dark:text-gray-400 print:text-gray-700">{senderPhone}</p>
              <p className="text-gray-600 dark:text-gray-400 print:text-gray-700">
                {pickupAddress}, {pickupCity}, {pickupPostcode}
              </p>
            </div>
          </div>

          {/* Receiver Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-zim-green" />
              <h3 className="font-semibold text-lg">Delivery Details</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm print:bg-white print:border">
              <p><strong>{receiverName}</strong></p>
              <p className="text-gray-600 dark:text-gray-400 print:text-gray-700">{receiverPhone}</p>
              <p className="text-gray-600 dark:text-gray-400 print:text-gray-700">
                {deliveryAddress}, {deliveryCity}, Zimbabwe
              </p>
            </div>
          </div>

          {/* Shipment Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-zim-green" />
              <h3 className="font-semibold text-lg">Items</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm print:bg-white print:border">
              {drumQuantity && drumQuantity > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>{drumQuantity} x Drum (200-220 L)</span>
                  </div>
                  {wantMetalSeal && (
                    <p className="text-gray-600 dark:text-gray-400 print:text-gray-700">
                      • Metal Coded Seal included
                    </p>
                  )}
                </div>
              )}
              {includeBoxes && (
                <div className="border-t pt-2 mt-2">
                  <p className="font-medium">Boxes & Other Items:</p>
                  <p className="text-gray-600 dark:text-gray-400 print:text-gray-700">{boxesDescription}</p>
                  <p className="text-xs italic mt-1 text-blue-600 dark:text-blue-400 print:text-blue-600">
                    Custom quote will be provided
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-zim-green" />
              <h3 className="font-semibold text-lg">Payment</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 print:bg-white print:border">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 print:text-gray-700">Payment Method:</span>
                <span className="font-medium">{getPaymentMethodLabel()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 print:text-gray-700">Status:</span>
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs font-medium print:bg-yellow-100 print:text-yellow-800">
                  Pending
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-semibold text-lg">Total Amount:</span>
                <span className="text-2xl font-bold text-zim-green">£{amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Collection Schedule */}
          {(collectionRoute || collectionDate) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="h-5 w-5 text-zim-green" />
                <h3 className="font-semibold text-lg">Collection Schedule</h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm print:bg-white print:border">
                {collectionRoute && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span><strong>Route:</strong> {collectionRoute}</span>
                  </div>
                )}
                {collectionDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span><strong>Collection Date:</strong> {collectionDate}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 print:bg-blue-50 print:border-blue-200">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1 print:text-blue-900">What's Next?</p>
                <ul className="space-y-1 text-blue-800 dark:text-blue-400 print:text-blue-800">
                  <li>• We'll contact you within 24 hours to confirm collection time</li>
                  <li>• You can track your shipment using the tracking number above</li>
                  <li>• Payment will be collected based on your selected method</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center print:hidden">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Print Receipt
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <Button
          onClick={onNewBooking}
          className="bg-zim-green hover:bg-zim-green/90"
        >
          Book Another Shipment
        </Button>
      </div>

      {/* Footer Note */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 print:text-gray-600">
        Keep this receipt for your records. Questions? Contact us at support@zimbabweshipping.com
      </p>
    </div>
  );
};

export default BookingReceipt;
