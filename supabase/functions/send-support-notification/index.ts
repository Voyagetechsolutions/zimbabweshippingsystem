
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  ticketId: string;
  userId: string;
  messagePreview: string;
}

serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request payload
    const { ticketId, userId, messagePreview } = await req.json() as RequestBody;

    if (!ticketId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Creating notification for ticket ${ticketId}, user ${userId}`);

    // Get ticket information
    const { data: ticketData, error: ticketError } = await supabase
      .from("support_tickets")
      .select("subject")
      .eq("id", ticketId)
      .single();

    if (ticketError) {
      console.error("Error fetching ticket:", ticketError.message);
      return new Response(JSON.stringify({ error: ticketError.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create notification
    const { data: notificationData, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: "Support Ticket Update",
        message: `New response on ticket: "${ticketData.subject}" - ${messagePreview}`,
        type: "support",
        related_id: ticketId,
        is_read: false
      })
      .select()
      .single();

    if (notificationError) {
      console.error("Error creating notification:", notificationError.message);
      return new Response(JSON.stringify({ error: notificationError.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update the ticket_responses to indicate notification was sent
    await supabase
      .from("ticket_responses")
      .update({ notification_sent: true })
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ 
      success: true, 
      notification: notificationData 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
