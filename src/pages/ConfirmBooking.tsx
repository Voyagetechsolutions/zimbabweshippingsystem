
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import { Shipment } from '@/types/shipment';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { Printer, Download, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import Logo from '@/components/Logo';

const ConfirmBooking = () => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for booking data and loading status
  const [bookingData, setBookingData] = useState<any>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string | null>(null);
  
  // Booking data can come from navigation state or URL param
  const stateBookingData = location.state?.bookingData;
  const shipmentId = params.id || location.state?.shipmentId;
  
  useEffect(() => {
    document.title = 'Booking Confirmation | Zimbabwe Shipping';
  }, []);
  
  useEffect(() => {
    async function fetchBookingData() {
      try {
        setLoading(true);
        
        // Case 1: Data from navigation state
        if (stateBookingData) {
          console.log('Using booking data from navigation state:', stateBookingData);
          setBookingData(stateBookingData);
          
          if (stateBookingData.shipment_id) {
            const { data: shipmentData } = await supabase
              .from(tableFrom('shipments'))
              .select('*')
              .eq('id', stateBookingData.shipment_id)
              .single();
              
            if (shipmentData) setShipment(shipmentData as Shipment);
          }
          
          // Fetch collection schedule
          await fetchCollectionSchedule();
          return;
        }
        
        // Case 2: Fetch shipment by ID from URL
        if (shipmentId) {
          console.log('Fetching shipment data by ID:', shipmentId);
          
          const { data: shipmentData, error: shipmentError } = await supabase
            .from(tableFrom('shipments'))
            .select('*')
            .eq('id', shipmentId)
            .single();
          
          if (shipmentError) {
            console.error('Error fetching shipment:', shipmentError);
            setError('Shipment not found');
            return;
          }
          
          setShipment(shipmentData as Shipment);
          
          // Also fetch related booking data if available
          const { data: paymentsData } = await supabase
            .from(tableFrom('payments'))
            .select('*')
            .eq('shipment_id', shipmentId)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (paymentsData && paymentsData.length > 0) {
            setBookingData({
              paymentMethod: paymentsData[0].payment_method,
              amount: paymentsData[0].amount,
              currency: paymentsData[0].currency || 'GBP'
            });
          }
          
          // Fetch collection schedule
          await fetchCollectionSchedule();
          return;
        }
        
        // Case 3: No booking data available
        setError('No booking information found');
      } catch (err) {
        console.error('Error loading booking data:', err);
        setError('Failed to load booking information');
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchCollectionSchedule() {
      try {
        const { data: scheduleData } = await supabase
          .from(tableFrom('collection_schedules'))
          .select('*')
          .order('pickup_date', { ascending: true })
          .limit(1);
          
        if (scheduleData && scheduleData.length > 0) {
          setCollectionDate(scheduleData[0].pickup_date);
        }
      } catch (err) {
        console.error('Error fetching collection schedule:', err);
      }
    }
    
    fetchBookingData();
  }, [stateBookingData, shipmentId]);
  
  // Handle print booking
  const handlePrint = () => {
    window.print();
  };
  
  // Handle download booking as PDF
  const handleDownload = () => {
    const bookingElement = document.getElementById('booking-confirmation');
    if (!bookingElement) return;
    
    const options = {
      margin: 10,
      filename: `booking-${shipment?.tracking_number || 'zimbabwe-shipping'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().from(bookingElement).set(options).save();
    
    toast({
      title: "Booking Confirmation Downloaded",
      description: "Your booking confirmation has been downloaded as a PDF file."
    });
  };
  
  // Handle email booking
  const handleEmail = () => {
    // In a real implementation, this would call an API to send the email
    toast({
      title: "Booking Confirmation Emailed",
      description: "Your booking confirmation has been sent to your email address."
    });
  };
  
  // Extract data from the booking and shipment objects
  const senderDetails = bookingData?.senderDetails || {};
  const recipientDetails = bookingData?.recipientDetails || {};
  const shipmentDetails = bookingData?.shipmentDetails || {};
  const paymentMethod = bookingData?.paymentMethod || bookingData?.paymentOption;
  const baseAmount = bookingData?.amount || 0;
  
  // Calculate the pay on arrival amount (20% premium)
  const payOnArrivalAmount = paymentMethod === 'payOnArrival' ? baseAmount * 1.2 : baseAmount;
  
  // Format payment method display
  const getPaymentMethodDisplay = () => {
    if (!paymentMethod) return 'Standard Payment';
    
    switch(paymentMethod) {
      case 'payOnArrival':
        return 'Pay on Arrival (20% Premium)';
      case 'cashOnCollection':
        return 'Cash on Collection';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'payLater':
      case 'cash':
        return 'Standard Payment (30-Day Terms)';
      case 'direct_debit':
        return 'Direct Debit';
      default:
        return paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace(/_/g, ' ');
    }
  };

  return (
    <>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50 py-8 px-4 md:py-12">
        <div className="container mx-auto max-w-4xl">
          {/* Back button */}
          <div className="mb-6">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
              <span className="ml-3 text-lg">Loading booking information...</span>
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
              <p className="mb-4">{error}</p>
              <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </Card>
          ) : (
            <div className="bg-white shadow-md rounded-lg p-6 md:p-8 mb-6" id="booking-confirmation">
              {/* Booking Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6">
                <div>
                  {/* Logo */}
                  <Logo size="medium" />
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <h2 className="text-2xl font-bold text-gray-800">BOOKING CONFIRMATION</h2>
                  <p className="text-gray-600">Tracking #: {shipment?.tracking_number || 'Pending'}</p>
                  <p className="text-gray-600">Date: {formatDate(new Date().toISOString())}</p>
                </div>
              </div>
              
              {/* Confirmation Message */}
              <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="font-medium text-green-800 mb-2">Thank You {senderDetails?.name || `${senderDetails?.firstName || ''} ${senderDetails?.lastName || ''}`.trim() || 'Valued Customer'}!</h3>
                <p className="text-green-700">
                  Your booking is successful. Goods will be collected on {collectionDate || 'the scheduled collection date'} from the Sender Address, 
                  and we will contact you on {senderDetails?.phone || 'your registered phone number'}. 
                  Your tracking number is {shipment?.tracking_number || 'being generated'}. Your payment status is currently 'Pending.' 
                  Payment will be required on or before the day of collection. Cash on Collection clients will be required to be on standby with the cash on the day of pickup.
                </p>
              </div>
              
              {/* Sender and Recipient Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Sender Details */}
                <div className="border rounded-md p-4">
                  <h3 className="text-md font-semibold mb-2">Sender Details</h3>
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {senderDetails?.name || `${senderDetails?.firstName || ''} ${senderDetails?.lastName || ''}`.trim() || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Email:</span> {senderDetails?.email || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Phone:</span> {senderDetails?.phone || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Address:</span> {senderDetails?.address || bookingData?.pickupAddress || 'N/A'}
                  </p>
                </div>
                
                {/* Recipient Details */}
                <div className="border rounded-md p-4">
                  <h3 className="text-md font-semibold mb-2">Recipient Details</h3>
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {recipientDetails?.name || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Phone:</span> {recipientDetails?.phone || 'N/A'}
                  </p>
                  {recipientDetails?.additionalPhone && (
                    <p className="text-sm">
                      <span className="font-medium">Additional Phone:</span> {recipientDetails.additionalPhone}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Address:</span> {recipientDetails?.address || 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Payment Instructions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Payment Instructions</h3>
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-800 mb-2">Selected Payment Method: {getPaymentMethodDisplay()}</p>
                  
                  {/* Payment instructions based on method */}
                  {paymentMethod === 'payOnArrival' ? (
                    <div>
                      <p className="text-blue-700">
                        Goods will be kept in our warehouse in Zimbabwe until payment of: {formatCurrency(payOnArrivalAmount, 'GBP')}.
                      </p>
                      <p className="text-blue-700 mt-2">
                        This includes a 20% premium on the standard price.
                      </p>
                    </div>
                  ) : paymentMethod === 'cashOnCollection' ? (
                    <div>
                      <p className="text-blue-700">
                        Payment is required upon collection of the items. Amount Due: {formatCurrency(baseAmount, 'GBP')} payable on {collectionDate || 'the collection date'}.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-blue-700">
                        You selected the standard payment method. For direct debit and bank transfer, please contact Mr. Moyo at +44 7984 099041. 
                        Reference: Your tracking number {shipment?.tracking_number || ''} or surname and initials.
                      </p>
                      <p className="text-blue-700 mt-2">
                        Amount Due: {formatCurrency(baseAmount, 'GBP')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Receiver Information */}
              <div className="mb-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Important Information</h3>
                <p className="text-gray-700">
                  Please ensure that you are available on the collection day. And please let {recipientDetails?.name || 'the recipient'} of {recipientDetails?.address || 'the delivery address'} 
                  with contact number {recipientDetails?.phone || 'the provided contact number'} be aware of the parcel that will arrive 6-8 weeks from collection day.
                </p>
              </div>
              
              {/* Footer Message */}
              <div className="text-center border-t pt-6 mt-6">
                <p className="font-medium text-zim-green">Thank you for choosing Zimbabwe Shipping. Your support is highly appreciated.</p>
              </div>
            </div>
          )}
          
          {/* Booking Actions */}
          {!loading && !error && (
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                onClick={handlePrint}
                className="flex items-center justify-center"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" /> 
                Print Confirmation
              </Button>
              
              <Button 
                onClick={handleDownload}
                className="flex items-center justify-center"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" /> 
                Download PDF
              </Button>
              
              <Button 
                onClick={handleEmail}
                className="flex items-center justify-center"
                variant="outline"
              >
                <Mail className="h-4 w-4 mr-2" /> 
                Email Confirmation
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </>
  );
};

export default ConfirmBooking;
