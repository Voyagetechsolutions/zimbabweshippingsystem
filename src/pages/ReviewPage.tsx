
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';

const ReviewPage = () => {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Reviews</h1>
        <ReviewsSection />
      </main>
      <Footer />
    </>
  );
};

export default ReviewPage;
