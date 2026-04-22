import { getUserSession, updateUserSession } from '../services/userSession.js';
import { handleBookingFlow } from '../flows/bookingFlow.js';
import { handleTrackingFlow } from '../flows/trackingFlow.js';
import { handleFAQFlow } from '../flows/faqFlow.js';
import { sendMessage, sendListMessage } from '../utils/messageUtils.js';
import { getBotMessage } from '../services/botMessages.js';
import { getBotSettings } from '../utils/pricingUtils.js';

export async function handleMessage(sock, message) {
  try {
    const phoneNumber = message.key.remoteJid;

    if (phoneNumber.endsWith('@g.us')) return;

    const messageText = extractMessageText(message);
    if (!messageText) return;

    const session = await getUserSession(phoneNumber);

    if (!session.hasBeenGreeted) {
      await sendWelcomeMessage(sock, phoneNumber);
      await updateUserSession(phoneNumber, { hasBeenGreeted: true });
      return;
    }

    if (session.state === 'BOOKING_FLOW') {
      await handleBookingFlow(sock, phoneNumber, messageText, session);
    } else if (session.state === 'TRACKING_FLOW') {
      await handleTrackingFlow(sock, phoneNumber, messageText, session);
    } else if (session.state === 'FAQ_FLOW') {
      await handleFAQFlow(sock, phoneNumber, messageText, session);
    } else {
      await handleMainMenu(sock, phoneNumber, messageText, session);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await sendMessage(sock, message.key.remoteJid,
      '❌ Sorry, something went wrong. Please try again or type *menu* to start over.'
    );
  }
}

async function sendWelcomeMessage(sock, phoneNumber) {
  const msg = await getBotMessage('welcome');
  await sendListMessage(sock, phoneNumber, msg,
    '≡  Zimbabwe Shipping Menu',
    [{
      title: 'How can we help you today?',
      rows: await getMainMenuRows()
    }]
  );
}

function extractMessageText(message) {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.buttonsResponseMessage?.selectedButtonId ||
    message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  ).trim();
}

async function handleMainMenu(sock, phoneNumber, text, session) {
  const lowerText = text.toLowerCase();

  if (lowerText === 'menu' || lowerText === 'start' || lowerText === 'main') {
    await sendMainMenuList(sock, phoneNumber, session.userName);
    return;
  }

  switch (lowerText) {
    case '1':
    case 'book':
    case 'booking':
      await updateUserSession(phoneNumber, { state: 'BOOKING_FLOW', step: 'START' });
      await handleBookingFlow(sock, phoneNumber, text, { ...session, state: 'BOOKING_FLOW', step: 'START' });
      break;

    case '2':
    case 'pricing':
    case 'price':
    case 'prices':
      await sendPricingMessage(sock, phoneNumber);
      break;

    case '3':
    case 'track':
    case 'tracking':
      await updateUserSession(phoneNumber, { state: 'TRACKING_FLOW', step: 'ASK_TRACKING' });
      await sendMessage(sock, phoneNumber,
        await getBotMessage('tracking_prompt')
      );
      break;

    case '4':
    case 'collection':
    case 'schedule':
      await sendMessage(sock, phoneNumber, await getCollectionInfo());
      break;

    case '5':
    case 'faq':
    case 'help':
      await updateUserSession(phoneNumber, { state: 'FAQ_FLOW', step: 'CATEGORIES' });
      await handleFAQFlow(sock, phoneNumber, 'start', session);
      break;

    case '6':
    case 'contact':
    case 'agent':
    case 'speak':
      await sendMessage(sock, phoneNumber, await getBotMessage('contact'));
      break;

    default:
      await sendMainMenuList(sock, phoneNumber, session.userName);
  }
}

export async function sendMainMenuList(sock, phoneNumber, userName = null) {
  const greeting = userName ? `Hello ${userName}! 👋` : 'Hello! 👋';
  const notice = await getBotMessage('collection_notice');
  const bodyText = `${greeting}\n\n🇮🇪 *Zimbabwe Shipping - Ireland*\n\n${notice}\n\nTap the button below to choose an option.`;

  await sendListMessage(sock, phoneNumber, bodyText,
    '≡  Main Menu',
    [{ title: 'What would you like to do?', rows: await getMainMenuRows() }]
  );
}

async function getMainMenuRows() {
  return [
    { id: '1', title: '📦 Book a Shipment', description: 'Ship drums or boxes to Zimbabwe' },
    { id: '2', title: '💰 View Pricing', description: 'See our rates and what\'s included' },
    { id: '3', title: '🔍 Track Shipment', description: 'Check your shipment status' },
    { id: '4', title: '📍 Collection Areas', description: 'See where we collect from in Ireland' },
    { id: '5', title: '❓ FAQ & Help', description: 'Visit our FAQ page' },
    { id: '6', title: '🧑‍💼 Speak to an Agent', description: 'Get help from our team' }
  ];
}

async function sendPricingMessage(sock, phoneNumber) {
  const settings = await getBotSettings();
  const msg = `💰 *Ireland Pricing (EUR)*\n\n` +
    `*DRUM SHIPPING (200-220L):*\n` +
    `🥁 5+ drums: €${settings.drum_price_5_plus} per drum\n` +
    `🥁 2-4 drums: €${settings.drum_price_2_4} per drum\n` +
    `🥁 1 drum: €${settings.drum_price_1} per drum\n\n` +
    `*TRUNK/STORAGE BOX SHIPPING:*\n` +
    `📦 5+ items: €${settings.box_price_5_plus} per item\n` +
    `📦 2-4 items: €${settings.box_price_2_4} per item\n` +
    `📦 1 item: €${settings.box_price_1} per item\n\n` +
    `*ADDITIONAL SERVICES:*\n` +
    `🔒 Metal Coded Seal: €${settings.seal_price} per item\n` +
    `🚪 Door-to-Door Delivery (Zimbabwe): €${settings.door_to_door_price}\n\n` +
    `*WHAT'S INCLUDED:*\n` +
    `✅ FREE collection anywhere in Ireland\n` +
    `✅ Full tracking\n` +
    `✅ 6–8 weeks delivery\n` +
    `✅ Professional handling\n\n` +
    `*PAYMENT OPTIONS:*\n` +
    `💵 Cash on collection\n` +
    `💵 Cash on delivery\n` +
    `🏦 Bank transfer\n\n` +
    `Type *book* to start booking or *menu* for main menu.`;
  await sendMessage(sock, phoneNumber, msg);
}

async function getCollectionInfo() {
  // Fetch live route dates from Supabase if available
  let routeLines = '';
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data } = await supabase
      .from('collection_schedules')
      .select('route, pickup_date')
      .eq('country', 'Ireland')
      .order('route');

    if (data?.length) {
      routeLines = data.map(r =>
        `🔹 *${r.route}* — ${r.pickup_date && r.pickup_date !== 'Not set' ? r.pickup_date : 'Date TBC'}`
      ).join('\n');
    }
  } catch { /* fallback below */ }

  if (!routeLines) {
    routeLines = [
      '🔹 *Londonderry Route* — Date TBC',
      '🔹 *Belfast Route* — Date TBC',
      '🔹 *Cavan Route* — Date TBC',
      '🔹 *Athlone Route* — Date TBC',
      '🔹 *Limerick Route* — Date TBC',
      '🔹 *Dublin City Route* — Date TBC',
      '🔹 *Cork Route* — Date TBC',
    ].join('\n');
  }

  return `📍 *Collection Areas — Ireland*\n\n` +
    `We offer FREE collection across all of Ireland!\n\n` +
    `*Collection Routes & Next Dates:*\n${routeLines}\n\n` +
    `*How it works:*\n` +
    `1️⃣ Book your shipment\n` +
    `2️⃣ We confirm your collection date\n` +
    `3️⃣ Our driver collects from your address\n` +
    `4️⃣ Items shipped to Zimbabwe\n\n` +
    `Type *book* to start your booking or *menu* for main menu.`;
}
