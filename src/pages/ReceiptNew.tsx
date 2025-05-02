
import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Receipt from '@/components/Receipt';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ReceiptNew = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { bookingData, paymentData, customQuoteData } = location.state || {};
  
  // Log state data to help debug
  console.log("ReceiptNew page state:", {
    bookingData,
    paymentData,
    customQuoteData,
    location
  });

  // Check if we have receipt data
  const hasReceiptData = bookingData && (paymentData || customQuoteData);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="mb-6">
            <Link to="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
            
            <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-2">Receipt</h1>
            {hasReceiptData ? (
              <p className="text-gray-600">
                Thank you for your shipment. Here's your receipt and shipping details.
              </p>
            ) : (
              <p className="text-gray-600">
                No receipt data available. Please go back and complete your booking.
              </p>
            )}
          </div>
          
          {hasReceiptData ? (
            <Receipt 
              bookingData={bookingData}
              paymentData={paymentData}
              customQuote={customQuoteData}
            />
          ) : (
            <Card className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">No Receipt Data Found</h2>
              <p className="text-gray-500 mb-6">
                We couldn't find any receipt information. This could be because:
              </p>
              <ul className="list-disc text-left max-w-md mx-auto mb-6 text-gray-500">
                <li>Your session may have expired</li>
                <li>You navigated directly to this page without completing a booking</li>
                <li>There was an issue processing your payment</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link to="/book">Book a New Shipment</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReceiptNew;
