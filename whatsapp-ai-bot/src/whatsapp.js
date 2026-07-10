import { config } from './config.js';

function messagesUrl() {
  return `https://graph.facebook.com/${config.whatsappGraphVersion}/${config.whatsappPhoneNumberId}/messages`;
}

export async function sendTextMessage(to, body) {
  if (!config.whatsappToken || !config.whatsappPhoneNumberId) {
    throw new Error('Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
  }

  const response = await fetch(messagesUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsappToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body,
      },
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Meta send failed ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
}

export function extractIncomingMessages(payload) {
  const messages = [];

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      for (const message of value?.messages || []) {
        messages.push({
          id: message.id,
          from: message.from,
          timestamp: message.timestamp,
          type: message.type,
          text: extractText(message),
          raw: message,
        });
      }
    }
  }

  return messages;
}

export function extractText(message) {
  if (message.type === 'text') {
    return message.text?.body?.trim() || '';
  }

  if (message.type === 'button') {
    return message.button?.text?.trim() || message.button?.payload?.trim() || '';
  }

  if (message.type === 'interactive') {
    const interactive = message.interactive;
    return (
      interactive?.button_reply?.title ||
      interactive?.button_reply?.id ||
      interactive?.list_reply?.title ||
      interactive?.list_reply?.id ||
      ''
    ).trim();
  }

  return '';
}
