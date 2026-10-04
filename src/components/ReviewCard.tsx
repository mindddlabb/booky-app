import { Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export const ReviewCard = ({
  reviewerName,
  reviewerAvatar,
  rating,
  comment,
  createdAt,
}: ReviewCardProps) => {
  const anonymizedName = reviewerName
    .split(' ')
    .map((part, idx) => (idx === 0 ? part : `${part[0]}.`))
    .join(' ');

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={reviewerAvatar} alt={reviewerName} />
          <AvatarFallback>
            {reviewerName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">{anonymizedName}</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, idx) => (
              <Star
                key={idx}
                size={16}
                className={
                  idx < Math.round(rating)
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground'
                }
              />
            ))}
            <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
          </div>

          {comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">{comment}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
