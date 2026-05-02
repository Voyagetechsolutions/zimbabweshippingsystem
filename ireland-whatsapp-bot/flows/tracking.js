import { updateUserSession } from '../utils/sessions.js';
import { getShipmentByTracking } from '../utils/database.js';

async function sendMessage(sock, phoneNumber, text) {
  await sock.sendMessage(phoneNumber, { text });
}

export async function handleTrackingFlow(sock, phoneNumber, text) {
  const lowerText = (text || '').toLowerCase().trim();

  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', step: null });
    const { getMainMenu } = await import('../bot.js');
    await sendMessage(sock, phoneNumber, getMainMenu());
    return;
  }

  const trimmed = text.trim().toUpperCase();

  if (!/^ZS-[A-Z0-9]{8}$/i.test(trimmed)) {
    await sendMessage(sock, phoneNumber,
      `❌ Invalid tracking number format.\n\nTracking numbers look like: *ZS-ABC12345*\n\nPlease try again or type *menu* to return.`
    );
    return;
  }

  const shipment = await getShipmentByTracking(trimmed);

  if (!shipment) {
    await sendMessage(sock, phoneNumber,
      `❌ No shipment found with tracking number *${trimmed}*\n\nPlease check the number and try again, or type *menu* to return.`
    );
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', step: null });
    return;
  }

  await sendMessage(sock, phoneNumber, generateTrackingInfo(shipment));
  await updateUserSession(phoneNumber, { state: 'MAIN_MENU', step: null });
  await sendMessage(sock, phoneNumber,
    `Type *track* to track another shipment or *menu* for main menu.`
  );
}

function generateTrackingInfo(shipment) {
  const metadata = shipment.metadata || {};
  const sender = metadata.sender || {};
  const recipient = metadata.recipient || {};

  let info = `📦 *Shipment Tracking*\n\n`;
  info += `🔢 Tracking: *${shipment.tracking_number}*\n`;
  info += `📍 Status: *${shipment.status}*\n\n`;

  info += `*ROUTE:*\n`;
  info += `🇮🇪 From: ${shipment.origin}\n`;
  info += `🇿🇼 To: ${shipment.destination}\n\n`;

  if (sender.firstName || sender.name) {
    info += `*SENDER:*\n`;
    info += `👤 ${sender.firstName ? `${sender.firstName} ${sender.lastName || ''}`.trim() : sender.name}\n`;
    if (sender.phone) info += `📱 ${sender.phone}\n`;
    info += `\n`;
  }

  if (recipient.name) {
    info += `*RECEIVER:*\n`;
    info += `👤 ${recipient.name}\n`;
    if (recipient.phone) info += `📱 ${recipient.phone}\n`;
    if (recipient.city) info += `🏙️ ${recipient.city}\n`;
    info += `\n`;
  }

  info += `*STATUS TIMELINE:*\n`;
  info += getStatusTimeline(shipment.status);

  if (shipment.status !== 'Delivered') {
    info += `\n\n⏱️ Estimated delivery: ${getEstimatedDelivery(shipment)}`;
  }

  return info;
}

function getStatusTimeline(status) {
  const statuses = [
    'Pending Collection',
    'Collected',
    'In Transit to Port',
    'At Port',
    'Shipped',
    'In Transit to Zimbabwe',
    'Arrived in Zimbabwe',
    'Customs Clearance',
    'Out for Delivery',
    'Delivered',
  ];

  const currentIndex = statuses.indexOf(status);
  return statuses.map((s, i) => {
    if (i < currentIndex) return `✅ ${s}`;
    if (i === currentIndex) return `🔄 *${s}* ← Current`;
    if (i === currentIndex + 1) return `⏳ ${s} (Next)`;
    return `⬜ ${s}`;
  }).join('\n');
}

function getEstimatedDelivery(shipment) {
  const created = new Date(shipment.created_at);
  const earliest = new Date(created);
  earliest.setDate(earliest.getDate() + 42);
  const latest = new Date(created);
  latest.setDate(latest.getDate() + 56);
  const fmt = (d) => d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${fmt(earliest)} – ${fmt(latest)}`;
}
