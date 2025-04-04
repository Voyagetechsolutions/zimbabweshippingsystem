
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailReceiptRequest {
  receiptId: string;
  email: string;
  receiptData: {
    receipt_number: string;
    created_at: string;
    amount: number;
    currency: string;
    payment_method: string;
    sender_details: any;
    recipient_details: any;
    shipment_details: any;
    status: string;
  };
  shipmentData?: {
    tracking_number: string;
    origin: string;
    destination: string;
    status: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { receiptId, email, receiptData, shipmentData }: EmailReceiptRequest = await req.json();

    console.log(`Processing email request for receipt: ${receiptId} to ${email}`);

    // In a real implementation, you would use a service like Resend, SendGrid, or similar
    // to actually send the email with the receipt as an attachment or in the body

    // For now, we'll just log the information and pretend we sent the email
    console.log(`Would send receipt email to: ${email}`);
    console.log(`Receipt data: ${JSON.stringify({
      receiptId,
      amount: receiptData.amount,
      recipient: receiptData.recipient_details.name,
    })}`);

    // In the future, implement actual email sending logic here
    // using a service like Resend.com API

    // For now, just return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Receipt ${receiptId} would be sent to ${email}` 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in email-receipt function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to process email request" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
