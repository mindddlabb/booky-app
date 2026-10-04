import { Apartment } from "@/types";
import { MapPin, Star, Bed, Bath, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";

interface QuickInfoModalProps {
  apartment: Apartment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickInfoModal = ({ apartment, open, onOpenChange }: QuickInfoModalProps) => {
  const navigate = useNavigate();

  const handleSeeMore = () => {
    navigate(`/apartment/${apartment.id}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-3xl">
        <SheetClose className="absolute right-4 top-4 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </SheetClose>
        
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl font-bold pr-8">{apartment.name}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-5 h-5" />
            <span>{apartment.location.address}, {apartment.location.city}</span>
          </div>

          {apartment.averageRating > 0 && (
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-lg">{apartment.averageRating.toFixed(1)}/5</span>
              <span className="text-muted-foreground">
                ({apartment.totalReviews} reviews)
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 py-4 border-y">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Bed className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{apartment.bedrooms}</div>
              <div className="text-sm text-muted-foreground">Bedrooms</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Bath className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold">{apartment.bathrooms}</div>
              <div className="text-sm text-muted-foreground">Bathrooms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">${apartment.pricePerNight}</div>
              <div className="text-sm text-muted-foreground">per night</div>
            </div>
          </div>

          {apartment.description && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground line-clamp-3">{apartment.description}</p>
            </div>
          )}

          {apartment.amenities.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {apartment.amenities.slice(0, 6).map((amenity, i) => (
                  <Badge key={i} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
                {apartment.amenities.length > 6 && (
                  <Badge variant="secondary">
                    +{apartment.amenities.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold text-lg"
            onClick={handleSeeMore}
          >
            See More Details
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickInfoModal;
