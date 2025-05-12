
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get Supabase client
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
  
  try {
    // Get request body
    const { shipmentData } = await req.json();
    
    // Generate tracking number
    const trackingNumber = `ZIMSHIP-${Math.floor(10000 + Math.random() * 90000)}`;
    const shipmentId = uuidv4();
    
    // Get authenticated user if available
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // Format sender and recipient data for consistency
    const formattedSenderDetails = shipmentData.sender ? shipmentData.sender : {
      name: shipmentData.metadata?.senderDetails?.name || 
            `${shipmentData.metadata?.senderDetails?.firstName || ''} ${shipmentData.metadata?.senderDetails?.lastName || ''}`.trim(),
      email: shipmentData.metadata?.senderDetails?.email,
      phone: shipmentData.metadata?.senderDetails?.phone,
      address: shipmentData.metadata?.senderDetails?.address
    };
    
    const formattedRecipientDetails = shipmentData.recipient ? shipmentData.recipient : {
      name: shipmentData.metadata?.recipientDetails?.name,
      phone: shipmentData.metadata?.recipientDetails?.phone,
      address: shipmentData.metadata?.recipientDetails?.address
    };
    
    // Prepare shipment record with properly formatted metadata
    const shipment = {
      id: shipmentId,
      tracking_number: trackingNumber,
      status: 'Booking Confirmed', // Ensuring consistent status
      origin: shipmentData.origin,
      destination: shipmentData.destination,
      user_id: user?.id || shipmentData.userId || null,
      metadata: {
        ...shipmentData.metadata,
        sender: formattedSenderDetails,
        recipient: formattedRecipientDetails
      }
    };
    
    // Insert shipment into database
    const { data, error } = await supabaseClient
      .from('shipments')
      .insert(shipment)
      .select()
      .single();
    
    if (error) throw error;
    
    // Return response
    return new Response(
      JSON.stringify({ 
        success: true,
        shipment: data,
        shipmentId: data.id,
        trackingNumber: data.tracking_number
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
