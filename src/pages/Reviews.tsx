import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReviewCard } from '@/components/ReviewCard';
import { supabase } from '@/integrations/supabase/client';

interface ReviewWithProfile {
  id: string;
  overall_rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    full_name: string;
    profile_picture: string | null;
  };
}

export default function Reviews() {
  const { apartmentId } = useParams();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<ReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    if (apartmentId) {
      fetchReviews();
    }
  }, [apartmentId]);

  useEffect(() => {
    filterAndSortReviews();
  }, [reviews, searchQuery, sortBy]);

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
          reviewer:profiles!reviews_reviewer_id_fkey (
            full_name,
            profile_picture
          )
        `
        )
        .eq('apartment_id', apartmentId);

      if (error) throw error;

      setReviews(data as ReviewWithProfile[]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortReviews = () => {
    let filtered = [...reviews];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (review) =>
          review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          review.reviewer.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'highest':
        filtered.sort((a, b) => Number(b.overall_rating) - Number(a.overall_rating));
        break;
      case 'lowest':
        filtered.sort((a, b) => Number(a.overall_rating) - Number(b.overall_rating));
        break;
    }

    setFilteredReviews(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={20} />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-6">All Reviews ({reviews.length})</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No reviews match your search' : 'No reviews yet'}
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              reviewerName={review.reviewer.full_name}
              reviewerAvatar={review.reviewer.profile_picture || undefined}
              rating={Number(review.overall_rating)}
              comment={review.comment || undefined}
              createdAt={review.created_at}
            />
          ))
        )}
      </div>
    </div>
  );
}
