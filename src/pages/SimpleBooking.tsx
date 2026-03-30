import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SimplifiedBookingForm } from '@/components/SimplifiedBookingForm';

const SimpleBooking: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Book a Shipment | Zimbabwe Shipping - Ship from UK & Ireland</title>
        <meta
          name="description"
          content="Book your shipment to Zimbabwe from UK or Ireland. Drums and trunks available. Free collection, door-to-door delivery, fully tracked. Quick 5-step booking."
        />
        <meta name="keywords" content="book Zimbabwe shipment, ship to Zimbabwe, UK to Zimbabwe, Ireland to Zimbabwe, drum shipping booking, trunk shipping" />

        {/* Open Graph */}
        <meta property="og:title" content="Book a Shipment | Zimbabwe Shipping" />
        <meta property="og:description" content="Book your shipment to Zimbabwe from UK or Ireland. Free collection, door-to-door delivery." />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Book a Shipment | Zimbabwe Shipping" />
        <meta name="twitter:description" content="Book your shipment to Zimbabwe from UK or Ireland. Free collection, door-to-door delivery." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-grow px-4 py-8 sm:py-12">
          <div className="max-w-2xl mx-auto mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Ship to Zimbabwe
            </h1>
            <p className="text-lg text-gray-600">
              Quick & easy booking in 5 simple steps. No account needed.
            </p>
          </div>
          <SimplifiedBookingForm />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SimpleBooking;
