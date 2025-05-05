
import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { ArrowLeft, Check, Calendar, Phone, MapPin, User, Truck } from 'lucide-react';

const ConfirmBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state?.bookingData;
  
  useEffect(() => {
    document.title = 'Booking Confirmation | Zimbabwe Shipping';
    
    // If no booking data is found, redirect to the booking page
    if (!bookingData) {
      navigate('/book-shipment');
    }
  }, [bookingData, navigate]);
  
  if (!bookingData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-2xl font-bold mb-4">No Booking Information Found</h1>
            <p className="mb-6">We couldn't find your booking details. Please try booking again.</p>
            <Button onClick={() => navigate('/book-shipment')}>Go to Booking Page</Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }
  
  // Extract data from bookingData
  const senderName = `${bookingData.firstName || ''} ${bookingData.lastName || ''}`.trim() || 'Valued Customer';
  const senderPhone = bookingData.phone || 'Not provided';
  const senderAddress = bookingData.pickupAddress || 'Not provided';
  
  const receiverName = bookingData.recipientName || 'Not provided';
  const receiverPhone = bookingData.recipientPhone || 'Not provided';
  const additionalReceiverPhone = bookingData.additionalRecipientPhone || null;
  const receiverAddress = bookingData.deliveryAddress || 'Not provided';
  
  const trackingNumber = bookingData.shipmentDetails?.tracking_number || 'Pending assignment';
  const collectionDate = bookingData.collectionDate || 'To be scheduled';
  const amount = bookingData.totalAmount || 0;
  const paymentMethod = bookingData.paymentMethod || 'standard';
  
  // Calculate pay on arrival amount (with 20% premium)
  const payOnArrivalAmount = paymentMethod === 'goods_arriving' ? amount * 1.2 : amount;
  
  // Helper function to get payment instructions based on payment method
  const getPaymentInstructions = () => {
    switch(paymentMethod) {
      case 'standard':
      case 'bank_transfer':
      case 'direct_debit':
        return (
          <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-md">
            <p className="font-medium text-blue-800">Standard Payment Method</p>
            <p className="text-blue-700">For direct debit and bank transfer, please contact Mr. Moyo at +44 7984 099041.</p>
            <p className="text-blue-700 font-medium">Reference: {trackingNumber} or your surname and initials.</p>
          </div>
        );
      case 'cashOnCollection':
      case 'cash_on_collection':
        return (
          <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded-r-md">
            <p className="font-medium text-green-800">Cash on Collection</p>
            <p className="text-green-700">Payment is required upon collection of the items.</p>
            <p className="text-green-700 font-medium">Amount Due: {formatCurrency(amount, 'GBP')} payable on {collectionDate}.</p>
          </div>
        );
      case 'goods_arriving':
      case 'payOnArrival':
        return (
          <div className="border-l-4 border-amber-500 pl-4 py-2 bg-amber-50 rounded-r-md">
            <p className="font-medium text-amber-800">Pay on Arrival in Zimbabwe</p>
            <p className="text-amber-700">Goods will be kept in our warehouse in Zimbabwe until payment of:</p>
            <p className="text-amber-700 font-medium">{formatCurrency(payOnArrivalAmount, 'GBP')} (includes 20% premium)</p>
          </div>
        );
      default:
        return (
          <div className="border-l-4 border-gray-500 pl-4 py-2 bg-gray-50 rounded-r-md">
            <p className="font-medium">Payment Required</p>
            <p>Please contact us at +44 7984 099041 for payment instructions.</p>
            <p className="font-medium">Amount Due: {formatCurrency(amount, 'GBP')}</p>
          </div>
        );
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 py-8 px-4 md:py-12">
        <div className="container mx-auto max-w-4xl">
          {/* Back button */}
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          
          <Card className="p-6 md:p-8 mb-6 border-t-4 border-zim-green">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-100 rounded-full p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Booking Confirmation</h1>
              <p className="text-gray-600">Your booking has been successfully completed</p>
            </div>
            
            <div className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <p className="mb-4 text-gray-700">
                Thank You <span className="font-semibold">{senderName}</span>,
              </p>
              <p className="mb-4 text-gray-700">
                Your booking is successful. Goods will be collected on <span className="font-semibold">{collectionDate}</span> from the Sender Address, 
                and we will contact you on <span className="font-semibold">{senderPhone}</span>.
              </p>
              <p className="mb-4 text-gray-700">
                Your tracking number is <span className="font-semibold">{trackingNumber}</span>. 
                Your payment status is currently <span className="font-semibold text-amber-600">Pending</span>.
              </p>
              <p className="text-gray-700">
                Payment will be required on or before the day of collection. Cash on Collection clients will be required 
                to be on standby with the cash on the day of pickup.
              </p>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Payment Instructions</h2>
              {getPaymentInstructions()}
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2 text-zim-green" />
                    Sender Information
                  </h3>
                  <p className="text-sm text-gray-700"><span className="font-medium">Name:</span> {senderName}</p>
                  <p className="text-sm text-gray-700"><span className="font-medium">Phone:</span> {senderPhone}</p>
                  <p className="text-sm text-gray-700"><span className="font-medium">Address:</span> {senderAddress}</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2 text-zim-green" />
                    Receiver Information
                  </h3>
                  <p className="text-sm text-gray-700"><span className="font-medium">Name:</span> {receiverName}</p>
                  <p className="text-sm text-gray-700"><span className="font-medium">Phone:</span> {receiverPhone}</p>
                  {additionalReceiverPhone && (
                    <p className="text-sm text-gray-700"><span className="font-medium">Additional Phone:</span> {additionalReceiverPhone}</p>
                  )}
                  <p className="text-sm text-gray-700"><span className="font-medium">Address:</span> {receiverAddress}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h2 className="text-xl font-semibold mb-2">Receiver Notice</h2>
              <p className="text-gray-700">
                Please ensure that you are available on the collection day. And please let <span className="font-semibold">{receiverName}</span> of <span className="font-semibold">{receiverAddress}</span> with 
                contact number <span className="font-semibold">{receiverPhone}</span> be aware of the parcel that will arrive 6-8 weeks from collection day.
              </p>
            </div>
            
            <div className="text-center border-t pt-6 mt-6">
              <p className="text-gray-700 italic">
                Thank you for choosing Zimbabwe Shipping. Your support is highly appreciated.
              </p>
            </div>
          </Card>
          
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => window.print()}
              variant="outline"
              className="flex items-center"
            >
              Print Confirmation
            </Button>
            
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default ConfirmBooking;
