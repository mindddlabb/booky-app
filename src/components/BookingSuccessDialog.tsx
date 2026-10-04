import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, MapPin, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BookingSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  apartmentName: string;
  apartmentAddress: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalPrice: number;
}

export const BookingSuccessDialog = ({
  open,
  onOpenChange,
  bookingId,
  apartmentName,
  apartmentAddress,
  checkInDate,
  checkOutDate,
  totalPrice,
}: BookingSuccessDialogProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="animate-scale-in">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
            <DialogTitle className="text-center text-2xl">
              Booking Confirmed!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your reservation has been successfully confirmed
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Booking ID */}
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Booking ID</p>
            <p className="font-mono text-sm font-semibold">{bookingId.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Booking Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">{apartmentName}</p>
                <p className="text-sm text-muted-foreground">{apartmentAddress}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm">
                  <span className="font-medium">Check-in:</span>{" "}
                  {format(checkInDate, "MMM dd, yyyy")}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Check-out:</span>{" "}
                  {format(checkOutDate, "MMM dd, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm">
                  <span className="font-medium">Total Paid:</span> ${totalPrice.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">Payment Confirmed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/bookings");
            }}
            className="w-full"
          >
            View Booking
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate("/home");
            }}
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
