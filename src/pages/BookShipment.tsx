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
    document.title = 'Book a Shipment | UK Shipping Service';
  }, []);

  // Handle form submission to move to payment step
  const handleFormSubmit = async (data: any, shipmentId: string, amount: number) => {
    console.log("Form submitted with data:", { data, shipmentId, amount });
    
    // Get user ID if logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    // Add the mandatory metal seal cost (£5) to the total amount
    const totalWithSeal = amount + 5;
    
    // Add door-to-door delivery cost if selected
    const doorToDoorCost = data.doorToDoor ? 25 : 0;
    const finalAmount = totalWithSeal + doorToDoorCost;
    
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
        quantity: data.shipmentType === 'drum' ? parseInt(data.drumQuantity) : null,
        weight: data.shipmentType === 'parcel' ? parseFloat(data.weight) : null,
        tracking_number: '', // Will be filled from the database
        services: [
          { name: 'Mandatory Metal Seal', price: 5 },
          ...(data.doorToDoor ? [{ name: 'Door to Door Delivery', price: 25 }] : [])
        ],
        item_category: data.shipmentType === 'other' ? data.itemCategory : null,
        item_description: data.shipmentType === 'other' ? data.itemDescription : null,
      },
      paymentOption: data.paymentOption || 'standard',
      paymentMethod: data.paymentMethod || 'card',
    });
    
    setTotalAmount(finalAmount);
    
    if (data.shipmentType === 'custom') {
      setCurrentStep(BookingStep.CUSTOM_QUOTE);
    } else if (data.paymentOption === 'standard') {
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
    } else {
      // For non-standard payment options (pay later, cash on collection, pay on arrival)
      // Create a receipt with appropriate status
      const receiptNumber = `R${Date.now().toString().substring(6)}`;
      
      try {
        const { data: receiptData, error: receiptError } = await supabase
          .from('receipts')
          .insert({
            receipt_number: receiptNumber,
            amount: finalAmount,
            payment_method: data.paymentOption,
            sender_details: {
              name: `${data.firstName} ${data.lastName}`,
              email: data.email,
              phone: data.phone,
              address: `${data.pickupAddress}, ${data.pickupPostcode}`,
            },
            recipient_details: {
              name: data.recipientName,
              phone: data.recipientPhone,
              address: `${data.deliveryAddress}, ${data.deliveryCity}`,
            },
            shipment_details: {
              type: data.shipmentType,
              quantity: data.shipmentType === 'drum' ? parseInt(data.drumQuantity) : null,
              tracking_number: '',
              services: [
                { name: 'Mandatory Metal Seal', price: 5 },
                ...(data.doorToDoor ? [{ name: 'Door to Door Delivery', price: 25 }] : [])
              ],
              item_category: data.shipmentType === 'other' ? data.itemCategory : null,
              item_description: data.shipmentType === 'other' ? data.itemDescription : null,
            },
            status: 'pending',
            payment_id: null,
            shipment_id: shipmentId
          })
          .select('id')
          .single();
          
        if (receiptError) throw receiptError;
        
        // Update the shipment with the receipt info
        await supabase
          .from('shipments')
          .update({ 
            receipt_id: receiptData.id,
            status: data.paymentOption === 'payLater' ? 'pending_payment' : 
                   data.paymentOption === 'cashOnCollection' ? 'awaiting_collection' : 
                   'awaiting_arrival'
          })
          .eq('id', shipmentId);
        
        // Navigate to the success page with the receipt ID
        navigate(`/payment-success?receipt_id=${receiptData.id}`);
      } catch (err: any) {
        console.error('Error creating receipt:', err);
        toast({
          title: 'Error',
          description: err.message || 'Failed to process your booking. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  // Handle going back to the form step
  const handleBackToForm = () => {
    setCurrentStep(BookingStep.FORM);
  };

  // Handle custom quote submission
  const handleCustomQuoteSubmit = async (customQuoteData: any) => {
    try {
      // Save custom quote to database
      const { data, error } = await supabase.from('custom_quotes').insert({
        user_id: bookingData.user_id,
        phone_number: customQuoteData.phoneNumber,
        description: customQuoteData.description,
        image_urls: customQuoteData.imageUrls || [],
        status: 'pending'
      }).select().single();
      
      if (error) throw error;
      
      // Show success message
      toast({
        title: "Custom Quote Submitted",
        description: "We'll contact you shortly with a price for your shipment.",
      });
      
      // Create notification for admin
      await supabase.from('notifications').insert({
        user_id: bookingData.user_id || '00000000-0000-0000-0000-000000000000', // Use placeholder ID if not logged in
        title: 'New Custom Quote Request',
        message: `A new custom quote request has been submitted for: ${customQuoteData.description.substring(0, 50)}...`,
        type: 'custom_quote',
        related_id: data.id,
        is_read: false
      });
      
      // Navigate to home page
      navigate('/');
      
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
            <BookingForm onSubmitComplete={handleFormSubmit} />
          ) : currentStep === BookingStep.PAYMENT ? (
            <PaymentProcessor 
              bookingData={bookingData}
              totalAmount={totalAmount}
              onPaymentComplete={handlePaymentComplete}
              onCancel={handleBackToForm}
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

// Custom Quote Form Component
interface CustomQuoteFormProps {
  initialData: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [phoneNumber, setPhoneNumber] = useState(initialData?.senderDetails?.phone || '');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !description) {
      toast({
        title: "Missing information",
        description: "Please provide your phone number and item description.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    try {
      const urls: string[] = [];
      
      // Upload images if any
      if (images.length > 0) {
        for (const file of images) {
          const fileName = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('custom-quotes')
            .upload(fileName, file);
          
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('custom-quotes')
            .getPublicUrl(fileName);
          
          urls.push(publicUrlData.publicUrl);
        }
      }
      
      // Submit form with image URLs
      onSubmit({
        phoneNumber,
        description,
        imageUrls: urls
      });
      
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload images. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6 p-4 border-l-4 border-blue-500 bg-blue-50">
        <h3 className="font-semibold text-blue-800 mb-2">How Custom Quotes Work</h3>
        <ol className="list-decimal ml-5 space-y-2">
          <li>Enter your phone number so we can contact you with the quote</li>
          <li>Add a detailed description of the item(s) you want to ship</li>
          <li>Upload photos of your item(s) to help us provide an accurate quote</li>
          <li>Submit your request and our team will contact you within 24 hours</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zim-green"
            placeholder="+44 7123 456789"
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Item Description *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zim-green"
            rows={4}
            placeholder="Please provide details about the item(s) including size, weight, condition, etc."
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Images
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-zim-green hover:text-zim-green/80 focus-within:outline-none"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleImageChange}
                    accept="image/*"
                    multiple
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
          
          {images.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700">Selected files:</p>
              <ul className="mt-1 text-sm text-gray-500 list-disc ml-5">
                {images.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zim-green"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-zim-green hover:bg-zim-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zim-green disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Submit Quote Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookShipment;
