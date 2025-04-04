
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Star, StarHalf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ReviewFormData } from '@/types/reviews';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().min(5, 'Review comment must be at least 5 characters').max(500, 'Review comment cannot exceed 500 characters'),
  shipmentId: z.string().optional().nullable(),
});

interface ReviewFormProps {
  onSubmit: (data: ReviewFormData) => Promise<void>;
  shipmentId?: string;
  initialData?: ReviewFormData;
  isUpdate?: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ 
  onSubmit, 
  shipmentId,
  initialData,
  isUpdate = false
}) => {
  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: initialData || {
      rating: 0,
      comment: '',
      shipmentId: shipmentId || undefined
    }
  });

  const [hoveredRating, setHoveredRating] = React.useState(0);

  const handleSubmitReview = async (data: ReviewFormData) => {
    try {
      await onSubmit({
        ...data,
        shipmentId: shipmentId || data.shipmentId
      });
      form.reset();
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const renderStar = (index: number) => {
    const isSelected = form.watch('rating') >= index;
    const isHovered = hoveredRating >= index;
    const fillColor = isSelected || isHovered ? "fill-zim-yellow" : "fill-gray-200";
    const textColor = isSelected || isHovered ? "text-zim-yellow" : "text-gray-200";
    
    return (
      <Star 
        className={`h-8 w-8 ${textColor} ${fillColor} cursor-pointer transition-all`}
        key={index}
        onClick={() => form.setValue('rating', index, { shouldValidate: true })}
        onMouseEnter={() => setHoveredRating(index)}
        onMouseLeave={() => setHoveredRating(0)}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitReview)} className="space-y-6">
        <FormField
          control={form.control}
          name="rating"
          render={() => (
            <FormItem>
              <FormLabel className="text-lg">Rating</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-1 mt-1">
                  {[1, 2, 3, 4, 5].map((index) => renderStar(index))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Comment</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Share your experience..." 
                  className="min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="bg-zim-green hover:bg-zim-green/90 w-full"
        >
          {isUpdate ? 'Update Review' : 'Submit Review'}
        </Button>
      </form>
    </Form>
  );
};

export default ReviewForm;
