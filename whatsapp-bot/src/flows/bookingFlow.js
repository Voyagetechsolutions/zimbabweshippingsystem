import { updateUserSession, getUserSession } from '../services/userSession.js';
import { sendMessage, sendButtonMessage, sendListMessage } from '../utils/messageUtils.js';
import { getIrelandCities, getCityToRouteMap } from '../menus/mainMenu.js';
import { createShipment } from '../services/database.js';
import { calculatePrice, getBotSettings } from '../utils/pricingUtils.js';

export async function handleBookingFlow(sock, phoneNumber, text, session) {
  const lowerText = text.toLowerCase().trim();

  // Allow user to cancel at any time
  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {}, step: null });
    const { sendMainMenuList } = await import('../handlers/messageHandler.js');
    await sendMainMenuList(sock, phoneNumber, session.userName);
    return;
  }

  // Read fresh session to avoid stale step
  const freshSession = await getUserSession(phoneNumber);
  const step = freshSession.step || 'START';
  const bookingData = { ...(freshSession.bookingData || {}) };

  switch (step) {
    case 'START': {
      if (freshSession.userName && freshSession.userEmail) {
        await updateUserSession(phoneNumber, { step: 'USE_SAVED_OR_NEW' });
        await sendButtonMessage(
          sock, phoneNumber,
          `📦 *Start Your Booking*\n\nWelcome back ${freshSession.userName}! 👋\n\nI have your details saved. How would you like to proceed?`,
          [
            { id: '1', displayText: '⚡ Use saved details' },
            { id: '2', displayText: '✏️ Enter new details' }
          ]
        );
      } else {
        await updateUserSession(phoneNumber, { step: 'SENDER_NAME', bookingData: {} });
        await sendMessage(sock, phoneNumber,
          `📦 *Start Your Booking*\n\nHere's what we'll need from you:\n\n• Your full name, phone & email\n• Your collection address in Ireland\n• Receiver's details in Zimbabwe\n• What you're sending (drums / boxes)\n\nThis will only take a minute.\n\n➡️ *Please type your full name*\n\n_Type_ cancel _anytime to return to the main menu._`
        );
      }
      break;
    }

    case 'USE_SAVED_OR_NEW': {
      if (text === '1') {
        const filled = {
          senderName: freshSession.userName,
          senderEmail: freshSession.userEmail,
          senderAddress: freshSession.userAddress || '',
          senderCity: freshSession.userCity || '',
        };
        await updateUserSession(phoneNumber, { bookingData: filled, step: 'CONFIRM_SAVED_INFO' });

        let savedInfo = `✅ *Your Saved Information:*\n\n`;
        savedInfo += `👤 Name: ${freshSession.userName}\n`;
        savedInfo += `📧 Email: ${freshSession.userEmail}\n`;
        if (freshSession.userAddress) savedInfo += `🏠 Address: ${freshSession.userAddress}\n`;
        if (freshSession.userCity) savedInfo += `🏙️ City: ${freshSession.userCity}\n`;

        await sendMessage(sock, phoneNumber, savedInfo);
        await sendButtonMessage(sock, phoneNumber, 'Is this information still correct?', [
          { id: 'yes', displayText: '✅ Yes, looks good' },
          { id: 'no', displayText: '✏️ No, update details' }
        ]);
      } else if (text === '2') {
        await updateUserSession(phoneNumber, { step: 'SENDER_NAME', bookingData: {} });
        await sendMessage(sock, phoneNumber, `Let's start fresh.\n\n➡️ *Please type your full name*`);
      } else {
        await sendButtonMessage(sock, phoneNumber, 'Please choose an option:', [
          { id: '1', displayText: '⚡ Use saved details' },
          { id: '2', displayText: '✏️ Enter new details' }
        ]);
      }
      break;
    }

    case 'CONFIRM_SAVED_INFO': {
      if (lowerText === 'yes') {
        if (freshSession.receiverName && freshSession.receiverPhone) {
          await updateUserSession(phoneNumber, { step: 'USE_SAVED_RECEIVER' });
          let savedReceiverInfo = `✅ Perfect! Now for the receiver in Zimbabwe.\n\nI have a saved receiver:\n\n`;
          savedReceiverInfo += `👤 ${freshSession.receiverName}\n`;
          savedReceiverInfo += `📱 ${freshSession.receiverPhone}\n`;
          savedReceiverInfo += `🏠 ${freshSession.receiverAddress}\n`;
          savedReceiverInfo += `🏙️ ${freshSession.receiverCity}\n`;
          await sendMessage(sock, phoneNumber, savedReceiverInfo);
          await sendButtonMessage(sock, phoneNumber, 'Is this the same receiver?', [
            { id: 'yes', displayText: '✅ Yes, same receiver' },
            { id: 'no', displayText: '✏️ No, enter new receiver' }
          ]);
        } else {
          await updateUserSession(phoneNumber, { step: 'RECEIVER_NAME' });
          await sendMessage(sock, phoneNumber,
            `✅ Perfect! Now let's get the receiver details in Zimbabwe.\n\n➡️ *What's the receiver's full name?*`
          );
        }
      } else if (lowerText === 'no') {
        await updateUserSession(phoneNumber, { bookingData: {}, step: 'SENDER_NAME' });
        await sendMessage(sock, phoneNumber, `No problem! Let's update your information.\n\n➡️ *Please type your full name*`);
      } else {
        await sendButtonMessage(sock, phoneNumber, 'Is this information still correct?', [
          { id: 'yes', displayText: '✅ Yes, looks good' },
          { id: 'no', displayText: '✏️ No, update details' }
        ]);
      }
      break;
    }

    case 'SENDER_NAME': {
      const name = text.trim();
      if (!name || name.length < 2) {
        await sendMessage(sock, phoneNumber, `❌ Please enter your full name.`);
        return;
      }
      bookingData.senderName = name;
      const firstName = name.split(' ')[0];
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_PHONE', userName: firstName });
      await sendMessage(sock, phoneNumber,
        `Great ${firstName}! �\n\n➡️ *What's your phone number?*\n\n_Include country code, e.g. +353 87 123 4567_`
      );
      break;
    }

    case 'SENDER_PHONE': {
      if (!isValidPhone(text)) {
        await sendMessage(sock, phoneNumber, `❌ Please enter a valid phone number, e.g. +353 87 123 4567`);
        return;
      }
      bookingData.senderPhone = text.trim();
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_EMAIL' });
      await sendMessage(sock, phoneNumber, `➡️ *What's your email address?*`);
      break;
    }

    case 'SENDER_EMAIL': {
      if (!isValidEmail(text)) {
        await sendMessage(sock, phoneNumber, `❌ Please enter a valid email address, e.g. name@example.com`);
        return;
      }
      bookingData.senderEmail = text.trim();
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_ADDRESS', userEmail: text.trim() });
      await sendMessage(sock, phoneNumber, `➡️ *What's your full collection address in Ireland?*\n\n_e.g. 12 Main Street, Dublin_`);
      break;
    }

    case 'SENDER_ADDRESS': {
      bookingData.senderAddress = text.trim();
      await updateUserSession(phoneNumber, { bookingData, step: 'SENDER_CITY', userAddress: text.trim() });
      await sendMessage(sock, phoneNumber,
        `➡️ *Which city/town are you in?*\n\n_e.g. Dublin, Cork, Belfast, Galway, Limerick_`
      );
      break;
    }

    case 'SENDER_CITY': {
      const city = text.trim().toUpperCase();
      const cities = getIrelandCities();
      const cityMap = getCityToRouteMap();

      if (!cities.includes(city)) {
        await sendMessage(sock, phoneNumber,
          `❌ Sorry, I don't recognise "${text}". Please enter a valid Irish city/town.\n\n_Common cities: Dublin, Cork, Belfast, Galway, Limerick, Waterford_`
        );
        return;
      }

      bookingData.senderCity = text.trim();
      bookingData.collectionRoute = cityMap[city];
      await updateUserSession(phoneNumber, { bookingData, userCity: text.trim() });

      if (freshSession.receiverName && freshSession.receiverPhone) {
        await updateUserSession(phoneNumber, { step: 'USE_SAVED_RECEIVER' });
        let savedReceiverInfo = `✅ Got it!\n\nNow for the receiver in Zimbabwe.\n\nI have a saved receiver:\n\n`;
        savedReceiverInfo += `👤 ${freshSession.receiverName}\n`;
        savedReceiverInfo += `📱 ${freshSession.receiverPhone}\n`;
        savedReceiverInfo += `🏠 ${freshSession.receiverAddress}\n`;
        savedReceiverInfo += `🏙️ ${freshSession.receiverCity}\n`;
        await sendMessage(sock, phoneNumber, savedReceiverInfo);
        await sendButtonMessage(sock, phoneNumber, 'Is this the same receiver?', [
          { id: 'yes', displayText: '✅ Yes, same receiver' },
          { id: 'no', displayText: '✏️ No, enter new receiver' }
        ]);
      } else {
        await updateUserSession(phoneNumber, { step: 'RECEIVER_NAME' });
        await sendMessage(sock, phoneNumber,
          `✅ Got it!\n\nNow let's get the receiver details in Zimbabwe.\n\n➡️ *What's the receiver's full name?*`
        );
      }
      break;
    }

    case 'USE_SAVED_RECEIVER': {
      if (lowerText === 'yes') {
        bookingData.receiverName = freshSession.receiverName;
        bookingData.receiverPhone = freshSession.receiverPhone;
        bookingData.receiverAddress = freshSession.receiverAddress;
        bookingData.receiverCity = freshSession.receiverCity;
        await updateUserSession(phoneNumber, { bookingData, step: 'SHIPMENT_TYPE' });
        await sendListMessage(sock, phoneNumber,
          `✅ Receiver confirmed!\n\n📦 *What would you like to ship?*`,
          'View shipment types',
          [{
            title: 'Shipment Options',
            rows: [
              { id: '1', title: '🥁 Drums', description: '200-220L barrels' },
              { id: '2', title: '📦 Trunks / Storage Boxes', description: 'Standard shipping boxes' },
              { id: '3', title: '🥁📦 Both', description: 'Drums and boxes together' }
            ]
          }]
        );
      } else if (lowerText === 'no') {
        await updateUserSession(phoneNumber, { step: 'RECEIVER_NAME' });
        await sendMessage(sock, phoneNumber, `No problem!\n\n➡️ *What's the receiver's full name?*`);
      } else {
        await sendButtonMessage(sock, phoneNumber, 'Is this the same receiver?', [
          { id: 'yes', displayText: '✅ Yes, same receiver' },
          { id: 'no', displayText: '✏️ No, enter new receiver' }
        ]);
      }
      break;
    }

    case 'RECEIVER_NAME': {
      bookingData.receiverName = text.trim();
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_PHONE', receiverName: text.trim() });
      await sendMessage(sock, phoneNumber, `➡️ *What's the receiver's phone number in Zimbabwe?*`);
      break;
    }

    case 'RECEIVER_PHONE': {
      bookingData.receiverPhone = text.trim();
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_ADDRESS', receiverPhone: text.trim() });
      await sendMessage(sock, phoneNumber, `➡️ *What's the delivery address in Zimbabwe?*`);
      break;
    }

    case 'RECEIVER_ADDRESS': {
      bookingData.receiverAddress = text.trim();
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_CITY', receiverAddress: text.trim() });
      await sendMessage(sock, phoneNumber,
        `➡️ *Which city in Zimbabwe?*\n\n_e.g. Harare, Bulawayo, Mutare, Gweru_`
      );
      break;
    }

    case 'RECEIVER_CITY': {
      bookingData.receiverCity = text.trim();
      await updateUserSession(phoneNumber, { bookingData, step: 'SHIPMENT_TYPE', receiverCity: text.trim() });
      await sendListMessage(sock, phoneNumber,
        `📦 *What would you like to ship?*`,
        'View shipment types',
        [{
          title: 'Shipment Options',
          rows: [
            { id: '1', title: '🥁 Drums', description: '200-220L barrels' },
            { id: '2', title: '📦 Trunks / Storage Boxes', description: 'Standard shipping boxes' },
            { id: '3', title: '🥁📦 Both', description: 'Drums and boxes together' }
          ]
        }]
      );
      break;
    }

    case 'SHIPMENT_TYPE': {
      if (!['1', '2', '3'].includes(text)) {
        await sendMessage(sock, phoneNumber, `❌ Please select an option from the menu.`);
        return;
      }
      bookingData.shipmentType = text;
      if (text === '2') {
        await updateUserSession(phoneNumber, { bookingData, step: 'BOX_QUANTITY' });
        await sendMessage(sock, phoneNumber, `➡️ *How many trunks/boxes?* (Enter a number)`);
      } else {
        await updateUserSession(phoneNumber, { bookingData, step: 'DRUM_QUANTITY' });
        await sendMessage(sock, phoneNumber, `➡️ *How many drums?* (Enter a number)`);
      }
      break;
    }

    case 'DRUM_QUANTITY': {
      const drumQty = parseInt(text);
      if (isNaN(drumQty) || drumQty < 1) {
        await sendMessage(sock, phoneNumber, `❌ Please enter a valid number (1 or more).`);
        return;
      }
      bookingData.drums = drumQty;
      if (bookingData.shipmentType === '3') {
        await updateUserSession(phoneNumber, { bookingData, step: 'BOX_QUANTITY' });
        await sendMessage(sock, phoneNumber, `➡️ *How many trunks/boxes?* (Enter a number)`);
      } else {
        await updateUserSession(phoneNumber, { bookingData, step: 'METAL_SEAL' });
        await askMetalSeal(sock, phoneNumber, bookingData);
      }
      break;
    }

    case 'BOX_QUANTITY': {
      const boxQty = parseInt(text);
      if (isNaN(boxQty) || boxQty < 1) {
        await sendMessage(sock, phoneNumber, `❌ Please enter a valid number (1 or more).`);
        return;
      }
      bookingData.boxes = boxQty;
      await updateUserSession(phoneNumber, { bookingData, step: 'METAL_SEAL' });
      await askMetalSeal(sock, phoneNumber, bookingData);
      break;
    }

    case 'METAL_SEAL': {
      bookingData.metalSeal = lowerText === 'yes';
      await updateUserSession(phoneNumber, { bookingData, step: 'DOOR_TO_DOOR' });
      await sendButtonMessage(sock, phoneNumber,
        `🚪 *Door-to-Door Delivery*\n\nWould you like door-to-door delivery in Zimbabwe?\n\n_Additional charge applies_`,
        [
          { id: 'yes', displayText: '🚪 Yes, deliver to door' },
          { id: 'no', displayText: '🏪 No, depot pickup' }
        ]
      );
      break;
    }

    case 'DOOR_TO_DOOR': {
      bookingData.doorToDoor = lowerText === 'yes';
      await updateUserSession(phoneNumber, { bookingData, step: 'PAYMENT_METHOD' });

      const settings = await getBotSettings();
      const pricing = calculatePrice(bookingData, settings);
      const summary = generateBookingSummary(bookingData, pricing);

      await sendMessage(sock, phoneNumber, summary);
      await sendListMessage(sock, phoneNumber,
        `💳 *How would you like to pay?*`,
        'Choose payment method',
        [{
          title: 'Payment Options',
          rows: [
            { id: '1', title: '💵 Cash on Collection', description: 'Pay when we collect your items' },
            { id: '2', title: '� Cash on Delivery', description: 'Pay when items arrive in Zimbabwe' },
            { id: '3', title: '🏦 Bank Transfer', description: 'Direct bank transfer' }
          ]
        }]
      );
      break;
    }

    case 'PAYMENT_METHOD': {
      if (!['1', '2', '3'].includes(text)) {
        await sendMessage(sock, phoneNumber, `❌ Please select a payment method from the menu.`);
        return;
      }
      const paymentMethods = {
        '1': 'Cash on Collection',
        '2': 'Cash on Delivery',
        '3': 'Bank Transfer'
      };
      bookingData.paymentMethod = paymentMethods[text];
      await updateUserSession(phoneNumber, { bookingData, step: 'CONFIRM' });
      await sendButtonMessage(sock, phoneNumber,
        `✅ *Ready to confirm your booking?*\n\nPayment: ${paymentMethods[text]}\n\nTap below to submit or start over.`,
        [
          { id: 'confirm', displayText: '✅ Confirm Booking' },
          { id: 'edit', displayText: '✏️ Start Over' }
        ]
      );
      break;
    }

    case 'CONFIRM': {
      if (lowerText === 'confirm') {
        const trackingNumber = await createShipment(phoneNumber, bookingData);

        const currentSession = await getUserSession(phoneNumber);
        const bookingHistory = currentSession.bookingHistory || [];
        bookingHistory.push({
          trackingNumber,
          date: new Date().toISOString(),
          drums: bookingData.drums || 0,
          boxes: bookingData.boxes || 0
        });

        await sendMessage(sock, phoneNumber,
          `🎉 *Booking Confirmed!*\n\n✅ Your tracking number: *${trackingNumber}*\n\n📧 Confirmation sent to ${bookingData.senderEmail}\n\n📞 We'll contact you within 24 hours to confirm your collection date.\n\n📢 *Collections commence August 2026*\n\nType *track* to track your shipment or *menu* for main menu.`
        );

        await updateUserSession(phoneNumber, {
          state: 'MAIN_MENU',
          bookingData: {},
          step: null,
          bookingHistory
        });
      } else if (lowerText === 'edit') {
        await updateUserSession(phoneNumber, { state: 'MAIN_MENU', bookingData: {}, step: null });
        await sendMessage(sock, phoneNumber, `No problem. Type *book* to start a new booking or *menu* for the main menu.`);
      } else {
        await sendButtonMessage(sock, phoneNumber, `Ready to confirm?`, [
          { id: 'confirm', displayText: '✅ Confirm Booking' },
          { id: 'edit', displayText: '✏️ Start Over' }
        ]);
      }
      break;
    }
  }
}

async function askMetalSeal(sock, phoneNumber, bookingData) {
  const totalItems = (bookingData.drums || 0) + (bookingData.boxes || 0);
  const settings = await getBotSettings();
  const sealPrice = settings.seal_price || 7;
  const totalSealCost = totalItems * sealPrice;

  await sendButtonMessage(sock, phoneNumber,
    `🔒 *Metal Coded Seals*\n\nWould you like to add metal coded seals for extra security?\n\n_€${sealPrice} per item × ${totalItems} item(s) = €${totalSealCost} total_`,
    [
      { id: 'yes', displayText: `✅ Yes — €${totalSealCost}` },
      { id: 'no', displayText: '❌ No thanks' }
    ]
  );
}

function isValidPhone(phone) {
  return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 7;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateBookingSummary(data, pricing) {
  let summary = `📋 *Booking Summary*\n\n`;

  summary += `*SENDER (Ireland):*\n`;
  summary += `👤 ${data.senderName}\n`;
  summary += `📱 ${data.senderPhone}\n`;
  summary += `📧 ${data.senderEmail}\n`;
  summary += `🏠 ${data.senderAddress}\n`;
  summary += `🏙️ ${data.senderCity}\n\n`;

  summary += `*RECEIVER (Zimbabwe):*\n`;
  summary += `👤 ${data.receiverName}\n`;
  summary += `📱 ${data.receiverPhone}\n`;
  summary += `🏠 ${data.receiverAddress}\n`;
  summary += `🏙️ ${data.receiverCity}\n\n`;

  summary += `*SHIPMENT:*\n`;
  if (data.drums) summary += `🥁 ${data.drums} drum(s) — €${pricing.drumTotal}\n`;
  if (data.boxes) summary += `📦 ${data.boxes} box(es) — €${pricing.boxTotal}\n`;
  if (data.metalSeal) summary += `🔒 Metal seals (${pricing.sealQty}×) — €${pricing.sealCost}\n`;
  if (data.doorToDoor) summary += `🚪 Door-to-door — €${pricing.doorToDoorCost}\n`;
  summary += `\n💰 *TOTAL: €${pricing.total}*\n\n`;

  summary += `✅ FREE collection included\n`;
  summary += `✅ Full tracking\n`;
  summary += `✅ 6–8 weeks delivery`;

  return summary;
}
