
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import BookingFormNew from '@/components/BookingFormNew';
import PaymentProcessor from '@/components/PaymentProcessor';

const BookShipment = () => {
  const [step, setStep] = useState(1);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  
  const location = useLocation();
  const customQuoteData = location.state?.customQuote;
  
  // Handle booking form completion
  const handleBookingComplete = (data: any, id: string, calculatedAmount: number) => {
    setShipmentData(data);
    setShipmentId(id);
    
    // If there's a custom quote, use its amount instead of the calculated one
    if (customQuoteData?.amount) {
      setAmount(customQuoteData.amount);
    } else {
      setAmount(calculatedAmount);
    }
    
    setStep(2);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Book Your Shipment</h1>
        <p className="text-gray-600 mt-2">
          {step === 1 
            ? "Fill out the details below to book your shipment"
            : "Review and complete your payment"
          }
        </p>
      </div>
      
      {step === 1 && (
        <BookingFormNew 
          onSubmitComplete={handleBookingComplete} 
          customQuoteData={customQuoteData}
        />
      )}
      
      {step === 2 && shipmentId && (
        <PaymentProcessor 
          shipmentId={shipmentId} 
          amount={amount} 
          shipmentData={shipmentData}
        />
      )}
    </div>
  );
};

export default BookShipment;
