import { updateUserSession, getUserSession } from '../utils/sessions.js';
import { getSupabase, createBookingRecords } from '../utils/database.js';
import {
  getBotSettings,
  getDrumPrice,
  getTrunkPrice,
  getSealPrice,
  calculatePricing,
  formatMoney,
  CURRENCY_SYMBOL,
  CASH_DISCOUNT_PER_DRUM,
  PAY_ON_ARRIVAL_MULTIPLIER,
} from '../utils/pricing.js';

// Simple send message function
async function sendMessage(sock, phoneNumber, text) {
  await sock.sendMessage(phoneNumber, { text });
}

// Ireland cities and routes mapping
function getIrelandCities() {
  return [
    // Londonderry Route
    'LARNE', 'BALLYCLARE', 'BALLYMENA', 'BALLYMONEY', 'KILREA', 
    'COLERAINE', 'LONDONDERRY', 'LIFFORD', 'OMAGH', 'COOKSTOWN', 'CARRICKFERGUS',
    // Belfast Route
    'BELFAST', 'BANGOR', 'COMBER', 'LISBURN', 'NEWRY', 'NEWTOWNWARDS',
    'DUNMURRY', 'LURGAN', 'PORTADOWN', 'BANBRIDGE', 'MOY', 'DUNGANNON', 'ARMAGH',
    // Cavan Route
    'MAYNOOTH', 'ASHBOURNE', 'SWORDS', 'SKERRIES', 'DROGHEDA', 'DUNDALK',
    'CAVAN', 'VIRGINIA', 'KELLS', 'NAVAN', 'TRIM',
    // Athlone Route
    'MULLINGAR', 'LONGFORD', 'ROSCOMMON', 'BOYLE', 'SLIGO', 'BALLINA',
    'SWINFORD', 'CASTLEBAR', 'TUAM', 'GALWAY', 'ATHENRY', 'ATHLONE',
    // Limerick Route
    'NEWBRIDGE', 'PORTLAOISE', 'ROSCREA', 'LIMERICK', 'ENNIS', 'DOOLIN',
    'LOUGHREA', 'BALLINASLOE', 'TULLAMORE',
    // Dublin City Route
    'SANDYFORD', 'RIALTO', 'BALLYMOUNT', 'CABRA', 'BEAUMONT', 'MALAHIDE',
    'PORTMARNOCK', 'DALKEY', 'SHANKILL', 'BRAY', 'DUBLIN',
    // Cork Route
    'CASHEL', 'FERMOY', 'CORK', 'DUNGARVAN', 'WATERFORD', 'NEW ROSS',
    'WEXFORD', 'GOREY', 'GREYSTONES'
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
    'WEXFORD': 'CORK', 'GOREY': 'CORK', 'GREYSTONES': 'CORK'
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

export async function handleBookingFlow(sock, phoneNumber, text, _session) {
  const lowerText = (text || '').toLowerCase().trim();

  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {}, step: null });
    const { getMainMenu } = await import('../bot.js');
    await sendMessage(sock, phoneNumber, getMainMenu());
    return;
  }

  // Always read fresh so multiple in-flight messages don't clobber each other.
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
      return sendMessage(sock, phoneNumber, '➡️ *What\'s your phone number?*\n\n_Include country code, e.g. +353 87 123 4567_');
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
      bookingData.senderPostcode = 'N/A'; // Ireland uses city-based routing
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

      // Send a quick ack first; date lookup may take a beat.
      await updateUserSession(phoneNumber, { bookingData, userCity: cityInput });
      await sendMessage(sock, phoneNumber,
        `✅ Got it! Your collection route is *${bookingData.collectionRoute}*.\n\n_Looking up the next collection date..._`
      );

      const pickupDate = await lookupPickupDate(bookingData.collectionRoute);
      bookingData.collectionDate = pickupDate || 'To be confirmed';

      const dateLine = pickupDate
        ? `📅 Next collection: *${pickupDate}*`
        : `📅 Collection date: *to be confirmed* — our team will arrange this with you.`;

      // Move into Step 2 (receiver). Offer saved receiver if we have one.
      if (session.receiverName && session.receiverPhone) {
        await updateUserSession(phoneNumber, { bookingData, step: 'USE_SAVED_RECEIVER' });
        const saved =
          `${dateLine}\n\n*Step 2 of 5 — Receiver*\n\nI have a saved receiver in Zimbabwe:\n\n` +
          `👤 ${session.receiverName}\n` +
          `📱 ${session.receiverPhone}\n` +
          `🏠 ${session.receiverAddress}\n` +
          `🏙️ ${session.receiverCity}\n\n` +
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
        const settings = await getBotSettings();
        return sendMessage(sock, phoneNumber,
          `➡️ *How many drums?*\n\n_Pricing per drum:_\n• 1 drum: ${formatMoney(getDrumPrice(1, settings))}\n• 2–4 drums: ${formatMoney(getDrumPrice(2, settings))} each\n• 5+ drums: ${formatMoney(getDrumPrice(5, settings))} each (best value!)`
        );
      }
      if (isNo(text)) {
        bookingData.includeDrums = false;
        bookingData.drumQuantity = 0;
        await updateUserSession(phoneNumber, { bookingData, step: 'ASK_TRUNKS' });
        return askTrunks(sock, phoneNumber);
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'DRUM_QUANTITY': {
      const qty = parseInt(text, 10);
      if (isNaN(qty) || qty < 1) return sendMessage(sock, phoneNumber, '❌ Please enter a number (1 or more).');
      bookingData.drumQuantity = qty;
      await updateUserSession(phoneNumber, { bookingData, step: 'DRUMS_DESCRIPTION' });
      const settings = await getBotSettings();
      const unit = getDrumPrice(qty, settings);
      await sendMessage(sock, phoneNumber, `✅ ${qty} × drum @ ${formatMoney(unit)} each = *${formatMoney(qty * unit)}*`);
      return sendMessage(sock, phoneNumber,
        `📝 *Describe your ${qty === 1 ? 'drum' : 'drums'}*\n\nWhat ${qty === 1 ? 'does it' : 'do they'} look like? (color, markings, anything that helps the driver spot ${qty === 1 ? 'it' : 'them'})\n\n_e.g. ${qty > 1 ? '"3 blue plastic drums with red lids"' : '"blue plastic drum with red lid"'}_`
      );
    }

    case 'DRUMS_DESCRIPTION': {
      const v = text.trim();
      if (v.length < 3) return sendMessage(sock, phoneNumber, '❌ Please give a short description so the driver can identify your drums.');
      bookingData.drumsDescription = v;
      await updateUserSession(phoneNumber, { bookingData, step: 'ASK_TRUNKS' });
      return askTrunks(sock, phoneNumber);
    }

    case 'ASK_TRUNKS': {
      if (isYes(text)) {
        bookingData.includeTrunks = true;
        await updateUserSession(phoneNumber, { bookingData, step: 'TRUNK_QUANTITY' });
        const settings = await getBotSettings();
        return sendMessage(sock, phoneNumber,
          `➡️ *How many trunks / storage boxes?*\n\n_Pricing per trunk:_\n• 1 trunk: ${formatMoney(getTrunkPrice(1, settings))}\n• 2–4 trunks: ${formatMoney(getTrunkPrice(2, settings))} each\n• 5+ trunks: ${formatMoney(getTrunkPrice(5, settings))} each (best value!)`
        );
      }
      if (isNo(text)) {
        bookingData.includeTrunks = false;
        bookingData.trunkQuantity = 0;
        await updateUserSession(phoneNumber, { bookingData, step: 'ASK_OTHER_ITEMS' });
        return askOtherItems(sock, phoneNumber);
      }
      return sendMessage(sock, phoneNumber, '❌ Please reply *1* (yes) or *2* (no).');
    }

    case 'TRUNK_QUANTITY': {
      const qty = parseInt(text, 10);
      if (isNaN(qty) || qty < 1) return sendMessage(sock, phoneNumber, '❌ Please enter a number (1 or more).');
      bookingData.trunkQuantity = qty;
      await updateUserSession(phoneNumber, { bookingData, step: 'TRUNKS_DESCRIPTION' });
      const settings = await getBotSettings();
      const unit = getTrunkPrice(qty, settings);
      await sendMessage(sock, phoneNumber, `✅ ${qty} × trunk @ ${formatMoney(unit)} each = *${formatMoney(qty * unit)}*`);
      return sendMessage(sock, phoneNumber,
        `📝 *Describe your ${qty === 1 ? 'trunk' : 'trunks'}*\n\nWhat ${qty === 1 ? 'does it' : 'do they'} look like? (color, size, markings, anything that helps the driver spot ${qty === 1 ? 'it' : 'them'})\n\n_e.g. ${qty > 1 ? '"2 large black storage trunks"' : '"medium grey storage box"'}_`
      );
    }

    case 'TRUNKS_DESCRIPTION': {
      const v = text.trim();
      if (v.length < 3) return sendMessage(sock, phoneNumber, '❌ Please give a short description so the driver can identify your trunks.');
      bookingData.trunksDescription = v;
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
      // 1 = continue to payment, 2 = start over
      if (text.trim() === '1' || lowerText === 'continue') {
        // If only "other items" (no priced items), skip payment selection — agent quotes.
        const hasPricedItems =
          (bookingData.includeDrums && bookingData.drumQuantity > 0) ||
          (bookingData.includeTrunks && bookingData.trunkQuantity > 0);
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
      if (pricing.cashDiscount > 0) {
        msg += `_(Cash discount of ${formatMoney(pricing.cashDiscount)} applied)_\n`;
      } else if (pricing.payOnArrivalPremium > 0) {
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
      // Unknown step — recover by restarting.
      await updateUserSession(phoneNumber, { state: 'BOOKING_FLOW', bookingData: {}, step: 'START' });
      return handleBookingFlow(sock, phoneNumber, '', await getUserSession(phoneNumber));
  }
}

// --- Step helpers --- //

async function startBooking(sock, phoneNumber, session) {
  const intro = `📦 *Book your shipment* — 5 quick steps\n\nYou can type *cancel* anytime to return to the main menu.\n\n*Step 1 of 5 — Your Details*`;

  // Offer saved details if both name and email are present.
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
      senderPostcode: 'N/A',
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
    // Skip straight to phone if missing, otherwise jump to address city detection.
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

    // We have everything — re-detect route from saved city.
    const cityKey = (bookingData.senderCity || '').toUpperCase();
    const cityMap = getCityToRouteMap();
    if (cityMap[cityKey]) {
      bookingData.collectionRoute = cityMap[cityKey];
      bookingData.collectionDate = await lookupPickupDate(bookingData.collectionRoute) || 'To be confirmed';
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

async function askDrums(sock, phoneNumber, opts = {}) {
  if (!opts.skipIntro) {
    const settings = await getBotSettings();
    const intro =
      `*Step 3 of 5 — What are you shipping today?* 📦\n` +
      `_60% complete_\n\n` +
      `Select all that apply (we'll ask about each):\n\n` +
      `🥁 *Drums (200–220 L)*\n` +
      `   • 5+ drums: ${formatMoney(settings.drum_price_5_plus)} each _(Best value!)_\n` +
      `   • 2–4 drums: ${formatMoney(settings.drum_price_2_4)} each\n` +
      `   • 1 drum: ${formatMoney(settings.drum_price_1)}\n\n` +
      `📦 *Trunks / Storage Boxes*\n` +
      `   • 5+ trunks: ${formatMoney(settings.box_price_5_plus)} each _(Best value!)_\n` +
      `   • 2–4 trunks: ${formatMoney(settings.box_price_2_4)} each\n` +
      `   • 1 trunk: ${formatMoney(settings.box_price_1)}\n\n` +
      `🎁 *Other Items*\n` +
      `   Shipping something else? Tell us what you're sending and our agent will contact you with a personalised quote.\n\n` +
      `_💡 Multiple drop-off addresses? No problem — just tell the driver during collection._`;
    await sendMessage(sock, phoneNumber, intro);
  }
  return sendMessage(sock, phoneNumber,
    '🥁 *Are you shipping drums (200–220 L)?*\n\n1️⃣ Yes\n2️⃣ No'
  );
}

async function askTrunks(sock, phoneNumber) {
  return sendMessage(sock, phoneNumber,
    '📦 *Trunks or storage boxes?*\n\n1️⃣ Yes\n2️⃣ No'
  );
}

async function askOtherItems(sock, phoneNumber) {
  return sendMessage(sock, phoneNumber,
    '🎁 *Anything else?* (clothes, suitcases, small furniture, electronics...)\n\nOur agent will quote these separately.\n\n1️⃣ Yes\n2️⃣ No'
  );
}

async function afterItemsSelected(sock, phoneNumber, bookingData) {
  // Must select at least one
  if (!bookingData.includeDrums && !bookingData.includeTrunks && !bookingData.includeBoxes) {
    bookingData.includeDrums = undefined;
    bookingData.includeTrunks = undefined;
    bookingData.includeBoxes = undefined;
    await updateUserSession(phoneNumber, { bookingData, step: 'ASK_DRUMS' });
    await sendMessage(sock, phoneNumber, '❌ You haven\'t selected anything to ship. Let\'s try again.');
    return askDrums(sock, phoneNumber, { skipIntro: true });
  }

  // Metal seal only relevant if drums or trunks present.
  const hasSealable = bookingData.includeDrums || bookingData.includeTrunks;
  if (hasSealable) {
    await updateUserSession(phoneNumber, { bookingData, step: 'ASK_METAL_SEAL' });
    const settings = await getBotSettings();
    const sealUnit = getSealPrice(settings);
    return sendMessage(sock, phoneNumber,
      `🔒 *Add metal coded seals?*\n\nSecure coded seals for extra peace of mind — *${formatMoney(sealUnit)} per item*.\n\n1️⃣ Yes, add seals\n2️⃣ No thanks`
    );
  }

  // Only "other items" — no seal needed
  bookingData.wantMetalSeal = false;
  return proceedToSummaryOrNotes(sock, phoneNumber, bookingData);
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
  if (bookingData.collectionDate) msg += `📅 Next collection: ${bookingData.collectionDate}\n`;
  msg += `\n`;

  msg += `*🇿🇼 Delivery*\n`;
  msg += `${bookingData.receiverName}\n`;
  msg += `${bookingData.receiverPhone}${bookingData.receiverPhone2 ? ' / ' + bookingData.receiverPhone2 : ''}\n`;
  msg += `${bookingData.receiverAddress}, ${bookingData.receiverCity}, Zimbabwe\n`;
  if (bookingData.deliveryNote) {
    msg += `📝 Note: _${bookingData.deliveryNote}_\n`;
  }
  msg += `\n`;

  msg += `*📦 Items*\n`;
  if (pricing.drumQty > 0) {
    msg += `🥁 ${pricing.drumQty} × drum @ ${formatMoney(pricing.drumUnit)} = *${formatMoney(pricing.drumTotal)}*\n`;
    if (bookingData.drumsDescription) msg += `   _${bookingData.drumsDescription}_\n`;
  }
  if (pricing.trunkQty > 0) {
    msg += `📦 ${pricing.trunkQty} × trunk @ ${formatMoney(pricing.trunkUnit)} = *${formatMoney(pricing.trunkTotal)}*\n`;
    if (bookingData.trunksDescription) msg += `   _${bookingData.trunksDescription}_\n`;
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
    if (bookingData.includeBoxes) {
      msg += `_(other items quoted separately)_\n`;
    }
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

    const { trackingNumber, receiptNumber } = await createBookingRecords(
      phoneNumber,
      bookingData,
      pricing,
    );

    // Append to history and persist receiver for re-use.
    const current = await getUserSession(phoneNumber);
    const history = [...(current.bookingHistory || []), {
      trackingNumber,
      receiptNumber,
      date: new Date().toISOString(),
      drums: bookingData.drumQuantity || 0,
      trunks: bookingData.trunkQuantity || 0,
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
