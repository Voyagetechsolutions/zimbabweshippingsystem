import { updateUserSession, getUserSession } from '../services/userSession.js';
import { sendMessage } from '../utils/messageUtils.js';
import { getRouteFromPostcode } from '../menus/mainMenu.js';
import { createBookingRecords, getPickupDateForRoute } from '../services/database.js';
import {
  getDrumPrice,
  getMetalSealPrice,
  getPurchaseDrumPrice,
  calculatePricing,
  formatMoney,
  CURRENCY_SYMBOL,
  PURCHASE_DRUM_PRICES,
} from '../utils/pricingUtils.js';

const PHONE_RE = /^[\d\s\+\-\(\)]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidPhone = (s) => PHONE_RE.test(s) && s.replace(/\D/g, '').length >= 7;
const isValidEmail = (s) => EMAIL_RE.test(s);
const isYes = (s) => ['yes', 'y', '1'].includes((s || '').toLowerCase().trim());
const isNo  = (s) => ['no', 'n', '2'].includes((s || '').toLowerCase().trim());

function routeLabel(route) {
  if (!route) return 'TBC';
  return route.charAt(0) + route.slice(1).toLowerCase() + ' Route';
}

export async function handleBookingFlow(sock, phoneNumber, text, _session) {
  const lowerText = (text || '').toLowerCase().trim();

  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {}, step: null });
    const { sendMainMenuList } = await import('../handlers/messageHandler.js');
    const fresh = await getUserSession(phoneNumber);
    await sendMainMenuList(sock, phoneNumber, fresh.userName);
    return;
  }

  const session = await getUserSession(phoneNumber);
  const step = session.step || 'START';
  const bookingData = { ...(session.bookingData || {}) };

  switch (step) {
    case 'START':
      return startBooking(sock, phoneNumber, session);

    case 'USE_SAVED_OR_NEW':
      return useSavedOrNew(sock, phoneNumber, text, session);

    case 'CONFIRM_SAVED_INFO':
      return confirmSavedInfo(sock, phoneNumber, lowerText, session, bookingData);

    case 'SENDER_FIRST_NAME': {
      const v = text.trim();
      if (v.length < 2) return sendMessage(sock, phoneNumber, '❌ Please enter your first name.');
      bookingData.senderFirstName = v;
      await updateUserSession(phoneNumber, {
        bookingData, step: 'SENDER_LAST_NAME',
        userFirstName: v, userName: v.split(' ')[0],
      });
      return sendMessage(sock, phoneNumber, `Nice to meet you ${v}! 👋\n\n➡️ *And your last name?*`);
    }

    case 'SENDER_LAST_NAME': {
      const v = text.trim();
      if (v.length < 1) return sendMessage(sock, phoneNumber, '❌ Please enter your last name.');
      bookingData.senderLastName = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_EMAIL', userLastName: v });
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your email address?*');
    }

    case 'SENDER_EMAIL': {
      const v = text.trim();
      if (!isValidEmail(v)) return sendMessage(sock, phoneNumber, '❌ Please enter a valid email, e.g. name@example.com');
      bookingData.senderEmail = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_PHONE', userEmail: v });
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your phone number?*\n\n_e.g. 07123 456789_');
    }

    case 'SENDER_PHONE': {
      const v = text.trim();
      if (!isValidPhone(v)) return sendMessage(sock, phoneNumber, '❌ Please enter a valid phone number.');
      bookingData.senderPhone = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'ASK_SENDER_PHONE2', userPhone: v });
      return sendMessage(sock, phoneNumber,
        '➡️ *Add another phone number?*\n\n1️⃣ Yes\n2️⃣ No, continue'
      );
    }

    case 'ASK_SENDER_PHONE2': {
      if (isYes(text)) {
        await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_PHONE2' });
        return sendMessage(sock, phoneNumber, '➡️ *Second phone number?*');
      }
      if (isNo(text)) {
        await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_ADDRESS' });
        return sendMessage(sock, phoneNumber, '➡️ *What\'s your full pickup address in England?*\n\n_e.g. 123 Main Street_');
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'SENDER_PHONE2': {
      const v = text.trim();
      if (!isValidPhone(v)) return sendMessage(sock, phoneNumber, '❌ Please enter a valid phone number.');
      bookingData.senderPhone2 = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_ADDRESS', userPhone2: v });
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your full pickup address in England?*\n\n_e.g. 123 Main Street_');
    }

    case 'SENDER_ADDRESS': {
      const v = text.trim();
      if (v.length < 4) return sendMessage(sock, phoneNumber, '❌ Please enter your full pickup address.');
      bookingData.senderAddress = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_CITY', userAddress: v });
      return sendMessage(sock, phoneNumber, '➡️ *Which city or town?*\n\n_e.g. London, Birmingham, Manchester_');
    }

    case 'SENDER_CITY': {
      const v = text.trim();
      if (v.length < 2) return sendMessage(sock, phoneNumber, '❌ Please enter your city.');
      bookingData.senderCity = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_POSTCODE', userCity: v });
      return sendMessage(sock, phoneNumber, '➡️ *Postal code?*\n\n_Just the area code is fine — e.g. SW1, B1, M1_');
    }

    case 'SENDER_POSTCODE': {
      const postcode = text.trim().toUpperCase();
      const route = getRouteFromPostcode(postcode);

      if (route === 'RESTRICTED') {
        await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {}, step: null });
        return sendMessage(sock, phoneNumber,
          `❌ Sorry, we don't currently service the *${postcode}* area.\n\nPlease call us on +44 7584 100552 to discuss options.\n\nType *menu* to return to the main menu.`
        );
      }
      if (!route) {
        return sendMessage(sock, phoneNumber,
          `⚠️ I couldn't recognise postcode *${postcode}*. Please double-check, or call +44 7584 100552 if you need help.`
        );
      }

      bookingData.senderPostcode = postcode;
      bookingData.collectionRoute = route;

      await updateUserSession(phoneNumber, { bookingData, userPostcode: postcode });
      await sendMessage(sock, phoneNumber,
        `✅ Got it! Your collection route is *${routeLabel(route)}*.\n\n_Looking up the next collection date..._`
      );

      const pickupDate = await getPickupDateForRoute(route);
      bookingData.collectionDate = pickupDate || 'To be confirmed';

      const dateLine = pickupDate
        ? `📅 Next collection: *${pickupDate}*`
        : `📅 Collection date: *to be confirmed* — our team will arrange this with you.`;

      if (session.receiverName && session.receiverPhone) {
        await updateUserSession(phoneNumber, { bookingData, step: 'USE_SAVED_RECEIVER' });
        const saved = `${dateLine}\n\n*Step 2 of 5 — Receiver*\n\nI have a saved receiver in Zimbabwe:\n\n` +
          `👤 ${session.receiverName}\n📱 ${session.receiverPhone}\n🏠 ${session.receiverAddress}\n🏙️ ${session.receiverCity}\n\n` +
          `Use this receiver?\n\n1️⃣ Yes, same receiver\n2️⃣ No, enter a new one`;
        return sendMessage(sock, phoneNumber, saved);
      }
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_NAME' });
      return sendMessage(sock, phoneNumber,
        `${dateLine}\n\n*Step 2 of 5 — Receiver Details*\n\nWho will receive the shipment in Zimbabwe?\n\n➡️ *Receiver\'s full name?*`
      );
    }

    case 'USE_SAVED_RECEIVER': {
      if (isYes(text)) {
        bookingData.receiverName = session.receiverName;
        bookingData.receiverPhone = session.receiverPhone;
        bookingData.receiverPhone2 = session.receiverPhone2 || null;
        bookingData.receiverAddress = session.receiverAddress;
        bookingData.receiverCity = session.receiverCity;
        await updateUserSession(phoneNumber, { bookingData, step: 'ASK_DRUMS' });
        return askDrums(sock, phoneNumber);
      }
      if (isNo(text)) {
        await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_NAME' });
        return sendMessage(sock, phoneNumber, '➡️ *Receiver\'s full name?*');
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'RECEIVER_NAME': {
      const v = text.trim();
      if (v.length < 2) return sendMessage(sock, phoneNumber, '❌ Please enter the receiver\'s full name.');
      bookingData.receiverName = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_PHONE', receiverName: v });
      return sendMessage(sock, phoneNumber, '➡️ *Receiver\'s phone number in Zimbabwe?*\n\n_e.g. +263 77 123 4567_');
    }

    case 'RECEIVER_PHONE': {
      const v = text.trim();
      if (!isValidPhone(v)) return sendMessage(sock, phoneNumber, '❌ Please enter a valid phone number.');
      bookingData.receiverPhone = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'ASK_RECEIVER_PHONE2', receiverPhone: v });
      return sendMessage(sock, phoneNumber,
        '➡️ *Add another receiver phone number?*\n\n1️⃣ Yes\n2️⃣ No, continue'
      );
    }

    case 'ASK_RECEIVER_PHONE2': {
      if (isYes(text)) {
        await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_PHONE2' });
        return sendMessage(sock, phoneNumber, '➡️ *Second receiver phone number?*');
      }
      if (isNo(text)) {
        await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_ADDRESS' });
        return sendMessage(sock, phoneNumber, '➡️ *Delivery address in Zimbabwe?*');
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'RECEIVER_PHONE2': {
      const v = text.trim();
      if (!isValidPhone(v)) return sendMessage(sock, phoneNumber, '❌ Please enter a valid phone number.');
      bookingData.receiverPhone2 = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_ADDRESS', receiverPhone2: v });
      return sendMessage(sock, phoneNumber, '➡️ *Delivery address in Zimbabwe?*');
    }

    case 'RECEIVER_ADDRESS': {
      const v = text.trim();
      if (v.length < 4) return sendMessage(sock, phoneNumber, '❌ Please enter the full delivery address.');
      bookingData.receiverAddress = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_CITY', receiverAddress: v });
      return sendMessage(sock, phoneNumber,
        '➡️ *Which city in Zimbabwe?*\n\n_We deliver to main towns and major cities — e.g. Harare, Bulawayo, Mutare, Gweru._'
      );
    }

    case 'RECEIVER_CITY': {
      const v = text.trim();
      if (v.length < 2) return sendMessage(sock, phoneNumber, '❌ Please enter the delivery city.');
      bookingData.receiverCity = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'ASK_DRUMS', receiverCity: v });
      return askDrums(sock, phoneNumber);
    }

    case 'ASK_DRUMS': {
      if (isYes(text)) {
        bookingData.includeDrums = true;
        await updateUserSession(phoneNumber, { bookingData, step: 'DRUM_QUANTITY' });
        return sendMessage(sock, phoneNumber,
          `➡️ *How many drums?*\n\n_Pricing: ${formatMoney(getDrumPrice(1))} per drum_`
        );
      }
      if (isNo(text)) {
        bookingData.includeDrums = false;
        bookingData.drumQuantity = 0;
        await updateUserSession(phoneNumber, { bookingData, step: 'ASK_PURCHASE_DRUMS' });
        return askPurchaseDrums(sock, phoneNumber);
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'DRUM_QUANTITY': {
      const qty = parseInt(text, 10);
      if (isNaN(qty) || qty < 1) return sendMessage(sock, phoneNumber, '❌ Please enter a number (1 or more).');
      bookingData.drumQuantity = qty;
      await updateUserSession(phoneNumber, { bookingData, step: 'DRUMS_DESCRIPTION' });
      const unit = getDrumPrice(qty);
      await sendMessage(sock, phoneNumber, `✅ ${qty} × drum @ ${formatMoney(unit)} each = *${formatMoney(qty * unit)}*`);
      return sendMessage(sock, phoneNumber,
        `📝 *Describe your ${qty === 1 ? 'drum' : 'drums'}*\n\nWhat ${qty === 1 ? 'does it' : 'do they'} look like? (color, markings, anything that helps the driver spot ${qty === 1 ? 'it' : 'them'})\n\n_e.g. ${qty > 1 ? '"3 blue plastic drums with red lids"' : '"blue plastic drum with red lid"'}_`
      );
    }

    case 'DRUMS_DESCRIPTION': {
      const v = text.trim();
      if (v.length < 3) return sendMessage(sock, phoneNumber, '❌ Please give a short description so the driver can identify your drums.');
      bookingData.drumsDescription = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'ASK_PURCHASE_DRUMS' });
      return askPurchaseDrums(sock, phoneNumber);
    }

    case 'ASK_PURCHASE_DRUMS': {
      if (isYes(text)) {
        bookingData.purchaseDrums = true;
        await updateUserSession(phoneNumber, { bookingData, step: 'PURCHASE_DRUM_TYPE' });
        return sendMessage(sock, phoneNumber,
          `➡️ *Which drum type?*\n\n1️⃣ 🛢️ Metal Drum — ${formatMoney(PURCHASE_DRUM_PRICES.metal)} each\n2️⃣ 🛢️ Plastic Barrel — ${formatMoney(PURCHASE_DRUM_PRICES.plastic)} each`
        );
      }
      if (isNo(text)) {
        bookingData.purchaseDrums = false;
        bookingData.purchaseDrumType = null;
        bookingData.purchaseDrumQuantity = 0;
        await updateUserSession(phoneNumber, { bookingData, step: 'ASK_OTHER_ITEMS' });
        return askOtherItems(sock, phoneNumber);
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'PURCHASE_DRUM_TYPE': {
      if (text.trim() === '1') {
        bookingData.purchaseDrumType = 'metal';
      } else if (text.trim() === '2') {
        bookingData.purchaseDrumType = 'plastic';
      } else {
        return sendMessage(sock, phoneNumber, '❌ Please reply *1* (metal) or *2* (plastic).');
      }
      await updateUserSession(phoneNumber, { bookingData, step: 'PURCHASE_DRUM_QUANTITY' });
      return sendMessage(sock, phoneNumber, `➡️ *How many ${bookingData.purchaseDrumType === 'metal' ? 'metal drums' : 'plastic barrels'} would you like to buy?*`);
    }

    case 'PURCHASE_DRUM_QUANTITY': {
      const qty = parseInt(text, 10);
      if (isNaN(qty) || qty < 1) return sendMessage(sock, phoneNumber, '❌ Please enter a number (1 or more).');
      bookingData.purchaseDrumQuantity = qty;
      const unit = getPurchaseDrumPrice(bookingData.purchaseDrumType);
      await sendMessage(sock, phoneNumber, `✅ ${qty} × ${bookingData.purchaseDrumType === 'metal' ? 'metal drum' : 'plastic barrel'} @ ${formatMoney(unit)} = *${formatMoney(qty * unit)}*`);
      await updateUserSession(phoneNumber, { bookingData, step: 'ASK_OTHER_ITEMS' });
      return askOtherItems(sock, phoneNumber);
    }

    case 'ASK_OTHER_ITEMS': {
      if (isYes(text)) {
        bookingData.includeBoxes = true;
        await updateUserSession(phoneNumber, { bookingData, step: 'OTHER_ITEMS_DESC' });
        return sendMessage(sock, phoneNumber,
          '➡️ *What are you shipping?*\n\n_e.g. 3 boxes of clothes, 1 suitcase, small furniture, electronics..._\n\nOur agent will contact you with a personalised quote within 24 hours.'
        );
      }
      if (isNo(text)) {
        bookingData.includeBoxes = false;
        bookingData.boxesDescription = null;
        return afterItemsSelected(sock, phoneNumber, bookingData);
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'OTHER_ITEMS_DESC': {
      const v = text.trim();
      if (v.length < 3) return sendMessage(sock, phoneNumber, '❌ Please give a short description of what you\'re shipping.');
      bookingData.boxesDescription = v;
      return afterItemsSelected(sock, phoneNumber, bookingData);
    }

    case 'ASK_METAL_SEAL': {
      if (isYes(text)) {
        bookingData.wantMetalSeal = true;
      } else if (isNo(text)) {
        bookingData.wantMetalSeal = false;
      } else {
        return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
      }
      await updateUserSession(phoneNumber, { bookingData, step: 'REVIEW_SUMMARY' });
      return showSummary(sock, phoneNumber, bookingData);
    }

    case 'REVIEW_SUMMARY': {
      if (text.trim() === '1' || lowerText === 'continue') {
        const hasPricedItems =
          (bookingData.includeDrums && bookingData.drumQuantity > 0) ||
          (bookingData.purchaseDrums && bookingData.purchaseDrumQuantity > 0);
        if (!hasPricedItems) {
          bookingData.paymentMethod = 'agentQuote';
          await updateUserSession(phoneNumber, { bookingData, step: 'CONFIRM_BOOKING' });
          return sendMessage(sock, phoneNumber,
            '📞 Since this is a custom-quote request, our agent will confirm payment with you when they call.\n\n*Step 5 of 5 — Confirm*\n\n1️⃣ ✅ Submit booking\n2️⃣ ✏️ Start over'
          );
        }
        await updateUserSession(phoneNumber, { bookingData, step: 'PAYMENT_METHOD' });
        return showPaymentOptions(sock, phoneNumber, bookingData);
      }
      if (text.trim() === '2' || lowerText === 'edit' || lowerText === 'restart') {
        await updateUserSession(phoneNumber, { state: 'BOOKING_FLOW', bookingData: {}, step: 'START' });
        return handleBookingFlow(sock, phoneNumber, '', await getUserSession(phoneNumber));
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* to continue or *2* to start over.');
    }

    case 'PAYMENT_METHOD': {
      const choice = text.trim();
      if (!['1', '2', '3'].includes(choice)) {
        return sendMessage(sock, phoneNumber, '❌ Please reply *1*, *2*, or *3*.');
      }
      const map = { '1': 'standard', '2': 'cashOnCollection', '3': 'payOnArrival' };
      bookingData.paymentMethod = map[choice];
      await updateUserSession(phoneNumber, { bookingData, step: 'CONFIRM_BOOKING' });

      const pricing = calculatePricing(bookingData);
      const label = ({
        standard: '💳 Standard payment',
        cashOnCollection: '💵 Cash on Collection',
        payOnArrival: '⏳ Pay on Arrival',
      })[bookingData.paymentMethod];

      let msg = `✅ Selected: *${label}*\n\n`;
      msg += `*Total to pay: ${formatMoney(pricing.finalTotal)}*\n`;
      if (pricing.payOnArrivalPremium > 0) {
        msg += `_(20% premium of ${formatMoney(pricing.payOnArrivalPremium)} added)_\n`;
      }
      msg += `\n*Step 5 of 5 — Confirm*\n\n1️⃣ ✅ Submit booking\n2️⃣ ✏️ Start over`;
      return sendMessage(sock, phoneNumber, msg);
    }

    case 'CONFIRM_BOOKING': {
      if (text.trim() === '1' || lowerText === 'confirm' || lowerText === 'submit') {
        return submitBooking(sock, phoneNumber, bookingData);
      }
      if (text.trim() === '2' || lowerText === 'edit' || lowerText === 'restart') {
        await updateUserSession(phoneNumber, { state: 'BOOKING_FLOW', bookingData: {}, step: 'START' });
        return handleBookingFlow(sock, phoneNumber, '', await getUserSession(phoneNumber));
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* to submit or *2* to start over.');
    }

    default:
      await updateUserSession(phoneNumber, { state: 'BOOKING_FLOW', bookingData: {}, step: 'START' });
      return handleBookingFlow(sock, phoneNumber, '', await getUserSession(phoneNumber));
  }
}

// --- Step helpers --- //

async function startBooking(sock, phoneNumber, session) {
  const intro = `📦 *Book your shipment* — 5 quick steps\n\nYou can type *cancel* anytime to return to the main menu.\n\n*Step 1 of 5 — Your Details*`;

  const hasSaved = session.userFirstName && session.userEmail;
  if (hasSaved) {
    await updateUserSession(phoneNumber, { step: 'USE_SAVED_OR_NEW' });
    const display = `Welcome back ${session.userFirstName}! 👋\n\nI have your details saved:\n\n` +
      `👤 ${session.userFirstName}${session.userLastName ? ' ' + session.userLastName : ''}\n` +
      `📧 ${session.userEmail}\n` +
      (session.userPhone ? `📱 ${session.userPhone}\n` : '') +
      (session.userAddress ? `🏠 ${session.userAddress}\n` : '') +
      (session.userCity ? `🏙️ ${session.userCity}\n` : '') +
      (session.userPostcode ? `📮 ${session.userPostcode}\n` : '');
    return sendMessage(sock, phoneNumber,
      `${intro}\n\n${display}\nUse these details?\n\n1️⃣ ⚡ Yes, use saved\n2️⃣ ✏️ No, enter fresh`
    );
  }

  await updateUserSession(phoneNumber, { step: 'SENDER_FIRST_NAME', bookingData: {} });
  return sendMessage(sock, phoneNumber, `${intro}\n\nWhere should we collect from?\n\n➡️ *What\'s your first name?*`);
}

async function useSavedOrNew(sock, phoneNumber, text, session) {
  if (text.trim() === '1' || isYes(text)) {
    const filled = {
      senderFirstName: session.userFirstName,
      senderLastName: session.userLastName || '',
      senderEmail: session.userEmail,
      senderPhone: session.userPhone || '',
      senderPhone2: session.userPhone2 || null,
      senderAddress: session.userAddress || '',
      senderCity: session.userCity || '',
      senderPostcode: session.userPostcode || '',
    };
    await updateUserSession(phoneNumber, { bookingData: filled, step: 'CONFIRM_SAVED_INFO' });
    return sendMessage(sock, phoneNumber,
      'Are these details still correct?\n\n1️⃣ ✅ Yes, looks good\n2️⃣ ✏️ No, update them'
    );
  }
  if (text.trim() === '2' || isNo(text)) {
    await updateUserSession(phoneNumber, { bookingData: {}, step: 'SENDER_FIRST_NAME' });
    return sendMessage(sock, phoneNumber, 'No problem — let\'s start fresh.\n\n➡️ *What\'s your first name?*');
  }
  return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
}

async function confirmSavedInfo(sock, phoneNumber, lowerText, session, bookingData) {
  if (lowerText === '1' || isYes(lowerText)) {
    if (!bookingData.senderPhone) {
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_PHONE' });
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your phone number?*\n\n_e.g. 07123 456789_');
    }
    if (!bookingData.senderAddress) {
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_ADDRESS' });
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your full pickup address in England?*');
    }
    if (!bookingData.senderCity) {
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_CITY' });
      return sendMessage(sock, phoneNumber, '➡️ *Which city or town?*');
    }
    if (!bookingData.senderPostcode) {
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_POSTCODE' });
      return sendMessage(sock, phoneNumber, '➡️ *Postal code?*');
    }

    // Have everything — re-detect route and pickup date.
    const route = getRouteFromPostcode(bookingData.senderPostcode);
    if (route && route !== 'RESTRICTED') {
      bookingData.collectionRoute = route;
      bookingData.collectionDate = await getPickupDateForRoute(route) || 'To be confirmed';
    }

    if (session.receiverName && session.receiverPhone) {
      await updateUserSession(phoneNumber, { bookingData, step: 'USE_SAVED_RECEIVER' });
      const saved = `*Step 2 of 5 — Receiver*\n\nI have a saved receiver in Zimbabwe:\n\n` +
        `👤 ${session.receiverName}\n📱 ${session.receiverPhone}\n🏠 ${session.receiverAddress}\n🏙️ ${session.receiverCity}\n\n` +
        `Use this receiver?\n\n1️⃣ Yes, same receiver\n2️⃣ No, enter a new one`;
      return sendMessage(sock, phoneNumber, saved);
    }
    await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_NAME' });
    return sendMessage(sock, phoneNumber, '*Step 2 of 5 — Receiver Details*\n\n➡️ *Receiver\'s full name?*');
  }
  if (lowerText === '2' || isNo(lowerText)) {
    await updateUserSession(phoneNumber, { bookingData: {}, step: 'SENDER_FIRST_NAME' });
    return sendMessage(sock, phoneNumber, 'OK, let\'s update them.\n\n➡️ *What\'s your first name?*');
  }
  return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
}

async function askDrums(sock, phoneNumber) {
  return sendMessage(sock, phoneNumber,
    '*Step 3 of 5 — What are you shipping?*\n\n🥁 *Drums (200–220L)?*\n\n1️⃣ Yes\n2️⃣ No'
  );
}

async function askPurchaseDrums(sock, phoneNumber) {
  return sendMessage(sock, phoneNumber,
    `🛢️ *Need to purchase drums from us?*\n\nWe can supply drums for you at collection.\n\n• Metal Drum: ${formatMoney(PURCHASE_DRUM_PRICES.metal)} each\n• Plastic Barrel: ${formatMoney(PURCHASE_DRUM_PRICES.plastic)} each\n\n1️⃣ Yes\n2️⃣ No`
  );
}

async function askOtherItems(sock, phoneNumber) {
  return sendMessage(sock, phoneNumber,
    '🎁 *Anything else?* (clothes, suitcases, small furniture, electronics...)\n\nOur agent will quote these separately.\n\n1️⃣ Yes\n2️⃣ No'
  );
}

async function afterItemsSelected(sock, phoneNumber, bookingData) {
  if (!bookingData.includeDrums && !bookingData.purchaseDrums && !bookingData.includeBoxes) {
    bookingData.includeDrums = undefined;
    bookingData.purchaseDrums = undefined;
    bookingData.includeBoxes = undefined;
    await updateUserSession(phoneNumber, { bookingData, step: 'ASK_DRUMS' });
    await sendMessage(sock, phoneNumber, '❌ You haven\'t selected anything to ship. Let\'s try again.');
    return askDrums(sock, phoneNumber);
  }

  // Metal seal only relevant if drums present.
  if (bookingData.includeDrums) {
    await updateUserSession(phoneNumber, { bookingData, step: 'ASK_METAL_SEAL' });
    const sealUnit = getMetalSealPrice();
    return sendMessage(sock, phoneNumber,
      `🔒 *Add metal coded seals?*\n\nSecure coded seals for extra peace of mind — *${formatMoney(sealUnit)} per drum*.\n\n1️⃣ Yes, add seals\n2️⃣ No thanks`
    );
  }

  bookingData.wantMetalSeal = false;
  await updateUserSession(phoneNumber, { bookingData, step: 'REVIEW_SUMMARY' });
  return showSummary(sock, phoneNumber, bookingData);
}

async function showSummary(sock, phoneNumber, bookingData) {
  const pricing = calculatePricing(bookingData);

  let msg = `*Step 4 of 5 — Booking Summary*\n\n`;

  msg += `*📍 Collection*\n`;
  msg += `${bookingData.senderFirstName} ${bookingData.senderLastName}\n`;
  msg += `${bookingData.senderPhone}${bookingData.senderPhone2 ? ' / ' + bookingData.senderPhone2 : ''}\n`;
  msg += `${bookingData.senderEmail}\n`;
  msg += `${bookingData.senderAddress}, ${bookingData.senderCity}, ${bookingData.senderPostcode}\n`;
  if (bookingData.collectionRoute) msg += `🚚 Route: ${routeLabel(bookingData.collectionRoute)}\n`;
  if (bookingData.collectionDate) msg += `📅 Next collection: ${bookingData.collectionDate}\n`;
  msg += `\n`;

  msg += `*🇿🇼 Delivery*\n`;
  msg += `${bookingData.receiverName}\n`;
  msg += `${bookingData.receiverPhone}${bookingData.receiverPhone2 ? ' / ' + bookingData.receiverPhone2 : ''}\n`;
  msg += `${bookingData.receiverAddress}, ${bookingData.receiverCity}, Zimbabwe\n\n`;

  msg += `*📦 Items*\n`;
  if (pricing.drumQty > 0) {
    msg += `🥁 ${pricing.drumQty} × drum @ ${formatMoney(pricing.drumUnit)} = *${formatMoney(pricing.drumTotal)}*\n`;
    if (bookingData.drumsDescription) msg += `   _${bookingData.drumsDescription}_\n`;
  }
  if (pricing.purchaseDrumQty > 0) {
    const label = pricing.purchaseDrumType === 'metal' ? 'Metal Drum' : 'Plastic Barrel';
    msg += `🛢️ ${pricing.purchaseDrumQty} × ${label} @ ${formatMoney(pricing.purchaseDrumUnit)} = *${formatMoney(pricing.purchaseDrumTotal)}*\n`;
  }
  if (bookingData.includeBoxes) {
    msg += `🎁 Other items: ${bookingData.boxesDescription}\n   _(agent will quote separately)_\n`;
  }
  if (pricing.sealQty > 0) {
    msg += `🔒 Metal seals × ${pricing.sealQty} = *${formatMoney(pricing.sealCost)}*\n`;
  }
  msg += `\n`;

  if (pricing.baseTotal > 0) {
    msg += `*Subtotal: ${formatMoney(pricing.baseTotal)}*\n`;
    if (bookingData.includeBoxes) msg += `_(other items quoted separately)_\n`;
  } else {
    msg += `*Subtotal: agent will quote*\n`;
  }
  msg += `\n✅ FREE collection across England\n✅ Full tracking included\n\n`;
  msg += `1️⃣ Continue to payment\n2️⃣ Start over`;

  return sendMessage(sock, phoneNumber, msg);
}

async function showPaymentOptions(sock, phoneNumber, bookingData) {
  const standard = calculatePricing({ ...bookingData, paymentMethod: 'standard' });
  const cash = calculatePricing({ ...bookingData, paymentMethod: 'cashOnCollection' });
  const arrival = calculatePricing({ ...bookingData, paymentMethod: 'payOnArrival' });

  let msg = `*Step 5 of 5 — Payment Method*\n\nHow would you like to pay?\n\n`;
  msg += `1️⃣ 💳 *Standard Payment* — ${formatMoney(standard.finalTotal)}\n   _Pay by card or bank transfer_\n\n`;
  msg += `2️⃣ 💵 *Cash on Collection* — ${formatMoney(cash.finalTotal)}\n   _Pay cash when we collect_\n\n`;
  msg += `3️⃣ ⏳ *Pay on Arrival* — ${formatMoney(arrival.finalTotal)}\n   _Pay when shipment reaches Zimbabwe (+20% premium)_\n\nReply with *1*, *2*, or *3*.`;

  return sendMessage(sock, phoneNumber, msg);
}

async function submitBooking(sock, phoneNumber, bookingData) {
  await sendMessage(sock, phoneNumber, '⏳ Submitting your booking...');
  try {
    const pricing = calculatePricing(bookingData);
    const { trackingNumber, receiptNumber } = await createBookingRecords(phoneNumber, bookingData, pricing);

    const current = await getUserSession(phoneNumber);
    const history = [...(current.bookingHistory || []), {
      trackingNumber,
      receiptNumber,
      date: new Date().toISOString(),
      drums: bookingData.drumQuantity || 0,
      purchasedDrums: bookingData.purchaseDrumQuantity || 0,
    }];

    await updateUserSession(phoneNumber, {
      state: 'MAIN_MENU',
      bookingData: {},
      step: null,
      bookingHistory: history,
      receiverName: bookingData.receiverName,
      receiverPhone: bookingData.receiverPhone,
      receiverPhone2: bookingData.receiverPhone2 || null,
      receiverAddress: bookingData.receiverAddress,
      receiverCity: bookingData.receiverCity,
    });

    let msg = `🎉 *Booking confirmed!*\n\n`;
    msg += `📦 Tracking: *${trackingNumber}*\n`;
    if (receiptNumber) msg += `🧾 Receipt: *${receiptNumber}*\n`;
    if (pricing.finalTotal > 0) msg += `💰 Amount: *${formatMoney(pricing.finalTotal)}*\n`;
    msg += `\n📞 We'll be in touch within 24 hours to confirm your collection.\n\n`;
    msg += `Type *track* to track your shipment or *menu* for the main menu.`;

    return sendMessage(sock, phoneNumber, msg);
  } catch (err) {
    console.error('Booking submission failed:', err);
    return sendMessage(sock, phoneNumber,
      '❌ Sorry, something went wrong while submitting your booking. Please try again, or call us on +44 7584 100552 for help.\n\nType *menu* to return to the main menu.'
    );
  }
}
