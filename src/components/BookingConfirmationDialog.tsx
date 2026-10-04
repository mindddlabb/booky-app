import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Bed, Bath } from "lucide-react";

interface BookingConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  apartmentName: string;
  apartmentAddress: string;
  bedrooms: number;
  bathrooms: number;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  basePrice: number;
  serviceFee: number;
  cleaningFee: number;
  totalPrice: number;
  isLoading?: boolean;
}

export const BookingConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  apartmentName,
  apartmentAddress,
  bedrooms,
  bathrooms,
  checkInDate,
  checkOutDate,
  numberOfNights,
  basePrice,
  serviceFee,
  cleaningFee,
  totalPrice,
  isLoading,
}: BookingConfirmationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Your Booking</DialogTitle>
          <DialogDescription>
            Please review your booking details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Apartment Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{apartmentName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{apartmentAddress}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span>{bedrooms} beds</span>
              </div>
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                <span>{bathrooms} baths</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">Check-in:</span>
              <span>{format(checkInDate, "MMM dd, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">Check-out:</span>
              <span>{format(checkOutDate, "MMM dd, yyyy")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {numberOfNights} {numberOfNights === 1 ? "night" : "nights"}
            </p>
          </div>

          <Separator />

          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                ${basePrice / numberOfNights} x {numberOfNights} nights
              </span>
              <span>${basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service fee (10%)</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cleaning fee</span>
              <span>${cleaningFee.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Processing..." : "Confirm Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
