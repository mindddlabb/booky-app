import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Apartment } from "@/types";
import {
  Loader2, ArrowLeft, MapPin, Star, Bed, Bath, Bookmark, Wifi, Wind,
  Utensils, Car, Tv, WashingMachine, MessageCircle, Calendar as CalendarIcon,
  Grid3x3, ChevronRight, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addFavorite, removeFavorite } from "@/store/favoritesSlice";
import { differenceInDays, isWithinInterval, parseISO } from "date-fns";
import {
  Carousel, CarouselContent, CarouselItem,
} from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { BookingConfirmationDialog } from "@/components/BookingConfirmationDialog";
import { BookingSuccessDialog } from "@/components/BookingSuccessDialog";
import GalleryView from "@/components/GalleryView";
import QuickInfoModal from "@/components/QuickInfoModal";
import {
  markApartmentBooked,
  syncApartmentsAvailability,
} from "@/lib/bookingAvailability";

const amenityIcons: Record<string, any> = {
  WiFi: Wifi,
  "Air Conditioning": Wind,
  Kitchen: Utensils,
  Parking: Car,
  TV: Tv,
  Washer: WashingMachine,
};

const ApartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((state) => state.favorites.apartmentIds);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [listerProfile, setListerProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isFavorite = id ? favoriteIds.includes(id) : false;

  const numberOfNights = checkInDate && checkOutDate
    ? differenceInDays(checkOutDate, checkInDate)
    : 0;

  const basePrice = apartment && numberOfNights > 0 ? numberOfNights * apartment.pricePerNight : 0;
  const serviceFee = basePrice * 0.1;
  const cleaningFee = 50;
  const totalPrice = basePrice + serviceFee + cleaningFee;

  useEffect(() => {
    fetchApartment();
    fetchReviews();
    fetchBookings();
  }, [id]);

  useEffect(() => {
    if (!carouselApi) return;
    setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  const fetchApartment = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from("apartments").select("*").eq("id", id).single();
      if (error) throw error;
      if (data) {
        const mediaArray = Array.isArray(data.media) ? data.media as any[] : [];
        const transformedApartment: Apartment = {
          id: data.id, listerId: data.lister_id, name: data.name,
          description: data.description || undefined,
          location: { address: data.address, city: data.city, neighborhood: data.neighborhood || undefined, lat: data.latitude ? Number(data.latitude) : undefined, lng: data.longitude ? Number(data.longitude) : undefined },
          pricePerNight: Number(data.price_per_night), bedrooms: data.bedrooms, bathrooms: data.bathrooms,
          amenities: data.amenities || [],
          media: mediaArray.map((m: any) => ({ type: m.type || 'image', url: m.url || '', thumbnail: m.thumbnail })),
          availabilityStatus: data.availability_status, averageRating: Number(data.average_rating),
          totalReviews: data.total_reviews, favoritesCount: data.favorites_count || 0,
          createdAt: data.created_at, updatedAt: data.updated_at,
        };
        const [syncedApt] = await syncApartmentsAvailability([transformedApartment]);
        setApartment(syncedApt || transformedApartment);
        const { data: listerData } = await supabase.from("profiles").select("*").eq("id", data.lister_id).single();
        if (listerData) setListerProfile(listerData);
      }
    } catch (error: any) {
      toast.error("Failed to load apartment details");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from("reviews").select("*, reviewer:profiles!reviews_reviewer_id_fkey(*)").eq("apartment_id", id).order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      if (data) setReviews(data);
    } catch (error: any) { console.error("Error fetching reviews:", error); }
  };

  const fetchBookings = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from("bookings").select("*").eq("apartment_id", id).in("status", ["confirmed", "pending"]);
      if (error) throw error;
      if (data) setBookings(data);
    } catch (error: any) { console.error("Error fetching bookings:", error); }
  };

  const isDateBooked = (date: Date) => {
    return bookings.some((booking) => {
      const checkIn = parseISO(booking.check_in_date_time);
      const checkOut = parseISO(booking.check_out_date_time);
      return isWithinInterval(date, { start: checkIn, end: checkOut });
    });
  };

  const handleBookNow = () => {
    if (!checkInDate || !checkOutDate) {
      setShowDatePicker(true);
      toast.error("Please select check-in and check-out dates");
      return;
    }
    if (numberOfNights < 1) { toast.error("Minimum stay is 1 night"); return; }
    setShowConfirmDialog(true);
  };

  const handleConfirmBooking = async () => {
    if (!apartment || !checkInDate || !checkOutDate) return;
    setBookingLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login to book"); setBookingLoading(false); return; }
      const { data: bookingData, error: bookingError } = await supabase.from("bookings").insert({
        user_id: user.id, apartment_id: apartment.id, lister_id: apartment.listerId,
        check_in_date_time: checkInDate.toISOString(), check_out_date_time: checkOutDate.toISOString(),
        total_price: totalPrice, status: "confirmed", payment_status: "paid",
      }).select().single();
      if (bookingError) throw bookingError;

      await markApartmentBooked({
        bookingId: bookingData.id,
        apartmentId: apartment.id,
        checkInDateTime: checkInDate.toISOString(),
        checkOutDateTime: checkOutDate.toISOString(),
      });

      setApartment((prev) =>
        prev ? { ...prev, availabilityStatus: "unavailable" } : prev
      );
      setCreatedBookingId(bookingData.id);
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      toast.success("Booking confirmed! Apartment is now marked as unavailable until checkout.");
      await fetchBookings();
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking");
    } finally { setBookingLoading(false); }
  };

  const handleFavorite = async () => {
    if (!apartment) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login to save favorites"); return; }
      if (isFavorite) {
        dispatch(removeFavorite(apartment.id));
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("apartment_id", apartment.id);
        if (error) { dispatch(addFavorite(apartment.id)); throw error; }
        toast.success("Removed from favorites");
      } else {
        dispatch(addFavorite(apartment.id));
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, apartment_id: apartment.id });
        if (error) { dispatch(removeFavorite(apartment.id)); throw error; }
        toast.success("Added to favorites");
      }
    } catch (error: any) { toast.error(error.message || "Failed to update favorites"); }
  };

  const handleMessageHost = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !apartment) { toast.error("Please login first"); return; }

      const ids = [user.id, apartment.listerId].sort();
      const conversationId = `${ids[0]}_${ids[1]}_${apartment.id}`;

      navigate(`/chat/${conversationId}`, {
        state: {
          otherUserId: apartment.listerId,
          otherUserName: listerProfile?.full_name || "Host",
          apartmentId: apartment.id,
        },
      });
    } catch (error: any) {
      toast.error("Failed to start conversation");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Apartment not found</h2>
          <Button onClick={() => navigate("/")}>Go Back Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-56">
      {/* Full-bleed Hero Media */}
      <div className="relative">
        <div className="relative h-[55vw] max-h-[420px] min-h-[260px] overflow-hidden bg-muted">
          <Carousel className="w-full h-full" setApi={setCarouselApi} plugins={[Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })]} opts={{ loop: true }}>
            <CarouselContent className="h-full">
              {apartment.media.length > 0 ? (
                apartment.media.map((media, index) => (
                  <CarouselItem key={index} className="h-full">
                    {media.type === "video" ? (
                      <video src={media.url} poster={media.thumbnail} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                    ) : (
                      <img src={media.url} alt={`${apartment.name} - Image ${index + 1}`} className="w-full h-full object-cover" />
                    )}
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem className="h-full">
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                </CarouselItem>
              )}
            </CarouselContent>
          </Carousel>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

          {/* Floating nav buttons */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-11 h-11 rounded-full bg-background/90 backdrop-blur-md flex items-center justify-center shadow-md transition-transform active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGallery(true)}
                aria-label="Open gallery"
                className="w-11 h-11 rounded-full bg-background/90 backdrop-blur-md flex items-center justify-center shadow-md transition-transform active:scale-95"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Slide dots */}
          {apartment.media.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {apartment.media.map((_, index) => (
                <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          )}

            {/* Availability badge */}
          <div className="absolute bottom-10 right-4 z-20">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${apartment.availabilityStatus === "available" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
              {apartment.availabilityStatus === "available" ? "Available" : "Unavailable"}
            </span>
          </div>
        </div>

        {/* Content card overlapping hero */}
        <div className="px-5 -mt-6 relative z-10">
          <div className="bg-background rounded-3xl shadow-lg p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Title */}
            <div className="mb-3">
              <h1 className="text-2xl font-bold leading-tight cursor-pointer" onClick={() => setShowInfoModal(true)}>
                {apartment.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm">{apartment.location.address}, {apartment.location.city}</span>
              </div>
            </div>

            {/* Rating row */}
            {apartment.averageRating > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">{apartment.averageRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({apartment.totalReviews} reviews)</span>
                </div>
                {apartment.favoritesCount > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Bookmark className="w-3.5 h-3.5 fill-primary text-primary" />
                    <span>{apartment.favoritesCount}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick stats pills */}
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5">
                <Bed className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium">{apartment.bedrooms} bed{apartment.bedrooms !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5">
                <Bath className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium">{apartment.bathrooms} bath{apartment.bathrooms !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5">
                <span className="text-xs font-bold text-primary">${apartment.pricePerNight}/night</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="px-5 mt-4 space-y-4 animate-in fade-in duration-700 delay-200">

        {/* Description */}
        {apartment.description && (
          <section className="bg-background rounded-2xl border p-5">
            <h2 className="font-semibold text-base mb-2">About this place</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{apartment.description}</p>
          </section>
        )}

        {/* Amenities */}
        {apartment.amenities.length > 0 && (
          <section className="bg-background rounded-2xl border p-5">
            <h2 className="font-semibold text-base mb-3">Amenities</h2>
            <div className="grid grid-cols-2 gap-2">
              {apartment.amenities.map((amenity, i) => {
                const Icon = amenityIcons[amenity] || Shield;
                return (
                  <div key={i} className="flex items-center gap-2.5 py-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm">{amenity}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Hosted by */}
        {listerProfile && (
          <section className="bg-background rounded-2xl border p-5">
            <h2 className="font-semibold text-base mb-3">Hosted by</h2>
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-14 h-14 border-2 border-muted">
                <AvatarImage src={listerProfile.profile_picture} />
                <AvatarFallback className="text-lg font-semibold">{listerProfile.full_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{listerProfile.full_name}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span>{listerProfile.rating?.toFixed(1) || "New host"}</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl"
              onClick={handleMessageHost}
            >
              <MessageCircle className="w-4 h-4" />
              Message Host
            </Button>
          </section>
        )}

        {/* Date picker section */}
        <section className="bg-background rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Select Dates</h2>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              {showDatePicker ? "Done" : "Choose dates"}
              <ChevronRight className={`w-4 h-4 transition-transform ${showDatePicker ? "rotate-90" : ""}`} />
            </button>
          </div>

          {/* Date summary */}
          <div className="flex gap-3 mb-3">
            <div className={`flex-1 p-3 rounded-xl border-2 transition-colors ${checkInDate ? "border-primary/30 bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Check-in</p>
              <p className="text-sm font-medium">{checkInDate ? checkInDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Select date"}</p>
            </div>
            <div className={`flex-1 p-3 rounded-xl border-2 transition-colors ${checkOutDate ? "border-primary/30 bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Check-out</p>
              <p className="text-sm font-medium">{checkOutDate ? checkOutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Select date"}</p>
            </div>
          </div>

          {showDatePicker && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Check-in</p>
                <Calendar mode="single" selected={checkInDate} onSelect={setCheckInDate} disabled={(date) => date < new Date() || isDateBooked(date)} className="rounded-xl border pointer-events-auto" />
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Check-out</p>
                <Calendar mode="single" selected={checkOutDate} onSelect={setCheckOutDate} disabled={(date) => !checkInDate || date <= checkInDate || isDateBooked(date)} className="rounded-xl border pointer-events-auto" />
              </div>
            </div>
          )}

          {/* Price breakdown */}
          {numberOfNights > 0 && (
            <div className="mt-4 space-y-2 border-t pt-4 animate-in fade-in duration-300">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">${apartment.pricePerNight} × {numberOfNights} nights</span>
                <span>${basePrice.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service fee (10%)</span>
                <span>${serviceFee.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cleaning fee</span>
                <span>${cleaningFee}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>${totalPrice.toFixed(0)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="bg-background rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Reviews</h2>
            {apartment.averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">{apartment.averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({apartment.totalReviews})</span>
              </div>
            )}
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={review.reviewer?.profile_picture} />
                      <AvatarFallback className="text-xs">{review.reviewer?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{review.reviewer?.full_name}</p>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= review.overall_rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground ml-11">{review.comment}</p>}
                  <Separator className="mt-4" />
                </div>
              ))}
              {apartment.totalReviews > 3 && (
                <Button variant="ghost" className="w-full text-primary text-sm" onClick={() => navigate(`/reviews/${apartment.id}`)}>
                  See all {apartment.totalReviews} reviews
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
          )}
        </section>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t px-5 py-3.5">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div>
            <div className="text-xl font-bold leading-tight">
              {numberOfNights > 0 ? (
                <>${totalPrice.toFixed(0)}<span className="text-sm font-normal text-muted-foreground"> total</span></>
              ) : (
                <>${apartment.pricePerNight}<span className="text-sm font-normal text-muted-foreground">/night</span></>
              )}
            </div>
            {numberOfNights > 0 && (
              <p className="text-xs text-muted-foreground">{numberOfNights} night{numberOfNights !== 1 ? "s" : ""}</p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              size="icon"
              variant="outline"
              aria-label={isFavorite ? "Remove bookmark" : "Bookmark apartment"}
              onClick={handleFavorite}
              className={`rounded-2xl min-h-[48px] min-w-[48px] h-12 w-12 active:scale-95 transition-transform ${
                isFavorite
                  ? "bg-primary/15 border-primary text-primary hover:bg-primary/20"
                  : "border-border text-foreground"
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
            </Button>
            <Button
              size="lg"
              disabled={apartment.availabilityStatus !== "available"}
              className="rounded-2xl font-semibold px-8 min-h-[48px] bg-primary hover:bg-primary/90 active:scale-95 transition-transform disabled:opacity-60"
              onClick={handleBookNow}
            >
              {apartment.availabilityStatus !== "available"
                ? "Unavailable"
                : checkInDate && checkOutDate
                ? "Book Now"
                : "Reserve"}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {apartment && checkInDate && checkOutDate && (
        <BookingConfirmationDialog
          open={showConfirmDialog} onOpenChange={setShowConfirmDialog}
          onConfirm={handleConfirmBooking}
          apartmentName={apartment.name}
          apartmentAddress={`${apartment.location.address}, ${apartment.location.city}`}
          bedrooms={apartment.bedrooms} bathrooms={apartment.bathrooms}
          checkInDate={checkInDate} checkOutDate={checkOutDate}
          numberOfNights={numberOfNights} basePrice={basePrice}
          serviceFee={serviceFee} cleaningFee={cleaningFee}
          totalPrice={totalPrice} isLoading={bookingLoading}
        />
      )}
      {apartment && checkInDate && checkOutDate && (
        <BookingSuccessDialog
          open={showSuccessDialog} onOpenChange={setShowSuccessDialog}
          bookingId={createdBookingId} apartmentName={apartment.name}
          apartmentAddress={`${apartment.location.address}, ${apartment.location.city}`}
          checkInDate={checkInDate} checkOutDate={checkOutDate} totalPrice={totalPrice}
        />
      )}
      <GalleryView media={apartment.media} open={showGallery} onOpenChange={setShowGallery} />
      <QuickInfoModal apartment={apartment} open={showInfoModal} onOpenChange={setShowInfoModal} />
    </div>
  );
};

export default ApartmentDetail;
