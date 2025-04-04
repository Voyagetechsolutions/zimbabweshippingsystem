
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Review } from '@/types/reviews';
import { useToast } from '@/hooks/use-toast';
import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';
import { tableFrom } from '@/integrations/supabase/db-types';

const ReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from(tableFrom('reviews'))
        .select(`
          id,
          user_id,
          shipment_id,
          rating,
          comment,
          created_at,
          profiles:user_id(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedReviews: Review[] = data.map(item => ({
          id: item.id,
          userId: item.user_id,
          shipmentId: item.shipment_id,
          rating: item.rating,
          comment: item.comment || '',
          createdAt: item.created_at,
          userName: item.profiles?.full_name || 'Anonymous',
          userEmail: item.profiles?.email || '',
        }));
        
        setReviews(formattedReviews);
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to load reviews',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReview = async (rating: number, comment: string, shipmentId?: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to submit a review',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from(tableFrom('reviews'))
        .insert({
          user_id: user.id,
          rating,
          comment,
          shipment_id: shipmentId || null
        });

      if (error) throw error;

      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!',
      });
      
      fetchReviews();
    } catch (error: any) {
      console.error('Error creating review:', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateReview = async (id: string, rating: number, comment: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from(tableFrom('reviews'))
        .update({ rating, comment })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Review Updated',
        description: 'Your review has been updated successfully',
      });
      
      setSelectedReview(null);
      fetchReviews();
    } catch (error: any) {
      console.error('Error updating review:', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from(tableFrom('reviews'))
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Review Deleted',
        description: 'Your review has been deleted successfully',
      });
      
      fetchReviews();
    } catch (error: any) {
      console.error('Error deleting review:', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ReviewsList 
            reviews={reviews} 
            isLoading={isLoading} 
            onEdit={setSelectedReview}
            onDelete={handleDeleteReview}
            currentUserId={user?.id}
          />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">
            {selectedReview ? 'Edit Your Review' : 'Share Your Experience'}
          </h3>
          <ReviewForm 
            initialRating={selectedReview?.rating || 0}
            initialComment={selectedReview?.comment || ''}
            onSubmit={selectedReview 
              ? (rating, comment) => handleUpdateReview(selectedReview.id, rating, comment)
              : handleCreateReview
            }
            onCancel={selectedReview ? () => setSelectedReview(null) : undefined}
            isEdit={!!selectedReview}
          />
        </div>
      </div>
    </div>
  );
};

export default ReviewsSection;
