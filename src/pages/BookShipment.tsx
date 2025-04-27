
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import BookingFormNew from '@/components/BookingFormNew';
import PaymentProcessor from '@/components/PaymentProcessor';
import CustomQuoteForm from '@/components/CustomQuoteForm';

enum BookingStep {
  FORM,
  PAYMENT,
  CUSTOM_QUOTE
}

const BookShipment = () => {
  const [currentStep, setCurrentStep] = useState<BookingStep>(BookingStep.FORM);
  const [bookingData, setBookingData] = useState<any>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Book a Shipment | UK Shipping Service';
  }, []);

  const handleFormSubmit = async (data: any, shipmentId: string, amount: number) => {
    console.log("Form submitted with data:", { data, shipmentId, amount });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (data.shipmentType === 'other') {
        setBookingData({
          ...data,
          shipment_id: shipmentId,
          user_id: user?.id || null,
          senderDetails: {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            address: `${data.pickupAddress}, ${data.pickupPostcode}`,
          },
          recipientDetails: {
            name: data.recipientName,
            phone: data.recipientPhone,
            address: `${data.deliveryAddress}, ${data.deliveryCity}`,
          },
          shipmentDetails: {
            type: data.shipmentType,
            category: data.itemCategory,
            description: data.itemDescription,
            tracking_number: '',
          }
        });
        setCurrentStep(BookingStep.CUSTOM_QUOTE);
        return;
      }
      
      const metalSealsCount = data.needMetalSeals ? (parseInt(data.drumQuantity) || 1) : 0;
      const metalSealsCost = metalSealsCount * 5;
      const drumCount = parseInt(data.drumQuantity) || 1;
      const doorToDoorCost = data.doorToDoor ? 25 * data.deliveryAddresses.length : 0;
      const finalAmount = amount + metalSealsCost + doorToDoorCost;
      
      setBookingData({
        ...data,
        shipment_id: shipmentId,
        user_id: user?.id || null,
        senderDetails: {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          address: `${data.pickupAddress}, ${data.pickupPostcode || data.pickupCity}`,
        },
        recipientDetails: {
          name: data.recipientName,
          phone: data.recipientPhone,
          additionalPhone: data.additionalPhone,
          address: `${data.deliveryAddress}, ${data.deliveryCity}`,
          deliveryAddresses: data.deliveryAddresses || [],
        },
        shipmentDetails: {
          type: data.shipmentType,
          quantity: data.shipmentType === 'drum' ? drumCount : null,
          weight: data.shipmentType === 'parcel' ? parseFloat(data.weight) : null,
          tracking_number: '',
          services: [
            ...(metalSealsCount > 0 ? [{
              name: `Metal Seal${metalSealsCount > 1 ? 's' : ''} (${metalSealsCount})`, 
              price: metalSealsCost
            }] : []),
            ...(data.doorToDoor ? [{
              name: `Door to Door Delivery (${data.deliveryAddresses.length} address${data.deliveryAddresses.length > 1 ? 'es' : ''})`,
              price: doorToDoorCost
            }] : [])
          ],
          item_category: data.shipmentType === 'other' ? data.itemCategory : null,
          item_description: data.shipmentType === 'other' ? data.itemDescription : null,
        },
        paymentOption: data.paymentOption || 'standard',
        paymentMethod: data.paymentMethod || 'card',
      });
      
      setTotalAmount(finalAmount);
      setCurrentStep(BookingStep.PAYMENT);
      
      try {
        const { data: shipmentData, error: shipmentError } = await supabase
          .from('shipments')
          .select('tracking_number')
          .eq('id', shipmentId)
          .single();
        
        if (shipmentError) {
          console.error('Error fetching tracking number:', shipmentError);
          throw shipmentError;
        }
        
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
    } catch (error: any) {
      console.error('Error processing form submission:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while processing your booking. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBackToForm = () => {
    setCurrentStep(BookingStep.FORM);
  };

  const handleCustomQuoteSubmit = async (customQuoteData: any) => {
    try {
      console.log("Submitting custom quote with data:", {
        ...customQuoteData,
        shipment_id: bookingData.shipment_id,
        user_id: bookingData.user_id,
        category: bookingData.shipmentDetails.category
      });
      
      let shipmentUuid = null;
      if (bookingData.shipment_id) {
        shipmentUuid = bookingData.shipment_id;
        if (typeof shipmentUuid === 'string' && shipmentUuid.startsWith('shp_')) {
          shipmentUuid = shipmentUuid.substring(4);
        }
      
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(shipmentUuid)) {
          console.log('Invalid UUID format for shipment, setting to null');
          shipmentUuid = null;
        }
      }
      
      const { data, error } = await supabase.from('custom_quotes').insert({
        user_id: bookingData.user_id,
        shipment_id: shipmentUuid,
        phone_number: customQuoteData.phoneNumber || bookingData.senderDetails.phone,
        description: customQuoteData.description || bookingData.shipmentDetails.description,
        category: customQuoteData.category || bookingData.shipmentDetails.category,
        image_urls: customQuoteData.imageUrls || [],
        status: 'pending',
        sender_details: bookingData.senderDetails,
        recipient_details: bookingData.recipientDetails
      }).select().single();
      
      if (error) throw error;
      
      toast({
        title: "Custom Quote Submitted",
        description: "We'll contact you shortly with a price for your shipment.",
      });
      
      await supabase.from('notifications').insert({
        user_id: bookingData.user_id || '00000000-0000-0000-0000-000000000000',
        title: 'New Custom Quote Request',
        message: `A new custom quote request has been submitted for: ${customQuoteData.description?.substring(0, 50) || bookingData.shipmentDetails.description?.substring(0, 50) || 'Custom Item'}...`,
        type: 'custom_quote',
        related_id: data.id,
        is_read: false
      });
      
      navigate('/quote-submitted');
    } catch (err: any) {
      console.error('Error submitting custom quote:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit custom quote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6 sm:mb-8">
            <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Link>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-4 mb-2">
              {currentStep === BookingStep.FORM ? 'Book Your Shipment' : 
               currentStep === BookingStep.PAYMENT ? 'Complete Payment' :
               'Request Custom Quote'}
            </h1>
            <p className="text-gray-600 max-w-2xl">
              {currentStep === BookingStep.FORM 
                ? 'Complete the form below to book your shipment from the UK.' 
                : currentStep === BookingStep.PAYMENT
                ? 'Choose your preferred payment method to complete your booking.'
                : 'Tell us about your item so we can provide a custom shipping quote.'}
            </p>
          </div>
          
          {currentStep === BookingStep.FORM ? (
            <BookingFormNew onSubmitComplete={handleFormSubmit} />
          ) : currentStep === BookingStep.PAYMENT ? (
            <PaymentProcessor 
              bookingData={bookingData}
              totalAmount={totalAmount}
              onCancel={handleBackToForm}
              onPaymentComplete={() => {}}
            />
          ) : (
            <CustomQuoteForm 
              initialData={bookingData}
              onSubmit={handleCustomQuoteSubmit}
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
