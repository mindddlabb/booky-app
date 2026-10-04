import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find bookings with check-in in the next 24 hours that are confirmed
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, user_id, check_in_date_time, apartments(name)")
      .eq("status", "confirmed")
      .gte("check_in_date_time", now.toISOString())
      .lte("check_in_date_time", in24h.toISOString());

    if (error) throw error;

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No upcoming check-ins", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.warn("OneSignal credentials not configured, skipping push notifications");
      return new Response(
        JSON.stringify({ success: true, message: "OneSignal not configured", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;

    for (const booking of bookings) {
      const apartmentName = (booking as any).apartments?.name || "your apartment";
      const checkInDate = new Date(booking.check_in_date_time);
      const hoursUntil = Math.round((checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      const payload = {
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [booking.user_id],
        headings: { en: "Check-in Reminder 🏠" },
        contents: {
          en: `Your check-in at ${apartmentName} is in ${hoursUntil} hours. Get ready!`,
        },
        data: { type: "checkin_reminder", bookingId: booking.id },
      };

      try {
        const res = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          sentCount++;
          console.log(`Reminder sent for booking ${booking.id}`);
        } else {
          const errBody = await res.text();
          console.error(`Failed to send for booking ${booking.id}:`, errBody);
        }
      } catch (e) {
        console.error(`Error sending reminder for booking ${booking.id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: bookings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-in reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
