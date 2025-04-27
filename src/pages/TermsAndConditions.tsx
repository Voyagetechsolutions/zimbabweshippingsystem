
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const TermsAndConditions = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
        
        <div className="prose max-w-none">
          <h2 className="text-xl font-semibold mt-6 mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using Zimbabwe Shipping's services, you accept and agree to be bound by the terms
            and provision of this agreement.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">2. Shipping Services</h2>
          <p className="mb-4">
            We provide shipping services from the UK to Zimbabwe. All shipments are subject to our shipping
            policies and procedures.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">3. Pricing and Payment</h2>
          <p className="mb-4">
            Prices for our services are as displayed on our website. We reserve the right to modify
            prices at any time. Payment terms are as specified during the booking process.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">4. Delivery Times</h2>
          <p className="mb-4">
            While we strive to meet all delivery timeframes, delivery times are estimates and not
            guaranteed. Various factors may affect actual delivery times.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">5. Prohibited Items</h2>
          <p className="mb-4">
            Certain items are prohibited from shipping. Please refer to our prohibited items list
            before shipping.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default TermsAndConditions;
