
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const QuoteSubmitted = () => {
  useEffect(() => {
    document.title = 'Quote Submitted | UK Shipping Service';
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-16 px-4">
        <div className="container mx-auto max-w-lg text-center">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3 mb-6">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-4">Quote Request Submitted!</h1>
            
            <div className="space-y-4 mb-8">
              <p className="text-gray-600">
                Thank you for submitting your custom quote request. Our team will review your request 
                and provide a personalized quote as soon as possible.
              </p>
              
              <p className="text-gray-600">
                You'll receive a notification when your quote is ready. You can also check the status 
                of your quote in your dashboard under the "Custom Quotes" tab.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button>View in Dashboard</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">Return to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default QuoteSubmitted;
