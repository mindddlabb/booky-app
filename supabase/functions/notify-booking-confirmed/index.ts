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

    const { bookingId } = await req.json();

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        apartments:apartment_id (name),
        profiles:user_id (full_name)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Send notification to lister
    await supabase.functions.invoke("send-notification", {
      body: {
        userIds: [booking.lister_id],
        title: "New Booking Confirmed! 🎉",
        message: `${booking.profiles.full_name} booked ${booking.apartments.name}`,
        data: {
          type: "booking_confirmed",
          bookingId: booking.id,
          screen: "BookingDetails",
        },
      },
    });

    console.log("Booking confirmation notification sent to lister");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
