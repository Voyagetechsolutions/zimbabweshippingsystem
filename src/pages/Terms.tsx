
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const Terms = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
        <div className="prose max-w-none">
          <p>This is the terms and conditions page. Content will be added here.</p>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Terms;
