
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { announcement_id } = await req.json();

    if (!announcement_id) {
      throw new Error("Announcement ID is required");
    }

    // Get the announcement details
    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .select("*, profiles(email, full_name)")
      .eq("id", announcement_id)
      .single();

    if (announcementError) {
      throw announcementError;
    }

    if (!announcement) {
      throw new Error("Announcement not found");
    }

    // Get users to notify based on targeting
    let usersQuery = supabase.from("profiles").select("id, email, full_name, role");

    // Apply role targeting if specified
    if (announcement.target_roles && announcement.target_roles.length > 0) {
      usersQuery = usersQuery.in("role", announcement.target_roles);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      throw usersError;
    }

    // Create notifications for each user
    if (users && users.length > 0) {
      const notifications = users.map((user) => ({
        user_id: user.id,
        title: `New Announcement: ${announcement.title}`,
        message: announcement.is_critical ? `CRITICAL: ${announcement.content}` : announcement.content,
        type: "announcement",
        related_id: announcement.id,
        is_read: false,
      }));

      // Insert notifications
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        throw notificationError;
      }

      // Could add email sending logic here if needed

      return new Response(
        JSON.stringify({
          success: true,
          message: `Sent notifications to ${notifications.length} users`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No users match the targeting criteria",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("Error in send-announcement-notification:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
