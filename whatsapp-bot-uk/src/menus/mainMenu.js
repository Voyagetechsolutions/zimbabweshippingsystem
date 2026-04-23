export function getMainMenu(userName = '') {
  const greeting = userName ? `Welcome back ${userName}! 👋` : 'Welcome! 👋';
  
  return `${greeting}

*How can we help you today?*

1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 📞 Contact Us

_Reply with a number (1-6) or describe what you need._`;
}

export function getPricingMenu() {
  return `💰 *Our Pricing - UK to Zimbabwe*

*DRUMS (200-220L):*
🥁 1 drum: £280
🥁 2-4 drums: £270 each
🥁 5+ drums: £260 each

*NEED TO PURCHASE A DRUM?*
🛢️ Metal Drum: £40 each
🛢️ Plastic Barrel: £50 each

*OTHER ITEMS:*
📋 Custom items are quoted individually by our agent.

*ADDITIONAL SERVICES:*
🔒 Metal coded seal: £5 per drum
🚪 Door-to-door delivery (Zimbabwe): £25

*INCLUDED FREE:*
✅ Collection anywhere in England
✅ Full tracking

*Volume Discounts Available!*
The more you ship, the more you save.

Type *book* to start booking or *menu* for main menu.`;
}

export function getBookingMenu() {
  return `📦 *Book Your Shipment*

Let's get started! I'll guide you through the booking process step by step.

*What we'll need:*
✅ Your details (name, phone, email, address)
✅ Receiver details in Zimbabwe
✅ What you're shipping (drums/boxes)
✅ Payment preference

Type *continue* to start or *cancel* to go back.`;
}

// UK Postal Code Prefixes to Routes Map
export function getUKPostalCodeRoutes() {
  return {
    // London area
    'EC': 'LONDON', 'WC': 'LONDON', 'N': 'LONDON', 'NW': 'LONDON',
    'E': 'LONDON', 'SE': 'LONDON', 'SW': 'LONDON', 'W': 'LONDON',
    'EN': 'LONDON', 'IG': 'LONDON', 'RM': 'LONDON', 'DA': 'LONDON',
    'BR': 'LONDON', 'UB': 'LONDON', 'HA': 'LONDON', 'WD': 'LONDON',
    
    // Birmingham area
    'B': 'BIRMINGHAM', 'CV': 'BIRMINGHAM', 'WV': 'BIRMINGHAM',
    'DY': 'BIRMINGHAM', 'WS': 'BIRMINGHAM', 'WR': 'BIRMINGHAM',
    'SY': 'BIRMINGHAM', 'TF': 'BIRMINGHAM',
    
    // Manchester area
    'M': 'MANCHESTER', 'L': 'MANCHESTER', 'WA': 'MANCHESTER',
    'OL': 'MANCHESTER', 'SK': 'MANCHESTER', 'ST': 'MANCHESTER',
    'BB': 'MANCHESTER', 'PR': 'MANCHESTER', 'FY': 'MANCHESTER',
    'BL': 'MANCHESTER', 'WN': 'MANCHESTER', 'CW': 'MANCHESTER',
    'CH': 'MANCHESTER', 'LL': 'MANCHESTER',
    
    // Leeds area
    'LS': 'LEEDS', 'WF': 'LEEDS', 'HX': 'LEEDS', 'DN': 'LEEDS',
    'S': 'LEEDS', 'HD': 'LEEDS', 'YO': 'LEEDS', 'BD': 'LEEDS',
    'HG': 'LEEDS',
    
    // Cardiff area
    'CF': 'CARDIFF', 'GL': 'CARDIFF', 'BS': 'CARDIFF', 'SN': 'CARDIFF',
    'BA': 'CARDIFF', 'SP': 'CARDIFF', 'NP': 'CARDIFF', 'CP': 'CARDIFF',
    'SA': 'CARDIFF',
    
    // Bournemouth area
    'SO': 'BOURNEMOUTH', 'PO': 'BOURNEMOUTH', 'RG': 'BOURNEMOUTH',
    'GU': 'BOURNEMOUTH', 'BH': 'BOURNEMOUTH', 'OX': 'BOURNEMOUTH',
    
    // Nottingham area
    'NG': 'NOTTINGHAM', 'LE': 'NOTTINGHAM', 'DE': 'NOTTINGHAM',
    'PE': 'NOTTINGHAM', 'LN': 'NOTTINGHAM',
    
    // Brighton area
    'BN': 'BRIGHTON', 'RH': 'BRIGHTON', 'SL': 'BRIGHTON',
    'TN': 'BRIGHTON', 'CT': 'BRIGHTON', 'CR': 'BRIGHTON',
    'TW': 'BRIGHTON', 'KT': 'BRIGHTON', 'ME': 'BRIGHTON',
    
    // Southend area
    'NR': 'SOUTHEND', 'IP': 'SOUTHEND', 'CO': 'SOUTHEND',
    'CM': 'SOUTHEND', 'CB': 'SOUTHEND', 'SS': 'SOUTHEND',
    'SG': 'SOUTHEND',
    
    // Northampton area
    'MK': 'NORTHAMPTON', 'LU': 'NORTHAMPTON', 'AL': 'NORTHAMPTON',
    'HP': 'NORTHAMPTON', 'NN': 'NORTHAMPTON'
  };
}

// Restricted postal codes (areas not serviced)
export function getRestrictedPostalCodes() {
  return [
    'EX', 'TQ', 'DT', 'LD', 'HR', 'HU',
    'TS', 'DL', 'SR', 'CA', 'NE', 'TD', 'EH', 'ML',
    'KA', 'DG', 'G', 'DH', 'KY', 'PA', 'IV', 'AB', 'DD'
  ];
}

// Get route from postcode
export function getRouteFromPostcode(postcode) {
  if (!postcode) return null;
  
  const cleanPostcode = postcode.toUpperCase().replace(/\s/g, '');
  const prefix = cleanPostcode.match(/^[A-Z]{1,2}/)?.[0];
  
  if (!prefix) return null;
  
  // Check if restricted
  const restricted = getRestrictedPostalCodes();
  if (restricted.includes(prefix)) {
    return 'RESTRICTED';
  }
  
  // Get route
  const routes = getUKPostalCodeRoutes();
  return routes[prefix] || null;
}
