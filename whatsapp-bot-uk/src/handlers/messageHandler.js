import { getUserSession, updateUserSession } from '../services/userSession.js';
import { getMainMenu } from '../menus/mainMenu.js';
import { handleBookingFlow } from '../flows/bookingFlow.js';
import { handleTrackingFlow } from '../flows/trackingFlow.js';
import { handlePricingInquiry } from '../flows/pricingFlow.js';
import { handleFAQFlow } from '../flows/faqFlow.js';
import { sendMessage, sendListMessage } from '../utils/messageUtils.js';

export async function handleMessage(sock, message) {
  try {
    const phoneNumber = message.key.remoteJid;
    
    // Ignore group messages - only respond to individual chats
    if (phoneNumber.endsWith('@g.us')) {
      console.log('Ignoring group message from:', phoneNumber);
      return;
    }
    
    const messageText = extractMessageText(message);
    
    if (!messageText) return;

    // Get or create user session
    const session = await getUserSession(phoneNumber);
    
    // If this is the first message from this user, send welcome message
    if (!session.hasBeenGreeted) {
      await sendWelcomeMessage(sock, phoneNumber);
      await updateUserSession(phoneNumber, { hasBeenGreeted: true });
      return;
    }
    
    // Handle different conversation states
    if (session.state === 'BOOKING_FLOW') {
      await handleBookingFlow(sock, phoneNumber, messageText, session);
    } else if (session.state === 'TRACKING_FLOW') {
      await handleTrackingFlow(sock, phoneNumber, messageText, session);
    } else if (session.state === 'FAQ_FLOW') {
      await handleFAQFlow(sock, phoneNumber, messageText, session);
    } else {
      // Main menu handling
      await handleMainMenu(sock, phoneNumber, messageText, session);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await sendMessage(
      sock,
      message.key.remoteJid,
      '❌ Sorry, something went wrong. Please try again or type *menu* to start over.'
    );
  }
}

async function sendWelcomeMessage(sock, phoneNumber) {
  await sendMainMenuList(sock, phoneNumber);
}

export async function sendMainMenuList(sock, phoneNumber, userName = null) {
  const greeting = userName ? `Hello ${userName}! 👋` : 'Hello! 👋';
  const bodyText = `${greeting}\n\n🇬🇧 *Zimbabwe Shipping — UK*\n\n` +
    `✈️ Ship drums, trunks & boxes to Zimbabwe\n` +
    `🚚 FREE collection across England\n` +
    `📦 Full tracking end-to-end\n` +
    `💰 Competitive pricing with volume discounts\n\n` +
    `Tap the button below to choose an option.`;

  await sendListMessage(sock, phoneNumber, bodyText,
    '≡  Main Menu',
    [{ title: 'What would you like to do?', rows: getMainMenuRows() }]
  );
}

function getMainMenuRows() {
  return [
    { id: '1', title: '📦 Book a Shipment', description: 'Ship drums, boxes or other items to Zimbabwe' },
    { id: '2', title: '💰 View Pricing', description: 'See our rates and what\'s included' },
    { id: '3', title: '🔍 Track Shipment', description: 'Check your shipment status' },
    { id: '4', title: '📍 Collection Areas', description: 'See where we collect from in England' },
    { id: '5', title: '❓ FAQ & Help', description: 'Get answers to common questions' },
    { id: '6', title: '📞 Contact Us', description: 'Speak to our team' }
  ];
}

function extractMessageText(message) {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    ''
  ).trim();
}

async function handleMainMenu(sock, phoneNumber, text, session) {
  const lowerText = text.toLowerCase();
  
  // Menu request
  if (lowerText === 'menu' || lowerText === 'start' || lowerText === 'main') {
    await sendMainMenuList(sock, phoneNumber, session.userName);
    return;
  }

  // Handle menu options
  switch (lowerText) {
    case '1':
    case 'book':
    case 'booking':
      await updateUserSession(phoneNumber, { state: 'BOOKING_FLOW', step: 'START' });
      await sendMessage(sock, phoneNumber, getBookingMenu());
      break;

    case '2':
    case 'pricing':
    case 'price':
    case 'prices':
      await handlePricingInquiry(sock, phoneNumber, session);
      break;

    case '3':
    case 'track':
    case 'tracking':
      await updateUserSession(phoneNumber, { state: 'TRACKING_FLOW', step: 'ASK_TRACKING' });
      await sendMessage(
        sock,
        phoneNumber,
        '📦 *Track Your Shipment*\n\nPlease enter your tracking number (e.g., ZS-ABC12345):'
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
    case 'support':
      await sendMessage(sock, phoneNumber, getContactInfo());
      break;

    default:
      await sendMessage(
        sock,
        phoneNumber,
        `I didn't quite understand that. Type *menu* to see available options.`
      );
  }
}

function getBookingMenu() {
  return `📦 *Book Your Shipment*

Let's get started! I'll guide you through the booking process step by step.

*What we'll need:*
✅ Your details (name, phone, email, address)
✅ Receiver details in Zimbabwe
✅ What you're shipping (drums/boxes)
✅ Payment preference

Type *continue* to start or *cancel* to go back.`;
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
      .eq('country', 'England')
      .order('route');

    if (data?.length) {
      routeLines = data.map(r =>
        `🔹 *${r.route}* — ${r.pickup_date && r.pickup_date !== 'Not set' ? r.pickup_date : 'Date TBC'}`
      ).join('\n');
    }
  } catch { /* fallback below */ }

  if (!routeLines) {
    routeLines = [
      '🔹 *London Route* — Date TBC',
      '🔹 *Birmingham Route* — Date TBC',
      '🔹 *Manchester Route* — Date TBC',
      '🔹 *Leeds Route* — Date TBC',
      '🔹 *Nottingham Route* — Date TBC',
      '🔹 *Northampton Route* — Date TBC',
      '🔹 *Bournemouth Route* — Date TBC',
      '🔹 *Brighton Route* — Date TBC',
      '🔹 *Southend Route* — Date TBC',
    ].join('\n');
  }

  return `📍 *Collection Areas — England*\n\n` +
    `We offer FREE collection across England!\n\n` +
    `*Collection Routes & Next Dates:*\n${routeLines}\n\n` +
    `*How it works:*\n` +
    `1️⃣ Book your shipment\n` +
    `2️⃣ We confirm your collection date\n` +
    `3️⃣ Our driver collects from your address\n` +
    `4️⃣ Items shipped to Zimbabwe\n\n` +
    `Type *book* to start your booking or *menu* for main menu.`;
}

function getContactInfo() {
  return `📞 *Contact Us*

*WhatsApp:* You're already here! 😊

*Email:* support@zimbabwe-shipping.co.uk

*Phone:* 
📱 +44 7984 099041
📱 +44 7584 100552

*Website:* www.zimbabweshipping.com

*Office Hours:*
Monday - Friday: 9:00 AM - 6:00 PM
Saturday: 10:00 AM - 4:00 PM
Sunday: Closed

We typically respond within 1-2 hours during business hours.

Type *menu* to return to main menu.`;
}

export { getBookingMenu };
