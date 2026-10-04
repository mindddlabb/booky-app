import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground text-center pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] px-4 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You're offline. Some features may be unavailable.</span>
    </div>
  );
};

export default OfflineBanner;
