import { sendMessage } from '../utils/messageUtils.js';

function digits(value = '') {
  return String(value).replace(/\D/g, '');
}

function customerNumberFromJid(jid = '') {
  return digits(String(jid).split('@')[0]);
}

export function representativeJid() {
  const number = digits(process.env.REPRESENTATIVE_WHATSAPP_NUMBER || '');
  return number ? `${number}@s.whatsapp.net` : null;
}

export async function notifyRepresentative(sock, {
  type,
  customerJid,
  customerName,
  reason,
  trackingNumber,
  summary,
}) {
  const to = representativeJid();
  if (!to || !sock) return false;

  const customer = customerNumberFromJid(customerJid);
  const lines = [
    `🔔 *${type || 'New customer request'}*`,
    '',
    customerName ? `Customer: ${customerName}` : null,
    customer ? `WhatsApp: +${customer}` : null,
    reason ? `Reason: ${reason}` : null,
    trackingNumber ? `Tracking: ${trackingNumber}` : null,
    summary ? `Details: ${summary}` : null,
    customer ? `Open chat: https://wa.me/${customer}` : null,
  ].filter(line => line !== null);

  const delivered = await sendMessage(sock, to, lines.join('\n'));
  console.log(`${delivered ? '✅' : '❌'} Representative alert ${delivered ? 'sent' : 'failed'}`);
  return delivered;
}
