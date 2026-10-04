import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Loader2, MapPin, Globe, Map, List, ExternalLink, CheckCircle2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Apartment, ExternalApartment } from "@/types";
import {
  externalApartmentsApi,
  getSearchResultsCountMessage,
} from "@/lib/api/externalApartments";
import ExternalApartmentCard from "@/components/ExternalApartmentCard";
import ApartmentMap from "@/components/ApartmentMap";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Explore = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [externalApartments, setExternalApartments] = useState<ExternalApartment[]>([]);
  const [internalApartments, setInternalApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchCountMessage, setSearchCountMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [activeApartmentId, setActiveApartmentId] = useState<string>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch internal apartments with coordinates
  useEffect(() => {
    fetchInternalApartments();
  }, []);

  const fetchInternalApartments = async () => {
    try {
      const { data, error } = await supabase
        .from("apartments")
        .select("*")
        .eq("availability_status", "available");

      if (error) throw error;

      const transformed: Apartment[] = (data || []).map((apt) => {
        const mediaArray = Array.isArray(apt.media) ? (apt.media as any[]) : [];
        return {
          id: apt.id,
          listerId: apt.lister_id,
          name: apt.name,
          description: apt.description || undefined,
          location: {
            address: apt.address,
            city: apt.city,
            neighborhood: apt.neighborhood || undefined,
            lat: apt.latitude ? Number(apt.latitude) : undefined,
            lng: apt.longitude ? Number(apt.longitude) : undefined,
          },
          pricePerNight: Number(apt.price_per_night),
          bedrooms: apt.bedrooms,
          bathrooms: apt.bathrooms,
          amenities: apt.amenities || [],
          media: mediaArray.map((m: any) => ({
            type: m.type || "image",
            url: m.url || "",
            thumbnail: m.thumbnail,
          })),
          availabilityStatus: apt.availability_status,
          averageRating: Number(apt.average_rating),
          totalReviews: apt.total_reviews,
          favoritesCount: apt.favorites_count || 0,
          createdAt: apt.created_at,
          updatedAt: apt.updated_at,
        };
      });

      setInternalApartments(transformed);
    } catch (error) {
      console.error("Error fetching apartments for map:", error);
    }
  };

  const handleSearch = async (loc?: string) => {
    const searchLocation = (loc ?? location ?? searchQuery).trim();
    if (!searchLocation) {
      toast.error("Please enter a city, location, or keyword to search");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setSearchCountMessage(null);

    try {
      const result = await externalApartmentsApi.search(searchLocation, searchQuery);

      if (result.success && result.apartments) {
        const count = result.apartments.length;
        const msg = getSearchResultsCountMessage(count, searchLocation);
        setExternalApartments(result.apartments);
        setSearchCountMessage(msg);
        setCurrentIndex(0);

        if (count > 0) {
          toast.success(msg);
        } else {
          toast.info(`No apartments found for "${searchLocation}"`);
        }
      } else {
        setExternalApartments([]);
        setSearchCountMessage(getSearchResultsCountMessage(0, searchLocation));
        toast.info(`No apartments found for "${searchLocation}"`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search. Please try again.");
      setExternalApartments([]);
      setSearchCountMessage(getSearchResultsCountMessage(0, searchLocation));
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setLocation("");
    setSearchQuery("");
    setExternalApartments([]);
    setHasSearched(false);
    setSearchCountMessage(null);
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "";
          const state = data.address?.state || "";
          const detected = [city, state].filter(Boolean).join(", ");

          if (detected) {
            setLocation(detected);
            toast.success(`Location detected: ${detected}`);
            handleSearch(detected);
          } else {
            toast.error("Could not determine your city");
          }
        } catch {
          toast.error("Failed to detect location");
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        setDetectingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  // Combine internal and external apartments for map markers
  const mapApartments = useMemo<Apartment[]>(() => {
    const extMapped: Apartment[] = externalApartments
      .filter((ext) => typeof ext.lat === "number" && typeof ext.lng === "number")
      .map((ext) => ({
        id: ext.id,
        listerId: "external",
        name: ext.name,
        description: ext.description,
        location: {
          address: ext.neighborhood || ext.location,
          city: ext.location,
          neighborhood: ext.neighborhood,
          lat: ext.lat,
          lng: ext.lng,
        },
        pricePerNight: ext.pricePerNight || 150,
        bedrooms: ext.bedrooms || 1,
        bathrooms: ext.bathrooms || 1,
        amenities: ext.amenities || [],
        media: (ext.images || (ext.imageUrl ? [ext.imageUrl] : [])).map((url) => ({
          type: "image" as const,
          url,
        })),
        availabilityStatus: "available" as const,
        averageRating: ext.rating || 4.7,
        totalReviews: ext.reviewCount || 24,
        favoritesCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    if (hasSearched) {
      return extMapped;
    }
    return internalApartments;
  }, [externalApartments, internalApartments, hasSearched]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const windowHeight = containerRef.current.clientHeight || window.innerHeight;
    const newIndex = Math.round(scrollTop / windowHeight);
    setCurrentIndex(newIndex);
  };

  const handleMarkerClick = (apartment: Apartment) => {
    setActiveApartmentId(apartment.id);
  };

  const activeMapItem = useMemo(() => {
    if (!activeApartmentId) return null;
    const ext = externalApartments.find((e) => e.id === activeApartmentId);
    if (ext) return { type: "external" as const, ext };
    const int = internalApartments.find((a) => a.id === activeApartmentId);
    if (int) return { type: "internal" as const, int };
    return null;
  }, [activeApartmentId, externalApartments, internalApartments]);

  return (
    <div className="h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b px-4 pt-[max(0.875rem,env(safe-area-inset-top,0px))] pb-3">
        <div className="space-y-2.5 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Explore</h1>
                <p className="text-[11px] text-muted-foreground">
                  Search available apartments across the web
                </p>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex bg-muted/60 rounded-xl p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Feed
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "map"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                Map
              </button>
            </div>
          </div>

          {/* Unified Location & Keyword Search Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="City, neighborhood, or apartment type..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9 pr-24 h-10 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {location && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-full"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 px-2 rounded-xl text-primary hover:bg-primary/10"
                  onClick={detectLocation}
                  disabled={detectingLocation}
                >
                  {detectingLocation ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <MapPin className="h-3 w-3 mr-1" />
                  )}
                  Near me
                </Button>
              </div>
            </div>

            <Button
              onClick={() => handleSearch()}
              disabled={loading}
              className="h-10 px-5 rounded-2xl font-semibold shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {/* Search Results Count Banner */}
          {searchCountMessage && !loading && (
            <div className="flex items-center justify-between bg-primary/10 text-foreground px-3.5 py-1.5 rounded-xl text-xs font-medium animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{searchCountMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-primary hover:underline text-[11px] font-semibold"
              >
                Reset
              </button>
            </div>
          )}

          {/* Popular Quick-Search Cities */}
          {!hasSearched && !loading && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pt-0.5">
              {["New York", "Miami", "Los Angeles", "London", "Lagos", "Austin", "Toronto"].map(
                (city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setLocation(city);
                      handleSearch(city);
                    }}
                    className="text-xs px-3 py-1 rounded-full bg-muted/60 hover:bg-primary/15 hover:text-primary text-muted-foreground font-medium whitespace-nowrap transition-colors"
                  >
                    {city}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === "map" ? (
          <div className="h-full relative">
            <ApartmentMap
              apartments={mapApartments}
              activeApartmentId={activeApartmentId}
              onMarkerClick={handleMarkerClick}
            />

            {/* Bottom apartment card on map */}
            {activeMapItem && (
              <div className="absolute bottom-20 left-4 right-4 z-[400] animate-in slide-in-from-bottom-4 duration-300">
                {activeMapItem.type === "internal" ? (
                  <div
                    onClick={() => navigate(`/apartment/${activeMapItem.int.id}`)}
                    className="bg-background rounded-2xl shadow-xl border overflow-hidden flex cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="w-28 h-28 shrink-0">
                      {activeMapItem.int.media?.[0]?.url ? (
                        <img
                          src={activeMapItem.int.media[0].url}
                          alt={activeMapItem.int.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                      )}
                    </div>
                    <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                          {activeMapItem.int.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {activeMapItem.int.location.address}, {activeMapItem.int.location.city}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-primary">
                          ${activeMapItem.int.pricePerNight}
                          <span className="text-xs font-normal text-muted-foreground">/night</span>
                        </span>
                        {activeMapItem.int.averageRating > 0 && (
                          <span className="text-xs flex items-center gap-0.5 text-muted-foreground">
                            ⭐ {activeMapItem.int.averageRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <a
                    href={activeMapItem.ext.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-background rounded-2xl shadow-xl border overflow-hidden flex cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="w-28 h-28 shrink-0">
                      {activeMapItem.ext.imageUrl ? (
                        <img
                          src={activeMapItem.ext.imageUrl}
                          alt={activeMapItem.ext.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                      )}
                    </div>
                    <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-sm leading-tight line-clamp-1">
                            {activeMapItem.ext.name}
                          </h3>
                          <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {activeMapItem.ext.neighborhood || activeMapItem.ext.location}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-primary">
                          ${activeMapItem.ext.pricePerNight || 150}
                          <span className="text-xs font-normal text-muted-foreground">/night</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {activeMapItem.ext.sourceName}
                        </span>
                      </div>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {loading ? (
              <div className="h-full flex items-center justify-center animate-fade-in">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Searching the web for compatible apartments in "{location}"...
                  </p>
                </div>
              </div>
            ) : !hasSearched ? (
              <div className="h-full flex items-center justify-center p-6 animate-fade-in">
                <div className="text-center space-y-5 max-w-xs">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Search className="w-9 h-9 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Find Apartments Anywhere</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enter any city or neighborhood above, or tap a city chip to browse live apartment listings from across the internet.
                  </p>
                </div>
              </div>
            ) : externalApartments.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6 animate-fade-in">
                <div className="text-center space-y-4 max-w-xs">
                  <div className="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto">
                    <MapPin className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">No apartments found</h2>
                  <p className="text-sm text-muted-foreground">
                    0 compatible apartments matched "{location}". Try searching for a valid city or neighborhood.
                  </p>
                  <Button onClick={handleClearSearch} variant="outline" className="rounded-full">
                    Reset Search
                  </Button>
                </div>
              </div>
            ) : (
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                style={{ scrollBehavior: "smooth" }}
              >
                {externalApartments.map((apartment, index) => (
                  <div
                    key={apartment.id}
                    className="h-full snap-start snap-always relative"
                  >
                    <ExternalApartmentCard
                      apartment={apartment}
                      isActive={index === currentIndex}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Explore;
