import { Home, Compass, Calendar, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let userId: string | null = null;

    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read_status", false);

      if (!error) setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => { fetchUnread(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: Calendar, label: "Bookings", path: "/bookings" },
    { icon: MessageCircle, label: "Inbox", path: "/inbox", badge: unreadCount },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 pb-safe pl-safe pr-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center gap-1 flex-1 min-h-[48px] min-w-[48px] rounded-xl active:scale-95 transition-all ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "fill-primary/20 stroke-[2.25]" : ""}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1 leading-none">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium leading-none whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
