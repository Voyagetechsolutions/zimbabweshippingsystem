
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | Zimbabwe Shipping';
  }, []);

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        
        <div className="prose max-w-none">
          <p className="mb-4">
            At Zimbabwe Shipping, we respect your privacy and are committed to protecting your personal data.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us when you:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Create an account or update your profile</li>
            <li>Book a shipment or request services</li>
            <li>Contact our customer service</li>
            <li>Participate in surveys or promotions</li>
            <li>Make payments for our services</li>
          </ul>
          <p className="mb-4">
            This information may include your name, email address, phone number, postal addresses,
            payment information, and shipment details.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use your information for various purposes, including:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Processing your shipments</li>
            <li>Managing your account</li>
            <li>Providing customer support</li>
            <li>Improving our services</li>
            <li>Sending important notifications about your shipments</li>
            <li>Communicating about promotions or offers</li>
            <li>Complying with legal obligations</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-4">3. Information Sharing</h2>
          <p className="mb-4">
            We may share your information with:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Service providers who perform services on our behalf</li>
            <li>Shipping partners necessary to fulfill your shipment</li>
            <li>Legal authorities when required by law</li>
            <li>Business partners with your consent</li>
          </ul>
          <p className="mb-4">
            We do not sell your personal information to third parties.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">4. Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information from
            unauthorized access, alteration, disclosure, or destruction. However, no method of
            transmission over the Internet or electronic storage is 100% secure.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">5. Data Retention</h2>
          <p className="mb-4">
            We retain your personal information for as long as necessary to fulfill the purposes outlined
            in this Privacy Policy, unless a longer retention period is required by law.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">6. Your Rights</h2>
          <p className="mb-4">
            Depending on your location, you may have rights regarding your personal information, including:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Accessing your personal information</li>
            <li>Correcting inaccurate information</li>
            <li>Deleting your information</li>
            <li>Restricting or objecting to processing</li>
            <li>Data portability</li>
            <li>Withdrawing consent</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-4">7. Changes to This Policy</h2>
          <p className="mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by
            posting the new Privacy Policy on this page and updating the "Effective Date."
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">8. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us through the
            information provided on our website.
          </p>
          
          <p className="mt-8 text-sm text-gray-600">Effective Date: April 27, 2025</p>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
