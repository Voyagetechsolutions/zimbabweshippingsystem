
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { amount, bookingData } = await req.json();
    
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
    
    const { access_token } = await tokenResponse.json();
    
    if (!access_token) {
      throw new Error("Failed to obtain PayPal access token");
    }
    
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
          return_url: `${new URL(req.url).origin}/payment-success`,
          cancel_url: `${new URL(req.url).origin}/book-shipment`,
        },
      }),
    });
    
    const order = await orderResponse.json();
    
    if (order.error) {
      throw new Error(order.error.message || "Failed to create PayPal order");
    }
    
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
