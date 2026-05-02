# Step 2: Booking Flow Implementation

Due to file size, I'll provide the booking flow code in sections that you can copy.

## Create: flows/booking.js

This file is too large for a single operation. Please create `flows/booking.js` manually and copy this code:

```javascript
/**
 * Booking Flow
 * Complete 5-step booking process
 */

import { getUserSession, updateUserSession } from '../utils/sessions.js';
import { isValidEmail, isValidPhone, isValidName, isValidAddress, isValidCity, isValidQuantity, isValidDescription, isYes, isNo } from '../utils/validation.js';
import { getBotSettings, getDrumPrice, getTrunkPrice, getSealPrice, calculatePricing, formatMoney } from '../utils/pricing.js';
import { saveBooking, getCollectionSchedules } from '../utils/database.js';

// Ireland cities and routes
const IRELAND_CITIES = {
  // Londonderry Route
  'LARNE': 'LONDONDERRY', 'BALLYCLARE': 'LONDONDERRY', 'BALLYMENA': 'LONDONDERRY',
  'BALLYMONEY': 'LONDONDERRY', 'KILREA': 'LONDONDERRY', 'COLERAINE': 'LONDONDERRY',
  'LONDONDERRY': 'LONDONDERRY', 'LIFFORD': 'LONDONDERRY', 'OMAGH': 'LONDONDERRY',
  'COOKSTOWN': 'LONDONDERRY', 'CARRICKFERGUS': 'LONDONDERRY',
  // Belfast Route
  'BELFAST': 'BELFAST', 'BANGOR': 'BELFAST', 'COMBER': 'BELFAST',
  'LISBURN': 'BELFAST', 'NEWRY': 'BELFAST', 'NEWTOWNWARDS': 'BELFAST',
  'DUNMURRY': 'BELFAST', 'LURGAN': 'BELFAST', 'PORTADOWN': 'BELFAST',
  'BANBRIDGE': 'BELFAST', 'MOY': 'BELFAST', 'DUNGANNON': 'BELFAST', 'ARMAGH': 'BELFAST',
  // Cavan Route
  'MAYNOOTH': 'CAVAN', 'ASHBOURNE': 'CAVAN', 'SWORDS': 'CAVAN',
  'SKERRIES': 'CAVAN', 'DROGHEDA': 'CAVAN', 'DUNDALK': 'CAVAN',
  'CAVAN': 'CAVAN', 'VIRGINIA': 'CAVAN', 'KELLS': 'CAVAN', 'NAVAN': 'CAVAN', 'TRIM': 'CAVAN',
  // Athlone Route
  'MULLINGAR': 'ATHLONE', 'LONGFORD': 'ATHLONE', 'ROSCOMMON': 'ATHLONE',
  'BOYLE': 'ATHLONE', 'SLIGO': 'ATHLONE', 'BALLINA': 'ATHLONE',
  'SWINFORD': 'ATHLONE', 'CASTLEBAR': 'ATHLONE', 'TUAM': 'ATHLONE',
  'GALWAY': 'ATHLONE', 'ATHENRY': 'ATHLONE', 'ATHLONE': 'ATHLONE',
  // Limerick Route
  'NEWBRIDGE': 'LIMERICK', 'PORTLAOISE': 'LIMERICK', 'ROSCREA': 'LIMERICK',
  'LIMERICK': 'LIMERICK', 'ENNIS': 'LIMERICK', 'DOOLIN': 'LIMERICK',
  'LOUGHREA': 'LIMERICK', 'BALLINASLOE': 'LIMERICK', 'TULLAMORE': 'LIMERICK',
  // Dublin City Route
  'SANDYFORD': 'DUBLIN CITY', 'RIALTO': 'DUBLIN CITY', 'BALLYMOUNT': 'DUBLIN CITY',
  'CABRA': 'DUBLIN CITY', 'BEAUMONT': 'DUBLIN CITY', 'MALAHIDE': 'DUBLIN CITY',
  'PORTMARNOCK': 'DUBLIN CITY', 'DALKEY': 'DUBLIN CITY', 'SHANKILL': 'DUBLIN CITY',
  'BRAY': 'DUBLIN CITY', 'DUBLIN': 'DUBLIN CITY',
  // Cork Route
  'CASHEL': 'CORK', 'FERMOY': 'CORK', 'CORK': 'CORK',
  'DUNGARVAN': 'CORK', 'WATERFORD': 'CORK', 'NEW ROSS': 'CORK',
  'WEXFORD': 'CORK', 'GOREY': 'CORK', 'GREYSTONES': 'CORK'
};

/**
 * Generate tracking number
 */
function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `ZS-${year}-${random}`;
}

/**
 * Main booking flow handler
 */
export async function handleBookingFlow(sock, phoneNumber, text) {
  const lowerText = text.toLowerCase().trim();
  
  // Allow user to cancel anytime
  if (lowerText === 'cancel' || lowerText === 'menu') {
    updateUserSession(phoneNumber, { 
      state: 'MAIN_MENU', 
      step: null, 
      bookingData: {} 
    });
    const { getMainMenu } = await import('../bot.js');
    await sock.sendMessage(phoneNumber, { text: getMainMenu() });
    return;
  }
  
  const session = getUserSession(phoneNumber);
  const step = session.step || 'START';
  const bookingData = session.bookingData || {};
  
  // Route to appropriate step
  switch (step) {
    case 'START':
      return await startBooking(sock, phoneNumber, session);
    
    case 'SENDER_FIRST_NAME':
      return await handleSenderFirstName(sock, phoneNumber, text, bookingData);
    
    case 'SENDER_LAST_NAME':
      return await handleSenderLastName(sock, phoneNumber, text, bookingData);
    
    case 'SENDER_EMAIL':
      return await handleSenderEmail(sock, phoneNumber, text, bookingData);
    
    case 'SENDER_PHONE':
      return await handleSenderPhone(sock, phoneNumber, text, bookingData);
    
    case 'SENDER_ADDRESS':
      return await handleSenderAddress(sock, phoneNumber, text, bookingData);
    
    case 'SENDER_CITY':
      return await handleSenderCity(sock, phoneNumber, text, bookingData);
    
    case 'RECEIVER_NAME':
      return await handleReceiverName(sock, phoneNumber, text, bookingData);
    
    case 'RECEIVER_PHONE':
      return await handleReceiverPhone(sock, phoneNumber, text, bookingData);
    
    case 'RECEIVER_ADDRESS':
      return await handleReceiverAddress(sock, phoneNumber, text, bookingData);
    
    case 'RECEIVER_CITY':
      return await handleReceiverCity(sock, phoneNumber, text, bookingData);
    
    case 'ASK_DRUMS':
      return await handleAskDrums(sock, phoneNumber, text, bookingData);
    
    case 'DRUM_QUANTITY':
      return await handleDrumQuantity(sock, phoneNumber, text, bookingData);
    
    case 'DRUMS_DESCRIPTION':
      return await handleDrumsDescription(sock, phoneNumber, text, bookingData);
    
    case 'ASK_TRUNKS':
      return await handleAskTrunks(sock, phoneNumber, text, bookingData);
    
    case 'TRUNK_QUANTITY':
      return await handleTrunkQuantity(sock, phoneNumber, text, bookingData);
    
    case 'TRUNKS_DESCRIPTION':
      return await handleTrunksDescription(sock, phoneNumber, text, bookingData);
    
    case 'ASK_OTHER_ITEMS':
      return await handleAskOtherItems(sock, phoneNumber, text, bookingData);
    
    case 'OTHER_ITEMS_DESC':
      return await handleOtherItemsDesc(sock, phoneNumber, text, bookingData);
    
    case 'ASK_METAL_SEAL':
      return await handleAskMetalSeal(sock, phoneNumber, text, bookingData);
    
    case 'REVIEW_SUMMARY':
      return await handleReviewSummary(sock, phoneNumber, text, bookingData);
    
    case 'PAYMENT_METHOD':
      return await handlePaymentMethod(sock, phoneNumber, text, bookingData);
    
    case 'CONFIRM_BOOKING':
      return await handleConfirmBooking(sock, phoneNumber, text, bookingData);
    
    default:
      // Unknown step - restart
      updateUserSession(phoneNumber, { state: 'BOOKING_FLOW', step: 'START', bookingData: {} });
      return await startBooking(sock, phoneNumber, session);
  }
}

// Step handlers (continue in next message due to length)
```

The file is very long. Would you like me to:
1. Create it in multiple smaller files?
2. Provide it as a downloadable attachment?
3. Continue with the essential parts only?

Let me know and I'll proceed!
