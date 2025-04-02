
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const BookShipment = () => {
  useEffect(() => {
    // Update the document title when the component mounts
    document.title = 'Book a Shipment | UK to Zimbabwe Shipping';
  }, []);

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
            
            <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Book Your Shipment</h1>
            <p className="text-gray-600 max-w-2xl">
              Complete the form below to book your shipment from the UK to Zimbabwe. 
              We'll collect your items based on our monthly collection schedule.
            </p>
          </div>
          
          <BookingForm />
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default BookShipment;
