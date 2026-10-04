import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Booking } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, MapPin, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-primary/10 text-primary border-primary/20",
  checked_in: "bg-green-500/10 text-green-600 border-green-200",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-secondary/10 text-secondary border-secondary/20",
};

const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login to view bookings"); return; }

      const { data, error } = await supabase
        .from("bookings")
        .select(`*, apartments (name, address, city, media)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedBookings: (Booking & { apartments?: any })[] = (data || []).map((booking) => ({
        id: booking.id, userId: booking.user_id, apartmentId: booking.apartment_id,
        listerId: booking.lister_id, checkInDateTime: booking.check_in_date_time,
        checkOutDateTime: booking.check_out_date_time, totalPrice: Number(booking.total_price),
        status: booking.status, paymentStatus: booking.payment_status,
        createdAt: booking.created_at, updatedAt: booking.updated_at,
        apartments: booking.apartments,
      }));

      setBookings(transformedBookings);
    } catch (error: any) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const upcomingBookings = bookings.filter(b => new Date(b.checkInDateTime) > new Date() && b.status !== 'completed');
  const ongoingBookings = bookings.filter(b => b.status === 'checked_in');
  const pastBookings = bookings.filter(b => b.status === 'completed');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderBookingCard = (booking: any) => (
    <div
      key={booking.id}
      onClick={() => navigate(`/booking/${booking.id}`)}
      className="flex gap-3 p-4 rounded-2xl bg-card border cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98] animate-in fade-in duration-300"
    >
      {/* Thumbnail */}
      <div className="w-[72px] h-[72px] rounded-xl bg-muted shrink-0 overflow-hidden">
        {booking.apartments?.media?.[0]?.url ? (
          <img src={booking.apartments.media[0].url} alt={booking.apartments.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-tight truncate">{booking.apartments?.name}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[booking.status] || STATUS_COLORS.pending}`}>
            {booking.status === "checked_in" ? "Checked In" : booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{booking.apartments?.city}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {format(new Date(booking.checkInDateTime), "MMM d")} – {format(new Date(booking.checkOutDateTime), "MMM d, yyyy")}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-primary">${booking.totalPrice}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmpty = (msg: string, sub: string) => (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-base mb-1">{msg}</h3>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b px-5 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top,0px))] flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Bookings</h1>
        <button
          onClick={() => fetchBookings(true)}
          disabled={refreshing}
          aria-label="Refresh bookings"
          className="w-11 h-11 rounded-full bg-muted flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="px-5 pt-4">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted/60 rounded-2xl p-1 h-auto">
            <TabsTrigger value="upcoming" className="rounded-xl text-xs min-h-[40px] py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Upcoming <span className="ml-1 text-[10px] opacity-60">({upcomingBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="rounded-xl text-xs min-h-[40px] py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Ongoing <span className="ml-1 text-[10px] opacity-60">({ongoingBookings.length})</span>
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-xl text-xs min-h-[40px] py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Past <span className="ml-1 text-[10px] opacity-60">({pastBookings.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcomingBookings.length === 0 ? renderEmpty("No upcoming bookings", "Start exploring apartments to plan your next stay") : upcomingBookings.map(renderBookingCard)}
          </TabsContent>

          <TabsContent value="ongoing" className="mt-4 space-y-3">
            {ongoingBookings.length === 0 ? renderEmpty("No ongoing bookings", "Your active stays will appear here") : ongoingBookings.map(renderBookingCard)}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {pastBookings.length === 0 ? renderEmpty("No past bookings", "Your completed stays will appear here") : pastBookings.map(renderBookingCard)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Bookings;
