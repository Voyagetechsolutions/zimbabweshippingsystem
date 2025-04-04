
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ReviewsSection from '@/components/reviews/ReviewsSection';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useAuth } from '@/contexts/AuthContext';

const ReviewsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Customer Reviews</h1>
        <p className="text-gray-600 mb-8">
          See what our customers are saying about our services or leave your own review.
        </p>
        <ReviewsSection />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ReviewsPage;
