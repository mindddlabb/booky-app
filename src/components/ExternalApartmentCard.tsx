import { useState } from "react";
import { ExternalApartment } from "@/types";
import {
  Bookmark,
  MapPin,
  Star,
  Bed,
  Bath,
  Globe,
  ExternalLink,
  Ruler,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

interface ExternalApartmentCardProps {
  apartment: ExternalApartment;
  isActive: boolean;
}

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
];

const ExternalApartmentCard = ({ apartment, isActive }: ExternalApartmentCardProps) => {
  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("booky_external_favorites") || "[]");
      return Array.isArray(saved) && saved.includes(apartment.id);
    } catch {
      return false;
    }
  });
  const [detailsOpen, setDetailsOpen] = useState(false);

  const mediaImages =
    apartment.images && apartment.images.length > 0
      ? apartment.images
      : apartment.imageUrl
      ? [apartment.imageUrl, ...FALLBACK_IMAGES.slice(1)]
      : FALLBACK_IMAGES;

  const nightlyPrice = apartment.pricePerNight || 150;
  const bedrooms = apartment.bedrooms || 1;
  const bathrooms = apartment.bathrooms || 1;
  const rating = apartment.rating || 4.7;

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("booky_external_favorites") || "[]");
      let updated: string[];
      if (isFavorite) {
        updated = saved.filter((id) => id !== apartment.id);
        setIsFavorite(false);
        toast.success("Removed from bookmarks");
      } else {
        updated = [...saved, apartment.id];
        setIsFavorite(true);
        toast.success("Bookmarked apartment");
      }
      localStorage.setItem("booky_external_favorites", JSON.stringify(updated));
    } catch {
      setIsFavorite(!isFavorite);
    }
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailsOpen(true);
  };

  return (
    <>
      <div
        onClick={() => setDetailsOpen(true)}
        className={`relative w-full h-full cursor-pointer transition-all duration-500 ease-out ${
          isActive ? "scale-100 opacity-100" : "scale-[0.97] opacity-70"
        }`}
      >
        {/* Media Carousel - Full Screen (Matches ApartmentCard) */}
        <Carousel
          className="w-full h-full"
          plugins={[Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })]}
          opts={{
            loop: true,
            dragFree: true,
            watchDrag: false,
          }}
        >
          <CarouselContent className="touch-pan-y">
            {mediaImages.map((imgUrl, index) => (
              <CarouselItem key={index} className="h-screen">
                <img
                  src={imgUrl}
                  alt={`${apartment.name} - Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Gradient Overlay (Matches ApartmentCard) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

        {/* Availability Dot - Top Right (Matches ApartmentCard) */}
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
          <span className="text-white text-xs font-medium capitalize">available</span>
        </div>

        {/* Bottom Info Preview (Matches ApartmentCard) */}
        <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-5 right-5 text-white pointer-events-none">
          <div className="space-y-2.5 pointer-events-auto pb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-black/50 backdrop-blur-sm border-white/20 text-white">
                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                {rating.toFixed(1)}
              </Badge>
              <Badge className="bg-black/50 backdrop-blur-sm border-white/20 text-white">
                <Globe className="w-3 h-3 mr-1 text-primary" />
                {apartment.sourceName}
              </Badge>
            </div>

            <h2 className="text-2xl font-bold line-clamp-1">{apartment.name}</h2>

            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="line-clamp-1">
                {apartment.neighborhood || apartment.location}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm pt-1">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{bedrooms}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{bathrooms}</span>
                </div>
                <span className="font-bold">
                  ${nightlyPrice}
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-h-[44px] px-5 py-2 rounded-full shadow-lg active:scale-95 transition-transform whitespace-nowrap"
                  onClick={handleBook}
                >
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Listing Detail Sheet (Matches ApartmentDetail style) */}
      {detailsOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200"
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="bg-background text-foreground w-full max-w-lg max-h-[90dvh] rounded-t-3xl sm:rounded-3xl overflow-y-auto shadow-2xl border border-border animate-in slide-in-from-bottom-6 duration-300 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Image */}
            <div className="relative h-64 w-full">
              <img
                src={mediaImages[0]}
                alt={apartment.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGES[0];
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70 h-10 w-10"
                onClick={() => setDetailsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-white">
                <Badge className="bg-primary text-primary-foreground border-0 px-3 py-1">
                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                  Verified on {apartment.sourceName}
                </Badge>
                <span className="flex items-center gap-1 text-sm font-semibold bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {rating.toFixed(1)}
                  {apartment.reviewCount ? ` (${apartment.reviewCount})` : ""}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-2xl font-bold leading-tight">{apartment.name}</h2>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>{apartment.neighborhood || apartment.location}</span>
                </div>
              </div>

              {/* Specs Row */}
              <div className="grid grid-cols-3 gap-3 bg-muted/50 rounded-2xl p-3.5 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Bed className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground">Bedrooms</span>
                  <span className="font-semibold text-sm">{bedrooms} Bed</span>
                </div>
                <div className="flex flex-col items-center gap-1 border-x border-border">
                  <Bath className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground">Bathrooms</span>
                  <span className="font-semibold text-sm">{bathrooms} Bath</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Ruler className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground">Area</span>
                  <span className="font-semibold text-sm">
                    {(apartment.squareFeet || 650 + bedrooms * 250).toLocaleString()} sqft
                  </span>
                </div>
              </div>

              {/* Description */}
              {apartment.description && (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold">About this apartment</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {apartment.description}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {apartment.amenities && apartment.amenities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {apartment.amenities.map((amenity, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="px-3 py-1.5 text-xs font-medium gap-1.5 rounded-xl"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom CTA Bar */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
                <div>
                  <span className="text-2xl font-bold text-primary">${nightlyPrice}</span>
                  <span className="text-sm text-muted-foreground"> / night</span>
                </div>
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 px-6 rounded-full shadow-lg gap-2"
                >
                  <a href={apartment.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Book on {apartment.sourceName}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExternalApartmentCard;
