import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Apartment } from "@/types";
import { useNavigate } from "react-router-dom";
import { Star, Bed, Bath } from "lucide-react";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createPriceIcon = (price: number, isActive: boolean) => {
  return L.divIcon({
    className: "custom-price-marker",
    html: `<div class="price-bubble ${isActive ? "active" : ""}">$${price}</div>`,
    iconSize: [60, 32],
    iconAnchor: [30, 32],
  });
};

interface FitBoundsProps {
  apartments: Apartment[];
}

const FitBounds = ({ apartments }: FitBoundsProps) => {
  const map = useMap();

  useEffect(() => {
    const points = apartments
      .filter((a) => a.location.lat && a.location.lng)
      .map((a) => [a.location.lat!, a.location.lng!] as L.LatLngTuple);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [apartments, map]);

  return null;
};

interface ApartmentMapProps {
  apartments: Apartment[];
  activeApartmentId?: string;
  onMarkerClick?: (apartment: Apartment) => void;
}

const ApartmentMap = ({ apartments, activeApartmentId, onMarkerClick }: ApartmentMapProps) => {
  const navigate = useNavigate();

  const mappableApartments = apartments.filter(
    (a) => a.location.lat && a.location.lng
  );

  // Default center: Lagos, Nigeria (or first apartment)
  const defaultCenter: L.LatLngTuple = mappableApartments.length > 0
    ? [mappableApartments[0].location.lat!, mappableApartments[0].location.lng!]
    : [6.5244, 3.3792];

  if (mappableApartments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 rounded-2xl">
        <div className="text-center p-6">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🗺️</span>
          </div>
          <p className="text-sm font-medium">No map data available</p>
          <p className="text-xs text-muted-foreground mt-1">
            Apartments need coordinates to appear on the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden relative">
      <style>{`
        .custom-price-marker {
          background: none;
          border: none;
        }
        .price-bubble {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          font-weight: 700;
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          white-space: nowrap;
          text-align: center;
          border: 2px solid hsl(var(--border));
          transition: all 0.2s;
          cursor: pointer;
        }
        .price-bubble:hover,
        .price-bubble.active {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border-color: hsl(var(--primary));
          transform: scale(1.15);
          z-index: 1000 !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          padding: 0 !important;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.2) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          min-width: 220px;
        }
        .leaflet-popup-tip {
          box-shadow: 0 4px 10px rgba(0,0,0,0.15) !important;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="h-full w-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds apartments={mappableApartments} />

        {mappableApartments.map((apt) => (
          <Marker
            key={apt.id}
            position={[apt.location.lat!, apt.location.lng!]}
            icon={createPriceIcon(apt.pricePerNight, apt.id === activeApartmentId)}
            eventHandlers={{
              click: () => onMarkerClick?.(apt),
            }}
          >
            <Popup>
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/apartment/${apt.id}`)}
              >
                {apt.media?.[0]?.url && (
                  <img
                    src={apt.media[0].url}
                    alt={apt.name}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1">
                    {apt.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {apt.location.address}, {apt.location.city}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-0.5">
                      <Bed className="w-3 h-3" /> {apt.bedrooms}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Bath className="w-3 h-3" /> {apt.bathrooms}
                    </span>
                    {apt.averageRating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {apt.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm" style={{ color: "hsl(var(--primary))" }}>
                    ${apt.pricePerNight}
                    <span className="font-normal text-xs text-gray-400">/night</span>
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ApartmentMap;
