import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, MessageCircle, Navigation, FileText, Check, AlertTriangle, Star, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewsSection } from "@/components/ReviewsSection";

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [guestProfile, setGuestProfile] = useState<any>(null);
  const [isLister, setIsLister] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    fetchBookingDetails();
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user);
  };

  useEffect(() => { if (booking) updateBookingStatus(); }, [currentTime, booking?.id]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, apartments (id, name, address, city, media, description)`)
        .eq("id", id).single();
      if (error) throw error;
      setBooking(data);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data.lister_id === user.id) {
        setIsLister(true);
        const { data: guestData } = await supabase.from("profiles").select("*").eq("id", data.user_id).single();
        setGuestProfile(guestData);
      }
      if (user) {
        const { data: reviewData } = await supabase.from('reviews').select('*').eq('booking_id', id).eq('reviewer_id', user.id).maybeSingle();
        setExistingReview(reviewData);
        if (data.status === 'completed' && !reviewData) setShowReviewForm(true);
      }
    } catch (error: any) {
      toast.error("Failed to load booking details");
    } finally { setLoading(false); }
  };

  const updateBookingStatus = async () => {
    if (!booking) return;
    const now = new Date();
    const checkIn = new Date(booking.check_in_date_time);
    const checkOut = new Date(booking.check_out_date_time);
    let newStatus = booking.status;
    if (now >= checkIn && now < checkOut && booking.status !== 'checked_in') newStatus = 'checked_in';
    else if (now >= checkOut && booking.status !== 'completed') newStatus = 'completed';
    if (newStatus !== booking.status) {
      try {
        const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", booking.id);
        if (error) throw error;
        if (newStatus === "completed" && booking.apartment_id) {
          await supabase
            .from("apartments")
            .update({ availability_status: "available" })
            .eq("id", booking.apartment_id);
        } else if (newStatus === "checked_in" && booking.apartment_id) {
          await supabase
            .from("apartments")
            .update({ availability_status: "unavailable" })
            .eq("id", booking.apartment_id);
        }
        setBooking({ ...booking, status: newStatus });
        toast.success(`Booking status updated to ${newStatus}`);
      } catch (error) { console.error("Error updating booking status:", error); }
    }
  };

  const getStatusInfo = () => {
    if (!booking) return null;
    const now = currentTime;
    const checkIn = new Date(booking.check_in_date_time);
    const checkOut = new Date(booking.check_out_date_time);
    if (now < checkIn) {
      return { label: "Confirmed", color: "bg-primary/10 text-primary border-primary/20", message: `Check-in ${format(checkIn, "MMM d, yyyy")}`, countdown: null };
    } else if (now >= checkIn && now < checkOut) {
      const daysLeft = differenceInDays(checkOut, now);
      const hoursLeft = differenceInHours(checkOut, now) % 24;
      return { label: "Checked In ✓", color: "bg-green-500/10 text-green-600 border-green-200", message: "You're currently staying here", countdown: `${daysLeft}d ${hoursLeft}h until checkout` };
    } else {
      return { label: "Completed", color: "bg-muted text-muted-foreground border-border", message: "Booking completed", countdown: null };
    }
  };

  const getTotalNights = () => {
    if (!booking) return 0;
    return differenceInDays(new Date(booking.check_out_date_time), new Date(booking.check_in_date_time));
  };

  const handleMarkAvailable = async () => {
    try {
      const { error } = await supabase.from("apartments").update({ availability_status: "available" }).eq("id", booking.apartment_id);
      if (error) throw error;
      toast.success("Apartment marked as available");
    } catch (error) { toast.error("Failed to update apartment status"); }
  };

  const handleReviewSuccess = () => { setShowReviewForm(false); fetchBookingDetails(); };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold">Booking not found</h2>
          <Button onClick={() => navigate("/bookings")}>Back to Bookings</Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const backTarget = isLister ? "/profile" : "/bookings";

  const sharedHero = (
    <div className="relative">
      <div className="h-56 bg-muted relative overflow-hidden">
        {booking.apartments?.media?.[0]?.url ? (
          <img src={booking.apartments.media[0].url} alt={booking.apartments.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <button
          onClick={() => navigate(backTarget)}
          aria-label="Go back"
          className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 w-11 h-11 rounded-full bg-background/90 backdrop-blur-md flex items-center justify-center shadow-md transition-transform active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Floating info card */}
      <div className="px-5 -mt-6 relative z-10">
        <div className="bg-background rounded-2xl shadow-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg leading-tight truncate">{booking.apartments?.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{booking.apartments?.address}, {booking.apartments?.city}</p>
            </div>
            {statusInfo && (
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            )}
          </div>

          {statusInfo && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm font-medium">{statusInfo.message}</p>
              {statusInfo.countdown && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{statusInfo.countdown}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const dateCard = (
    <section className="bg-background rounded-2xl border p-4 animate-in fade-in duration-500">
      <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Stay Details</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Calendar className="w-3.5 h-3.5" />
            Check-in
          </div>
          <p className="font-semibold text-sm">{format(new Date(booking.check_in_date_time), "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(booking.check_in_date_time), "h:mm a")}</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Calendar className="w-3.5 h-3.5" />
            Check-out
          </div>
          <p className="font-semibold text-sm">{format(new Date(booking.check_out_date_time), "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(booking.check_out_date_time), "h:mm a")}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-sm text-muted-foreground">{getTotalNights()} nights</span>
        <span className="text-lg font-bold text-primary">${booking.total_price}</span>
      </div>
    </section>
  );

  const reviewDialog = (revieweeId: string, reviewType: string, extra?: any) => (
    <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Star className="text-primary" /> Rate your experience</DialogTitle>
        </DialogHeader>
        <ReviewForm bookingId={booking.id} apartmentId={booking.apartments?.id} revieweeId={revieweeId} reviewType={reviewType as any} {...extra} onSuccess={handleReviewSuccess} />
      </DialogContent>
    </Dialog>
  );

  if (isLister) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {reviewDialog(booking.user_id, "lister_reviews_user", { userName: guestProfile?.full_name })}
        {sharedHero}

        <div className="px-5 mt-4 space-y-4 animate-in fade-in duration-700 delay-200">
          {/* Guest card */}
          <section className="bg-background rounded-2xl border p-4">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Guest</h3>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-muted">
                <AvatarImage src={guestProfile?.profile_picture} />
                <AvatarFallback>{guestProfile?.full_name?.charAt(0) || "G"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{guestProfile?.full_name}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span>{guestProfile?.rating?.toFixed(1) || "New"}</span>
                </div>
              </div>
              <Button size="sm" onClick={() => {
                if (!currentUser) { toast.error("Please login first"); return; }
                const ids = [currentUser.id, booking.user_id].sort();
                const convId = `${ids[0]}_${ids[1]}_${booking.apartment_id}`;
                navigate(`/chat/${convId}`, { state: { otherUserId: booking.user_id, otherUserName: guestProfile?.full_name || "Guest", apartmentId: booking.apartment_id } });
              }} className="rounded-xl gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </Button>
            </div>
          </section>

          {dateCard}

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full rounded-2xl gap-2" size="lg" onClick={() => {
              if (!currentUser) { toast.error("Please login first"); return; }
              const ids = [currentUser.id, booking.user_id].sort();
              const convId = `${ids[0]}_${ids[1]}_${booking.apartment_id}`;
              navigate(`/chat/${convId}`, { state: { otherUserId: booking.user_id, otherUserName: guestProfile?.full_name || "Guest", apartmentId: booking.apartment_id } });
            }}>
              <MessageCircle className="w-4 h-4" /> Message Guest
            </Button>
            <Button variant="outline" className="w-full rounded-2xl gap-2" size="lg" onClick={() => toast.info("Report issue coming soon")}>
              <AlertTriangle className="w-4 h-4" /> Report Issue
            </Button>
            {booking.status === 'completed' && (
              <Button variant="outline" className="w-full rounded-2xl gap-2" size="lg" onClick={handleMarkAvailable}>
                <Check className="w-4 h-4" /> Mark Available
              </Button>
            )}
          </div>

          {booking.status === 'completed' && (
            <section className="bg-background rounded-2xl border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Reviews</h2>
                {!existingReview && (
                  <Button onClick={() => setShowReviewForm(true)} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    <Star className="w-3.5 h-3.5" /> Leave Review
                  </Button>
                )}
              </div>
              <ReviewsSection apartmentId={booking.apartments?.id} />
            </section>
          )}
        </div>
      </div>
    );
  }

  // Guest view
  return (
    <div className="min-h-screen bg-background pb-24">
      {reviewDialog(booking.lister_id, "user_reviews_lister", { apartmentName: booking.apartments?.name })}
      {sharedHero}

      <div className="px-5 mt-4 space-y-4 animate-in fade-in duration-700 delay-200">
        {dateCard}

        {/* Actions */}
        <div className="space-y-2">
          <Button className="w-full rounded-2xl gap-2" size="lg" onClick={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { toast.error("Please login first"); return; }
            const ids = [user.id, booking.lister_id].sort();
            const convId = `${ids[0]}_${ids[1]}_${booking.apartment_id}`;
            const { data: listerProfile } = await supabase.from("profiles").select("full_name").eq("id", booking.lister_id).single();
            navigate(`/chat/${convId}`, { state: { otherUserId: booking.lister_id, otherUserName: listerProfile?.full_name || "Host", apartmentId: booking.apartment_id } });
          }}>
            <MessageCircle className="w-4 h-4" /> Message Host
          </Button>
          {booking?.apartments?.address && (
            <Button asChild variant="outline" className="w-full rounded-2xl gap-2" size="lg">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.apartments.address}, ${booking.apartments.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation className="w-4 h-4" /> Get Directions
              </a>
            </Button>
          )}
          <Button variant="outline" className="w-full rounded-2xl gap-2" size="lg" onClick={() => toast.info("Receipt view coming soon")}>
            <FileText className="w-4 h-4" /> View Receipt
          </Button>
        </div>

        {/* Description / access */}
        {booking.apartments?.description && (
          <section className="bg-background rounded-2xl border p-4">
            <h3 className="font-semibold text-sm mb-2">Access Instructions</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{booking.apartments.description}</p>
          </section>
        )}

        {/* Reviews */}
        {booking.status === 'completed' && (
          <section className="bg-background rounded-2xl border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Reviews</h2>
              {!existingReview && (
                <Button onClick={() => setShowReviewForm(true)} variant="outline" size="sm" className="rounded-xl gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Leave Review
                </Button>
              )}
            </div>
            <ReviewsSection apartmentId={booking.apartments?.id} />
          </section>
        )}
      </div>
    </div>
  );
};

export default BookingDetails;
