
import React from 'react';
import { format, parseISO } from 'date-fns';
import { User, Star, StarHalf, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Review } from '@/types/reviews';

interface ReviewsListProps {
  reviews: Review[];
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  canManageReview?: (reviewUserId: string) => boolean;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ 
  reviews, 
  onEdit, 
  onDelete, 
  canManageReview = () => false 
}) => {
  // Generate star rating display
  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-zim-yellow fill-zim-yellow' : 'text-gray-300 fill-gray-100'}`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating}/5</span>
      </div>
    );
  };

  // Random pastel colors for user icons
  const getBgColor = (userId: string) => {
    const colors = [
      'bg-blue-100', 'bg-green-100', 'bg-yellow-100', 
      'bg-purple-100', 'bg-pink-100', 'bg-indigo-100'
    ];
    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    return colors[hash % colors.length];
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
  };

  const sortedReviews = [...reviews].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Star className="h-16 w-16 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium">No reviews yet</h3>
          <p className="text-gray-500 text-center mt-1 mb-6 max-w-md">
            Be the first to leave a review about your shipping experience!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sortedReviews.map(review => (
        <Card key={review.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-10 h-10 ${getBgColor(review.userId)} rounded-full flex items-center justify-center mr-3 text-gray-700`}>
                  {getInitials(review.userName)}
                </div>
                <div>
                  <CardTitle className="text-base">{review.userName || 'Anonymous User'}</CardTitle>
                  <div className="text-sm text-gray-500">
                    {format(parseISO(review.createdAt), 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>
              {renderStarRating(review.rating)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{review.comment}</p>
          </CardContent>
          {canManageReview(review.userId) && (
            <CardFooter className="pt-0 flex justify-end space-x-2">
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEdit(review)}
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => onDelete(review.id)}
                >
                  Delete
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
};

export default ReviewsList;
