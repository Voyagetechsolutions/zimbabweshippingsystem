import { updateUserSession } from '../services/userSession.js';
import { sendMessage } from '../utils/messageUtils.js';
import { getShipmentByTracking } from '../services/database.js';

export async function handleTrackingFlow(sock, phoneNumber, text, session) {
  const lowerText = text.toLowerCase();
  
  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
    const { getMainMenu } = await import('../menus/mainMenu.js');
    await sendMessage(sock, phoneNumber, getMainMenu());
    return;
  }

  // Validate tracking number format
  if (!/^ZS-[A-Z0-9]{8}$/i.test(text)) {
    await sendMessage(
      sock,
      phoneNumber,
      '❌ Invalid tracking number format.\n\nTracking numbers look like: *ZS-ABC12345*\n\nPlease try again or type *menu* to return.'
    );
    return;
  }

  // Fetch shipment from database
  const shipment = await getShipmentByTracking(text.toUpperCase());
  
  if (!shipment) {
    await sendMessage(
      sock,
      phoneNumber,
      `❌ No shipment found with tracking number *${text.toUpperCase()}*\n\nPlease check the number and try again, or type *menu* to return.`
    );
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
    return;
  }

  // Generate tracking info
  const trackingInfo = generateTrackingInfo(shipment);
  await sendMessage(sock, phoneNumber, trackingInfo);
  
  // Reset to main menu
  await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
  
  await sendMessage(
    sock,
    phoneNumber,
    '\nType *track* to track another shipment or *menu* for main menu.'
  );
}

function generateTrackingInfo(shipment) {
  const metadata = shipment.metadata || {};
  const sender = metadata.sender || {};
  const recipient = metadata.recipient || {};
  
  let info = `📦 *Shipment Tracking*\n\n`;
  info += `🔢 Tracking: *${shipment.tracking_number}*\n`;
  info += `📍 Status: *${shipment.status}*\n`;
  info += `\n`;
  
  info += `*ROUTE:*\n`;
  info += `🇮🇪 From: ${shipment.origin}\n`;
  info += `🇿🇼 To: ${shipment.destination}\n`;
  info += `\n`;
  
  if (sender.name) {
    info += `*SENDER:*\n`;
    info += `👤 ${sender.name}\n`;
    info += `📱 ${sender.phone}\n`;
    info += `\n`;
  }
  
  if (recipient.name) {
    info += `*RECEIVER:*\n`;
    info += `👤 ${recipient.name}\n`;
    info += `📱 ${recipient.phone}\n`;
    info += `🏙️ ${recipient.city}\n`;
    info += `\n`;
  }
  
  // Status timeline
  info += `*TIMELINE:*\n`;
  info += getStatusTimeline(shipment.status);
  
  // Estimated delivery
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
  let timeline = '';
  
  statuses.forEach((s, index) => {
    if (index <= currentIndex) {
      timeline += `✅ ${s}\n`;
    } else if (index === currentIndex + 1) {
      timeline += `🔄 ${s} (Next)\n`;
    } else {
      timeline += `⏳ ${s}\n`;
    }
  });
  
  return timeline;
}

function getEstimatedDelivery(shipment) {
  const createdDate = new Date(shipment.created_at);
  const estimatedDate = new Date(createdDate);
  estimatedDate.setDate(estimatedDate.getDate() + 42); // 6 weeks
  
  return estimatedDate.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
