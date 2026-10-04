import { Apartment } from "@/types";
import { Bookmark, MapPin, Star, Bed, Bath } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addFavorite, removeFavorite } from "@/store/favoritesSlice";
import Autoplay from "embla-carousel-autoplay";

import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
interface ApartmentCardProps {
  apartment: Apartment;
  isActive: boolean;
}
const ApartmentCard = ({
  apartment,
  isActive
}: ApartmentCardProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector(state => state.favorites.apartmentIds);
  const isFavorite = favoriteIds.includes(apartment.id);
  
  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to save bookmarks");
        return;
      }

      // Optimistic update
      if (isFavorite) {
        dispatch(removeFavorite(apartment.id));
      } else {
        dispatch(addFavorite(apartment.id));
      }

      // Update database
      if (isFavorite) {
        const {
          error
        } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("apartment_id", apartment.id);
        if (error) {
          // Revert on error
          dispatch(addFavorite(apartment.id));
          throw error;
        }
        toast.success("Removed from bookmarks");
      } else {
        const {
          error
        } = await supabase.from("favorites").insert({
          user_id: user.id,
          apartment_id: apartment.id
        });
        if (error) {
          // Revert on error
          dispatch(removeFavorite(apartment.id));
          throw error;
        }
        toast.success("Bookmarked apartment");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update bookmark");
    }
  };
  const isAvailable = apartment.availabilityStatus === "available";

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/apartment/${apartment.id}`);
  };
  return <>
      <div className={`relative w-full h-full transition-all duration-500 ease-out ${isActive ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-70'}`}>
        {/* Media Carousel - Full Screen */}
        <Carousel className="w-full h-full" plugins={[Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })]} opts={{
        loop: true,
        dragFree: true,
        watchDrag: false
      }}>
          <CarouselContent className="touch-pan-y">
            {apartment.media.length > 0 ? apartment.media.filter(media => media.type === "image").map((media, index) => <CarouselItem key={index} className="h-screen">
                    <img src={media.url} alt={`${apartment.name} - Image ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </CarouselItem>) : <CarouselItem className="h-screen">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
              </CarouselItem>}
          </CarouselContent>
        </Carousel>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

        {/* Availability Dot - Top Right */}
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
          <div className={`w-2.5 h-2.5 rounded-full ${isAvailable ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"}`} />
          <span className="text-white text-xs font-medium capitalize">
            {isAvailable ? "available" : "unavailable"}
          </span>
        </div>

        {/* Bottom Info Preview */}
        <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-5 right-5 text-white pointer-events-none">
          <div className="space-y-2.5 pointer-events-auto pb-2">
            <div className="flex items-center gap-2">
              {apartment.averageRating > 0 && <Badge className="bg-black/50 backdrop-blur-sm border-white/20">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {apartment.averageRating.toFixed(1)}
                </Badge>}
              {apartment.favoritesCount > 0 && <Badge className="bg-black/50 backdrop-blur-sm border-white/20">
                  <Bookmark className="w-3 h-3 mr-1 fill-primary text-primary" />
                  {apartment.favoritesCount}
                </Badge>}
            </div>
            <h2 className="text-2xl font-bold line-clamp-1">{apartment.name}</h2>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="line-clamp-1">
                {apartment.location.neighborhood || apartment.location.city}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm pt-1">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{apartment.bedrooms}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{apartment.bathrooms}</span>
                </div>
                <span className="font-bold">
                  ${apartment.pricePerNight}
                  <span className="font-normal text-white/80">/night</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={isFavorite ? "Remove bookmark" : "Bookmark apartment"}
                  className={`rounded-full backdrop-blur-sm min-h-[44px] min-w-[44px] h-11 w-11 active:scale-95 transition-transform ${
                    isFavorite
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                      : "bg-black/50 hover:bg-black/70 text-white border border-white/20"
                  }`}
                  onClick={handleFavorite}
                >
                  <Bookmark className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                </Button>
                <Button
                  className={`font-semibold min-h-[44px] px-5 py-2 rounded-full shadow-lg active:scale-95 transition-transform whitespace-nowrap ${
                    isAvailable
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-destructive/90 hover:bg-destructive text-destructive-foreground"
                  }`}
                  onClick={handleBook}
                >
                  {isAvailable ? "Book Now" : "Unavailable"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>;
};
export default ApartmentCard;