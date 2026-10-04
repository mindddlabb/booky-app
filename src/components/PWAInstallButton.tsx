import React, { useState } from "react";
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";

interface PWAInstallButtonProps {
  variant?: "banner" | "setting" | "compact";
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = "compact" }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (variant === "setting") {
      return (
        <div className="flex items-center justify-between py-3 px-1">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Smartphone className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">App Installed</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active
          </span>
        </div>
      );
    }
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === "setting" ? (
        <button
          type="button"
          onClick={handleAction}
          className="w-full flex items-center justify-between py-3 px-1 min-h-[44px] text-left hover:bg-muted/50 rounded-lg transition-colors active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 text-muted-foreground">
            <Download className="w-5 h-5 text-primary" />
            <div>
              <span className="text-sm text-foreground block">Install Mobile App</span>
              <span className="text-[11px] text-muted-foreground block">
                Add Booky to your iOS or Android home screen
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary px-2.5 py-1 rounded-full bg-primary/10">
            Install
          </span>
        </button>
      ) : variant === "banner" ? (
        <div className="w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-3.5 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">Get the Booky Mobile App</p>
              <p className="text-[11px] text-white/75 truncate">
                {isIOS ? "Install on iPhone & iPad" : isAndroid ? "Install on Android" : "Fast fullscreen mobile experience"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAction}
            className="shrink-0 rounded-xl h-9 px-3.5 text-xs font-semibold bg-white text-slate-900 hover:bg-white/90"
          >
            Install
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAction}
          className="gap-2 rounded-xl min-h-[44px] px-3.5 text-xs font-medium"
        >
          <Download className="w-4 h-4 text-primary" />
          {isIOS ? "Install on iOS" : "Install App"}
        </Button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-safe animate-in fade-in duration-200"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full mx-auto -mt-2 mb-1 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="/icon.svg" alt="Booky" className="w-12 h-12 rounded-2xl shadow-md" />
                <div>
                  <h3 className="text-base font-bold text-card-foreground">
                    Install Booky App
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isIOS ? "For iPhone & iPad (Safari)" : "For Android & Mobile Browsers"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-card-foreground leading-relaxed">
                    1. Tap the <strong>Share</strong> button in your Safari bottom toolbar.
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-card-foreground leading-relaxed">
                    2. Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-card-foreground leading-relaxed">
                    1. Open your browser menu (<strong>⋮</strong> in Chrome on Android or Share in Safari on iOS).
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-card-foreground leading-relaxed">
                    2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong> for fullscreen access.
                  </p>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full h-11 rounded-2xl font-semibold"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;
