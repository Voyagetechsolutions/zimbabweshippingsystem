import { updateUserSession } from '../services/userSession.js';
import { sendMessage } from '../utils/messageUtils.js';
import { getShipmentByTracking } from '../services/database.js';
import { getBotMessage } from '../services/botMessages.js';

export async function handleTrackingFlow(sock, phoneNumber, text, session) {
  const lowerText = text.toLowerCase();

  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
    const { sendMainMenuList } = await import('../handlers/messageHandler.js');
    await sendMainMenuList(sock, phoneNumber, session.userName);
    return;
  }

  if (!/^ZS-[A-Z0-9]{8}$/i.test(text.trim())) {
    await sendMessage(sock, phoneNumber,
      `❌ Invalid tracking number format.\n\nTracking numbers look like: *ZS-ABC12345*\n\nPlease try again or type *menu* to return.`
    );
    return;
  }

  const shipment = await getShipmentByTracking(text.trim().toUpperCase());

  if (!shipment) {
    await sendMessage(sock, phoneNumber,
      `❌ No shipment found with tracking number *${text.trim().toUpperCase()}*\n\nPlease check the number and try again, or type *menu* to return.`
    );
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
    return;
  }

  await sendMessage(sock, phoneNumber, generateTrackingInfo(shipment));
  await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
  await sendMessage(sock, phoneNumber,
    `Type *track* to track another shipment or *menu* for main menu.`
  );
}

export async function sendStatusUpdateToWhatsApp(sock, phoneNumber, trackingNumber, status) {
  try {
    const template = await getBotMessage('shipment_status_update');
    const msg = template
      .replace('{tracking_number}', trackingNumber)
      .replace('{status}', status);
    await sendMessage(sock, phoneNumber, msg);
    return true;
  } catch (err) {
    console.error('Failed to send status update to WhatsApp:', err);
    return false;
  }
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

  if (sender.name) {
    info += `*SENDER:*\n`;
    info += `👤 ${sender.name}\n`;
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
    info += `\n⏱️ Estimated delivery: ${getEstimatedDelivery(shipment)}`;
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
    'Delivered'
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
  // 6–8 weeks = 42–56 days; show the range end
  const earliest = new Date(created);
  earliest.setDate(earliest.getDate() + 42);
  const latest = new Date(created);
  latest.setDate(latest.getDate() + 56);

  const fmt = (d) => d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${fmt(earliest)} – ${fmt(latest)}`;
}
