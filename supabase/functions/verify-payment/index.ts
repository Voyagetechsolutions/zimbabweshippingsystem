
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
    const { session_id, payment_intent, payment_id } = await req.json();
    console.log("Received payment verification request:", { session_id, payment_intent, payment_id });
    
    // If we already have a payment_id and have processed it, return that receipt
    if (payment_id) {
      console.log("Looking up existing payment:", payment_id);
      const { data: paymentData, error: paymentError } = await supabaseClient
        .from('payments')
        .select('shipment_id, id')
        .eq('id', payment_id)
        .single();
      
      if (paymentError) {
        console.error("Error looking up payment:", paymentError);
        throw paymentError;
      }
      
      // Look up the receipt for this payment
      const { data: receiptData, error: receiptError } = await supabaseClient
        .from('receipts')
        .select('id')
        .eq('payment_id', payment_id)
        .single();
      
      if (receiptError) {
        console.error("Error looking up receipt:", receiptError);
        throw receiptError;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          paymentId: payment_id,
          receiptId: receiptData.id
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    let paymentInfo;
    let paymentMethod = 'stripe';
    
    // Verify Stripe payment
    if (session_id) {
      console.log("Verifying Stripe payment:", session_id);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      if (session.payment_status !== 'paid') {
        console.error("Payment not completed:", session.payment_status);
        throw new Error('Payment not completed');
      }
      
      paymentInfo = {
        amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents to dollars/pounds
        currency: session.currency,
        shipment_id: session.client_reference_id || session.metadata?.shipment_id,
        payment_method: 'stripe',
        transaction_id: session.payment_intent as string,
        status: 'completed'
      };
      
      console.log("Stripe payment verified:", paymentInfo);
    }
    // Verify PayPal payment (simplified, would need more robust validation in production)
    else if (payment_intent) {
      console.log("Verifying PayPal payment:", payment_intent);
      // In a real implementation, you would validate with the PayPal API
      // This is simplified for the example
      paymentInfo = {
        amount: 0, // Would come from PayPal verification
        currency: 'gbp',
        shipment_id: payment_intent,
        payment_method: 'paypal',
        transaction_id: payment_intent,
        status: 'completed'
      };
      paymentMethod = 'paypal';
      console.log("PayPal payment info:", paymentInfo);
    } else {
      console.error("No payment identifier provided");
      throw new Error('No payment identifier provided');
    }
    
    try {
      // Get the shipment details
      console.log("Looking up shipment:", paymentInfo.shipment_id);
      const { data: shipmentData, error: shipmentError } = await supabaseClient
        .from('shipments')
        .select('*')
        .eq('id', paymentInfo.shipment_id)
        .single();
      
      if (shipmentError) {
        console.error("Error looking up shipment:", shipmentError);
        throw shipmentError;
      }
      
      console.log("Retrieved shipment data:", shipmentData.id);
      
      // Create payment record with admin rights using service role
      console.log("Creating payment record for shipment:", shipmentData.id);
      const { data: paymentData, error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          amount: paymentInfo.amount,
          currency: paymentInfo.currency,
          shipment_id: paymentInfo.shipment_id,
          payment_method: paymentInfo.payment_method,
          payment_status: paymentInfo.status,
          transaction_id: paymentInfo.transaction_id,
          user_id: shipmentData.user_id || '00000000-0000-0000-0000-000000000000' // Use placeholder ID if not logged in
        })
        .select('id')
        .single();
      
      if (paymentError) {
        console.error("Error creating payment record:", paymentError);
        throw paymentError;
      }
      
      console.log("Created payment record:", paymentData.id);
      
      // Extract sender and recipient details from shipment metadata
      const metadata = shipmentData.metadata || {};
      
      // Generate receipt number
      const receiptNumber = `R-${Date.now().toString().substring(7)}`;
      
      // Create receipt record with admin rights using service role
      console.log("Creating receipt record for payment:", paymentData.id);
      const { data: receiptData, error: receiptError } = await supabaseClient
        .from('receipts')
        .insert({
          shipment_id: paymentInfo.shipment_id,
          payment_id: paymentData.id,
          receipt_number: receiptNumber,
          payment_method: paymentMethod,
          amount: paymentInfo.amount,
          currency: paymentInfo.currency,
          sender_details: {
            name: metadata.sender_name,
            email: metadata.sender_email,
            phone: metadata.sender_phone,
            address: shipmentData.origin
          },
          recipient_details: {
            name: metadata.recipient_name,
            phone: metadata.recipient_phone,
            address: shipmentData.destination
          },
          shipment_details: {
            tracking_number: shipmentData.tracking_number,
            type: metadata.shipment_type,
            quantity: metadata.drum_quantity,
            weight: shipmentData.weight,
            services: []
          }
        })
        .select('id')
        .single();
      
      if (receiptError) {
        console.error("Error creating receipt record:", receiptError);
        throw receiptError;
      }
      
      console.log("Created receipt record:", receiptData.id);

      // Update shipment status to paid
      console.log("Updating shipment status to Paid");
      const { error: updateError } = await supabaseClient
        .from('shipments')
        .update({ status: 'Paid' })
        .eq('id', paymentInfo.shipment_id);
      
      if (updateError) {
        console.error("Error updating shipment status:", updateError);
        throw updateError;
      }
      
      console.log("Updated shipment status to Paid");

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: paymentData.id,
          receiptId: receiptData.id
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      return new Response(
        JSON.stringify({ 
          error: "Database operation failed", 
          details: dbError.message,
          code: "DB_ERROR"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: "GENERAL_ERROR" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
