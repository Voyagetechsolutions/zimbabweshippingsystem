import { updateUserSession, getUserSession } from '../utils/sessions.js';
import { getSupabase, createBookingRecords } from '../utils/database.js';
import {
  getBotSettings,
  getDrumPrice,
  getPurchaseDrumPrice,
  calculatePricing,
  formatMoney,
  CURRENCY_SYMBOL,
  CASH_DISCOUNT_PER_DRUM,
} from '../utils/pricing.js';

async function sendMessage(sock, phoneNumber, text) {
  await sock.sendMessage(phoneNumber, { text });
}

// ── Ireland city → route mapping ─────────────────────────────────────────────
function getIrelandCities() {
  return [
    'LARNE', 'BALLYCLARE', 'BALLYMENA', 'BALLYMONEY', 'KILREA',
    'COLERAINE', 'LONDONDERRY', 'LIFFORD', 'OMAGH', 'COOKSTOWN', 'CARRICKFERGUS',
    'BELFAST', 'BANGOR', 'COMBER', 'LISBURN', 'NEWRY', 'NEWTOWNWARDS',
    'DUNMURRY', 'LURGAN', 'PORTADOWN', 'BANBRIDGE', 'MOY', 'DUNGANNON', 'ARMAGH',
    'MAYNOOTH', 'ASHBOURNE', 'SWORDS', 'SKERRIES', 'DROGHEDA', 'DUNDALK',
    'CAVAN', 'VIRGINIA', 'KELLS', 'NAVAN', 'TRIM',
    'MULLINGAR', 'LONGFORD', 'ROSCOMMON', 'BOYLE', 'SLIGO', 'BALLINA',
    'SWINFORD', 'CASTLEBAR', 'TUAM', 'GALWAY', 'ATHENRY', 'ATHLONE',
    'NEWBRIDGE', 'PORTLAOISE', 'ROSCREA', 'LIMERICK', 'ENNIS', 'DOOLIN',
    'LOUGHREA', 'BALLINASLOE', 'TULLAMORE',
    'SANDYFORD', 'RIALTO', 'BALLYMOUNT', 'CABRA', 'BEAUMONT', 'MALAHIDE',
    'PORTMARNOCK', 'DALKEY', 'SHANKILL', 'BRAY', 'DUBLIN',
    'CASHEL', 'FERMOY', 'CORK', 'DUNGARVAN', 'WATERFORD', 'NEW ROSS',
    'WEXFORD', 'GOREY', 'GREYSTONES',
  ];
}

function getCityToRouteMap() {
  return {
    'LARNE': 'LONDONDERRY', 'BALLYCLARE': 'LONDONDERRY', 'BALLYMENA': 'LONDONDERRY',
    'BALLYMONEY': 'LONDONDERRY', 'KILREA': 'LONDONDERRY', 'COLERAINE': 'LONDONDERRY',
    'LONDONDERRY': 'LONDONDERRY', 'LIFFORD': 'LONDONDERRY', 'OMAGH': 'LONDONDERRY',
    'COOKSTOWN': 'LONDONDERRY', 'CARRICKFERGUS': 'LONDONDERRY',
    'BELFAST': 'BELFAST', 'BANGOR': 'BELFAST', 'COMBER': 'BELFAST',
    'LISBURN': 'BELFAST', 'NEWRY': 'BELFAST', 'NEWTOWNWARDS': 'BELFAST',
    'DUNMURRY': 'BELFAST', 'LURGAN': 'BELFAST', 'PORTADOWN': 'BELFAST',
    'BANBRIDGE': 'BELFAST', 'MOY': 'BELFAST', 'DUNGANNON': 'BELFAST', 'ARMAGH': 'BELFAST',
    'MAYNOOTH': 'CAVAN', 'ASHBOURNE': 'CAVAN', 'SWORDS': 'CAVAN',
    'SKERRIES': 'CAVAN', 'DROGHEDA': 'CAVAN', 'DUNDALK': 'CAVAN',
    'CAVAN': 'CAVAN', 'VIRGINIA': 'CAVAN', 'KELLS': 'CAVAN', 'NAVAN': 'CAVAN', 'TRIM': 'CAVAN',
    'MULLINGAR': 'ATHLONE', 'LONGFORD': 'ATHLONE', 'ROSCOMMON': 'ATHLONE',
    'BOYLE': 'ATHLONE', 'SLIGO': 'ATHLONE', 'BALLINA': 'ATHLONE',
    'SWINFORD': 'ATHLONE', 'CASTLEBAR': 'ATHLONE', 'TUAM': 'ATHLONE',
    'GALWAY': 'ATHLONE', 'ATHENRY': 'ATHLONE', 'ATHLONE': 'ATHLONE',
    'NEWBRIDGE': 'LIMERICK', 'PORTLAOISE': 'LIMERICK', 'ROSCREA': 'LIMERICK',
    'LIMERICK': 'LIMERICK', 'ENNIS': 'LIMERICK', 'DOOLIN': 'LIMERICK',
    'LOUGHREA': 'LIMERICK', 'BALLINASLOE': 'LIMERICK', 'TULLAMORE': 'LIMERICK',
    'SANDYFORD': 'DUBLIN CITY', 'RIALTO': 'DUBLIN CITY', 'BALLYMOUNT': 'DUBLIN CITY',
    'CABRA': 'DUBLIN CITY', 'BEAUMONT': 'DUBLIN CITY', 'MALAHIDE': 'DUBLIN CITY',
    'PORTMARNOCK': 'DUBLIN CITY', 'DALKEY': 'DUBLIN CITY', 'SHANKILL': 'DUBLIN CITY',
    'BRAY': 'DUBLIN CITY', 'DUBLIN': 'DUBLIN CITY',
    'CASHEL': 'CORK', 'FERMOY': 'CORK', 'CORK': 'CORK',
    'DUNGARVAN': 'CORK', 'WATERFORD': 'CORK', 'NEW ROSS': 'CORK',
    'WEXFORD': 'CORK', 'GOREY': 'CORK', 'GREYSTONES': 'CORK',
  };
}

// Validation helpers
const isValidPhone = (s) => /^[\d\s\+\-\(\)]+$/.test(s) && s.replace(/\D/g, '').length >= 7;
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isYes = (s) => ['yes', 'y', '1'].includes(s.toLowerCase().trim());
const isNo  = (s) => ['no', 'n', '2'].includes(s.toLowerCase().trim());

async function lookupPickupDate(route) {
  const supabase = getSupabase();
  if (!supabase || !route) return null;
  try {
    const { data } = await supabase
      .from('collection_schedules')
      .select('pickup_date')
      .eq('country', 'Ireland')
      .ilike('route', `%${route}%`)
      .limit(1);
    const date = data?.[0]?.pickup_date;
    if (date && date !== 'Not set' && date !== 'To be confirmed' && date.trim() !== '') {
      return date;
    }
  } catch (err) {
    console.warn('Pickup date lookup failed:', err?.message || err);
  }
  return null;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function handleBookingFlow(sock, phoneNumber, text, _session) {
  const lowerText = (text || '').toLowerCase().trim();

  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {}, step: null });
    const { getMainMenu } = await import('../bot.js');
    await sendMessage(sock, phoneNumber, getMainMenu());
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
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your phone number?*\n\n_Include country code, e.g. +353 87 123 4567_');
    }

    case 'SENDER_PHONE': {
      const v = text.trim();
      if (!isValidPhone(v)) return sendMessage(sock, phoneNumber, '❌ Please enter a valid phone number.');
      bookingData.senderPhone = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'ASK_SENDER_PHONE2', userPhone: v });
      return sendMessage(sock, phoneNumber, '➡️ *Add another phone number?*\n\n1️⃣ Yes\n2️⃣ No, continue');
    }

    case 'ASK_SENDER_PHONE2': {
      if (isYes(text)) {
        await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_PHONE2' });
        return sendMessage(sock, phoneNumber, '➡️ *Second phone number?*');
      }
      if (isNo(text)) {
        await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_ADDRESS' });
        return sendMessage(sock, phoneNumber, '➡️ *What\'s your full pickup address in Ireland?*\n\n_e.g. 12 Main Street_');
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'SENDER_PHONE2': {
      const v = text.trim();
      if (!isValidPhone(v)) return sendMessage(sock, phoneNumber, '❌ Please enter a valid phone number.');
      bookingData.senderPhone2 = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_ADDRESS', userPhone2: v });
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your full pickup address in Ireland?*\n\n_e.g. 12 Main Street_');
    }

    case 'SENDER_ADDRESS': {
      const v = text.trim();
      if (v.length < 4) return sendMessage(sock, phoneNumber, '❌ Please enter your full pickup address.');
      bookingData.senderAddress = v;
      bookingData.senderPostcode = 'N/A';
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_CITY', userAddress: v });
      return sendMessage(sock, phoneNumber,
        '➡️ *Which city or town are you in?*\n\n_e.g. Dublin, Cork, Belfast, Galway, Limerick, Waterford_'
      );
    }

    case 'SENDER_CITY': {
      const cityInput = text.trim();
      const cityKey = cityInput.toUpperCase();
      const cities = getIrelandCities();
      const cityMap = getCityToRouteMap();

      if (!cities.includes(cityKey)) {
        return sendMessage(sock, phoneNumber,
          `❌ Sorry, I don't recognise "${cityInput}".\n\nPlease enter an Irish city or town we collect from. Common ones: Dublin, Cork, Belfast, Galway, Limerick, Waterford.`
        );
      }

      bookingData.senderCity = cityInput;
      bookingData.collectionRoute = cityMap[cityKey];

      await updateUserSession(phoneNumber, { bookingData, userCity: cityInput });
      await sendMessage(sock, phoneNumber,
        `✅ Got it! Your collection route is *${bookingData.collectionRoute}*.\n\n_Looking up the next collection date..._`
      );

      const pickupDate = await lookupPickupDate(bookingData.collectionRoute);
      bookingData.collectionDate = pickupDate || 'To be confirmed';

      const dateLine = pickupDate
        ? `Next collection: *${pickupDate}*`
        : `Collection date: *to be confirmed* — our team will arrange this with you.`;

      if (session.receiverName && session.receiverPhone) {
        await updateUserSession(phoneNumber, { bookingData, step: 'USE_SAVED_RECEIVER' });
        return sendMessage(sock, phoneNumber,
          `${dateLine}\n\n*Step 2 of 5 — Receiver*\n\nI have a saved receiver in Zimbabwe:\n\n` +
          `👤 ${session.receiverName}\n📱 ${session.receiverPhone}\n🏠 ${session.receiverAddress}\n🏙️ ${session.receiverCity}\n\n` +
          `Use this receiver?\n\n1️⃣ Yes, same receiver\n2️⃣ No, enter a new one`
        );
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
        await updateUserSession(phoneNumber, { bookingData, step: 'SHIPPING_TYPE' });
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
      return sendMessage(sock, phoneNumber, '➡️ *Add another receiver phone number?*\n\n1️⃣ Yes\n2️⃣ No, continue');
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
      await updateUserSession(phoneNumber, { bookingData, step: 'SHIPPING_TYPE', receiverCity: v });
      return askDrums(sock, phoneNumber);
    }

    case 'SHIPPING_TYPE': {
      const choice = text.trim();
      if (choice === '1') {
        bookingData.includeDrums = true;
        await updateUserSession(phoneNumber, { bookingData, step: 'DRUM_QUANTITY' });
        const settings = await getBotSettings();
        return sendMessage(sock, phoneNumber,
          `➡️ *How many drums?*\n\n_Shipping per drum:_\n• 1 drum: ${formatMoney(getDrumPrice(1, settings))}\n• 2–4 drums: ${formatMoney(getDrumPrice(2, settings))} each\n• 5+ drums: ${formatMoney(getDrumPrice(5, settings))} each (best value!)`
        );
      }
      if (choice === '2') {
        bookingData.includeDrums = false;
        bookingData.drumQuantity = 0;
        bookingData.includeBoxes = true;
        await updateUserSession(phoneNumber, { bookingData, step: 'OTHER_ITEMS_DESC' });
        return sendMessage(sock, phoneNumber,
          '🎁 *Other Items*\n\n_Other items are anything that won\'t travel inside a drum — for example suitcases, storage tubs, boxes, or household furniture._\n\n➡️ *Please describe what you\'re shipping* (items, approximate sizes/quantities).\n\nOur agent will review your list and send you a personalised quote within 24 hours.'
        );
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (drums) or *2* (other items).');
    }

    case 'DRUM_QUANTITY': {
      const qty = parseInt(text, 10);
      if (isNaN(qty) || qty < 1) return sendMessage(sock, phoneNumber, '❌ Please enter a number (1 or more).');
      bookingData.drumQuantity = qty;
      await updateUserSession(phoneNumber, { bookingData, step: 'DRUM_OWNERSHIP' });
      const settings = await getBotSettings();
      const unit = getDrumPrice(qty, settings);
      await sendMessage(sock, phoneNumber, `✅ ${qty} × drum shipping @ ${formatMoney(unit)} each = *${formatMoney(qty * unit)}*`);
      return sendMessage(sock, phoneNumber,
        `🛢️ *Do you have your own ${qty === 1 ? 'drum' : 'drums'}, or would you like us to supply ${qty === 1 ? 'one' : 'them'}?*\n\n1️⃣ I have my own\n2️⃣ Supply from you\n\n_Supply prices: Metal Drum ${formatMoney(getPurchaseDrumPrice('metal', settings))} each · Plastic Barrel ${formatMoney(getPurchaseDrumPrice('plastic', settings))} each_`
      );
    }

    case 'DRUM_OWNERSHIP': {
      const choice = text.trim();
      if (choice === '1') {
        bookingData.purchaseDrums = false;
        bookingData.purchaseDrumType = null;
        bookingData.purchaseDrumQuantity = 0;
        await updateUserSession(phoneNumber, { bookingData, step: 'DRUMS_DESCRIPTION' });
        const qty = bookingData.drumQuantity;
        return sendMessage(sock, phoneNumber,
          `📝 *Describe your ${qty === 1 ? 'drum' : 'drums'}*\n\nWhat ${qty === 1 ? 'does it' : 'do they'} look like? (color, markings, anything that helps the driver spot ${qty === 1 ? 'it' : 'them'})\n\n_e.g. ${qty > 1 ? '"3 blue plastic drums with red lids"' : '"blue plastic drum with red lid"'}_`
        );
      }
      if (choice === '2') {
        bookingData.purchaseDrums = true;
        await updateUserSession(phoneNumber, { bookingData, step: 'PURCHASE_DRUM_TYPE' });
        const settings = await getBotSettings();
        return sendMessage(sock, phoneNumber,
          `➡️ *Which type would you like?*\n\n1️⃣ 🛢️ Metal Drum — ${formatMoney(getPurchaseDrumPrice('metal', settings))} each\n2️⃣ 🛢️ Plastic Barrel — ${formatMoney(getPurchaseDrumPrice('plastic', settings))} each`
        );
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (I have my own) or *2* (supply from you).');
    }

    case 'PURCHASE_DRUM_TYPE': {
      if (text.trim() === '1') bookingData.purchaseDrumType = 'metal';
      else if (text.trim() === '2') bookingData.purchaseDrumType = 'plastic';
      else return sendMessage(sock, phoneNumber, '❌ Please reply *1* (metal) or *2* (plastic).');

      bookingData.purchaseDrumQuantity = bookingData.drumQuantity;
      const settings = await getBotSettings();
      const drumUnit = getPurchaseDrumPrice(bookingData.purchaseDrumType, settings);
      const shipUnit = getDrumPrice(bookingData.drumQuantity, settings);
      const qty = bookingData.drumQuantity;
      const drumLabel = bookingData.purchaseDrumType === 'metal' ? 'metal drum' : 'plastic barrel';
      await sendMessage(sock, phoneNumber,
        `✅ ${qty} × ${drumLabel} @ ${formatMoney(drumUnit)} = *${formatMoney(qty * drumUnit)}*\n` +
        `   + shipping ${qty} × ${formatMoney(shipUnit)} = *${formatMoney(qty * shipUnit)}*\n\n` +
        `*Drums total: ${formatMoney(qty * drumUnit + qty * shipUnit)}*`
      );
      return proceedToSummaryOrNotes(sock, phoneNumber, bookingData);
    }

    case 'DRUMS_DESCRIPTION': {
      const v = text.trim();
      if (v.length < 3) return sendMessage(sock, phoneNumber, '❌ Please give a short description so the driver can identify your drums.');
      bookingData.drumsDescription = v;
      return proceedToSummaryOrNotes(sock, phoneNumber, bookingData);
    }

    case 'OTHER_ITEMS_DESC': {
      const v = text.trim();
      if (v.length < 3) return sendMessage(sock, phoneNumber, '❌ Please give a short description of what you\'re shipping.');
      bookingData.boxesDescription = v;
      return proceedToSummaryOrNotes(sock, phoneNumber, bookingData);
    }

    case 'ASK_DELIVERY_NOTE': {
      const trimmed = text.trim();
      const skipWords = ['skip', 'no', 'none', 'n/a', 'na', '-'];
      if (!trimmed || skipWords.includes(trimmed.toLowerCase())) {
        bookingData.deliveryNote = null;
      } else {
        bookingData.deliveryNote = trimmed.slice(0, 500);
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

      const settings = await getBotSettings();
      const pricing = calculatePricing(bookingData, settings);
      const label = ({
        standard: '💳 Standard payment',
        cashOnCollection: '💵 Cash on Collection',
        payOnArrival: '⏳ Pay on Arrival',
      })[bookingData.paymentMethod];

      let msg = `✅ Selected: *${label}*\n\n`;
      msg += `*Total to pay: ${formatMoney(pricing.finalTotal)}*\n`;
      if (pricing.cashDiscount > 0) msg += `_(Cash discount of ${formatMoney(pricing.cashDiscount)} applied)_\n`;
      else if (pricing.payOnArrivalPremium > 0) msg += `_(20% premium of ${formatMoney(pricing.payOnArrivalPremium)} added)_\n`;
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

// ── Step helpers ─────────────────────────────────────────────────────────────

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
      (session.userCity ? `🏙️ ${session.userCity}\n` : '');
    return sendMessage(sock, phoneNumber,
      `${intro}\n\n${display}\nUse these details?\n\n1️⃣ ⚡ Yes, use saved\n2️⃣ ✏️ No, enter fresh`
    );
  }

  await updateUserSession(phoneNumber, { step: 'SENDER_FIRST_NAME', bookingData: {} });
  return sendMessage(sock, phoneNumber, `${intro}\n\n➡️ *What\'s your first name?*`);
}

async function useSavedOrNew(sock, phoneNumber, text, session) {
  if (text.trim() === '1' || isYes(text)) {
    const bookingData = {
      senderFirstName: session.userFirstName,
      senderLastName: session.userLastName || '',
      senderEmail: session.userEmail,
      senderPhone: session.userPhone || '',
      senderPhone2: session.userPhone2 || null,
      senderAddress: session.userAddress || '',
      senderCity: session.userCity || '',
      senderPostcode: 'N/A',
    };

    if (!bookingData.senderPhone) {
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_PHONE' });
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your phone number?*\n\n_Include country code, e.g. +353 87 123 4567_');
    }
    if (!bookingData.senderAddress) {
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_ADDRESS' });
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your full pickup address in Ireland?*');
    }
    if (!bookingData.senderCity) {
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_CITY' });
      return sendMessage(sock, phoneNumber, '➡️ *Which city or town are you in?*');
    }

    const cityKey = (bookingData.senderCity || '').toUpperCase();
    const cityMap = getCityToRouteMap();
    if (cityMap[cityKey]) {
      bookingData.collectionRoute = cityMap[cityKey];
      bookingData.collectionDate = await lookupPickupDate(bookingData.collectionRoute) || 'To be confirmed';
    }

    const dateLine = bookingData.collectionDate && bookingData.collectionDate !== 'To be confirmed'
      ? `Next collection: *${bookingData.collectionDate}*`
      : `Collection date: *to be confirmed*`;

    if (session.receiverName && session.receiverPhone) {
      await updateUserSession(phoneNumber, { bookingData, step: 'USE_SAVED_RECEIVER' });
      return sendMessage(sock, phoneNumber,
        `${dateLine}\n\n*Step 2 of 5 — Receiver*\n\nI have a saved receiver in Zimbabwe:\n\n` +
        `👤 ${session.receiverName}\n📱 ${session.receiverPhone}\n🏠 ${session.receiverAddress}\n🏙️ ${session.receiverCity}\n\n` +
        `Use this receiver?\n\n1️⃣ Yes, same receiver\n2️⃣ No, enter a new one`
      );
    }
    await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_NAME' });
    return sendMessage(sock, phoneNumber,
      `${dateLine}\n\n*Step 2 of 5 — Receiver Details*\n\nWho will receive the shipment in Zimbabwe?\n\n➡️ *Receiver\'s full name?*`
    );
  }
  if (text.trim() === '2' || isNo(text)) {
    await updateUserSession(phoneNumber, { bookingData: {}, step: 'SENDER_FIRST_NAME' });
    return sendMessage(sock, phoneNumber, 'No problem — let\'s start fresh.\n\n➡️ *What\'s your first name?*');
  }
  return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
}

async function askDrums(sock, phoneNumber) {
  return sendMessage(sock, phoneNumber,
    '*Step 3 of 5 — What are you shipping?*\n\n1️⃣ 🥁 Drums (200–220L)\n2️⃣ 🎁 Other items'
  );
}

async function proceedToSummaryOrNotes(sock, phoneNumber, bookingData) {
  const settings = await getBotSettings();
  const deliveryNotesOn = Number(settings.delivery_notes_enabled || 0) > 0;
  if (deliveryNotesOn && bookingData.deliveryNote === undefined) {
    await updateUserSession(phoneNumber, { bookingData, step: 'ASK_DELIVERY_NOTE' });
    return sendMessage(sock, phoneNumber,
      '📝 *Any delivery instructions or notes?*\n\nThings like landmarks, gate codes, preferred drop-off times, or anything the driver should know.\n\nType your note, or reply *skip* to continue without one.'
    );
  }
  await updateUserSession(phoneNumber, { bookingData, step: 'REVIEW_SUMMARY' });
  return showSummary(sock, phoneNumber, bookingData);
}

async function showSummary(sock, phoneNumber, bookingData) {
  const settings = await getBotSettings();
  const pricing = calculatePricing(bookingData, settings);

  let msg = `*Step 4 of 5 — Booking Summary*\n\n`;

  msg += `*📍 Collection*\n`;
  msg += `${bookingData.senderFirstName} ${bookingData.senderLastName}\n`;
  msg += `${bookingData.senderPhone}${bookingData.senderPhone2 ? ' / ' + bookingData.senderPhone2 : ''}\n`;
  msg += `${bookingData.senderEmail}\n`;
  msg += `${bookingData.senderAddress}, ${bookingData.senderCity}\n`;
  if (bookingData.collectionRoute) msg += `🚚 Route: ${bookingData.collectionRoute}\n`;
  if (bookingData.collectionDate) msg += `Next collection: ${bookingData.collectionDate}\n`;
  msg += `\n`;

  msg += `*🇿🇼 Delivery*\n`;
  msg += `${bookingData.receiverName}\n`;
  msg += `${bookingData.receiverPhone}${bookingData.receiverPhone2 ? ' / ' + bookingData.receiverPhone2 : ''}\n`;
  msg += `${bookingData.receiverAddress}, ${bookingData.receiverCity}, Zimbabwe\n`;
  if (bookingData.deliveryNote) msg += `📝 Note: _${bookingData.deliveryNote}_\n`;
  msg += `\n`;

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
  msg += `\n`;

  if (pricing.baseTotal > 0) {
    msg += `*Subtotal: ${formatMoney(pricing.baseTotal)}*\n`;
    if (bookingData.includeBoxes) msg += `_(other items quoted separately)_\n`;
  } else {
    msg += `*Subtotal: agent will quote*\n`;
  }
  msg += `\n✅ FREE collection across Ireland\n✅ Full tracking included\n\n`;
  msg += `1️⃣ Continue to payment\n2️⃣ Start over`;

  return sendMessage(sock, phoneNumber, msg);
}

async function showPaymentOptions(sock, phoneNumber, bookingData) {
  const settings = await getBotSettings();
  const standard = calculatePricing({ ...bookingData, paymentMethod: 'standard' }, settings);
  const cash = calculatePricing({ ...bookingData, paymentMethod: 'cashOnCollection' }, settings);
  const arrival = calculatePricing({ ...bookingData, paymentMethod: 'payOnArrival' }, settings);

  let msg = `*Step 5 of 5 — Payment Method*\n\nHow would you like to pay?\n\n`;
  msg += `1️⃣ 💳 *Standard Payment* — ${formatMoney(standard.finalTotal)}\n   _Pay by card or bank transfer_\n\n`;
  if (bookingData.includeDrums && bookingData.drumQuantity > 0) {
    msg += `2️⃣ 💵 *Cash on Collection* — ${formatMoney(cash.finalTotal)}\n   _Save ${CURRENCY_SYMBOL}${CASH_DISCOUNT_PER_DRUM}/drum (${formatMoney(cash.cashDiscount)} off)_\n\n`;
  } else {
    msg += `2️⃣ 💵 *Cash on Collection* — ${formatMoney(cash.finalTotal)}\n   _Pay cash when we collect_\n\n`;
  }
  msg += `3️⃣ ⏳ *Pay on Arrival* — ${formatMoney(arrival.finalTotal)}\n   _Pay when shipment reaches Zimbabwe (+20% premium)_\n\nReply with *1*, *2*, or *3*.`;

  return sendMessage(sock, phoneNumber, msg);
}

async function submitBooking(sock, phoneNumber, bookingData) {
  await sendMessage(sock, phoneNumber, '⏳ Submitting your booking...');
  try {
    const settings = await getBotSettings();
    const pricing = calculatePricing(bookingData, settings);
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
      '❌ Sorry, something went wrong while submitting your booking. Please try again, or call us on +353 87 195 4910 for help.\n\nType *menu* to return to the main menu.'
    );
  }
}
