// Sends WhatsApp messages through Meta's official Cloud API (Graph API).
// This replaces Baileys' sock.sendMessage when running on the Cloud API.
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

export async function sendText(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token) {
    console.error('❌ Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TOKEN');
    return false;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`❌ Meta send failed (${res.status}):`, errBody);
      return false;
    }
    console.log(`✅ Sent to ${to} via Cloud API`);
    return true;
  } catch (err) {
    console.error('❌ Meta send error:', err?.message || err);
    return false;
  }
}

// A Baileys-compatible "socket" so the existing sendMessage util and runAgent
// work unchanged — they only ever call sock.sendMessage(to, { text }).
export const cloudSock = {
  user: { id: 'cloud-api' },
  sendMessage: async (to, { text }) => {
    await sendText(to, text);
    return { key: { remoteJid: to } };
  },
};
