
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Review, ReviewFormData } from '@/types/reviews';

interface ReviewsSectionProps {
  shipmentId?: string;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ shipmentId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (shipmentId || user) {
      fetchReviews();
    }
  }, [shipmentId, user]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reviews')
        .select('*, profiles:user_id(full_name, email)')
      
      // If shipmentId is provided, only get reviews for that shipment
      if (shipmentId) {
        query = query.eq('shipment_id', shipmentId);
      } else if (user) {
        // Otherwise, get recent reviews (limit to 50 for performance)
        query = query.limit(50);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedReviews: Review[] = data.map(item => ({
          id: item.id,
          user_id: item.user_id,
          shipment_id: item.shipment_id,
          rating: item.rating,
          comment: item.comment,
          created_at: item.created_at,
          user_name: item.profiles?.full_name,
          user_email: item.profiles?.email
        }));

        setReviews(mappedReviews);
        
        // Check if current user has a review
        if (user) {
          const currentUserReview = mappedReviews.find(review => review.user_id === user.id);
          if (currentUserReview) {
            setUserReview(currentUserReview);
          } else {
            setUserReview(null);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error.message);
      toast({
        title: 'Error fetching reviews',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (data: ReviewFormData) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to submit a review',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditMode && userReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: data.rating,
            comment: data.comment
          })
          .eq('id', userReview.id);

        if (error) throw error;

        toast({
          title: 'Review updated',
          description: 'Your review has been updated successfully',
        });
      } else {
        // Create new review
        const { error } = await supabase
          .from('reviews')
          .insert([{
            user_id: user.id,
            rating: data.rating,
            comment: data.comment,
            shipment_id: shipmentId || null
          }]);

        if (error) throw error;

        toast({
          title: 'Review submitted',
          description: 'Thank you for your feedback!',
        });
      }

      setIsDialogOpen(false);
      fetchReviews();
    } catch (error: any) {
      console.error('Error submitting review:', error.message);
      toast({
        title: 'Error submitting review',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditReview = (review: Review) => {
    setIsEditMode(true);
    setUserReview(review);
    setIsDialogOpen(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: 'Review deleted',
        description: 'Your review has been deleted successfully',
      });

      fetchReviews();
    } catch (error: any) {
      console.error('Error deleting review:', error.message);
      toast({
        title: 'Error deleting review',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Check if current user can manage a review
  const canManageReview = (reviewUserId: string) => {
    return user && (reviewUserId === user.id);
  };

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Customer Reviews</CardTitle>
              <CardDescription>
                {shipmentId 
                  ? 'Reviews for this shipment'
                  : 'What our customers are saying about our services'}
              </CardDescription>
            </div>
            {user && (
              <Button 
                onClick={() => {
                  setIsEditMode(!!userReview);
                  setIsDialogOpen(true);
                }} 
                className="bg-zim-green hover:bg-zim-green/90"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {userReview ? 'Edit Your Review' : 'Write a Review'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : (
            <ReviewsList 
              reviews={reviews} 
              onEdit={handleEditReview} 
              onDelete={handleDeleteReview}
              canManageReview={canManageReview}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Update Your Review' : 'Write a Review'}
            </DialogTitle>
            <DialogDescription>
              {shipmentId 
                ? 'Share your experience with this shipment' 
                : 'Share your experience with our services'}
            </DialogDescription>
          </DialogHeader>
          <ReviewForm 
            onSubmit={handleSubmitReview}
            shipment_id={shipmentId}
            initialData={userReview ? {
              rating: userReview.rating,
              comment: userReview.comment || '',
              shipment_id: userReview.shipment_id || undefined
            } : undefined}
            isUpdate={isEditMode}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsSection;
