
import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CalendarClock, CheckCircle2, FileText, Printer, Mail, Loader, User, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2pdf from 'html2pdf.js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import CollectionInfo from '@/components/CollectionInfo';

const ConfirmBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [isCollectionInfoLoading, setIsCollectionInfoLoading] = useState(true);
  const [collectionInfo, setCollectionInfo] = useState<{ route: string | null; collectionDate: string | null }>({
    route: null,
    collectionDate: null
  });
  
  const bookingData = location.state?.bookingData || {};
  const paymentData = location.state?.paymentData || {};
  
  // Debug logs to help identify issues
  console.log('Booking Data:', bookingData);
  console.log('Payment Data:', paymentData);
  console.log('Collection Info:', collectionInfo);
  
  if (!bookingData || Object.keys(bookingData).length === 0) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">No Booking Information</h1>
          <p className="mb-8">We couldn't find any booking details. Please try making a booking first.</p>
          <Button onClick={() => navigate('/book-shipment')}>
            Book a Shipment
          </Button>
        </div>
        <Footer />
      </>
    );
  }
  
  // Extract necessary data
  const senderName = bookingData.senderDetails?.name || `${bookingData.firstName || ''} ${bookingData.lastName || ''}`.trim();
  const senderPhone = bookingData.senderDetails?.phone || bookingData.phone;
  const senderEmail = bookingData.senderDetails?.email || bookingData.email;
  const senderAddress = bookingData.senderDetails?.address || bookingData.pickupAddress;
  
  const receiverName = bookingData.recipientDetails?.name || bookingData.recipientName;
  const receiverPhone = bookingData.recipientDetails?.phone || bookingData.recipientPhone;
  const additionalReceiverPhone = bookingData.recipientDetails?.additionalPhone || bookingData.additionalRecipientPhone;
  const receiverAddress = bookingData.recipientDetails?.address || bookingData.deliveryAddress;
  const trackingNumber = bookingData.shipmentDetails?.tracking_number || 'Pending Assignment';
  
  // Get country and postal code for collection info
  const pickupCountry = bookingData.pickupCountry || 'England';
  const pickupPostcode = bookingData.pickupPostcode || '';
  const pickupCity = bookingData.pickupCity || '';
  
  // Payment details
  const baseAmount = paymentData.originalAmount || paymentData.finalAmount || 0;
  const paymentMethod = paymentData.method || 'standard';
  const finalAmount = paymentData.finalAmount || baseAmount;
  const payOnArrivalAmount = (baseAmount * 1.2).toFixed(2);
  
  // Handle when collection info is ready
  const handleCollectionInfoReady = (info: { route: string | null; collectionDate: string | null }) => {
    console.log("Collection info received:", info);
    setCollectionInfo(info);
    setIsCollectionInfoLoading(false);
  };
  
  // Generate payment instructions based on payment method
  let paymentInstructions = '';
  if (paymentMethod === 'standard' || paymentMethod === 'bankTransfer' || paymentMethod === 'payLater') {
    paymentInstructions = "You selected the standard payment method. For direct debit and bank transfer, please contact Mr. Moyo at +44 7984 099041. Reference: Your tracking number or surname and initials.";
  } else if (paymentMethod === 'cashOnCollection') {
    paymentInstructions = `Payment is required upon collection of the items. Amount Due: £${finalAmount.toFixed(2)} payable on the ${collectionInfo.collectionDate || 'collection date'}.`;
  } else if (paymentMethod === 'payOnArrival') {
    paymentInstructions = `Goods will be kept in our warehouse in Zimbabwe until payment of: £${payOnArrivalAmount} (including 20% premium).`;
  }
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleDownload = () => {
    if (printRef.current) {
      const element = printRef.current;
      const opt = {
        margin: 10,
        filename: `Zimbabwe-Shipping-Confirmation-${trackingNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      toast({
        title: "Preparing download...",
        description: "Your confirmation is being prepared for download.",
      });
      
      html2pdf().from(element).set(opt).save().then(() => {
        toast({
          title: "Download complete",
          description: "Your confirmation has been downloaded successfully.",
        });
      });
    }
  };
  
  const handleEmail = () => {
    // In a real implementation, this would send the email through a backend service
    toast({
      title: "Email feature coming soon",
      description: "The email feature is not yet implemented. Please use the download option for now.",
    });
  };
  
  // If still loading collection info, show a loading state
  if (isCollectionInfoLoading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-20 text-center">
          <Loader className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-4">Preparing Your Confirmation</h1>
          <p className="mb-8">Please wait while we retrieve your collection information...</p>
          
          {/* Mount the CollectionInfo component to start data loading, but make it invisible */}
          <div className="sr-only">
            <CollectionInfo
              country={pickupCountry}
              postalCode={pickupPostcode}
              city={pickupCity}
              onCollectionInfoReady={handleCollectionInfoReady}
            />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Collection information with fallbacks
  const collectionDate = collectionInfo.collectionDate || 'Next available collection date';
  const route = collectionInfo.route || 'Standard Route';
  
  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            Back to Dashboard
          </Button>
          
          <div className="print:hidden flex flex-wrap gap-2 justify-end mb-4">
            <Button 
              variant="outline" 
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Download PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={handleEmail}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
        </div>
        
        <div ref={printRef} className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md print:shadow-none">
          <div className="text-center mb-6">
            <img
              src="/lovable-uploads/f662f2d7-317f-42a5-afdc-43dfa2d4e82c.png"
              alt="Zimbabwe Shipping"
              className="h-32 mx-auto mb-4"
            />
          </div>
          
          <div className="text-center border-b pb-6 mb-6">
            <div className="flex justify-center items-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Confirmation</h1>
            <p className="text-xl text-gray-600">Your booking has been successfully completed</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Confirmation Message</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700">
              <p className="mb-4">
                Thank You <span className="font-semibold">{senderName}</span>, Your booking is successful. 
                Goods will be collected on <span className="font-semibold">{collectionDate}</span> from 
                the Sender Address, and we will contact you on <span className="font-semibold">{senderPhone}</span>. 
                Your tracking number is <span className="font-semibold">{trackingNumber}</span>. 
                Your payment status is currently 'Pending.' Payment will be required on or before the day of 
                collection. Cash on Collection clients will be required to be on standby with the cash on the day of pickup.
              </p>
            </CardContent>
          </Card>
          
          {/* Sender Information Card */}
          <Card className="mt-6">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-gray-500" />
                Sender Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="flex items-center mb-2">
                    <User className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Name:</span> 
                    <span className="ml-2">{senderName}</span>
                  </p>
                  <p className="flex items-center mb-2">
                    <Phone className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Phone:</span> 
                    <span className="ml-2">{senderPhone}</span>
                  </p>
                </div>
                <div>
                  <p className="flex items-center mb-2">
                    <Mail className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Email:</span> 
                    <span className="ml-2">{senderEmail}</span>
                  </p>
                  <p className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Address:</span> 
                    <span className="ml-2">{senderAddress}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Receiver Information Card */}
          <Card className="mt-6">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-gray-500" />
                Receiver Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="flex items-center mb-2">
                    <User className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Name:</span> 
                    <span className="ml-2">{receiverName}</span>
                  </p>
                  <p className="flex items-center mb-2">
                    <Phone className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Phone:</span> 
                    <span className="ml-2">{receiverPhone}</span>
                  </p>
                </div>
                <div>
                  {additionalReceiverPhone && (
                    <p className="flex items-center mb-2">
                      <Phone className="mr-2 h-4 w-4 text-gray-500" />
                      <span className="font-semibold">Additional Phone:</span> 
                      <span className="ml-2">{additionalReceiverPhone}</span>
                    </p>
                  )}
                  <p className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                    <span className="font-semibold">Address:</span> 
                    <span className="ml-2">{receiverAddress}</span>
                  </p>
                </div>
              </div>
              <p className="mt-4">
                Please ensure that you are available on the collection day. And please let <span className="font-semibold">{receiverName}</span> of <span className="font-semibold">{receiverAddress}</span> with contact number <span className="font-semibold">{receiverPhone}</span> be aware of the parcel that will arrive 6-8 weeks from collection day.
              </p>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center">
                <CalendarClock className="mr-2 h-5 w-5 text-gray-500" />
                Payment Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 pt-4">
              <p className="mb-4">{paymentInstructions}</p>
              
              <div className="bg-gray-50 p-4 rounded-md mt-2">
                <h3 className="font-semibold mb-2">Payment Summary</h3>
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">{
                    paymentMethod === 'standard' || paymentMethod === 'bankTransfer' || paymentMethod === 'payLater' 
                      ? 'Standard Payment' 
                      : paymentMethod === 'cashOnCollection' 
                        ? 'Cash on Collection' 
                        : 'Pay on Arrival'
                  }</span>
                  
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">£{finalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center">
            <p className="text-gray-600 italic">Thank you for choosing Zimbabwe Shipping. Your support is highly appreciated.</p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ConfirmBooking;
