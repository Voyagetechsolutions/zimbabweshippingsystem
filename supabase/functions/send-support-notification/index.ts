
import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, responseId } = await req.json();

    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://oncsaunsqtekwwbzvvyh.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get ticket and response details
    const { data: responseData, error: responseError } = await supabase
      .from("ticket_responses")
      .select("*, support_tickets(*)")
      .eq("id", responseId)
      .single();

    if (responseError) throw responseError;
    if (!responseData) throw new Error("Response not found");

    // Get ticket user details to send email
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", responseData.support_tickets.user_id)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error("User not found");

    // Create a notification in the database
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: responseData.support_tickets.user_id,
        title: "Support Ticket Response",
        message: `Your support ticket "${responseData.support_tickets.subject}" has received a response.`,
        type: "support",
        related_id: ticketId,
        is_read: false,
      });

    if (notificationError) throw notificationError;

    // Mark the response as notification sent
    const { error: updateError } = await supabase
      .from("ticket_responses")
      .update({ notification_sent: true })
      .eq("id", responseId);

    if (updateError) throw updateError;

    // Normally here we would also send an email using a service like Resend, SendGrid, etc.
    // For now, we'll just log the information
    console.log(`Support notification sent to ${userData.email} for ticket ${ticketId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
