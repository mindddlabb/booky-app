import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import onboarding1 from "@/assets/onboarding-1.jpg";
import onboarding2 from "@/assets/onboarding-2.jpg";
import onboarding3 from "@/assets/onboarding-3.jpg";
import PWAInstallButton from "@/components/PWAInstallButton";

const slides = [
  {
    image: onboarding1,
    title: "Find Your Perfect Stay",
    description:
      "Browse stunning apartments and short-term rentals, all in one place — curated just for you.",
  },
  {
    image: onboarding2,
    title: "Book With Confidence",
    description:
      "Verified listings, real reviews, and seamless booking so you can move in stress-free.",
  },
  {
    image: onboarding3,
    title: "Explore Any City",
    description:
      "From local gems to global destinations — discover apartments wherever life takes you.",
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      navigate("/register");
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45 && current < slides.length - 1) {
      setCurrent(current + 1);
    } else if (distance < -45 && current > 0) {
      setCurrent(current - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#303030] via-[#1c4e68] to-[#229ED9] flex flex-col items-center justify-between p-5 pt-safe pb-safe relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#229ED9]/25 blur-[120px] pointer-events-none" />

      {/* Top Install Prompt Banner for iOS & Android */}
      <div className="w-full flex justify-center z-10 pt-2">
        <PWAInstallButton variant="banner" />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm z-10 my-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-card rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500">
          {/* Image area */}
          <div className="relative h-[280px] sm:h-[340px] overflow-hidden">
            {slides.map((slide, i) => (
              <img
                key={i}
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 select-none"
                style={{ opacity: i === current ? 1 : 0 }}
                draggable={false}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          </div>

          {/* Text content */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 text-center space-y-3">
            <h2 className="text-2xl font-bold text-card-foreground leading-tight">
              {slides[current].title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {slides[current].description}
            </p>

            {/* Dots with 44px touch target wrapper */}
            <div className="flex justify-center items-center gap-1 pt-1">
              {slides.map((slide, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}: ${slide.title}`}
                  onClick={() => setCurrent(i)}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <span
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === current
                        ? "w-6 bg-primary"
                        : "w-2 bg-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Next button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                aria-label="Next slide"
                onClick={next}
                className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 hover:opacity-90 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Skip / Login */}
      <div className="z-10 mt-4 pb-2 flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          className="text-white/85 hover:text-white hover:bg-white/10 min-h-[44px] px-6 rounded-xl"
          onClick={() => navigate("/register")}
        >
          Skip &amp; Get Started
        </Button>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="text-sm text-white/60 hover:text-white/90 transition-colors min-h-[44px] px-4 flex items-center"
        >
          Already have an account?&nbsp;<span className="underline font-medium">Login</span>
        </button>
      </div>
    </div>
  );
};

export default Welcome;
