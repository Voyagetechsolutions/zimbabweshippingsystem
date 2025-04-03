
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import PaymentProcessor from '@/components/PaymentProcessor';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Define booking steps
enum BookingStep {
  FORM,
  PAYMENT
}

const BookShipment = () => {
  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.FORM);
  const [bookingData, setBookingData] = useState<any>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Update the document title when the component mounts
    document.title = 'Book a Shipment | UK to Zimbabwe Shipping';
  }, []);

  // Handle form submission to move to payment step
  const handleFormSubmit = async (data: any, shipmentId: string, amount: number) => {
    setBookingData({
      ...data,
      shipment_id: shipmentId,
      senderDetails: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        address: `${data.pickupAddress}, ${data.pickupPostcode}`,
      },
      recipientDetails: {
        name: data.recipientName,
        phone: data.recipientPhone,
        address: `${data.deliveryAddress}, ${data.deliveryCity}, Zimbabwe`,
      },
      shipmentDetails: {
        type: data.shipmentType,
        quantity: data.shipmentType === 'drum' ? parseInt(data.drumQuantity) : null,
        weight: data.shipmentType === 'parcel' ? parseFloat(data.weight) : null,
        tracking_number: '', // Will be filled from the database
        services: [], // Add any additional services here
      },
    });
    setTotalAmount(amount);
    setCurrentStep(BookingStep.PAYMENT);
    
    // After setting the booking data, fetch the tracking number from the database
    try {
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('tracking_number')
        .eq('id', shipmentId)
        .single();
      
      if (shipmentError) throw shipmentError;
      
      // Update the booking data with the tracking number
      setBookingData(prev => ({
        ...prev,
        shipmentDetails: {
          ...prev.shipmentDetails,
          tracking_number: shipmentData.tracking_number
        }
      }));
    } catch (err) {
      console.error('Error fetching tracking number:', err);
    }
  };

  // Handle payment completion
  const handlePaymentComplete = (paymentId: string, receiptId: string) => {
    // Navigate to the success page with the receipt ID
    navigate(`/payment-success?receipt_id=${receiptId}`);
  };

  // Handle going back to the form step
  const handleBackToForm = () => {
    setCurrentStep(BookingStep.FORM);
  };

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Link>
            
            <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">
              {currentStep === BookingStep.FORM ? 'Book Your Shipment' : 'Complete Payment'}
            </h1>
            <p className="text-gray-600 max-w-2xl">
              {currentStep === BookingStep.FORM 
                ? 'Complete the form below to book your shipment from the UK to Zimbabwe.' 
                : 'Choose your preferred payment method to complete your booking.'}
            </p>
          </div>
          
          {currentStep === BookingStep.FORM ? (
            <BookingForm onSubmitComplete={handleFormSubmit} />
          ) : (
            <PaymentProcessor 
              bookingData={bookingData}
              totalAmount={totalAmount}
              onPaymentComplete={handlePaymentComplete}
              onCancel={handleBackToForm}
            />
          )}
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default BookShipment;
