import { getUserSession, updateUserSession } from '../services/userSession.js';
import { getMainMenu, getPricingMenu, getBookingMenu } from '../menus/mainMenu.js';
import { handleBookingFlow } from '../flows/bookingFlow.js';
import { handleTrackingFlow } from '../flows/trackingFlow.js';
import { handlePricingInquiry } from '../flows/pricingFlow.js';
import { handleFAQFlow } from '../flows/faqFlow.js';
import { sendMessage } from '../utils/messageUtils.js';

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
  const welcomeMsg = `🇮🇪 *Welcome to Zimbabwe Shipping*
_Ireland Branch_

Thank you for contacting us! We're excited to serve you.

📢 *Important Notice:*
Collections in Ireland will commence in *August 2026*

*Our Services:*
✈️ Ship drums, trunks & boxes to Zimbabwe
🚚 FREE collection across Ireland
📦 Full tracking & insurance
💰 Competitive pricing with volume discounts

*How can we help you today?*

1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 📞 Contact Us

_Reply with a number (1-6) or describe what you need._`;

  await sendMessage(sock, phoneNumber, welcomeMsg);
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
    await sendMessage(sock, phoneNumber, getMainMenu(session.userName));
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
      await sendMessage(sock, phoneNumber, getCollectionInfo());
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

function getCollectionInfo() {
  return `📍 *Collection Schedule - Ireland*

We offer FREE collection across all of Ireland!

*Collection Routes:*
🔹 Londonderry Route
🔹 Belfast Route
🔹 Cavan Route
🔹 Athlone Route
🔹 Limerick Route
🔹 Dublin City Route
🔹 Cork Route

Collections are scheduled based on your location. When you book, we'll automatically assign the next available collection date for your area.

*How it works:*
1. Book your shipment
2. We'll confirm your collection date
3. Our driver arrives at your address
4. Items are collected and shipped to Zimbabwe

Type *book* to start your booking or *menu* for main menu.`;
}

function getContactInfo() {
  return `📞 *Contact Us*

*WhatsApp:* You're already here! 😊

*Email:* info@zimbabweshipping.com

*Phone:* +353 (Ireland number)

*Website:* www.zimbabweshipping.com

*Office Hours:*
Monday - Friday: 9:00 AM - 6:00 PM
Saturday: 10:00 AM - 4:00 PM
Sunday: Closed

We typically respond within 1-2 hours during business hours.

Type *menu* to return to main menu.`;
}
