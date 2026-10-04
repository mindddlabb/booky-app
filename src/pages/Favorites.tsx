import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Apartment } from "@/types";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, Loader2, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const Favorites = () => {
  const navigate = useNavigate();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("favorites")
          .select("apartment_id, apartments(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const transformed: Apartment[] = (data || [])
          .filter((f: any) => f.apartments)
          .map((f: any) => {
            const apt = f.apartments;
            return {
              id: apt.id,
              listerId: apt.lister_id,
              name: apt.name,
              description: apt.description,
              location: {
                address: apt.address,
                city: apt.city,
                neighborhood: apt.neighborhood,
                lat: apt.latitude,
                lng: apt.longitude,
              },
              pricePerNight: Number(apt.price_per_night),
              bedrooms: apt.bedrooms,
              bathrooms: apt.bathrooms,
              amenities: apt.amenities || [],
              media: Array.isArray(apt.media)
                ? apt.media.map((m: any) => ({
                    type: m.type || "image",
                    url: m.url || m,
                    thumbnail: m.thumbnail,
                  }))
                : [],
              availabilityStatus: apt.availability_status,
              averageRating: Number(apt.average_rating),
              totalReviews: apt.total_reviews,
              favoritesCount: apt.favorites_count || 0,
              createdAt: apt.created_at,
              updatedAt: apt.updated_at,
            };
          });

        setApartments(transformed);
      } catch (err) {
        console.error("Error fetching favorites:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b px-4 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top,0px))] flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Saved Places</h1>
      </div>

      {apartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-32 px-6 text-center">
          <Bookmark className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <h2 className="text-lg font-semibold mb-1">No saved places yet</h2>
          <p className="text-sm text-muted-foreground">
            Tap the bookmark icon on any apartment to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {apartments.map((apt) => (
            <div
              key={apt.id}
              className="rounded-2xl overflow-hidden bg-card border border-border cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/apartment/${apt.id}`)}
            >
              <div className="aspect-[4/3] relative">
                <img
                  src={apt.media?.[0]?.url || "/placeholder.svg"}
                  alt={apt.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Bookmark className="w-5 h-5 fill-primary text-primary" />
                </div>
              </div>
              <div className="p-2.5">
                <p className="font-medium text-sm truncate">{apt.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{apt.location.city}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-bold text-sm text-primary">
                    ${apt.pricePerNight}
                    <span className="text-xs font-normal text-muted-foreground">/night</span>
                  </span>
                  {apt.averageRating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {apt.averageRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
