import { getUserSession, updateUserSession } from '../services/userSession.js';
import { getMainMenu, getPricingMenu, getBookingMenu } from '../menus/mainMenu.js';
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
  const bodyText = `🇮🇪 *Welcome to Zimbabwe Shipping*\n_Ireland Branch_\n\nThank you for contacting us. We're ready to assist you.\n\n📢 *Collections in Ireland begin August 2026*\n\nTap the button below to get started.`;

  await sendListMessage(
    sock,
    phoneNumber,
    bodyText,
    '≡  Zimbabwe Shipping Menu',
    [{
      title: 'How can we help you today?',
      rows: [
        { id: '1', title: '📦 Book a Shipment', description: 'Ship drums or boxes to Zimbabwe' },
        { id: '2', title: '💰 View Pricing', description: 'See our rates and what\'s included' },
        { id: '3', title: '🔍 Track Shipment', description: 'Check your shipment status' },
        { id: '4', title: '📍 Collection Areas', description: 'See where we collect from in Ireland' },
        { id: '5', title: '❓ FAQ & Help', description: 'Common questions answered' },
        { id: '6', title: '📞 Contact Us', description: 'Get in touch with our team' }
      ]
    }]
  );
}

function extractMessageText(message) {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    // Button reply — user tapped a button
    message.message?.buttonsResponseMessage?.selectedButtonId ||
    // List reply — user selected a list row
    message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
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

  // Handle menu options (works for both typed numbers AND list selection IDs)
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
      await sendMainMenuList(sock, phoneNumber, session.userName);
  }
}

export async function sendMainMenuList(sock, phoneNumber, userName = null) {
  const greeting = userName ? `Hello ${userName}! 👋` : 'Hello! 👋';
  const bodyText = `${greeting}\n\n🇮🇪 *Zimbabwe Shipping - Ireland*\n\n📢 Collections commence in *August 2026*\n\nTap the button below to choose an option.`;

  await sendListMessage(
    sock,
    phoneNumber,
    bodyText,
    '≡  Main Menu',
    [{
      title: 'What would you like to do?',
      rows: [
        { id: '1', title: '📦 Book a Shipment', description: 'Ship drums or boxes to Zimbabwe' },
        { id: '2', title: '💰 View Pricing', description: 'See our rates and what\'s included' },
        { id: '3', title: '🔍 Track Shipment', description: 'Check your shipment status' },
        { id: '4', title: '📍 Collection Areas', description: 'See where we collect from in Ireland' },
        { id: '5', title: '❓ FAQ & Help', description: 'Common questions answered' },
        { id: '6', title: '📞 Contact Us', description: 'Get in touch with our team' }
      ]
    }]
  );
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
