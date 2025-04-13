
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.13.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

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
    const { amount, bookingData, paymentMethod } = await req.json();
    console.log("Creating payment session:", { amount, shipmentId: bookingData.shipment_id });
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "UK to Zimbabwe Shipping",
              description: `Shipment ${bookingData.shipmentDetails.type === 'drum' ? 
                `(${bookingData.shipmentDetails.quantity} Drums)` : 
                `(${bookingData.shipmentDetails.weight}kg Parcel)`}`,
            },
            unit_amount: amount, // amount in cents/pennies
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${new URL(req.url).origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(req.url).origin}/book-shipment`,
      customer_email: bookingData.senderDetails.email,
      client_reference_id: bookingData.shipment_id,
      metadata: {
        shipment_id: bookingData.shipment_id,
        tracking_number: bookingData.shipmentDetails.tracking_number,
        payment_method: paymentMethod,
      },
    });

    console.log("Created Stripe session:", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
