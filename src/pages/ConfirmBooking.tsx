
import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Printer, ArrowRight, MapPin, Calendar, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useShipping } from '@/contexts/ShippingContext';
import { supabase } from '@/integrations/supabase/client';

const ConfirmBooking = () => {
  const location = useLocation();
  const { bookingData, paymentData, customQuoteData } = location.state || {};
  const { toast } = useToast();
  const { formatPrice } = useShipping();

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
  
  // Calculate prices
  const basePrice = bookingData.shipmentDetails?.price || 0;
  const additionalServices = bookingData.shipmentDetails?.services || [];
  const additionalServicesTotal = additionalServices.reduce((total: number, service: any) => total + (service.price || 0), 0);
  const totalAmount = bookingData.paymentCompleted ? (paymentData?.finalAmount || 0) : (basePrice + additionalServicesTotal);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Booking Confirmed</h1>
            <p className="text-gray-600">
              {bookingData.paymentCompleted 
                ? "Thank you for your booking. Your payment has been processed successfully." 
                : customQuoteData 
                  ? "Thank you for your request. We'll contact you with a custom quote soon." 
                  : "Your booking has been submitted successfully."}
            </p>
            
            {trackingNumber && (
              <div className="mt-4 bg-gray-100 px-4 py-2 rounded-md inline-block">
                <span className="font-medium">Tracking Number:</span> {trackingNumber}
              </div>
            )}
          </div>

          <Card className="mb-6 shadow-md border-gray-200 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <CardTitle className="text-xl">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
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
                
                {/* Recipient Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-zim-green" /> Recipient Details
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
                    {bookingData.doorToDoor && (
                      <li className="flex justify-between">
                        <span>Door-to-Door Delivery</span>
                        <span className="font-medium">{formatPrice(25)}</span>
                      </li>
                    )}
                    
                    {bookingData.wantMetalSeal && bookingData.includeDrums && (
                      <li className="flex justify-between">
                        <span>Metal Seal ({bookingData.drumQuantity || 1} x £5)</span>
                        <span className="font-medium">{formatPrice(5 * parseInt(bookingData.drumQuantity || '1'))}</span>
                      </li>
                    )}
                    
                    {(!bookingData.doorToDoor && !bookingData.wantMetalSeal) && (
                      <li className="text-gray-500">No additional services selected</li>
                    )}
                  </ul>
                </div>
                
                {bookingData.paymentCompleted && (
                  <>
                    <Separator />
                    
                    {/* Payment Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="font-medium">Payment Method:</span> {
                            paymentData?.method === 'card' ? 'Credit/Debit Card' :
                            paymentData?.method === 'bank' ? 'Bank Transfer' :
                            paymentData?.method === 'crypto' ? 'Cryptocurrency' : 
                            'Not specified'
                          }
                        </div>
                        <div>
                          <span className="font-medium">Payment Status:</span> 
                          <span className="text-green-600 font-medium ml-1">Completed</span>
                        </div>
                        <div>
                          <span className="font-medium">Payment Option:</span> {
                            bookingData.paymentOption === 'standard' ? 'Discount Deal (Pay Now)' : 'Standard Rate'
                          }
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                {/* Total */}
                <div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total{bookingData.paymentCompleted ? ' Paid' : ''}</span>
                    <span className="text-zim-green">{formatPrice(totalAmount)}</span>
                  </div>
                  
                  {!bookingData.paymentCompleted && !customQuoteData && (
                    <p className="text-sm text-gray-500 mt-2">
                      Payment will be collected during the processing of your shipment.
                    </p>
                  )}
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
            
            {bookingData.paymentCompleted && (
              <Link to={`/receipt/${bookingData.shipment_id}`}>
                <Button variant="outline" className="w-full md:w-auto flex items-center">
                  <Printer className="h-4 w-4 mr-2" /> Print Receipt
                </Button>
              </Link>
            )}
            
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
