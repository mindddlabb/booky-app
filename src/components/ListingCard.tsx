import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ListingCardProps {
  id: string;
  image: string;
  name: string;
  location: string;
  status: "available" | "booked" | "unavailable";
  views?: number;
  onEdit: () => void;
  onStatusChange: (status: "available" | "unavailable") => void;
  onClick: () => void;
}

const ListingCard = ({
  id,
  image,
  name,
  location,
  status,
  views = 0,
  onEdit,
  onStatusChange,
  onClick,
}: ListingCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "booked":
        return "bg-yellow-500";
      case "unavailable":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking on the edit button or dropdown
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest('[role="menuitem"]')
    ) {
      return;
    }
    onClick();
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleCardClick}
    >
      <div className="relative aspect-video">
        <img src={image} alt={name} className="w-full h-full object-cover" />
        <Badge className={`absolute top-2 left-2 ${getStatusColor()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit Listing</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange("available")}>
              Mark Available
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange("unavailable")}>
              Mark Unavailable
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-semibold line-clamp-1">{name}</h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{location}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>{views} views</span>
        </div>
      </div>
    </Card>
  );
};

export default ListingCard;
