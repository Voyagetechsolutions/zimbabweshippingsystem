import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SimplifiedBookingForm } from '@/components/SimplifiedBookingForm';

const SimpleBooking: React.FC = () => {
  useEffect(() => {
    document.title = 'Book a Shipment | Zimbabwe Shipping';
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Ship to Zimbabwe
          </h1>
          <p className="text-lg text-gray-600">
            Quick & easy booking in 4 simple steps. No account needed.
          </p>
        </div>
        <SimplifiedBookingForm />
      </main>
      <Footer />
    </div>
  );
};

export default SimpleBooking;
