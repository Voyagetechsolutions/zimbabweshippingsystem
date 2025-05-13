
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QuoteSubmitted = () => {
  useEffect(() => {
    document.title = 'Quote Submitted | UK to Zimbabwe Shipping';
  }, []);
  
  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow-md p-6 md:p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-50 border border-green-200 rounded-full p-3">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Quote Request Received!</h1>
            
            <p className="text-gray-600 max-w-2xl mx-auto text-lg mb-8">
              Thank you for submitting your quote request. Our team will review your details and get back to you shortly with a custom price for your shipment.
            </p>
            
            <div className="bg-blue-50 border border-blue-100 rounded-md p-4 md:p-6 mb-8 max-w-lg mx-auto text-left">
              <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
              <ol className="list-decimal ml-5 space-y-2 text-blue-700">
                <li>Our team will review your request within 24 hours.</li>
                <li>You'll receive a price quote via phone or email.</li>
                <li>Once you accept the quote, we'll arrange collection.</li>
                <li>Your shipment will be on its way to Zimbabwe!</li>
              </ol>
            </div>
            
            <Link to="/">
              <Button className="bg-zim-green hover:bg-zim-green/90">
                Return to Home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default QuoteSubmitted;
