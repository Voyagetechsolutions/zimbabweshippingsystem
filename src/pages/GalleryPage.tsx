
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ShippingGallerySlideshow } from '@/components/ShippingGallerySlideshow';

const GalleryPage = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Gallery</h1>
        <ShippingGallerySlideshow />
      </main>
      <Footer />
    </>
  );
};

export default GalleryPage;
