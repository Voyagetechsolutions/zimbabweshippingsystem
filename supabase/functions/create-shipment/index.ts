
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
    
    // Ensure consistent data structure for sender
    const formattedSender = shipmentData.sender ? shipmentData.sender : 
      shipmentData.senderDetails ? {
        firstName: shipmentData.senderDetails.firstName,
        lastName: shipmentData.senderDetails.lastName,
        name: `${shipmentData.senderDetails.firstName} ${shipmentData.senderDetails.lastName}`,
        email: shipmentData.senderDetails.email,
        phone: shipmentData.senderDetails.phone,
        address: shipmentData.senderDetails.address,
        city: shipmentData.senderDetails.city,
        postcode: shipmentData.senderDetails.postcode,
        country: shipmentData.senderDetails.country
      } : {
        firstName: shipmentData.firstName,
        lastName: shipmentData.lastName,
        name: `${shipmentData.firstName} ${shipmentData.lastName}`,
        email: shipmentData.email,
        phone: shipmentData.phone,
        address: shipmentData.pickupAddress,
        city: shipmentData.pickupCity || '',
        postcode: shipmentData.pickupPostcode || '',
        country: shipmentData.pickupCountry || 'UK'
      };
    
    // Ensure consistent data structure for recipient
    const formattedRecipient = shipmentData.recipient ? shipmentData.recipient : 
      shipmentData.recipientDetails ? shipmentData.recipientDetails : {
        name: shipmentData.recipientName,
        phone: shipmentData.recipientPhone,
        additionalPhone: shipmentData.additionalRecipientPhone,
        address: shipmentData.deliveryAddress,
        city: shipmentData.deliveryCity
      };
    
    // Create origin and destination strings
    const origin = shipmentData.origin || 
      `${formattedSender.address}, ${formattedSender.city}, ${formattedSender.postcode}, ${formattedSender.country}`;
    
    const destination = shipmentData.destination || 
      `${formattedRecipient.address}, ${formattedRecipient.city}, Zimbabwe`;

    const letters = `${formattedSender.firstName || ''}${formattedSender.lastName || ''}`.replace(/[^a-z]/gi, '').toUpperCase();
    const prefix = (letters || 'CUS').slice(0, 3).padEnd(3, 'X');
    const phoneTail = String(formattedSender.phone || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
    const requestedDate = shipmentData.collectionDetails?.date || shipmentData.metadata?.collection?.date;
    const parsedDate = new Date(requestedDate || Date.now());
    const shipmentDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const mmyy = `${String(shipmentDate.getMonth() + 1).padStart(2, '0')}${String(shipmentDate.getFullYear()).slice(-2)}`;
    const referenceBase = `${prefix}-${mmyy}-${phoneTail}`;
    const { count: referenceCount } = await supabaseClient.from('shipments')
      .select('id', { count: 'exact', head: true }).like('customer_reference', `${referenceBase}%`);
    const customerReference = referenceCount ? `${referenceBase}-${String(referenceCount + 1).padStart(2, '0')}` : referenceBase;
    const qrToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
    
    // Prepare shipment record with properly formatted metadata
    const shipment = {
      id: shipmentId,
      tracking_number: trackingNumber,
      status: 'Booking Confirmed', // Ensuring consistent status
      origin: origin,
      destination: destination,
      user_id: user?.id || shipmentData.userId || null,
      customer_reference: customerReference,
      qr_token: qrToken,
      collection_status: 'Awaiting Collection',
      delivery_note_status: 'Draft',
      metadata: {
        ...shipmentData.metadata,
        sender: formattedSender,
        recipient: formattedRecipient,
        senderDetails: formattedSender,
        recipientDetails: formattedRecipient,
        shipmentDetails: shipmentData.shipmentDetails || shipmentData.metadata?.shipmentDetails,
        shipment: shipmentData.shipmentDetails || shipmentData.metadata?.shipmentDetails,
        collection: shipmentData.collectionDetails || shipmentData.metadata?.collection || {},
        customerReference,
        qrToken,
        deliveryNote: { status: 'Draft', number: `DN-${customerReference}` },
      }
    };
    
    // Insert shipment into database
    const { data, error } = await supabaseClient
      .from('shipments')
      .insert(shipment)
      .select()
      .single();
    
    if (error) throw error;

    await supabaseClient.from('customer_requests').insert({
      shipment_id: data.id,
      customer_name: formattedSender.name || `${formattedSender.firstName || ''} ${formattedSender.lastName || ''}`.trim(),
      whatsapp_number: formattedSender.phone,
      request_type: 'New Booking',
      message: shipmentData.shipmentDetails?.description || shipmentData.metadata?.shipmentDetails?.description || null,
      customer_reference: customerReference,
      status: 'New',
      unread: true,
      source: 'website',
    });

    const botUrl = Deno.env.get('WHATSAPP_BOT_URL');
    const botKey = Deno.env.get('WHATSAPP_BOT_API_KEY');
    if (botUrl && botKey && formattedSender.phone) {
      fetch(`${botUrl.replace(/\/$/, '')}/send-booking-confirmation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': botKey },
        body: JSON.stringify({
          phone_number: formattedSender.phone,
          customer_reference: customerReference,
          tracking_number: trackingNumber,
          qr_token: qrToken,
          collection_date: requestedDate || 'To be confirmed',
          collection_address: origin,
          payment_method: shipmentData.paymentMethod || shipmentData.metadata?.pricing?.paymentMethod || 'To be confirmed',
        }),
      }).catch((notifyError) => console.error('WhatsApp booking confirmation failed:', notifyError));
    }
    
    // Return response
    return new Response(
      JSON.stringify({ 
        success: true,
        shipment: data,
        shipmentId: data.id,
        trackingNumber: data.tracking_number,
        customerReference,
        qrToken,
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
