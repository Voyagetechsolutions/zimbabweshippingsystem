
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CollectionSchedule from './CollectionSchedule';

const CollectionSchedulePage = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Collection Schedule</h1>
        <CollectionSchedule />
      </main>
      <Footer />
    </>
  );
};

export default CollectionSchedulePage;
