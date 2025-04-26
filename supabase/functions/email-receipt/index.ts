import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "npm:resend@2.0.0";

// Initialize Resend client
const resend = new Resend(Deno.env.get("re_CfiA4KVD_CqCS6hkA9stb9fNbxAfaivJ5") || "");

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailReceiptRequest {
  receiptId: string;
  email: string;
  receiptData?: {
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
    // Initialize Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    
    // Parse the request body
    const { receiptId, email, receiptData, shipmentData }: EmailReceiptRequest = await req.json();

    console.log(`Processing email request for receipt: ${receiptId} to ${email}`);

    // Get the receipt data if not provided
    let receipt = receiptData;
    let shipment = shipmentData;
    
    if (!receiptData && receiptId) {
      // Fetch the receipt data
      const { data: fetchedReceipt, error: receiptError } = await supabaseAdmin
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();
        
      if (receiptError) {
        throw new Error(`Error fetching receipt: ${receiptError.message}`);
      }
      
      receipt = fetchedReceipt;
      
      // Fetch associated shipment
      const { data: fetchedShipment, error: shipmentError } = await supabaseAdmin
        .from('shipments')
        .select('*')
        .eq('id', fetchedReceipt.shipment_id)
        .single();
        
      if (shipmentError) {
        console.error('Error fetching shipment:', shipmentError);
      } else {
        shipment = fetchedShipment;
      }
    }
    
    if (!receipt) {
      throw new Error('Receipt data not found');
    }

    // Compose email content
    const emailContent = `
      <h1>Receipt for Your Purchase</h1>
      <p>Receipt Number: ${receipt.receipt_number}</p>
      <p>Amount: ${receipt.amount} ${receipt.currency}</p>
      <p>Payment Method: ${receipt.payment_method}</p>
      <p>Recipient: ${receipt.recipient_details?.name || 'Customer'}</p>
      <p>Created At: ${receipt.created_at}</p>
      <p>If you have any questions, feel free to contact us.</p>
    `;

    // Send the email using Resend
    const { error } = await resend.emails.send({
      from: "Zimbabwe Shipping <noreply@zimbabweshipping.com>",
      to: [email],
      subject: `Your Receipt - ${receipt.receipt_number}`,
      html: emailContent,
    });

    if (error) {
      throw new Error(`Error sending email: ${error.message}`);
    }

    // Log the activity as a notification
    if (shipment?.user_id) {
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: shipment.user_id,
          title: 'Receipt Sent',
          message: `Receipt ${receipt.receipt_number} has been emailed to you.`,
          type: 'RECEIPT',
          related_id: receiptId
        });
        
      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Receipt ${receiptId} has been sent to ${email}` 
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
