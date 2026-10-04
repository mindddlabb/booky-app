import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Booking, Apartment } from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  LogOut,
  Star,
  Edit,
  Bell,
  Globe,
  HelpCircle,
  Shield,
  FileText,
  Calendar,
  MapPin,
  Plus,
  ChevronRight,
  Building2,
  Home,
  Award,
  Bookmark,
  Moon,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { format, differenceInDays, differenceInHours } from "date-fns";
import ListingCard from "@/components/ListingCard";
import PWAInstallButton from "@/components/PWAInstallButton";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<
    (Booking & { apartments: Apartment }) | null
  >(null);
  const [bookingHistory, setBookingHistory] = useState<
    (Booking & { apartments: Apartment })[]
  >([]);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [listings, setListings] = useState<Apartment[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        const transformedProfile: User = {
          id: data.id,
          email: data.email,
          phone: data.phone || undefined,
          fullName: data.full_name,
          profilePicture: data.profile_picture || undefined,
          userType: data.user_type,
          rating: Number(data.rating),
          verificationStatus: data.verification_status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        setProfile(transformedProfile);
      } catch (error: any) {
        toast.error("Failed to load profile");
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchCurrentBooking = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("bookings")
          .select("*, apartments(*)")
          .eq("user_id", user.id)
          .eq("status", "checked_in")
          .gte("check_out_date_time", now)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        setCurrentBooking(data as any);
      } catch (error: any) {
        console.error("Error fetching current booking:", error);
      }
    };

    const fetchBookingHistory = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
          .from("bookings")
          .select("*, apartments(*)")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("check_out_date_time", { ascending: false })
          .limit(6);

        if (error) throw error;

        setBookingHistory((data as any) || []);
      } catch (error: any) {
        console.error("Error fetching booking history:", error);
      }
    };

    const fetchTotalBookings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { count, error } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (error) throw error;

        setTotalBookings(count || 0);
      } catch (error: any) {
        console.error(error);
      }
    };

    const fetchListings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("apartments")
          .select("*")
          .eq("lister_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const transformedListings: Apartment[] = (data || []).map((apt) => ({
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
        }));
        setListings(transformedListings);
      } catch (error: any) {
        console.error("Error fetching listings:", error);
      }
    };

    if (profile) {
      if (profile.userType === "lister") {
        fetchListings();
      } else {
        fetchCurrentBooking();
        fetchBookingHistory();
        fetchTotalBookings();
      }
    }
  }, [profile, navigate]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      const transformedProfile: User = {
        id: data.id, email: data.email, phone: data.phone || undefined,
        fullName: data.full_name, profilePicture: data.profile_picture || undefined,
        userType: data.user_type, rating: Number(data.rating),
        verificationStatus: data.verification_status,
        createdAt: data.created_at, updatedAt: data.updated_at,
      };
      setProfile(transformedProfile);
    } catch (error: any) {
      toast.error("Failed to load profile");
      console.error("Error fetching profile:", error);
    } finally { setLoading(false); }
  };

  const fetchCurrentBooking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("bookings").select("*, apartments(*)").eq("user_id", user.id).eq("status", "checked_in").gte("check_out_date_time", now).single();
      if (error && error.code !== "PGRST116") throw error;
      setCurrentBooking(data as any);
    } catch (error: any) { console.error("Error fetching current booking:", error); }
  };

  const fetchBookingHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("bookings").select("*, apartments(*)").eq("user_id", user.id).eq("status", "completed").order("check_out_date_time", { ascending: false }).limit(6);
      if (error) throw error;
      setBookingHistory((data as any) || []);
    } catch (error: any) { console.error("Error fetching booking history:", error); }
  };

  const fetchTotalBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count, error } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      if (error) throw error;
      setTotalBookings(count || 0);
    } catch (error: any) { console.error(error); }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error: any) { toast.error("Failed to logout"); }
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const fetchListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("apartments").select("*").eq("lister_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      const transformedListings: Apartment[] = (data || []).map((apt) => ({
        id: apt.id, listerId: apt.lister_id, name: apt.name, description: apt.description,
        location: { address: apt.address, city: apt.city, neighborhood: apt.neighborhood, lat: apt.latitude, lng: apt.longitude },
        pricePerNight: Number(apt.price_per_night), bedrooms: apt.bedrooms, bathrooms: apt.bathrooms,
        amenities: apt.amenities || [],
        media: Array.isArray(apt.media) ? apt.media.map((m: any) => ({ type: m.type || "image", url: m.url || m, thumbnail: m.thumbnail })) : [],
        availabilityStatus: apt.availability_status, averageRating: Number(apt.average_rating),
        totalReviews: apt.total_reviews, favoritesCount: apt.favorites_count || 0,
        createdAt: apt.created_at, updatedAt: apt.updated_at,
      }));
      setListings(transformedListings);
    } catch (error: any) { console.error("Error fetching listings:", error); }
  };

  const handleListingClick = async (listing: Apartment) => {
    if (listing.availabilityStatus === "booked") {
      try {
        const { data: bookingData, error } = await supabase.from("bookings").select("id").eq("apartment_id", listing.id).in("status", ["pending", "confirmed", "checked_in"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        if (bookingData) { navigate(`/booking/${bookingData.id}`); } else { navigate(`/apartment/${listing.id}`); }
      } catch (error) { console.error("Error fetching booking:", error); navigate(`/apartment/${listing.id}`); }
    } else { navigate(`/apartment/${listing.id}`); }
  };

  const handleStatusChange = async (listingId: string, status: "available" | "unavailable") => {
    try {
      const { error } = await supabase.from("apartments").update({ availability_status: status }).eq("id", listingId);
      if (error) throw error;
      toast.success("Status updated successfully");
      fetchListings();
    } catch (error: any) { toast.error("Failed to update status"); console.error(error); }
  };

  const getCheckoutCountdown = (checkOutDateTime: string) => {
    const now = new Date();
    const checkOut = new Date(checkOutDateTime);
    const days = differenceInDays(checkOut, now);
    const hours = differenceInHours(checkOut, now) % 24;
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = format(new Date(profile.createdAt), "MMM yyyy");

  return (
    <div className="min-h-screen bg-background pb-24 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b px-6 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top,0px))] flex items-center justify-between">
        <h1 className="text-xl font-semibold">Profile</h1>
        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" onClick={() => setEditDialogOpen(true)}>
          <Edit className="w-5 h-5" />
        </Button>
      </div>

      {/* Avatar + Name Section */}
      <div className="flex flex-col items-center pt-6 pb-4 px-6">
        <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
          <AvatarImage src={profile.profilePicture} />
          <AvatarFallback className="text-3xl font-semibold bg-muted">
            {profile.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-2xl font-bold mt-3">{profile.fullName}</h2>
        <div className="flex items-center gap-2 mt-1">
          {profile.rating > 0 && (
            <span className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{profile.rating.toFixed(1)}</span>
            </span>
          )}
          <span className="text-sm text-muted-foreground">•</span>
          <Badge variant={profile.userType === "lister" ? "default" : "secondary"} className="text-xs">
            {profile.userType === "lister" ? "Lister" : "Guest"}
          </Badge>
          {profile.verificationStatus && (
            <>
              <span className="text-sm text-muted-foreground">•</span>
              <Badge variant="outline" className="text-xs text-primary border-primary">Verified</Badge>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-6 pb-4">
        <div className="bg-muted/50 rounded-2xl p-4 flex items-center justify-around">
          {profile.userType === "lister" ? (
            <>
              <StatItem icon={<Building2 className="w-4 h-4 text-primary" />} value={listings.length.toString()} label="Listings" />
              <div className="h-8 w-px bg-border" />
              <StatItem icon={<Star className="w-4 h-4 text-primary" />} value={profile.rating > 0 ? profile.rating.toFixed(1) : "—"} label="Rating" />
              <div className="h-8 w-px bg-border" />
              <StatItem icon={<Calendar className="w-4 h-4 text-primary" />} value={memberSince} label="Member since" />
            </>
          ) : (
            <>
              <StatItem icon={<Home className="w-4 h-4 text-primary" />} value={totalBookings.toString()} label="Total bookings" />
              <div className="h-8 w-px bg-border" />
              <StatItem icon={<Star className="w-4 h-4 text-primary" />} value={profile.rating > 0 ? profile.rating.toFixed(1) : "—"} label="Rating" />
              <div className="h-8 w-px bg-border" />
              <StatItem icon={<Award className="w-4 h-4 text-primary" />} value={memberSince} label="Member since" />
            </>
          )}
        </div>
      </div>

      <div className="px-6 space-y-4">
        {/* Lister: My Listings */}
        {profile.userType === "lister" && (
          <Section title="My Listings" action={<Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate("/listing/new")}><Plus className="w-3.5 h-3.5" />Add</Button>}>
            {listings.length > 0 ? (
              <div className="space-y-3">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    onClick={() => handleListingClick(listing)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                  >
                    <img
                      src={listing.media?.[0]?.url || "/placeholder.svg"}
                      alt={listing.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{listing.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{listing.location.city}{listing.location.neighborhood ? `, ${listing.location.neighborhood}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={listing.availabilityStatus === "available" ? "default" : "secondary"}
                        className="text-[10px] px-2"
                      >
                        {listing.availabilityStatus === "available" ? "Active" : listing.availabilityStatus === "booked" ? "Booked" : "Inactive"}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No listings yet</p>
              </div>
            )}
          </Section>
        )}

        {/* User: Current Stay */}
        {profile.userType === "user" && currentBooking && (
          <Section title="Your Stay">
            <div
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
              onClick={() => navigate(`/booking/${currentBooking.id}`)}
            >
              <img
                src={currentBooking.apartments.media?.[0]?.url || "/placeholder.svg"}
                alt={currentBooking.apartments.name}
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{currentBooking.apartments.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{currentBooking.apartments.location.city}</span>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[10px]">Active</Badge>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {getCheckoutCountdown(currentBooking.checkOutDateTime)} left
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* User: Booking History */}
        {profile.userType === "user" && bookingHistory.length > 0 && (
          <Section title="Recent Bookings" action={<button onClick={() => navigate("/bookings")} className="text-xs text-primary font-medium flex items-center gap-0.5">See all <ChevronRight className="w-3.5 h-3.5" /></button>}>
            <div className="space-y-3">
              {bookingHistory.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                  onClick={() => navigate(`/apartment/${booking.apartmentId}`)}
                >
                  <img
                    src={booking.apartments.media?.[0]?.url || "/placeholder.svg"}
                    alt={booking.apartments.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{booking.apartments.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(booking.checkInDateTime), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">${booking.totalPrice.toFixed(0)}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Settings */}
        <Section title="Settings">
          <div className="space-y-1">
            <PWAInstallButton variant="setting" />
            <SettingRow icon={<Bookmark className="w-5 h-5" />} label="Saved Places" onClick={() => navigate("/favorites")} />
            <SettingRow icon={darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />} label="Dark Mode" right={<Switch checked={darkMode} onCheckedChange={handleDarkModeToggle} />} />
            <SettingRow icon={<Bell className="w-5 h-5" />} label="Notifications" right={<Switch checked={notifications} onCheckedChange={setNotifications} />} />
            <SettingRow icon={<Globe className="w-5 h-5" />} label="Language" right={<span className="text-xs text-muted-foreground">English</span>} />
            <SettingRow icon={<HelpCircle className="w-5 h-5" />} label="Help & Support" onClick={() => toast.info("Help & Support coming soon")} />
            <SettingRow icon={<Shield className="w-5 h-5" />} label="Privacy Policy" onClick={() => toast.info("Privacy Policy coming soon")} />
            <SettingRow icon={<FileText className="w-5 h-5" />} label="Terms of Service" onClick={() => toast.info("Terms of Service coming soon")} />
          </div>
        </Section>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full min-h-[48px] text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 rounded-xl"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>

      {profile && (
        <ProfileEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          onProfileUpdate={fetchProfile}
        />
      )}
    </div>
  );
};

/* Sub-components */

const StatItem = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="flex flex-col items-center gap-1">
    {icon}
    <span className="font-bold text-sm">{value}</span>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

const Section = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const SettingRow = ({ icon, label, right, onClick }: { icon: React.ReactNode; label: string; right?: React.ReactNode; onClick?: () => void }) => (
  <div
    className={`flex items-center justify-between min-h-[48px] py-3 px-1 ${onClick ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70 rounded-lg transition-colors" : ""}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-3 text-muted-foreground">
      {icon}
      <span className="text-sm text-foreground">{label}</span>
    </div>
    {right || (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />)}
  </div>
);

export default Profile;
