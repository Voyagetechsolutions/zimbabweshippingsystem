
// ============================================================
// THIS EDGE FUNCTION IS DEPRECATED AND SHOULD BE DELETED
// ============================================================
// 
// Collection schedules are now managed ONLY through:
// 1. Admin Dashboard -> Collection Schedule tab
// 2. Direct database updates via Supabase
//
// DO NOT deploy this function - it is no longer needed.
// Delete it from Supabase Dashboard -> Edge Functions
//
// All schedule data comes from the collection_schedules table
// which is updated by admins through the dashboard.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // This function is deprecated - just return a message
  return new Response(
    JSON.stringify({ 
      success: false, 
      message: "This function is deprecated. Manage schedules via Admin Dashboard.",
      deprecated: true
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
});
