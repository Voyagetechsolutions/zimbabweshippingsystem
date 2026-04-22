import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone_number, tracking_number, status } = await req.json();

    if (!phone_number || !tracking_number || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch the message template from bot_messages
    const { data: msgRow } = await supabase
      .from('bot_messages')
      .select('message')
      .eq('key', 'shipment_status_update')
      .single();

    const template = msgRow?.message ||
      `📦 *Shipment Update*\n\nYour shipment *{tracking_number}* has been updated.\n\n📍 New status: *{status}*\n\nType *track* and enter your tracking number for full details.`;

    const message = template
      .replace('{tracking_number}', tracking_number)
      .replace('{status}', status);

    // Call the bot's internal notification endpoint
    const botWebhookUrl = Deno.env.get('BOT_WEBHOOK_URL');
    if (botWebhookUrl) {
      await fetch(`${botWebhookUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': Deno.env.get('BOT_API_KEY') || '' },
        body: JSON.stringify({ phone_number, message })
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('notify-shipment-status error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
