import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ReviewType, Ratings } from '@/types';

interface ReviewFormProps {
  bookingId: string;
  apartmentId: string;
  revieweeId: string;
  reviewType: ReviewType;
  apartmentName?: string;
  userName?: string;
  onSuccess: () => void;
}

export const ReviewForm = ({
  bookingId,
  apartmentId,
  revieweeId,
  reviewType,
  apartmentName,
  userName,
  onSuccess,
}: ReviewFormProps) => {
  const isUserReview = reviewType === 'user_reviews_lister';
  
  const [ratings, setRatings] = useState<Ratings>({
    cleanliness: 0,
    accuracy: 0,
    communication: 0,
    location: 0,
    value: 0,
  });
  
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratingCategories = isUserReview
    ? [
        { key: 'cleanliness' as keyof Ratings, label: 'Cleanliness' },
        { key: 'accuracy' as keyof Ratings, label: 'Accuracy' },
        { key: 'communication' as keyof Ratings, label: 'Communication' },
        { key: 'location' as keyof Ratings, label: 'Location' },
        { key: 'value' as keyof Ratings, label: 'Value for money' },
      ]
    : [
        { key: 'communication' as keyof Ratings, label: 'Communication' },
        { key: 'cleanliness' as keyof Ratings, label: 'Cleanliness' },
        { key: 'accuracy' as keyof Ratings, label: 'Respect for rules' },
      ];

  const handleRating = (category: keyof Ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
  };

  const calculateOverallRating = () => {
    const relevantRatings = ratingCategories.map((cat) => ratings[cat.key]).filter((r) => r > 0);
    if (relevantRatings.length === 0) return 0;
    return relevantRatings.reduce((sum, r) => sum + r, 0) / relevantRatings.length;
  };

  const handleSubmit = async () => {
    const overallRating = calculateOverallRating();
    
    if (overallRating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please provide at least one rating',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create review
      const { error: reviewError } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        apartment_id: apartmentId,
        review_type: reviewType,
        cleanliness_rating: ratings.cleanliness || null,
        accuracy_rating: ratings.accuracy || null,
        communication_rating: ratings.communication || null,
        location_rating: ratings.location || null,
        value_rating: ratings.value || null,
        overall_rating: overallRating,
        comment: comment || null,
      });

      if (reviewError) throw reviewError;

      // Update apartment average rating
      const { data: apartmentReviews } = await supabase
        .from('reviews')
        .select('overall_rating')
        .eq('apartment_id', apartmentId);

      if (apartmentReviews) {
        const avgRating =
          apartmentReviews.reduce((sum, r) => sum + Number(r.overall_rating), 0) /
          apartmentReviews.length;

        await supabase
          .from('apartments')
          .update({
            average_rating: avgRating,
            total_reviews: apartmentReviews.length,
          })
          .eq('id', apartmentId);
      }

      // Update user rating if this is a guest review
      if (!isUserReview) {
        const { data: userReviews } = await supabase
          .from('reviews')
          .select('overall_rating')
          .eq('reviewee_id', revieweeId)
          .eq('review_type', 'lister_reviews_user');

        if (userReviews && userReviews.length > 0) {
          const avgRating =
            userReviews.reduce((sum, r) => sum + Number(r.overall_rating), 0) /
            userReviews.length;

          await supabase
            .from('profiles')
            .update({ rating: avgRating })
            .eq('id', revieweeId);
        }
      }

      toast({
        title: 'Thank you!',
        description: 'Your review has been submitted',
      });

      onSuccess();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const overallRating = calculateOverallRating();

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {isUserReview
          ? `How was your stay at ${apartmentName || 'this apartment'}?`
          : `How was your guest ${userName || ''}?`}
      </h2>

      <div className="space-y-6">
        {ratingCategories.map((category) => (
          <div key={category.key} className="space-y-2">
            <label className="text-sm font-medium">{category.label}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRating(category.key, star)}
                  className="transition-colors"
                >
                  <Star
                    size={32}
                    className={
                      star <= ratings[category.key]
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }
                  />
                </button>
              ))}
            </div>
          </div>
        ))}

        {overallRating > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Overall Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <Star size={24} className="fill-primary text-primary" />
              <span className="text-2xl font-bold">{overallRating.toFixed(1)}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Comment <span className="text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Share your experience..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/500
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || overallRating === 0}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </Card>
  );
};
