import { updateUserSession, getUserSession } from '../services/userSession.js';
import { sendMessage } from '../utils/messageUtils.js';
import { getRouteFromPostcode } from '../menus/mainMenu.js';
import { createShipment, supabase } from '../services/database.js';
import { calculatePrice } from '../utils/pricingUtils.js';

async function getPickupDateForRoute(route) {
  if (!route) return null;
  try {
    // Route codes in the bot (e.g. 'LONDON') are uppercase; DB stores proper case (e.g. 'London Route').
    // Match by ilike so we find "London Route", "London", etc.
    const { data } = await supabase
      .from('collection_schedules')
      .select('route, pickup_date')
      .eq('country', 'England')
      .ilike('route', `%${route}%`)
      .limit(1);
    const row = data?.[0];
    if (row?.pickup_date && row.pickup_date !== 'Not set') return row.pickup_date;
  } catch (err) {
    console.error('Error fetching pickup date for route:', err?.message || err);
  }
  return null;
}

export async function handleBookingFlow(sock, phoneNumber, text, session) {
  const lowerText = text.toLowerCase();
  
  // Allow user to cancel at any time
  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {} });
    const { getMainMenu } = await import('../menus/mainMenu.js');
    await sendMessage(sock, phoneNumber, 'Booking cancelled.\n\n' + getMainMenu());
    return;
  }

  const step = session.step || 'START';
  const bookingData = session.bookingData || {};

  switch (step) {
    case 'START':
      if (lowerText === 'continue') {
        // Check if user has saved information
        if (session.userName && session.userEmail) {
          await sendMessage(
            sock,
            phoneNumber,
            `📦 *Start Your Booking*\n\nWelcome back ${session.userName}! 👋\n\nI have your details saved. Would you like to:\n\n1️⃣ Use saved details (faster)\n2️⃣ Enter new details\n\nType *1* or *2*`
          );
          await updateUserSession(phoneNumber, { step: 'USE_SAVED_OR_NEW' });
        } else {
          await updateUserSession(phoneNumber, { step: 'SENDER_NAME' });
          await sendMessage(sock, phoneNumber, '👤 What\'s your full name?');
        }
      } else {
        await sendMessage(sock, phoneNumber, 'Type *continue* to start booking or *cancel* to go back.');
      }
      break;

    case 'USE_SAVED_OR_NEW':
      if (text === '1') {
        // Pre-fill saved information
        bookingData.senderName = session.userName;
        bookingData.senderEmail = session.userEmail;
        bookingData.senderAddress = session.userAddress || '';
        bookingData.senderCity = session.userCity || '';
        bookingData.senderPostcode = session.userPostcode || '';
        
        await updateUserSession(phoneNumber, { bookingData, step: 'CONFIRM_SAVED_INFO' });
        
        let savedInfo = `✅ *Your Saved Information:*\n\n`;
        savedInfo += `👤 Name: ${session.userName}\n`;
        savedInfo += `📧 Email: ${session.userEmail}\n`;
        if (session.userAddress) savedInfo += `🏠 Address: ${session.userAddress}\n`;
        if (session.userCity) savedInfo += `🏙️ City: ${session.userCity}\n`;
        if (session.userPostcode) savedInfo += `📮 Postcode: ${session.userPostcode}\n`;
        savedInfo += `\nIs this information still correct?\n\nType *yes* to continue or *no* to update`;
        
        await sendMessage(sock, phoneNumber, savedInfo);
      } else if (text === '2') {
        await updateUserSession(phoneNumber, { step: 'SENDER_NAME' });
        await sendMessage(sock, phoneNumber, 'Great! Let\'s start fresh.\n\n👤 What\'s your full name?');
      } else {
        await sendMessage(sock, phoneNumber, '❌ Please type *1* or *2*');
      }
      break;

    case 'CONFIRM_SAVED_INFO':
      if (lowerText === 'yes') {
        // Derive route + pickup date from saved postcode
        const savedRoute = getRouteFromPostcode(bookingData.senderPostcode || '');
        if (savedRoute && savedRoute !== 'RESTRICTED') {
          bookingData.collectionRoute = savedRoute;
          const savedDate = await getPickupDateForRoute(savedRoute);
          bookingData.collectionDate = savedDate || null;
        }

        const dateLine = bookingData.collectionDate
          ? `📅 Next collection date: *${bookingData.collectionDate}*\n\n`
          : '';

        // Check for saved receiver
        if (session.receiverName && session.receiverPhone) {
          await updateUserSession(phoneNumber, { bookingData, step: 'USE_SAVED_RECEIVER' });
          let savedReceiverInfo = `✅ Perfect!\n\n${dateLine}Now for the receiver in Zimbabwe.\n\nI have a saved receiver:\n\n`;
          savedReceiverInfo += `👤 ${session.receiverName}\n`;
          savedReceiverInfo += `📱 ${session.receiverPhone}\n`;
          savedReceiverInfo += `🏠 ${session.receiverAddress}\n`;
          savedReceiverInfo += `🏙️ ${session.receiverCity}\n\n`;
          savedReceiverInfo += `Is this the same receiver?\n\nType *yes* to use or *no* to enter new receiver details`;
          await sendMessage(sock, phoneNumber, savedReceiverInfo);
        } else {
          await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_NAME' });
          await sendMessage(
            sock,
            phoneNumber,
            `✅ Perfect!\n\n${dateLine}Now let's get the receiver details in Zimbabwe.\n\n👤 What\'s the receiver\'s full name?`
          );
        }
      } else if (lowerText === 'no') {
        await updateUserSession(phoneNumber, { bookingData: {}, step: 'SENDER_NAME' });
        await sendMessage(sock, phoneNumber, 'No problem! Let\'s update your information.\n\n👤 What\'s your full name?');
      } else {
        await sendMessage(sock, phoneNumber, 'Please type *yes* or *no*');
      }
      break;

    case 'SENDER_NAME':
      bookingData.senderName = text;
      const firstName = text.split(' ')[0];
      
      // Save user name for future sessions
      await updateUserSession(phoneNumber, { 
        bookingData, 
        step: 'SENDER_PHONE',
        userName: firstName
      });
      
      await sendMessage(
        sock,
        phoneNumber,
        `Great ${firstName}! 📱\n\nWhat's your phone number? (Include country code if different from UK)`
      );
      break;

    case 'SENDER_PHONE':
      if (!isValidPhone(text)) {
        await sendMessage(sock, phoneNumber, '❌ Please enter a valid phone number.');
        return;
      }
      bookingData.senderPhone = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_EMAIL' });
      await sendMessage(sock, phoneNumber, '📧 What\'s your email address?');
      break;

    case 'SENDER_EMAIL':
      if (!isValidEmail(text)) {
        await sendMessage(sock, phoneNumber, '❌ Please enter a valid email address.');
        return;
      }
      bookingData.senderEmail = text;
      
      // Save email for future
      await updateUserSession(phoneNumber, { 
        bookingData, 
        step: 'SENDER_ADDRESS',
        userEmail: text
      });
      
      await sendMessage(sock, phoneNumber, '🏠 What\'s your full collection address in the UK?');
      break;

    case 'SENDER_ADDRESS':
      bookingData.senderAddress = text;

      // Save address for future, then jump straight to postcode (no separate city step)
      await updateUserSession(phoneNumber, {
        bookingData,
        step: 'SENDER_POSTCODE',
        userAddress: text
      });

      await sendMessage(
        sock,
        phoneNumber,
        '📮 Enter your postal code to get your collection dates.\n\n_Example: SW1A 1AA_'
      );
      break;

    case 'SENDER_POSTCODE': {
      // Fast validation — these are sync
      const postcode = text.toUpperCase();
      const route = getRouteFromPostcode(postcode);

      if (route === 'RESTRICTED') {
        await sendMessage(
          sock,
          phoneNumber,
          `❌ Sorry, we don't currently service the ${postcode} area.\n\nPlease contact us directly at:\n📱 +44 7584 100552\n\nType *menu* to return to main menu.`
        );
        await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {} });
        return;
      }

      if (!route) {
        await sendMessage(
          sock,
          phoneNumber,
          `⚠️ I couldn't determine your collection route from postcode "${postcode}".\n\nPlease double-check your postcode or contact us at +44 7584 100552.\n\nType *menu* to return to main menu.`
        );
        return;
      }

      // 1. Save route + advance state IMMEDIATELY so duplicate sends don't re-process
      bookingData.senderPostcode = postcode;
      bookingData.collectionRoute = route;
      const routeLabel = route.charAt(0) + route.slice(1).toLowerCase() + ' Route';

      const currentSessionAfterPostcode = await getUserSession(phoneNumber);
      const hasSavedReceiver = currentSessionAfterPostcode.receiverName && currentSessionAfterPostcode.receiverPhone;
      const nextStep = hasSavedReceiver ? 'USE_SAVED_RECEIVER' : 'RECEIVER_NAME';

      await updateUserSession(phoneNumber, {
        bookingData,
        step: nextStep,
        userPostcode: postcode
      });

      // 2. Send immediate ack so the user sees response quickly
      await sendMessage(
        sock,
        phoneNumber,
        `✅ Got it! Your collection route is: *${routeLabel}*\n\n_Looking up next collection date…_`
      );

      // 3. Now do the slow DB lookup
      const pickupDate = await getPickupDateForRoute(route);
      bookingData.collectionDate = pickupDate || null;
      await updateUserSession(phoneNumber, { bookingData });

      const dateLine = pickupDate
        ? `📅 Next collection date: *${pickupDate}*`
        : `📅 Collection date: *To be confirmed* — our team will call to arrange.`;

      // 4. Send follow-up with the date + next-step prompt
      if (hasSavedReceiver) {
        let savedReceiverInfo = `${dateLine}\n\n`;
        savedReceiverInfo += `Now for the receiver in Zimbabwe.\n\nI have a saved receiver:\n\n`;
        savedReceiverInfo += `👤 ${currentSessionAfterPostcode.receiverName}\n`;
        savedReceiverInfo += `📱 ${currentSessionAfterPostcode.receiverPhone}\n`;
        savedReceiverInfo += `🏠 ${currentSessionAfterPostcode.receiverAddress}\n`;
        savedReceiverInfo += `🏙️ ${currentSessionAfterPostcode.receiverCity}\n\n`;
        savedReceiverInfo += `Is this the same receiver?\n\nType *yes* to use or *no* to enter new receiver details`;
        await sendMessage(sock, phoneNumber, savedReceiverInfo);
      } else {
        await sendMessage(
          sock,
          phoneNumber,
          `${dateLine}\n\nNow let's get the receiver details in Zimbabwe.\n\n👤 What's the receiver's full name?`
        );
      }
      break;
    }

    case 'USE_SAVED_RECEIVER':
      if (lowerText === 'yes') {
        bookingData.receiverName = session.receiverName;
        bookingData.receiverPhone = session.receiverPhone;
        bookingData.receiverAddress = session.receiverAddress;
        bookingData.receiverCity = session.receiverCity;
        await updateUserSession(phoneNumber, { bookingData, step: 'SHIPMENT_TYPE' });
        await sendMessage(
          sock,
          phoneNumber,
          `✅ Receiver details confirmed!\n\n📦 *What would you like to ship?*\n\nType the number:\n\n1️⃣ Drums (200-220L)\n2️⃣ Other item (our agent will quote you)`
        );
      } else if (lowerText === 'no') {
        await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_NAME' });
        await sendMessage(sock, phoneNumber, 'No problem! Let\'s enter the new receiver details.\n\n👤 What\'s the receiver\'s full name?');
      } else {
        await sendMessage(sock, phoneNumber, 'Please type *yes* or *no*');
      }
      break;

    case 'RECEIVER_NAME':
      bookingData.receiverName = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_PHONE', receiverName: text });
      await sendMessage(sock, phoneNumber, '📱 What\'s the receiver\'s phone number in Zimbabwe?');
      break;

    case 'RECEIVER_PHONE':
      bookingData.receiverPhone = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_ADDRESS', receiverPhone: text });
      await sendMessage(sock, phoneNumber, '🏠 What\'s the delivery address in Zimbabwe?');
      break;

    case 'RECEIVER_ADDRESS':
      bookingData.receiverAddress = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_CITY', receiverAddress: text });
      await sendMessage(
        sock,
        phoneNumber,
        '🏙️ Which city in Zimbabwe?\n\n_Examples: Harare, Bulawayo, Mutare, Gweru_'
      );
      break;

    case 'RECEIVER_CITY':
      bookingData.receiverCity = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'SHIPMENT_TYPE', receiverCity: text });
      await sendMessage(
        sock,
        phoneNumber,
        `📦 *What would you like to ship?*\n\nType the number:\n\n1️⃣ Drums (200-220L)\n2️⃣ Other item (our agent will quote you)`
      );
      break;

    case 'SHIPMENT_TYPE':
      if (!['1', '2'].includes(text)) {
        await sendMessage(sock, phoneNumber, '❌ Please type 1 or 2.');
        return;
      }
      bookingData.shipmentType = text;

      if (text === '1') {
        await updateUserSession(phoneNumber, { bookingData, step: 'DRUM_QUANTITY' });
        await sendMessage(sock, phoneNumber, '🥁 How many drums? (Enter a number)');
      } else {
        await updateUserSession(phoneNumber, { bookingData, step: 'OTHER_ITEM_DESCRIPTION' });
        await sendMessage(
          sock,
          phoneNumber,
          '📝 Please describe what you\'d like to ship.\n\nInclude size, weight and quantity if you can. Our agent will review and send you a personalised quote.'
        );
      }
      break;

    case 'OTHER_ITEM_DESCRIPTION':
      if (!text || text.length < 3) {
        await sendMessage(sock, phoneNumber, '❌ Please enter a short description of what you\'d like to ship.');
        return;
      }
      bookingData.otherItemDescription = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'CONFIRM' });

      // Skip metal seal / door-to-door / payment method — agent will quote separately
      const otherSummary = generateBookingSummary(bookingData, null);
      await sendMessage(sock, phoneNumber, otherSummary);
      await sendMessage(
        sock,
        phoneNumber,
        `✅ *Confirm Your Booking Request*\n\nYour details look good? Type *CONFIRM* to submit. Our agent will call you back with a quote, or *EDIT* to make changes.`
      );
      break;

    case 'DRUM_QUANTITY':
      const drumQty = parseInt(text);
      if (isNaN(drumQty) || drumQty < 1) {
        await sendMessage(sock, phoneNumber, '❌ Please enter a valid number (1 or more).');
        return;
      }
      bookingData.drums = drumQty;
      await updateUserSession(phoneNumber, { bookingData, step: 'METAL_SEAL' });
      await sendMessage(
        sock,
        phoneNumber,
        '🔒 Would you like to add metal coded seals for security?\n\n£5 per drum\n\nType *yes* or *no*'
      );
      break;

    case 'METAL_SEAL':
      bookingData.metalSeal = lowerText === 'yes';
      await updateUserSession(phoneNumber, { bookingData, step: 'DOOR_TO_DOOR' });
      await sendMessage(
        sock,
        phoneNumber,
        '🚪 Would you like door-to-door delivery in Zimbabwe?\n\n£25 extra\n\nType *yes* or *no*'
      );
      break;

    case 'DOOR_TO_DOOR':
      bookingData.doorToDoor = lowerText === 'yes';
      await updateUserSession(phoneNumber, { bookingData, step: 'PAYMENT_METHOD' });
      
      // Calculate and show summary
      const pricing = calculatePrice(bookingData);
      const summary = generateBookingSummary(bookingData, pricing);
      
      await sendMessage(sock, phoneNumber, summary);
      await sendMessage(
        sock,
        phoneNumber,
        `💳 *Payment Method*\n\nHow would you like to pay?\n\n1️⃣ Cash on collection\n2️⃣ Card payment\n3️⃣ Bank transfer\n4️⃣ Mobile payment\n\nType the number (1-4):`
      );
      break;

    case 'PAYMENT_METHOD':
      if (!['1', '2', '3', '4'].includes(text)) {
        await sendMessage(sock, phoneNumber, '❌ Please type 1, 2, 3, or 4.');
        return;
      }
      
      const paymentMethods = {
        '1': 'Cash on Collection',
        '2': 'Card Payment',
        '3': 'Bank Transfer',
        '4': 'Mobile Payment'
      };
      
      bookingData.paymentMethod = paymentMethods[text];
      await updateUserSession(phoneNumber, { bookingData, step: 'CONFIRM' });
      
      await sendMessage(
        sock,
        phoneNumber,
        `✅ *Confirm Your Booking*\n\nEverything looks good?\n\nType *CONFIRM* to submit your booking or *EDIT* to make changes.`
      );
      break;

    case 'CONFIRM':
      if (lowerText === 'confirm') {
        // Create shipment in database
        const trackingNumber = await createShipment(phoneNumber, bookingData);

        // Add to booking history
        const currentSession = await getUserSession(phoneNumber);
        const bookingHistory = currentSession.bookingHistory || [];
        bookingHistory.push({
          trackingNumber,
          date: new Date().toISOString(),
          drums: bookingData.drums || 0,
          boxes: bookingData.boxes || 0,
          otherItem: bookingData.shipmentType === '4' ? bookingData.otherItemDescription : null
        });

        const routeLabel = bookingData.collectionRoute
          ? bookingData.collectionRoute.charAt(0) + bookingData.collectionRoute.slice(1).toLowerCase() + ' Route'
          : 'TBC';
        const followUp = bookingData.shipmentType === '4'
          ? `📞 Our agent will contact you shortly with a quote for your item(s).`
          : `📞 We'll contact you within 24 hours to confirm your collection date.`;

        await sendMessage(
          sock,
          phoneNumber,
          `🎉 *Booking Confirmed!*\n\n✅ Your tracking number: *${trackingNumber}*\n\n📧 Confirmation email sent to ${bookingData.senderEmail}\n\n${followUp}\n\n📦 Your collection route: *${routeLabel}*\n\nType *track* to track your shipment or *menu* for main menu.`
        );
        
        // Reset session but keep user info
        await updateUserSession(phoneNumber, { 
          state: 'MAIN_MENU', 
          bookingData: {},
          step: null,
          bookingHistory
        });
      } else if (lowerText === 'edit') {
        await sendMessage(
          sock,
          phoneNumber,
          'To edit your booking, please type *book* to start over or *menu* for main menu.'
        );
        await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {} });
      } else {
        await sendMessage(sock, phoneNumber, 'Please type *CONFIRM* or *EDIT*.');
      }
      break;
  }
}

function isValidPhone(phone) {
  return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 7;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateBookingSummary(data, pricing) {
  let summary = `📋 *Booking Summary*\n\n`;

  const routeLabel = data.collectionRoute
    ? data.collectionRoute.charAt(0) + data.collectionRoute.slice(1).toLowerCase() + ' Route'
    : '';

  summary += `*SENDER (UK):*\n`;
  summary += `👤 ${data.senderName}\n`;
  summary += `📱 ${data.senderPhone}\n`;
  summary += `📧 ${data.senderEmail}\n`;
  summary += `🏠 ${data.senderAddress}\n`;
  summary += `📮 ${data.senderPostcode}\n`;
  if (routeLabel) summary += `🚚 Route: ${routeLabel}\n`;
  if (data.collectionDate) summary += `📅 Collection: ${data.collectionDate}\n`;
  summary += `\n`;

  summary += `*RECEIVER (Zimbabwe):*\n`;
  summary += `👤 ${data.receiverName}\n`;
  summary += `📱 ${data.receiverPhone}\n`;
  summary += `🏠 ${data.receiverAddress}\n`;
  summary += `🏙️ ${data.receiverCity}\n`;
  summary += `\n`;

  summary += `*SHIPMENT:*\n`;
  if (data.shipmentType === '2') {
    summary += `📝 Other item: ${data.otherItemDescription}\n`;
    summary += `\n💰 *TOTAL: Our agent will quote you*\n`;
  } else {
    if (data.drums) summary += `🥁 ${data.drums} drum(s) @ £${pricing.drumPrice} = £${pricing.drumTotal}\n`;
    if (data.metalSeal && pricing.sealCost) summary += `🔒 Metal seal (£5 × ${data.drums}) = £${pricing.sealCost}\n`;
    if (data.doorToDoor) summary += `🚪 Door-to-door = £${pricing.doorToDoorCost}\n`;
    summary += `\n💰 *TOTAL: £${pricing.total}*\n`;
  }
  summary += `\n`;
  summary += `✅ FREE collection included\n`;
  summary += `✅ Full tracking`;

  return summary;
}
