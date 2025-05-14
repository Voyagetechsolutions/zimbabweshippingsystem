
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const Privacy = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p>This is the privacy policy page content.</p>
      </main>
      <Footer />
    </>
  );
};

export default Privacy;
