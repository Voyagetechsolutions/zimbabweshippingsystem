import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SimplifiedBookingForm } from '@/components/SimplifiedBookingForm';
import { ArrowLeft } from 'lucide-react';

const BookShipment = () => {
  useEffect(() => {
    document.title = 'Book a Shipment | Zimbabwe Shipping';
  }, []);

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Link>
            
            <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">
              Ship to Zimbabwe
            </h1>
            <p className="text-gray-600 max-w-2xl">
              Complete your booking in 5 simple steps. No account needed.
            </p>
          </div>
          
          <SimplifiedBookingForm />
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default BookShipment;
