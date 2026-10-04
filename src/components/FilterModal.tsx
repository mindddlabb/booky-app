import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setCity,
  setPriceRange,
  setBedrooms,
  setBathrooms,
  setAmenities,
  setDateRange,
  clearFilters,
} from "@/store/filterSlice";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
}

const CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia"];

const AMENITIES = [
  "WiFi",
  "Kitchen",
  "Parking",
  "Air Conditioning",
  "Heating",
  "Washer",
  "Dryer",
  "Pool",
  "Gym",
  "Pet Friendly",
];

export default function FilterModal({ open, onOpenChange, onApply }: FilterModalProps) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.filters);
  
  const [localCity, setLocalCity] = useState<string | null>(filters.city);
  const [localPriceRange, setLocalPriceRange] = useState([filters.priceMin, filters.priceMax]);
  const [localBedrooms, setLocalBedrooms] = useState<number | null>(filters.bedrooms);
  const [localBathrooms, setLocalBathrooms] = useState<number | null>(filters.bathrooms);
  const [localAmenities, setLocalAmenities] = useState<string[]>(filters.amenities);
  const [localCheckIn, setLocalCheckIn] = useState<Date | undefined>(
    filters.checkInDate || undefined
  );
  const [localCheckOut, setLocalCheckOut] = useState<Date | undefined>(
    filters.checkOutDate || undefined
  );

  const handleApply = () => {
    dispatch(setCity(localCity));
    dispatch(setPriceRange({ min: localPriceRange[0], max: localPriceRange[1] }));
    dispatch(setBedrooms(localBedrooms));
    dispatch(setBathrooms(localBathrooms));
    dispatch(setAmenities(localAmenities));
    dispatch(
      setDateRange({
        checkIn: localCheckIn || null,
        checkOut: localCheckOut || null,
      })
    );
    onApply();
    onOpenChange(false);
  };

  const handleClearAll = () => {
    dispatch(clearFilters());
    setLocalCity(null);
    setLocalPriceRange([0, 10000]);
    setLocalBedrooms(null);
    setLocalBathrooms(null);
    setLocalAmenities([]);
    setLocalCheckIn(undefined);
    setLocalCheckOut(undefined);
  };

  const toggleAmenity = (amenity: string) => {
    setLocalAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Filter Apartments</DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4 space-y-6">
          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={localCity || ""} onValueChange={(value) => setLocalCity(value || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Cities</SelectItem>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label>
              Price Range: ${localPriceRange[0]} - ${localPriceRange[1]} per night
            </Label>
            <Slider
              min={0}
              max={10000}
              step={50}
              value={localPriceRange}
              onValueChange={setLocalPriceRange}
              className="mt-2"
            />
          </div>

          {/* Bedrooms */}
          <div className="space-y-2">
            <Label>Bedrooms</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <Button
                  key={num}
                  variant={localBedrooms === num ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocalBedrooms(num === localBedrooms ? null : num)}
                >
                  {num}{num === 4 ? "+" : ""}
                </Button>
              ))}
            </div>
          </div>

          {/* Bathrooms */}
          <div className="space-y-2">
            <Label>Bathrooms</Label>
            <div className="flex gap-2">
              {[1, 2, 3].map((num) => (
                <Button
                  key={num}
                  variant={localBathrooms === num ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocalBathrooms(num === localBathrooms ? null : num)}
                >
                  {num}{num === 3 ? "+" : ""}
                </Button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-3">
              {AMENITIES.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={amenity}
                    checked={localAmenities.includes(amenity)}
                    onCheckedChange={() => toggleAmenity(amenity)}
                  />
                  <label
                    htmlFor={amenity}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {amenity}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Check-in / Check-out Dates</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localCheckIn ? format(localCheckIn, "MMM dd") : "Check-in"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localCheckIn}
                    onSelect={setLocalCheckIn}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localCheckOut ? format(localCheckOut, "MMM dd") : "Check-out"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localCheckOut}
                    onSelect={setLocalCheckOut}
                    disabled={(date) => date < (localCheckIn || new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DrawerFooter className="flex-row gap-2">
          <Button variant="outline" onClick={handleClearAll} className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
