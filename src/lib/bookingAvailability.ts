import { supabase } from "@/integrations/supabase/client";
import { Apartment } from "@/types";

interface StoredBookingRecord {
  bookingId?: string;
  apartmentId: string;
  checkInDateTime: string;
  checkOutDateTime: string;
}

const LOCAL_BOOKINGS_KEY = "booky_active_bookings";

function getLocalBookings(): StoredBookingRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalBookings(records: StoredBookingRecord[]) {
  try {
    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

/**
 * Marks an apartment as unavailable immediately upon booking, both in Supabase
 * and in local storage so the Home page reflects "unavailable" even if RLS
 * restricts non-lister updates to the apartments table.
 */
export async function markApartmentBooked(params: {
  bookingId?: string;
  apartmentId: string;
  checkInDateTime: string;
  checkOutDateTime: string;
}): Promise<void> {
  const existing = getLocalBookings().filter((b) => b.apartmentId !== params.apartmentId);
  existing.push(params);
  setLocalBookings(existing);

  try {
    await supabase
      .from("apartments")
      .update({ availability_status: "unavailable" })
      .eq("id", params.apartmentId);
  } catch (err) {
    console.warn("Could not update apartment status in DB:", err);
  }
}

/**
 * Checks all active bookings for the given apartments:
 * - Any booking whose check_out_date_time <= now is marked "completed", and its
 *   apartment is restored to "available" (if no other active booking exists).
 * - Any apartment with an active, non-expired booking is marked "unavailable".
 */
export async function syncApartmentsAvailability(apartments: Apartment[]): Promise<Apartment[]> {
  if (apartments.length === 0) return apartments;

  const now = new Date();
  const activeApartmentIds = new Set<string>();
  const expiredApartmentIds = new Set<string>();

  // 1. Check local booking records for expiration vs active status
  const localRecords = getLocalBookings();
  const remainingLocal: StoredBookingRecord[] = [];

  for (const rec of localRecords) {
    const checkOut = new Date(rec.checkOutDateTime);
    if (checkOut <= now) {
      expiredApartmentIds.add(rec.apartmentId);
    } else {
      activeApartmentIds.add(rec.apartmentId);
      remainingLocal.push(rec);
    }
  }
  if (remainingLocal.length !== localRecords.length) {
    setLocalBookings(remainingLocal);
  }

  // 2. Check Supabase bookings table
  try {
    const apartmentIds = apartments.map((a) => a.id);
    const { data: bookingsData, error } = await supabase
      .from("bookings")
      .select("id, apartment_id, check_in_date_time, check_out_date_time, status")
      .in("apartment_id", apartmentIds)
      .in("status", ["pending", "confirmed", "checked_in"]);

    if (!error && Array.isArray(bookingsData)) {
      const expiredBookingIds: string[] = [];

      for (const b of bookingsData) {
        const checkOut = new Date(b.check_out_date_time);
        if (checkOut <= now) {
          expiredBookingIds.push(b.id);
          expiredApartmentIds.add(b.apartment_id);
        } else {
          activeApartmentIds.add(b.apartment_id);
        }
      }

      // Mark expired bookings as completed in Supabase
      if (expiredBookingIds.length > 0) {
        await supabase
          .from("bookings")
          .update({ status: "completed" })
          .in("id", expiredBookingIds);
      }
    }
  } catch (err) {
    console.warn("Error syncing bookings for availability:", err);
  }

  // 3. Reconcile apartments whose bookings expired and have no active bookings left
  const toRestoreAvailable: string[] = [];
  const toMarkUnavailable: string[] = [];

  const updatedApartments = apartments.map((apt) => {
    if (activeApartmentIds.has(apt.id)) {
      if (apt.availabilityStatus !== "unavailable") {
        toMarkUnavailable.push(apt.id);
      }
      return {
        ...apt,
        availabilityStatus: "unavailable" as const,
      };
    }

    // If booking expired (or apartment was marked booked/unavailable due to a booking that has now expired)
    if (expiredApartmentIds.has(apt.id) || apt.availabilityStatus === "booked") {
      if (apt.availabilityStatus !== "available") {
        toRestoreAvailable.push(apt.id);
      }
      return {
        ...apt,
        availabilityStatus: "available" as const,
      };
    }

    return apt;
  });

  // Persist reconciled statuses back to Supabase apartments table where permitted
  try {
    if (toRestoreAvailable.length > 0) {
      await supabase
        .from("apartments")
        .update({ availability_status: "available" })
        .in("id", toRestoreAvailable);
    }
    if (toMarkUnavailable.length > 0) {
      await supabase
        .from("apartments")
        .update({ availability_status: "unavailable" })
        .in("id", toMarkUnavailable);
    }
  } catch {
    // ignore RLS errors if guest user
  }

  return updatedApartments;
}
