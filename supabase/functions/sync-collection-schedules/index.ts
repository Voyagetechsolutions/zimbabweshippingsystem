
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    
    console.log("Syncing collection schedules with updated dates");
    
    // Updated schedule data
    const updatedSchedules = [
      {
        route: "NORTHAMPTON ROUTE",
        pickup_date: "26th of September",
        areas: ["KETTERING", "BEDFORD", "MILTON KEYNES", "BANBURY", "AYLESBURY", "LUTON"],
        country: "England"
      },
      {
        route: "LEEDS ROUTE",
        pickup_date: "27th of September",
        areas: ["WAKEFIELD", "HALIFAX", "DONCASTER", "SHEFFIELD", "HUDDERSFIELD", "YORK"],
        country: "England"
      },
      {
        route: "CARDIFF ROUTE",
        pickup_date: "29th of September",
        areas: ["CARDIFF", "GLOUCESTER", "BRISTOL", "SWINDON", "BATH", "SALISBURY"],
        country: "England"
      },
      {
        route: "BOURNEMOUTH ROUTE",
        pickup_date: "30th of September",
        areas: ["SOUTHAMPTON", "OXFORD", "HAMPHIRE", "READING", "GUILFORD", "PORTSMOUTH"],
        country: "England"
      },
      {
        route: "BRIGHTON ROUTE",
        pickup_date: "2nd of October",
        areas: ["HIGH COMBE", "SLOUGH", "VRAWLEY", "LANCING", "EASTBOURNE", "CANTEBURY"],
        country: "England"
      },
      {
        route: "LONDON ROUTE",
        pickup_date: "4th of October",
        areas: ["CENTRAL LONDON", "HEATHROW", "EAST LONDON", "ROMFORD", "ALL AREAS INSIDE M25"],
        country: "England"
      },
      {
        route: "BIRMINGHAM ROUTE",
        pickup_date: "6th of October",
        areas: ["WOLVEHAMPTON", "COVENTRY", "WARWICK", "DUDLEY", "WALSALL", "RUGBY"],
        country: "England"
      },
      {
        route: "NOTTINGHAM ROUTE",
        pickup_date: "8th of October",
        areas: ["LIECESTER", "DERBY", "PETERSBOROUGH", "CORBY", "MARKET HARB"],
        country: "England"
      },
      {
        route: "MANCHESTER ROUTE",
        pickup_date: "11th of October",
        areas: ["MANCHESTER", "STOCKPORT", "OLDHAM", "BOLTON", "BURY", "SALFORD"],
        country: "England"
      },
      {
        route: "SOUTHEND ROUTE",
        pickup_date: "13th of October",
        areas: ["NORWICH", "IPSWICH", "COLCHESTER", "BRAINTREE", "CAMBRIDGE", "BASILDON"],
        country: "England"
      }
    ];

    // Update existing routes with new dates and insert new ones if they don't exist
    for (const schedule of updatedSchedules) {
      // Try to update first
      const { data: existingRoute, error: selectError } = await supabaseClient
        .from('collection_schedules')
        .select('id')
        .eq('route', schedule.route)
        .single();

      if (existingRoute) {
        // Route exists, update it
        const { error } = await supabaseClient
          .from('collection_schedules')
          .update({
            pickup_date: schedule.pickup_date,
            updated_at: new Date().toISOString()
          })
          .eq('route', schedule.route);
        
        if (error) {
          console.error(`Error updating ${schedule.route}:`, error);
        } else {
          console.log(`Successfully updated ${schedule.route} to ${schedule.pickup_date}`);
        }
      } else {
        // Route doesn't exist, insert it
        const { error } = await supabaseClient
          .from('collection_schedules')
          .insert({
            route: schedule.route,
            pickup_date: schedule.pickup_date,
            areas: schedule.areas,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error(`Error inserting ${schedule.route}:`, error);
        } else {
          console.log(`Successfully inserted new route ${schedule.route} with date ${schedule.pickup_date}`);
        }
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Collection schedules updated successfully",
        updated_routes: updatedSchedules.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error("Error syncing collection schedules:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
