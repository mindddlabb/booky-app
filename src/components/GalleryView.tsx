import { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, Grid3x3 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Media {
  type: "image" | "video";
  url: string;
  thumbnail?: string;
}

interface GalleryViewProps {
  media: Media[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
}

const GalleryView = ({ media, open, onOpenChange, initialIndex = 0 }: GalleryViewProps) => {
  const [viewMode, setViewMode] = useState<"grid" | "single">("single");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  };

  const handleMediaClick = (index: number) => {
    setCurrentIndex(index);
    setViewMode("single");
    setZoom(1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (viewMode !== "single") return;
    
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && currentIndex < media.length - 1) {
        // Swipe left - next image
        setCurrentIndex(currentIndex + 1);
        setZoom(1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous image
        setCurrentIndex(currentIndex - 1);
        setZoom(1);
      }
    }
  };

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-full p-0 bg-black/95 border-0">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(viewMode === "grid" ? "single" : "grid")}
              className="text-white hover:bg-white/20"
            >
              <Grid3x3 className="w-5 h-5" />
            </Button>
            {viewMode === "single" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Content */}
        <div 
          className="w-full h-full overflow-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 pt-20">
              {media.map((item, index) => (
                <div
                  key={index}
                  className="aspect-square cursor-pointer hover:opacity-80 transition-opacity relative"
                  onClick={() => handleMediaClick(index)}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      poster={item.thumbnail}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={`Media ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-3">
                        <div className="w-0 h-0 border-l-8 border-l-white border-y-6 border-y-transparent ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full p-4 pt-20">
              <div
                className="relative transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                {media[currentIndex]?.type === "video" ? (
                  <video
                    src={media[currentIndex].url}
                    poster={media[currentIndex].thumbnail}
                    className="max-w-full max-h-[80vh] object-contain"
                    controls
                    autoPlay
                    loop
                  />
                ) : (
                  <img
                    src={media[currentIndex]?.url}
                    alt={`Media ${currentIndex + 1}`}
                    className="max-w-full max-h-[80vh] object-contain"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation for Single View */}
        {viewMode === "single" && media.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
              {media.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                    index === currentIndex
                      ? "ring-2 ring-white scale-110"
                      : "opacity-50 hover:opacity-100"
                  }`}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      poster={item.thumbnail}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GalleryView;
