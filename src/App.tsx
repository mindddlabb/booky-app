import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeOneSignal, setOneSignalExternalUserId } from "@/lib/onesignal";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Bookings from "./pages/Bookings";
import BookingDetails from "./pages/BookingDetails";
import Reviews from "./pages/Reviews";
import ListingForm from "./pages/ListingForm";
import Inbox from "./pages/Inbox";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import ApartmentDetail from "./pages/ApartmentDetail";
import Favorites from "./pages/Favorites";
import BottomNav from "./components/BottomNav";
import OfflineBanner from "./components/OfflineBanner";
import AIConcierge from "./components/AIConcierge";
import { ScrollToTop } from "./components/ScrollToTop";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AppRoutes = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Initialize OneSignal
    initializeOneSignal();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        setOneSignalExternalUserId(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        setOneSignalExternalUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const showBottomNav =
    isAuthenticated &&
    !["/", "/login", "/register"].includes(location.pathname) &&
    !location.pathname.startsWith("/chat/") &&
    !location.pathname.startsWith("/listing/");

  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <Welcome />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/home" replace /> : <Register />} />
        
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
        <Route path="/booking/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
        <Route path="/reviews/:apartmentId" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="/chat/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="/apartment/:id" element={<ProtectedRoute><ApartmentDetail /></ProtectedRoute>} />
        <Route path="/listing/new" element={<ProtectedRoute><ListingForm /></ProtectedRoute>} />
        <Route path="/listing/edit/:id" element={<ProtectedRoute><ListingForm /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showBottomNav && <BottomNav />}
      {isAuthenticated && <AIConcierge />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

