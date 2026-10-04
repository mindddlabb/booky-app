import { Card } from "@/components/ui/card";
import { Building2, Star, Clock } from "lucide-react";

interface ListerStatsProps {
  totalListings: number;
  averageRating: number;
  responseRate?: number;
}

const ListerStats = ({
  totalListings,
  averageRating,
  responseRate = 95,
}: ListerStatsProps) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-4 text-center">
        <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
        <p className="text-2xl font-bold">{totalListings}</p>
        <p className="text-xs text-muted-foreground">Listings</p>
      </Card>
      <Card className="p-4 text-center">
        <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
        <p className="text-2xl font-bold">
          {averageRating > 0 ? averageRating.toFixed(1) : "-"}
        </p>
        <p className="text-xs text-muted-foreground">Rating</p>
      </Card>
      <Card className="p-4 text-center">
        <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
        <p className="text-2xl font-bold">{responseRate}%</p>
        <p className="text-xs text-muted-foreground">Response</p>
      </Card>
    </div>
  );
};

export default ListerStats;
