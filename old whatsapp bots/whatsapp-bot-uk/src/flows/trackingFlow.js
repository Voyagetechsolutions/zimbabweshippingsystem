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

  const step = session.step || 'ASK_TRACKING';

  if (step === 'ASK_TRACKING') {
    // User provided tracking number
    const trackingNumber = text.toUpperCase().trim();

    // Validate format (sync)
    if (!trackingNumber.startsWith('ZS-') || trackingNumber.length < 8) {
      await sendMessage(
        sock,
        phoneNumber,
        '❌ Invalid tracking number format. It should look like: ZS-ABC12345\n\nPlease try again or type *menu* to go back.'
      );
      return;
    }

    // Advance state immediately so duplicate sends don't re-trigger the DB lookup
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', step: null });

    // Send immediate ack so user sees activity while the DB query runs
    await sendMessage(
      sock,
      phoneNumber,
      `🔍 Looking up *${trackingNumber}*…`
    );

    // Fetch shipment from database
    const shipment = await getShipmentByTracking(trackingNumber);

    if (!shipment) {
      await sendMessage(
        sock,
        phoneNumber,
        `❌ No shipment found with tracking number: ${trackingNumber}\n\nPlease check the number and try again, or type *menu* for main menu.`
      );
      return;
    }

    // Format and send tracking information
    const trackingInfo = formatTrackingInfo(shipment);
    await sendMessage(sock, phoneNumber, trackingInfo);
  }
}

function formatTrackingInfo(shipment) {
  let info = `📦 *Shipment Tracking*\n\n`;
  info += `*Tracking Number:* ${shipment.tracking_number}\n`;
  info += `*Status:* ${shipment.status}\n`;
  info += `*Origin:* ${shipment.origin}\n`;
  info += `*Destination:* ${shipment.destination}\n\n`;

  // Add sender/receiver info if available
  if (shipment.metadata?.sender) {
    info += `*Sender:* ${shipment.metadata.sender.name}\n`;
    info += `*City:* ${shipment.metadata.sender.city}\n\n`;
  }

  if (shipment.metadata?.recipient) {
    info += `*Receiver:* ${shipment.metadata.recipient.name}\n`;
    info += `*Destination:* ${shipment.metadata.recipient.city}, Zimbabwe\n\n`;
  }

  // Add shipment details
  if (shipment.metadata?.shipment) {
    const s = shipment.metadata.shipment;
    if (s.drums > 0) info += `🥁 Drums: ${s.drums}\n`;
    if (s.boxes > 0) info += `📦 Boxes: ${s.boxes}\n`;
    info += `\n`;
  }

  // Status-specific messages
  switch (shipment.status) {
    case 'Pending Collection':
      info += `⏳ Your shipment is scheduled for collection.\n`;
      break;
    case 'Collected':
      info += `✅ Your shipment has been collected and is at our depot.\n`;
      break;
    case 'In Transit':
      info += `🚢 Your shipment is on its way to Zimbabwe.\n`;
      break;
    case 'Arrived':
      info += `🎉 Your shipment has arrived in Zimbabwe.\n`;
      break;
    case 'Out for Delivery':
      info += `🚚 Your shipment is out for delivery.\n`;
      break;
    case 'Delivered':
      info += `✅ Your shipment has been delivered!\n`;
      break;
    default:
      info += `📍 Current status: ${shipment.status}\n`;
  }

  info += `\nType *menu* to return to main menu.`;

  return info;
}
