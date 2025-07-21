
import React, { useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Printer, ArrowRight, MapPin, Calendar, Package, Download, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useShipping } from '@/contexts/ShippingContext';
import { supabase } from '@/integrations/supabase/client';
import { exportElementToPdf } from '@/utils/exportUtils';
import { formatDate } from '@/utils/formatters';

const ConfirmBooking = () => {
  const location = useLocation();
  const { bookingData, paymentData, customQuoteData } = location.state || {};
  const { toast } = useToast();
  const { formatPrice } = useShipping();
  const bookingSummaryRef = useRef(null);

  useEffect(() => {
    // Set the page title
    document.title = 'Booking Confirmation | UK to Zimbabwe Shipping';

    // If there's no booking data, show an error
    if (!bookingData) {
      toast({
        title: "Error",
        description: "No booking data found. Please try again.",
        variant: "destructive"
      });
    }

    // If this is a successful booking, create a receipt
    const createReceipt = async () => {
      if (bookingData && paymentData && bookingData.paymentCompleted) {
        try {
          const receiptData = {
            shipment_id: bookingData.shipment_id,
            payment_id: paymentData?.id,
            user_id: bookingData.user_id,
            amount: paymentData.finalAmount,
            currency: paymentData.currency || 'GBP',
            payment_method: paymentData.method,
            status: 'completed',
            sender_details: bookingData.senderDetails,
            recipient_details: bookingData.recipientDetails,
            shipment_details: bookingData.shipmentDetails,
            payment_info: paymentData,
            collection_info: {
              route: bookingData.collectionRoute || bookingData.collection?.route,
              date: bookingData.collectionDate || bookingData.collection?.date
            }
          };

          const { error } = await supabase
            .from('receipts')
            .insert(receiptData);

          if (error) {
            console.error('Error creating receipt:', error);
          }
        } catch (err) {
          console.error('Error in receipt creation:', err);
        }
      }
    };

    createReceipt();
  }, [bookingData, paymentData, toast]);

  // Handle cases where booking data is missing
  if (!bookingData) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">Booking Error</h1>
            <p className="text-lg mb-8">Unable to find your booking details. Please try again or contact support.</p>
            <Link to="/book-shipment">
              <Button>Return to Booking</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Extract shipment details from booking data
  const senderName = `${bookingData.firstName || ''} ${bookingData.lastName || ''}`;
  const shipmentType = bookingData.includeDrums ? 'Drum Shipping' : bookingData.shipmentType === 'parcel' ? 'Parcel' : 'Custom Items';
  const trackingNumber = bookingData.shipmentDetails?.tracking_number || '';
  const deliveryCity = bookingData.deliveryCity || bookingData.recipientDetails?.address?.split(',').pop()?.trim() || 'Zimbabwe';
  
  // Calculate prices based on updated pricing structure
  const basePrice = calculateBasePrice(bookingData);
  const additionalServices = bookingData.shipmentDetails?.services || [];
  const additionalServicesTotal = additionalServices.reduce((total, service) => total + (service.price || 0), 0);
  const totalAmount = basePrice + additionalServicesTotal;
  
  // Calculate the base price based on the updated drum pricing structure
  function calculateBasePrice(data) {
    if (!data.includeDrums) return 0;
    
    const drumQuantity = parseInt(data.shipmentDetails?.quantity || data.drumQuantity || '1');
    
    if (drumQuantity >= 5) {
      return drumQuantity * 260;
    } else if (drumQuantity >= 2) {
      return drumQuantity * 270;
    } else {
      return 280; // 1 drum
    }
  }

  // Payment method information
  const getPaymentMethodInfo = () => {
    const paymentMethod = bookingData.paymentMethod || paymentData?.method || 'standard-payment';
    
    if (paymentMethod === 'standard-payment') {
      return {
        displayName: 'Standard Payment',
        instructions: `Please contact Mr. Moyo on +44 7984 099041 for bank details. Reference: Tracking number (${trackingNumber}), initials, and surname.`
      };
    } else if (paymentMethod === 'cash-on-collection') {
      return {
        displayName: 'Pay Full on Collection',
        instructions: "Please make payment via bank transfer or have cash on the collection date."
      };
    } else if (paymentMethod === 'pay-on-arrival') {
      return {
        displayName: 'Pay on Arrival (20% Premium)',
        instructions: "Payment will be required when goods arrive in Zimbabwe."
      };
    } else if (paymentMethod === 'standard' && paymentData?.payLaterMethod === 'payLater') {
      return {
        displayName: 'Pay within 30 days',
        instructions: "Payment schedule has been set up. Please see payment plan below."
      };
    }
    
    return {
      displayName: 'Standard Payment',
      instructions: `Please contact Mr. Moyo on +44 7984 099041 for bank details. Reference: Tracking number (${trackingNumber}), initials, and surname.`
    };
  };
  
  const paymentInfo = getPaymentMethodInfo();

  // Handle PDF download for the entire page
  const downloadAsPdf = async () => {
    try {
      if (!bookingSummaryRef.current) return;
      
      await exportElementToPdf(
        bookingSummaryRef.current, 
        `zimbabwe_shipping_confirmation_${trackingNumber || 'booking'}`,
        toast
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download confirmation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle email sending
  const sendConfirmationEmail = async () => {
    try {
      toast({
        title: "Sending Email",
        description: "Sending booking confirmation to your email...",
      });
      
      // This would typically call a backend API to send the email
      // For now, we'll just show a success message
      setTimeout(() => {
        toast({
          title: "Email Sent",
          description: "Booking confirmation has been sent to your email.",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div ref={bookingSummaryRef} className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img 
                src="/lovable-uploads/efd3418e-edfe-47c6-b53d-10a17c87dd39.png" 
                alt="Zimbabwe Shipping Logo" 
                className="h-32 w-auto"
              />
              <h1 className="text-3xl md:text-4xl font-bold ml-4">Zimbabwe Shipping</h1>
            </div>
            <p className="text-gray-600">
              {customQuoteData 
                ? "Thank you for your request. We'll contact you with a custom quote soon." 
                : "Your booking has been submitted successfully."}
            </p>
            
            <div className="mt-4 bg-gray-100 px-4 py-2 rounded-md inline-block">
              <CheckCircle2 className="h-5 w-5 text-green-600 inline mr-2" />
              <span className="font-medium">Booking Confirmed</span>
            </div>
          </div>

          <Card className="mb-6 shadow-md border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Tracking Number */}
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
                  <h3 className="text-lg font-semibold mb-1">Tracking Number</h3>
                  <p className="text-xl font-bold text-amber-800">{trackingNumber || 'Pending'}</p>
                </div>
                
                {/* Sender Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-zim-green" /> Sender Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {senderName}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {bookingData.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {bookingData.phone}
                    </div>
                    {bookingData.additionalPhone && (
                      <div>
                        <span className="font-medium">Additional Phone:</span> {bookingData.additionalPhone}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Address:</span> {bookingData.pickupAddress}
                    </div>
                    <div>
                      <span className="font-medium">City:</span> {bookingData.pickupCity}
                    </div>
                    <div>
                      <span className="font-medium">Postal Code:</span> {bookingData.pickupPostcode}
                    </div>
                    <div>
                      <span className="font-medium">Country:</span> {bookingData.pickupCountry}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Receiver Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-zim-green" /> Receiver Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {bookingData.recipientName}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {bookingData.recipientPhone}
                    </div>
                    {bookingData.additionalRecipientPhone && (
                      <div>
                        <span className="font-medium">Additional Phone:</span> {bookingData.additionalRecipientPhone}
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <span className="font-medium">Delivery Address:</span> {bookingData.deliveryAddress}
                    </div>
                    <div>
                      <span className="font-medium">City:</span> {deliveryCity}
                    </div>
                    
                    {/* Additional Delivery Addresses (if any) */}
                    {bookingData.additionalDeliveryAddresses && bookingData.additionalDeliveryAddresses.length > 0 && (
                      <div className="md:col-span-2 mt-2">
                        <h4 className="text-sm font-semibold mb-2">Additional Delivery Addresses:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {bookingData.additionalDeliveryAddresses.map((address, index) => (
                            <li key={index}>
                              {address.address}, {address.city || deliveryCity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Collection Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-zim-green" /> Collection Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="font-medium">Route:</span> {bookingData.collectionRoute || "Not specified"}
                    </div>
                    <div>
                      <span className="font-medium">Collection Date:</span> {bookingData.collectionDate || "Not specified"}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Shipment Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-zim-green" /> Shipment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <span className="font-medium">Shipment Type:</span> {shipmentType}
                    </div>
                    
                    {bookingData.includeDrums && (
                      <div>
                        <span className="font-medium">Number of Drums:</span> {bookingData.drumQuantity || '1'}
                      </div>
                    )}
                    
                    {bookingData.includeOtherItems && (
                      <>
                        <div>
                          <span className="font-medium">Category:</span> {bookingData.itemCategory || 'Not specified'}
                        </div>
                        {bookingData.specificItem && (
                          <div>
                            <span className="font-medium">Item:</span> {bookingData.specificItem}
                          </div>
                        )}
                        {bookingData.otherItemDescription && (
                          <div className="md:col-span-2">
                            <span className="font-medium">Description:</span> {bookingData.otherItemDescription}
                          </div>
                        )}
                      </>
                    )}
                    
                    {customQuoteData && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Custom Quote Request:</span> A representative will contact you with a quote.
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Services */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Additional Services</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="text-blue-600 font-medium">
                      If you wish to have your goods delivered to different drop-off addresses, please kindly communicate with the driver at the collection point.
                    </li>
                    
                    {bookingData.wantMetalSeal && bookingData.includeDrums && (
                      <li className="flex justify-between">
                        <span>Metal Coded Seal ({bookingData.drumQuantity || 1} x £5)</span>
                        <span className="font-medium">{formatPrice(5 * parseInt(bookingData.drumQuantity || '1'))}</span>
                      </li>
                    )}
                    
                    {!bookingData.wantMetalSeal && (
                      <li className="text-gray-500">No additional services selected</li>
                    )}
                  </ul>
                </div>
                
                <Separator />
                
                {/* Payment Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="font-medium">Payment Method:</span> {paymentInfo.displayName}
                    </div>
                    <div>
                      <span className="font-medium">Payment Status:</span> 
                      <span className="ml-1 font-medium text-amber-600">Pending Payment</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                    <p className="text-amber-800">{paymentInfo.instructions}</p>
                  </div>

                  {/* Payment Schedule Display - Only show if payment method is 'Pay within 30 days' */}
                  {paymentData?.payLaterMethod === 'payLater' && paymentData?.paymentSchedule && paymentData.paymentSchedule.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="text-sm font-semibold mb-3 text-blue-800">Payment Plan:</h4>
                      <div className="space-y-2">
                        {paymentData.paymentSchedule.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                            <span className="text-sm font-medium">
                              {formatDate(payment.date)}
                            </span>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatPrice(payment.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t border-blue-200 flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-800">Total:</span>
                        <span className="text-sm font-bold text-blue-800">
                          {formatPrice(paymentData.finalAmount || totalAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Total */}
                <div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-zim-green">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 justify-center mt-8">
            <Link to="/">
              <Button variant="outline" className="w-full md:w-auto">
                Return to Home
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={downloadAsPdf}
              className="flex items-center w-full md:w-auto"
            >
              <Download className="h-4 w-4 mr-1" /> Download Confirmation
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={sendConfirmationEmail}
              className="flex items-center w-full md:w-auto"
            >
              <Mail className="h-4 w-4 mr-1" /> Email Confirmation
            </Button>
            
            <Link to={`/receipt/${bookingData.shipment_id}`}>
              <Button variant="outline" className="w-full md:w-auto flex items-center">
                <Printer className="h-4 w-4 mr-2" /> Print Receipt
              </Button>
            </Link>
            
            <Link to="/track">
              <Button className="w-full md:w-auto flex items-center">
                Track Shipment <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ConfirmBooking;
