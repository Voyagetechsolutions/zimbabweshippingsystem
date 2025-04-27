
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        
        <div className="prose max-w-none">
          <h2 className="text-xl font-semibold mt-6 mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information that you provide directly to us, including personal details,
            shipping information, and payment details.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to provide our shipping services, process payments,
            and communicate with you about your shipments.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">3. Information Sharing</h2>
          <p className="mb-4">
            We do not sell your personal information. We share information only as necessary with
            our shipping partners to complete your deliveries.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">4. Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information from
            unauthorized access or disclosure.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">5. Your Rights</h2>
          <p className="mb-4">
            You have the right to access, correct, or delete your personal information. Contact us
            to exercise these rights.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
