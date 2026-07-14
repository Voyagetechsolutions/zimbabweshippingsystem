import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    const auth = req.headers.get('Authorization') || '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorised' }, 401);

    const admin = createClient(url, serviceKey);
    const { data: profile } = await admin.from('profiles').select('is_admin,role').eq('id', user.id).single();
    if (!profile?.is_admin && !['driver', 'staff'].includes(profile?.role)) return json({ error: 'Forbidden' }, 403);

    const { shipmentId, paymentResult } = await req.json();
    const { data: shipment, error } = await admin.from('shipments').select('*').eq('id', shipmentId).single();
    if (error || !shipment) return json({ error: 'Shipment not found' }, 404);

    const phone = shipment.metadata?.whatsappNumber || shipment.metadata?.sender?.phone;
    if (!phone) return json({ error: 'Customer WhatsApp number is missing' }, 400);
    const jid = phone.includes('@') ? phone : `${String(phone).replace(/\D/g, '')}@s.whatsapp.net`;
    const invoice = shipment.metadata?.invoice;
    const lines = [
      '✅ *Shipment collected successfully*', '',
      `Customer reference: *${shipment.customer_reference}*`,
      `Tracking number: *${shipment.tracking_number}*`,
      `Collected: ${new Date().toLocaleString('en-GB')}`,
      '', 'We will notify you as your shipment progresses.',
    ];
    if (paymentResult === 'paid' && invoice?.invoiceNumber) {
      lines.push('', '💷 *Cash payment received*', `Invoice: *${invoice.invoiceNumber}*`, 'Your paid invoice is now available from Zimbabwe Shipping.');
    }

    const botUrl = Deno.env.get('WHATSAPP_BOT_URL');
    const botKey = Deno.env.get('WHATSAPP_BOT_API_KEY');
    if (!botUrl || !botKey) return json({ error: 'WhatsApp bot notification is not configured' }, 503);
    const response = await fetch(`${botUrl.replace(/\/$/, '')}/send-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': botKey },
      body: JSON.stringify({ phone_number: jid, message: lines.join('\n') }),
    });
    if (!response.ok) return json({ error: 'WhatsApp notification failed', details: await response.text() }, 502);
    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
}

