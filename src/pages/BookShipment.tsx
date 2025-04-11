
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import PaymentProcessor from '@/components/PaymentProcessor';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';

// Define booking steps
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
    // Update the document title when the component mounts
    document.title = 'Book a Shipment | UK to Zimbabwe Shipping';
  }, []);

  // Handle form submission to move to payment step
  const handleFormSubmit = async (data: any, shipmentId: string, amount: number) => {
    console.log("Form submitted with data:", { data, shipmentId, amount });
    
    // Get user ID if logged in
    const { data: { user } } = await supabase.auth.getUser();
    
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
        address: `${data.deliveryAddress}, ${data.deliveryCity}, Zimbabwe`,
      },
      shipmentDetails: {
        type: data.shipmentType,
        quantity: data.shipmentType === 'drum' ? parseInt(data.drumQuantity) : null,
        items: data.shipmentType === 'other' ? data.selectedItems : null,
        metal_seal: data.metalSeal || false,
        door_to_door: data.doorToDoor || false,
        payment_option: data.paymentOption,
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
      
      if (shipmentError) {
        console.error('Error fetching tracking number:', shipmentError);
        throw shipmentError;
      }
      
      // Update the booking data with the tracking number
      setBookingData(prev => ({
        ...prev,
        shipmentDetails: {
          ...prev.shipmentDetails,
          tracking_number: shipmentData.tracking_number
        }
      }));
      
      console.log("Retrieved tracking number:", shipmentData.tracking_number);
    } catch (err) {
      console.error('Error fetching tracking number:', err);
    }
  };

  // Handle custom quote submission
  const handleCustomQuoteSubmit = async (data: any) => {
    console.log("Custom quote submitted with data:", data);
    try {
      // Get user ID if logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upload images to Supabase Storage
      const imageUrls: string[] = [];
      
      for (const image of data.images) {
        const fileName = `${Date.now()}-${image.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-quotes')
          .upload(`quotes/${fileName}`, image);
        
        if (uploadError) {
          throw uploadError;
        }
        
        imageUrls.push(uploadData.path);
      }
      
      // Create the custom quote record
      const { data: quoteData, error } = await supabase
        .from(tableFrom('custom_quotes'))
        .insert({
          user_id: user?.id || null,
          phone_number: data.phone,
          description: data.description,
          image_urls: imageUrls,
          status: 'pending'
        })
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      // Create notification for admins
      await supabase.from('notifications')
        .insert({
          title: 'New Custom Quote Request',
          message: `A new custom quote request has been submitted. Phone: ${data.phone}`,
          type: 'custom_quote',
          related_id: quoteData.id,
          user_id: null, // This will be updated to admin IDs through a trigger or function
        });
      
      // Notify the user that their custom quote request has been submitted
      toast({
        title: "Custom Quote Submitted",
        description: "We'll review your request and get back to you as soon as possible.",
      });
      
      // Navigate back to home
      navigate('/');
    } catch (error: any) {
      console.error('Error submitting custom quote:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit custom quote request",
        variant: "destructive",
      });
    }
  };

  // Handle payment completion
  const handlePaymentComplete = (paymentId: string, receiptId: string) => {
    console.log("Payment complete with:", { paymentId, receiptId });
    // Navigate to the success page with the receipt ID
    navigate(`/payment-success?receipt_id=${receiptId}`);
  };

  // Handle going back to the form step
  const handleBackToForm = () => {
    setCurrentStep(BookingStep.FORM);
  };

  // Handle switch to custom quote
  const handleSwitchToCustomQuote = () => {
    setCurrentStep(BookingStep.CUSTOM_QUOTE);
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
              {currentStep === BookingStep.FORM 
                ? 'Book Your Shipment' 
                : currentStep === BookingStep.PAYMENT 
                  ? 'Complete Payment' 
                  : 'Request Custom Quote'}
            </h1>
            <p className="text-gray-600 max-w-2xl">
              {currentStep === BookingStep.FORM 
                ? 'Complete the form below to book your shipment from the UK to Zimbabwe.' 
                : currentStep === BookingStep.PAYMENT
                  ? 'Choose your preferred payment method to complete your booking.'
                  : 'Fill in the details and upload images of your item to get a custom quote.'}
            </p>
          </div>
          
          {currentStep === BookingStep.FORM ? (
            <BookingForm 
              onSubmitComplete={handleFormSubmit} 
              onRequestCustomQuote={handleSwitchToCustomQuote}
            />
          ) : currentStep === BookingStep.PAYMENT ? (
            <PaymentProcessor 
              bookingData={bookingData}
              totalAmount={totalAmount}
              onPaymentComplete={handlePaymentComplete}
              onCancel={handleBackToForm}
            />
          ) : (
            <CustomQuoteForm onSubmit={handleCustomQuoteSubmit} onCancel={handleBackToForm} />
          )}
        </div>
      </main>
      
      <Footer />
    </>
  );
};

// Custom Quote Form Component
const CustomQuoteForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      if (fileArray.length > 4) {
        toast({
          title: "Too many files",
          description: "You can upload a maximum of 4 images",
          variant: "destructive",
        });
        return;
      }
      setImages(fileArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Submit the form data
      await onSubmit({
        phone,
        description,
        images
      });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit custom quote request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-md rounded-lg p-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Custom Quote Request</h2>
        <p className="text-gray-600">
          Please provide the following details for your custom shipping quote:
        </p>
        
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="+44 7123 456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="images" className="block text-sm font-medium text-gray-700">
            Upload Images (Max 4)
          </label>
          <input
            type="file"
            id="images"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            required
          />
          <p className="text-xs text-gray-500">Please upload up to 4 clear images of the item from different angles</p>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Item Description
          </label>
          <textarea
            id="description"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Please describe the item including dimensions, weight, condition, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-zim-green text-white rounded-md hover:bg-zim-green/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Custom Quote Request'}
        </button>
      </div>
    </form>
  );
};

export default BookShipment;
