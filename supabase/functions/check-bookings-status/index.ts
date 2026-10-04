import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    // Check for check-ins
    const { data: checkInBookings, error: checkInError } = await supabase
      .from("bookings")
      .select(`
        *,
        apartments:apartment_id (name),
        profiles:user_id (full_name)
      `)
      .eq("status", "confirmed")
      .lte("check_in_date_time", now);

    if (checkInError) throw checkInError;

    // Update to checked_in and send notifications
    for (const booking of checkInBookings || []) {
      await supabase
        .from("bookings")
        .update({ status: "checked_in" })
        .eq("id", booking.id);

      // Notify both user and lister
      await supabase.functions.invoke("send-notification", {
        body: {
          userIds: [booking.user_id, booking.lister_id],
          title: "Check-in Complete ✅",
          message: `Check-in for ${booking.apartments.name} is now active`,
          data: {
            type: "checked_in",
            bookingId: booking.id,
            screen: "BookingDetails",
          },
        },
      });

      console.log(`Checked in booking ${booking.id}`);
    }

    // Check for check-outs
    const { data: checkOutBookings, error: checkOutError } = await supabase
      .from("bookings")
      .select(`
        *,
        apartments:apartment_id (name)
      `)
      .eq("status", "checked_in")
      .lte("check_out_date_time", now);

    if (checkOutError) throw checkOutError;

    // Update to completed and send review request
    for (const booking of checkOutBookings || []) {
      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);

      // Send review request to both
      await supabase.functions.invoke("send-notification", {
        body: {
          userIds: [booking.user_id, booking.lister_id],
          title: "Rate your experience ⭐",
          message: "How was your stay? Leave a review!",
          data: {
            type: "review_request",
            bookingId: booking.id,
            screen: "BookingDetails",
          },
        },
      });

      console.log(`Completed booking ${booking.id}`);
    }

    // Send check-in reminders (1 day before)
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    const { data: upcomingCheckIns } = await supabase
      .from("bookings")
      .select(`
        *,
        apartments:apartment_id (name)
      `)
      .eq("status", "confirmed")
      .gte("check_in_date_time", now)
      .lte("check_in_date_time", oneDayFromNow.toISOString());

    for (const booking of upcomingCheckIns || []) {
      await supabase.functions.invoke("send-notification", {
        body: {
          userIds: [booking.user_id],
          title: "Check-in Tomorrow! 🏠",
          message: `Your stay at ${booking.apartments.name} starts tomorrow`,
          data: {
            type: "checkin_reminder",
            bookingId: booking.id,
            screen: "BookingDetails",
          },
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkedIn: checkInBookings?.length || 0,
        completed: checkOutBookings?.length || 0,
        reminders: upcomingCheckIns?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error checking booking statuses:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
