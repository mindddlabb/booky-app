import { useEffect, useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ReviewCard } from './ReviewCard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ReviewsSectionProps {
  apartmentId: string;
}

interface ReviewWithProfile {
  id: string;
  overall_rating: number;
  comment: string | null;
  created_at: string;
  cleanliness_rating: number | null;
  accuracy_rating: number | null;
  communication_rating: number | null;
  location_rating: number | null;
  value_rating: number | null;
  reviewer: {
    full_name: string;
    profile_picture: string | null;
  };
}

export const ReviewsSection = ({ apartmentId }: ReviewsSectionProps) => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [averageRatings, setAverageRatings] = useState({
    cleanliness: 0,
    accuracy: 0,
    communication: 0,
    location: 0,
    value: 0,
    overall: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [apartmentId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
          id,
          overall_rating,
          comment,
          created_at,
          cleanliness_rating,
          accuracy_rating,
          communication_rating,
          location_rating,
          value_rating,
          reviewer:profiles!reviews_reviewer_id_fkey (
            full_name,
            profile_picture
          )
        `
        )
        .eq('apartment_id', apartmentId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setReviews(data as ReviewWithProfile[]);

      // Calculate average ratings
      if (data && data.length > 0) {
        const totals = data.reduce(
          (acc, review) => ({
            cleanliness: acc.cleanliness + (review.cleanliness_rating || 0),
            accuracy: acc.accuracy + (review.accuracy_rating || 0),
            communication: acc.communication + (review.communication_rating || 0),
            location: acc.location + (review.location_rating || 0),
            value: acc.value + (review.value_rating || 0),
            overall: acc.overall + Number(review.overall_rating),
          }),
          { cleanliness: 0, accuracy: 0, communication: 0, location: 0, value: 0, overall: 0 }
        );

        const count = data.length;
        setAverageRatings({
          cleanliness: totals.cleanliness / count,
          accuracy: totals.accuracy / count,
          communication: totals.communication / count,
          location: totals.location / count,
          value: totals.value / count,
          overall: totals.overall / count,
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No reviews yet</p>
      </div>
    );
  }

  const ratingCategories = [
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'communication', label: 'Communication' },
    { key: 'location', label: 'Location' },
    { key: 'value', label: 'Value' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Star size={32} className="fill-primary text-primary" />
          <div>
            <p className="text-3xl font-bold">{averageRatings.overall.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">{reviews.length} reviews</p>
          </div>
        </div>

        <div className="space-y-3">
          {ratingCategories.map((category) => (
            <div key={category.key} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span>{category.label}</span>
                <span className="font-medium">
                  {averageRatings[category.key as keyof typeof averageRatings].toFixed(1)}
                </span>
              </div>
              <Progress
                value={(averageRatings[category.key as keyof typeof averageRatings] / 5) * 100}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              reviewerName={review.reviewer.full_name}
              reviewerAvatar={review.reviewer.profile_picture || undefined}
              rating={Number(review.overall_rating)}
              comment={review.comment || undefined}
              createdAt={review.created_at}
            />
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate(`/reviews/${apartmentId}`)}
      >
        See All Reviews
        <ChevronRight size={16} />
      </Button>
    </div>
  );
};
