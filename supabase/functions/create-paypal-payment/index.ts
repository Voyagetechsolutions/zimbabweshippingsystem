
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client with service role key to bypass RLS
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

serve(async (req) => {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { amount, bookingData } = await req.json();
    console.log("Creating PayPal payment:", { amount, shipmentId: bookingData.shipment_id });
    
    // PayPal credentials
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error("PayPal credentials not configured");
    }
    
    // Get an access token from PayPal
    const tokenResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error("Failed to obtain PayPal access token:", tokenData);
      throw new Error("Failed to obtain PayPal access token");
    }
    
    const access_token = tokenData.access_token;
    console.log("Obtained PayPal access token");
    
    // Create a PayPal order
    const orderResponse = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "GBP",
              value: amount.toFixed(2),
            },
            description: `Shipment ${bookingData.shipmentDetails.type === 'drum' ? 
              `(${bookingData.shipmentDetails.quantity} Drums)` : 
              `(${bookingData.shipmentDetails.weight}kg Parcel)`}`,
            custom_id: bookingData.shipment_id,
          },
        ],
        application_context: {
          return_url: `${new URL(req.url).origin}/payment-success?payment_intent=${bookingData.shipment_id}`,
          cancel_url: `${new URL(req.url).origin}/book-shipment`,
        },
      }),
    });
    
    const order = await orderResponse.json();
    
    if (order.error) {
      console.error("Failed to create PayPal order:", order.error);
      throw new Error(order.error.message || "Failed to create PayPal order");
    }
    
    console.log("Created PayPal order:", { orderId: order.id });
    
    // Find the approval URL
    const approvalUrl = order.links.find((link: any) => link.rel === "approve").href;
    
    return new Response(
      JSON.stringify({
        url: approvalUrl,
        orderId: order.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating PayPal payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
