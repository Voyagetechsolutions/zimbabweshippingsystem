
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookingFormNew from '@/components/BookingFormNew';
import CustomQuoteForm from '@/components/CustomQuoteForm';
import PaymentProcessor from '@/components/PaymentProcessor';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const location = useLocation();
  const { toast } = useToast();

  // Check if we're coming from a custom quote
  useEffect(() => {
    if (location.state?.quoteData) {
      const { quoteData } = location.state;
      
      // Pre-populate booking data with quote information
      setBookingData({
        customQuote: quoteData,
        firstName: quoteData.name?.split(' ')[0] || '',
        lastName: quoteData.name?.split(' ').slice(1).join(' ') || '',
        email: quoteData.email || '',
        phone: quoteData.phone_number || '',
        specificItem: quoteData.specific_item || '',
        otherItemDescription: quoteData.description || '',
        itemCategory: quoteData.category || '',
        includeOtherItems: true,
        shipmentType: 'other',
        paymentMethod: 'card',
        senderDetails: quoteData.sender_details || {
          name: quoteData.name,
          email: quoteData.email,
          phone: quoteData.phone_number
        }
      });
      
      // If it has a quoted amount, set the payment step
      if (quoteData.quoted_amount) {
        setTotalAmount(quoteData.quoted_amount);
        setCurrentStep(BookingStep.PAYMENT);
      }
    }
  }, [location.state]);

  useEffect(() => {
    document.title = 'Book a Shipment | UK Shipping Service';
  }, []);

  const handleFormSubmit = async (data: any, shipmentId: string, amount: number) => {
    console.log("Form submitted with data:", { data, shipmentId, amount });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (data.shipmentType === 'other' && !data.includeDrums) {
        setBookingData({
          ...data,
          shipment_id: shipmentId,
          user_id: user?.id || null,
          senderDetails: {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            address: `${data.pickupAddress}, ${data.pickupCountry === 'England' ? data.pickupPostcode : data.pickupCity}`,
          },
          recipientDetails: {
            name: data.recipientName,
            phone: data.recipientPhone,
            additionalPhone: data.additionalRecipientPhone,
            address: `${data.deliveryAddress}, ${data.deliveryCity}`,
          },
          shipmentDetails: {
            type: 'other',
            category: data.itemCategory,
            specificItem: data.specificItem,
            description: data.otherItemDescription,
            tracking_number: '',
          }
        });
        setCurrentStep(BookingStep.CUSTOM_QUOTE);
        return;
      }
      
      const metalSealCost = data.wantMetalSeal ? (5 * parseInt(data.drumQuantity || '0')) : 0;
      const doorToDoorAddresses = data.doorToDoor ? (1 + (data.additionalDeliveryAddresses?.length || 0)) : 0;
      const doorToDoorCost = doorToDoorAddresses * 25;
      const finalAmount = amount + metalSealCost + doorToDoorCost;
      
      setBookingData({
        ...data,
        shipment_id: shipmentId,
        user_id: user?.id || null,
        senderDetails: {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          address: `${data.pickupAddress}, ${data.pickupCountry === 'England' ? data.pickupPostcode : data.pickupCity}`,
        },
        recipientDetails: {
          name: data.recipientName,
          phone: data.recipientPhone,
          additionalPhone: data.additionalRecipientPhone,
          address: `${data.deliveryAddress}, ${data.deliveryCity}`,
        },
        shipmentDetails: {
          includeDrums: data.includeDrums,
          includeOtherItems: data.includeOtherItems,
          type: data.includeDrums ? 'drum' : 'other',
          quantity: data.includeDrums ? parseInt(data.drumQuantity) : null,
          weight: data.shipmentType === 'parcel' ? parseFloat(data.weight) : null,
          tracking_number: '',
          category: data.includeOtherItems ? data.itemCategory : null,
          specificItem: data.includeOtherItems ? data.specificItem : null,
          description: data.includeOtherItems ? data.otherItemDescription : null,
          services: [
            ...(data.wantMetalSeal && data.includeDrums ? [{
              name: `Metal Seal${parseInt(data.drumQuantity) > 1 ? 's' : ''} (${parseInt(data.drumQuantity)} x £5)`,
              price: metalSealCost
            }] : []),
            ...(data.doorToDoor ? [{
              name: `Door to Door Delivery (${doorToDoorAddresses} address${doorToDoorAddresses > 1 ? 'es' : ''})`,
              price: doorToDoorCost
            }] : [])
          ],
          additionalAddresses: data.additionalDeliveryAddresses || [],
        },
        paymentOption: data.paymentOption || 'standard',
        paymentMethod: data.paymentMethod || 'card',
      });
      
      setTotalAmount(finalAmount);
      
      if (data.includeOtherItems && data.includeDrums) {
        setCurrentStep(BookingStep.PAYMENT);
      } else if (data.includeDrums) {
        setCurrentStep(BookingStep.PAYMENT);
      } else {
        setCurrentStep(BookingStep.CUSTOM_QUOTE);
      }
      
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

  const handleRequestCustomQuote = () => {
    setCurrentStep(BookingStep.CUSTOM_QUOTE);
    
    // If we have form data from the main form, use it to pre-populate the custom quote form
    const formData = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      // Add any other fields you want to pre-populate
    };
    
    setBookingData(formData);
    
    toast({
      title: "Custom Quote Request",
      description: "Please provide details about your item for a custom shipping quote."
    });
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
        category: customQuoteData.category
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
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.from('custom_quotes').insert({
        user_id: user?.id || bookingData.user_id,
        shipment_id: shipmentUuid,
        name: customQuoteData.name,
        email: customQuoteData.email,
        phone_number: customQuoteData.phoneNumber || bookingData.senderDetails?.phone,
        description: customQuoteData.description || bookingData.shipmentDetails?.description,
        category: customQuoteData.category || bookingData.shipmentDetails?.category,
        specific_item: customQuoteData.specificItem || bookingData.shipmentDetails?.specificItem,
        image_urls: customQuoteData.imageUrls || [],
        status: 'pending',
        sender_details: bookingData.senderDetails,
        recipient_details: bookingData.recipientDetails
      }).select().single();
      
      if (error) {
        console.error('Error submitting custom quote:', error);
        throw error;
      }
      
      toast({
        title: "Custom Quote Requested",
        description: "We'll contact you shortly with a price for your shipment.",
      });
      
      // Fix the Promise chain issue
      try {
        await supabase.from('notifications').insert({
          user_id: user?.id || bookingData.user_id || '00000000-0000-0000-0000-000000000000',
          title: 'New Custom Quote Request',
          message: `A new custom quote request has been submitted for: ${customQuoteData.specificItem || customQuoteData.description}`,
          type: 'custom_quote',
          related_id: data.id,
          is_read: false
        });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }
      
      if (bookingData.paymentCompleted) {
        navigate('/receipt', { 
          state: { 
            bookingData,
            paymentData: bookingData.paymentData,
            customQuoteData: data
          }
        });
      } else {
        navigate('/quote-submitted');
      }
    } catch (err: any) {
      console.error('Error submitting custom quote:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit custom quote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentComplete = (paymentData: any) => {
    const updatedBookingData = {
      ...bookingData,
      paymentCompleted: true,
      paymentData
    };
    setBookingData(updatedBookingData);
    
    // If this came from a custom quote that was already quoted, update its status
    if (bookingData.customQuote?.id) {
      supabase.from('custom_quotes')
        .update({ 
          status: 'paid',
          payment_status: 'paid'
        })
        .eq('id', bookingData.customQuote.id)
        .then(() => {
          console.log('Updated custom quote status to paid');
        })
        .catch(err => {
          console.error('Error updating custom quote status:', err);
        });
    }
    
    if (bookingData.shipmentDetails?.includeOtherItems) {
      setCurrentStep(BookingStep.CUSTOM_QUOTE);
    } else {
      navigate('/receipt', { 
        state: { 
          bookingData: updatedBookingData,
          paymentData
        }
      });
    }
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
            <BookingFormNew 
              onSubmitComplete={handleFormSubmit} 
              onRequestCustomQuote={handleRequestCustomQuote}
            />
          ) : currentStep === BookingStep.PAYMENT ? (
            <PaymentProcessor 
              bookingData={bookingData}
              totalAmount={totalAmount}
              onCancel={handleBackToForm}
              onPaymentComplete={handlePaymentComplete}
            />
          ) : (
            <CustomQuoteForm 
              bookingData={bookingData}
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
