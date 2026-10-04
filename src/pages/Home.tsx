import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Apartment, ExternalApartment } from "@/types";
import ApartmentCard from "@/components/ApartmentCard";
import ApartmentCardSkeleton from "@/components/ApartmentCardSkeleton";
import ExternalApartmentCard from "@/components/ExternalApartmentCard";
import { Loader2, Search, RefreshCw, X, Globe, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setFavorites } from "@/store/favoritesSlice";
import { setSearchQuery } from "@/store/filterSlice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  externalApartmentsApi,
  getSearchResultsCountMessage,
} from "@/lib/api/externalApartments";
import { syncApartmentsAvailability } from "@/lib/bookingAvailability";

type MixedListing = (Apartment & { isExternal?: false }) | ExternalApartment;

const Home = () => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.filters);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [externalApartments, setExternalApartments] = useState<ExternalApartment[]>([]);
  const [mixedListings, setMixedListings] = useState<MixedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [localQuery, setLocalQuery] = useState(filters.searchQuery || "");
  const [searchCountMessage, setSearchCountMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pull-to-refresh state
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const PULL_THRESHOLD = 80;

  // Initial load and periodic check for expired bookings
  useEffect(() => {
    fetchFavorites();
    if (!filters.searchQuery) {
      fetchApartments("");
      setExternalApartments([]);
      setSearchCountMessage(null);
    } else {
      runFullSearch(filters.searchQuery, false);
    }

    const interval = setInterval(() => {
      fetchApartments(filters.searchQuery || "");
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFavorites = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("favorites")
        .select("apartment_id")
        .eq("user_id", user.id);
      if (error) throw error;
      const favoriteIds = data?.map((fav) => fav.apartment_id) || [];
      dispatch(setFavorites(favoriteIds));
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
    }
  };

  const fetchApartments = async (queryText?: string): Promise<Apartment[]> => {
    try {
      const activeSearch = (queryText ?? filters.searchQuery ?? "").trim();
      let query = supabase
        .from("apartments")
        .select("*");

      if (activeSearch) {
        query = query.or(
          `name.ilike.%${activeSearch}%,address.ilike.%${activeSearch}%,city.ilike.%${activeSearch}%,neighborhood.ilike.%${activeSearch}%`
        );
      }
      if (filters.city) query = query.eq("city", filters.city);
      if (filters.priceMin > 0) query = query.gte("price_per_night", filters.priceMin);
      if (filters.priceMax < 10000) query = query.lte("price_per_night", filters.priceMax);
      if (filters.bedrooms) query = query.gte("bedrooms", filters.bedrooms);
      if (filters.bathrooms) query = query.gte("bathrooms", filters.bathrooms);
      if (filters.amenities.length > 0) query = query.contains("amenities", filters.amenities);
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const transformedApartments: Apartment[] = (data || []).map((apt) => {
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

      const syncedApartments = await syncApartmentsAvailability(transformedApartments);
      setApartments(syncedApartments);
      return syncedApartments;
    } catch (error: any) {
      toast.error("Failed to load apartments");
      console.error("Error fetching apartments:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Executes both local and internet search and announces the exact number of compatible results found.
   */
  const runFullSearch = async (queryStr: string, notifyToast = true) => {
    const trimmed = queryStr.trim();
    dispatch(setSearchQuery(trimmed));

    if (!trimmed) {
      setSearchCountMessage(null);
      setExternalApartments([]);
      await fetchApartments("");
      return;
    }

    setSearchingExternal(true);
    setSearchCountMessage(null);

    try {
      const [localMatched, externalRes] = await Promise.all([
        fetchApartments(trimmed),
        externalApartmentsApi.search(trimmed, trimmed),
      ]);

      const extList = externalRes.success && externalRes.apartments ? externalRes.apartments : [];
      setExternalApartments(extList);

      const totalFound = localMatched.length + extList.length;
      const summaryMsg = getSearchResultsCountMessage(totalFound, trimmed);
      setSearchCountMessage(summaryMsg);

      if (notifyToast) {
        if (totalFound > 0) {
          toast.success(summaryMsg);
        } else {
          toast.info(`No apartments found for "${trimmed}"`);
        }
      }
    } catch (error) {
      console.error("Error running search:", error);
      setExternalApartments([]);
      setSearchCountMessage(getSearchResultsCountMessage(0, trimmed));
    } finally {
      setSearchingExternal(false);
    }
  };

  // Combine internal and external internet apartments into the feed
  useEffect(() => {
    if (apartments.length === 0 && externalApartments.length === 0) {
      setMixedListings([]);
      return;
    }

    if (apartments.length === 0) {
      setMixedListings([...externalApartments]);
      return;
    }

    const mixed: MixedListing[] = [];
    let externalIndex = 0;
    const step = filters.searchQuery ? 1 : 3;

    apartments.forEach((apt, index) => {
      mixed.push({ ...apt, isExternal: false });
      if ((index + 1) % step === 0 && externalIndex < externalApartments.length) {
        mixed.push(externalApartments[externalIndex]);
        externalIndex++;
      }
    });

    while (externalIndex < externalApartments.length) {
      mixed.push(externalApartments[externalIndex]);
      externalIndex++;
    }

    setMixedListings(mixed);
  }, [apartments, externalApartments, filters.searchQuery]);

  const handleImmediateSearch = () => {
    const trimmed = localQuery.trim();
    if (!trimmed) {
      toast.error("Please enter a city, location, or apartment name to search");
      return;
    }
    runFullSearch(trimmed, true);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearSearch = async () => {
    setLocalQuery("");
    setSearchCountMessage(null);
    dispatch(setSearchQuery(""));
    setExternalApartments([]);
    setSearchExpanded(false);
    await fetchApartments("");
  };

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling || refreshing) return;
      const diff = Math.max(0, e.touches[0].clientY - startY.current);
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
    },
    [pulling, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      try {
        if (filters.searchQuery) {
          await runFullSearch(filters.searchQuery, false);
        } else {
          await Promise.all([fetchApartments(""), fetchFavorites()]);
        }
        toast.success("Feed refreshed");
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pulling, pullDistance, filters.searchQuery]);

  // Skeleton loading state
  if (loading && mixedListings.length === 0) {
    return (
      <div className="h-screen overflow-hidden">
        <ApartmentCardSkeleton />
      </div>
    );
  }

  return (
    <>
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center transition-all duration-200 pt-safe"
          style={{ height: refreshing ? 56 : pullDistance }}
        >
          <div
            className={`bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg ${
              refreshing ? "animate-spin" : ""
            }`}
          >
            <RefreshCw
              className={`w-5 h-5 text-primary transition-transform ${
                pullDistance >= PULL_THRESHOLD ? "text-primary" : "text-muted-foreground"
              }`}
              style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
            />
          </div>
        </div>
      )}

      {/* Search Bar (Always accessible) */}
      <div className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 right-32 z-50 pointer-events-none">
        {searchExpanded || localQuery || filters.searchQuery ? (
          <div className="pointer-events-auto flex items-center gap-1.5 bg-background/95 backdrop-blur-md rounded-full border shadow-lg px-2 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative flex-1 flex items-center">
              <Search className="ml-2.5 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                ref={searchInputRef}
                placeholder="Search any city or apartment..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleImmediateSearch();
                    searchInputRef.current?.blur();
                  }
                }}
                className="pl-2 pr-2 h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                onBlur={() => {
                  if (!localQuery.trim() && !filters.searchQuery) setSearchExpanded(false);
                }}
              />
              {(localQuery || filters.searchQuery) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-full"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleImmediateSearch}
              disabled={searchingExternal}
              className="rounded-full h-8 px-3.5 text-xs font-semibold shrink-0"
            >
              {searchingExternal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="pointer-events-auto rounded-full bg-background/95 backdrop-blur-md shadow-lg h-11 w-11 active:scale-95 transition-transform"
            onClick={() => {
              setSearchExpanded(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Active internet search status pill OR Search Results Count badge */}
        {searchingExternal ? (
          <div className="mt-2 inline-flex items-center gap-2 bg-black/70 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full shadow-md animate-in fade-in">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Searching for "{localQuery || filters.searchQuery}"...</span>
          </div>
        ) : (
          searchCountMessage && (
            <div className="mt-2 pointer-events-auto inline-flex items-center gap-2 bg-black/75 backdrop-blur-md text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-md animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{searchCountMessage}</span>
            </div>
          )
        )}
      </div>

      {/* Empty State when no compatible apartments matched */}
      {mixedListings.length === 0 ? (
        <div className="h-screen flex items-center justify-center bg-background p-6">
          {searchingExternal ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <h2 className="text-xl font-bold">Searching available apartments...</h2>
              <p className="text-sm text-muted-foreground">
                Checking compatible listings for "{localQuery || filters.searchQuery}"
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-xs">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">No apartments found</h2>
              <p className="text-sm text-muted-foreground">
                {filters.searchQuery
                  ? `0 compatible apartments found for "${filters.searchQuery}". Try searching for another city or neighborhood.`
                  : "No apartments available right now."}
              </p>
              {filters.searchQuery && (
                <Button onClick={handleClearSearch} variant="outline" className="rounded-full">
                  Reset Search
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Apartments Vertical Snap Feed */
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          {mixedListings.map((listing) => (
            <div key={listing.id} className="h-screen snap-start snap-always relative">
              {"isExternal" in listing && listing.isExternal ? (
                <ExternalApartmentCard apartment={listing as ExternalApartment} isActive={true} />
              ) : (
                <ApartmentCard apartment={listing as Apartment} isActive={true} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Home;
