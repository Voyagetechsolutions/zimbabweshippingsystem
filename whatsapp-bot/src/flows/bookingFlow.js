import { updateUserSession, getUserSession } from '../services/userSession.js';
import { sendMessage, sendButtonMessage, sendListMessage } from '../utils/messageUtils.js';
import { getIrelandCities, getCityToRouteMap } from '../menus/mainMenu.js';
import { createShipment } from '../services/database.js';
import { calculatePrice } from '../utils/pricingUtils.js';

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
      // Check if user has saved information
      if (session.userName && session.userEmail) {
        await sendButtonMessage(
          sock,
          phoneNumber,
          `📦 *Start Your Booking*\n\nWelcome back ${session.userName}! 👋\n\nI have your details saved. How would you like to proceed?`,
          [
            { id: '1', displayText: '⚡ Use saved details' },
            { id: '2', displayText: '✏️ Enter new details' }
          ]
        );
        await updateUserSession(phoneNumber, { step: 'USE_SAVED_OR_NEW' });
      } else {
        await updateUserSession(phoneNumber, { step: 'SENDER_NAME' });
        await sendMessage(sock, phoneNumber, `📦 *Start Your Booking*\n\nI'll guide you through a quick booking.\n\n👤 What's your full name?`);
      }
      break;

    case 'USE_SAVED_OR_NEW':
      if (text === '1') {
        // Pre-fill saved information
        bookingData.senderName = session.userName;
        bookingData.senderEmail = session.userEmail;
        bookingData.senderAddress = session.userAddress || '';
        bookingData.senderCity = session.userCity || '';
        bookingData.senderEircode = session.userEircode || '';
        
        await updateUserSession(phoneNumber, { bookingData, step: 'CONFIRM_SAVED_INFO' });
        
        let savedInfo = `✅ *Your Saved Information:*\n\n`;
        savedInfo += `👤 Name: ${session.userName}\n`;
        savedInfo += `📧 Email: ${session.userEmail}\n`;
        if (session.userAddress) savedInfo += `🏠 Address: ${session.userAddress}\n`;
        if (session.userCity) savedInfo += `🏙️ City: ${session.userCity}\n`;
        if (session.userEircode) savedInfo += `📮 Eircode: ${session.userEircode}\n`;
        savedInfo += `\nIs this information still correct?`;
        
        await sendMessage(sock, phoneNumber, savedInfo);
        await sendButtonMessage(sock, phoneNumber, 'Is this information still correct?', [
          { id: 'yes', displayText: '✅ Yes, looks good' },
          { id: 'no', displayText: '✏️ No, update details' }
        ]);
      } else if (text === '2') {
        await updateUserSession(phoneNumber, { step: 'SENDER_NAME' });
        await sendMessage(sock, phoneNumber, 'Great! Let\'s start fresh.\n\n👤 What\'s your full name?');
      } else {
        await sendMessage(sock, phoneNumber, '❌ Please type *1* or *2*');
      }
      break;

    case 'CONFIRM_SAVED_INFO':
      if (lowerText === 'yes') {
        // Skip to receiver details
        await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_NAME' });
        await sendMessage(
          sock,
          phoneNumber,
          '✅ Perfect! Now let\'s get the receiver details in Zimbabwe.\n\n👤 What\'s the receiver\'s full name?'
        );
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
        `Great ${firstName}! 📱\n\nWhat's your phone number? (Include country code if different from Ireland)`
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
      
      await sendMessage(sock, phoneNumber, '🏠 What\'s your full collection address in Ireland?');
      break;

    case 'SENDER_ADDRESS':
      bookingData.senderAddress = text;
      
      // Save address for future
      await updateUserSession(phoneNumber, { 
        bookingData, 
        step: 'SENDER_CITY',
        userAddress: text
      });
      
      await sendMessage(
        sock,
        phoneNumber,
        `🏙️ Which city/town are you in?\n\n_Examples: Dublin, Cork, Belfast, Galway, Limerick_`
      );
      break;

    case 'SENDER_CITY':
      const city = text.toUpperCase();
      const cities = getIrelandCities();
      const cityMap = getCityToRouteMap();
      
      if (!cities.includes(city)) {
        await sendMessage(
          sock,
          phoneNumber,
          `❌ Sorry, I don't recognize "${text}". Please enter a valid Irish city/town.\n\n_Common cities: Dublin, Cork, Belfast, Galway, Limerick, Waterford_`
        );
        return;
      }
      
      bookingData.senderCity = text;
      bookingData.collectionRoute = cityMap[city];
      
      // Save city for future
      await updateUserSession(phoneNumber, { 
        bookingData, 
        step: 'SENDER_EIRCODE',
        userCity: text
      });
      
      await sendMessage(
        sock,
        phoneNumber,
        '📮 What\'s your Eircode? (Optional - type *skip* if you don\'t have one)'
      );
      break;

    case 'SENDER_EIRCODE':
      const eircode = lowerText === 'skip' ? '' : text;
      bookingData.senderEircode = eircode;
      
      // Save eircode for future
      await updateUserSession(phoneNumber, { 
        bookingData, 
        step: 'RECEIVER_NAME',
        userEircode: eircode
      });
      
      await sendMessage(
        sock,
        phoneNumber,
        '✅ Great! Now let\'s get the receiver details in Zimbabwe.\n\n👤 What\'s the receiver\'s full name?'
      );
      break;

    case 'RECEIVER_NAME':
      bookingData.receiverName = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_PHONE' });
      await sendMessage(sock, phoneNumber, '📱 What\'s the receiver\'s phone number in Zimbabwe?');
      break;

    case 'RECEIVER_PHONE':
      bookingData.receiverPhone = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_ADDRESS' });
      await sendMessage(sock, phoneNumber, '🏠 What\'s the delivery address in Zimbabwe?');
      break;

    case 'RECEIVER_ADDRESS':
      bookingData.receiverAddress = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'RECEIVER_CITY' });
      await sendMessage(
        sock,
        phoneNumber,
        '🏙️ Which city in Zimbabwe?\n\n_Examples: Harare, Bulawayo, Mutare, Gweru_'
      );
      break;

    case 'RECEIVER_CITY':
      bookingData.receiverCity = text;
      await updateUserSession(phoneNumber, { bookingData, step: 'SHIPMENT_TYPE' });
      await sendListMessage(
        sock,
        phoneNumber,
        '📦 *What would you like to ship?*',
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

    case 'SHIPMENT_TYPE':
      if (!['1', '2', '3'].includes(text)) {
        await sendMessage(sock, phoneNumber, '❌ Please type 1, 2, or 3.');
        return;
      }
      bookingData.shipmentType = text;
      
      if (text === '1') {
        await updateUserSession(phoneNumber, { bookingData, step: 'DRUM_QUANTITY' });
        await sendMessage(sock, phoneNumber, '🥁 How many drums? (Enter a number)');
      } else if (text === '2') {
        await updateUserSession(phoneNumber, { bookingData, step: 'BOX_QUANTITY' });
        await sendMessage(sock, phoneNumber, '📦 How many trunks/boxes? (Enter a number)');
      } else {
        await updateUserSession(phoneNumber, { bookingData, step: 'DRUM_QUANTITY' });
        await sendMessage(sock, phoneNumber, '🥁 How many drums? (Enter a number)');
      }
      break;

    case 'DRUM_QUANTITY':
      const drumQty = parseInt(text);
      if (isNaN(drumQty) || drumQty < 1) {
        await sendMessage(sock, phoneNumber, '❌ Please enter a valid number (1 or more).');
        return;
      }
      bookingData.drums = drumQty;
      
      if (bookingData.shipmentType === '3') {
        await updateUserSession(phoneNumber, { bookingData, step: 'BOX_QUANTITY' });
        await sendMessage(sock, phoneNumber, '📦 How many trunks/boxes? (Enter a number)');
      } else {
        await updateUserSession(phoneNumber, { bookingData, step: 'METAL_SEAL' });
        await sendButtonMessage(
          sock,
          phoneNumber,
          '🔒 *Metal Coded Seals*\n\nWould you like to add metal coded seals for extra security?\n\n_€7 per seal_',
          [
            { id: 'yes', displayText: '✅ Yes, add seals' },
            { id: 'no', displayText: '❌ No thanks' }
          ]
        );
      }
      break;

    case 'BOX_QUANTITY':
      const boxQty = parseInt(text);
      if (isNaN(boxQty) || boxQty < 1) {
        await sendMessage(sock, phoneNumber, '❌ Please enter a valid number (1 or more).');
        return;
      }
      bookingData.boxes = boxQty;
      await updateUserSession(phoneNumber, { bookingData, step: 'METAL_SEAL' });
      await sendButtonMessage(
        sock,
        phoneNumber,
        '🔒 *Metal Coded Seals*\n\nWould you like to add metal coded seals for extra security?\n\n_€7 per seal_',
        [
          { id: 'yes', displayText: '✅ Yes, add seals' },
          { id: 'no', displayText: '❌ No thanks' }
        ]
      );
      break;

    case 'METAL_SEAL':
      bookingData.metalSeal = lowerText === 'yes';
      await updateUserSession(phoneNumber, { bookingData, step: 'DOOR_TO_DOOR' });
      await sendButtonMessage(
        sock,
        phoneNumber,
        '🚪 *Door-to-Door Delivery*\n\nWould you like door-to-door delivery in Zimbabwe?\n\n_€25 extra charge_',
        [
          { id: 'yes', displayText: '🚪 Yes, deliver to door' },
          { id: 'no', displayText: '🏪 No, depot pickup' }
        ]
      );
      break;

    case 'DOOR_TO_DOOR':
      bookingData.doorToDoor = lowerText === 'yes';
      await updateUserSession(phoneNumber, { bookingData, step: 'PAYMENT_METHOD' });
      
      // Calculate and show summary
      const pricing = calculatePrice(bookingData);
      const summary = generateBookingSummary(bookingData, pricing);
      
      await sendMessage(sock, phoneNumber, summary);
      await sendListMessage(
        sock,
        phoneNumber,
        '💳 *How would you like to pay?*',
        'Choose payment method',
        [{
          title: 'Payment Options',
          rows: [
            { id: '1', title: '💵 Cash on Collection', description: 'Pay when we collect your items' },
            { id: '2', title: '💳 Card Payment', description: 'Debit or credit card' },
            { id: '3', title: '🏦 Bank Transfer', description: 'Direct bank transfer' },
            { id: '4', title: '📱 Mobile Payment', description: 'Revolut, PayPal, etc.' }
          ]
        }]
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
      
      await sendButtonMessage(
        sock,
        phoneNumber,
        `✅ *Ready to confirm your booking?*\n\nPayment: ${paymentMethods[text]}\n\nTap below to submit or go back to the menu.`,
        [
          { id: 'confirm', displayText: '✅ Confirm Booking' },
          { id: 'edit', displayText: '✏️ Start Over' }
        ]
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
          boxes: bookingData.boxes || 0
        });
        
        await sendMessage(
          sock,
          phoneNumber,
          `🎉 *Booking Confirmed!*\n\n✅ Your tracking number: *${trackingNumber}*\n\n📧 Confirmation email sent to ${bookingData.senderEmail}\n\n📞 We'll contact you within 24 hours to confirm your collection date.\n\n📢 *Remember:* Collections commence in August 2026\n\nType *track* to track your shipment or *menu* for main menu.`
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
  
  summary += `*SENDER (Ireland):*\n`;
  summary += `👤 ${data.senderName}\n`;
  summary += `📱 ${data.senderPhone}\n`;
  summary += `📧 ${data.senderEmail}\n`;
  summary += `🏠 ${data.senderAddress}\n`;
  summary += `🏙️ ${data.senderCity}\n`;
  if (data.senderEircode) summary += `📮 ${data.senderEircode}\n`;
  summary += `\n`;
  
  summary += `*RECEIVER (Zimbabwe):*\n`;
  summary += `👤 ${data.receiverName}\n`;
  summary += `📱 ${data.receiverPhone}\n`;
  summary += `🏠 ${data.receiverAddress}\n`;
  summary += `🏙️ ${data.receiverCity}\n`;
  summary += `\n`;
  
  summary += `*SHIPMENT:*\n`;
  if (data.drums) summary += `🥁 ${data.drums} drum(s) - €${pricing.drumTotal}\n`;
  if (data.boxes) summary += `📦 ${data.boxes} box(es) - €${pricing.boxTotal}\n`;
  if (data.metalSeal) summary += `🔒 Metal seal - €${pricing.sealCost}\n`;
  if (data.doorToDoor) summary += `🚪 Door-to-door - €${pricing.doorToDoorCost}\n`;
  summary += `\n`;
  
  summary += `💰 *TOTAL: €${pricing.total}*\n`;
  summary += `\n`;
  summary += `✅ FREE collection included\n`;
  summary += `✅ Full tracking\n`;
  summary += `✅ 6 weeks delivery`;
  
  return summary;
}
