export function getMainMenu(userName = null) {
  const greeting = userName ? `Hello ${userName}! 👋` : 'Hello! 👋';
  
  return `${greeting}

🇮🇪 *Zimbabwe Shipping - Ireland*

*Main Menu:*
1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 📞 Contact Us

📢 *Collections commence in August 2026*

_Reply with a number (1-6) or describe what you need._`;
}

export function getPricingMenu() {
  return `💰 *Ireland Pricing (EUR)*

*DRUM SHIPPING (200-220L):*
🥁 5+ drums: €340 per drum
🥁 2-4 drums: €350 per drum
🥁 1 drum: €360 per drum

*TRUNK/STORAGE BOX SHIPPING:*
📦 5+ items: €200 per item
📦 2-4 items: €210 per item
📦 1 item: €220 per item

*ADDITIONAL SERVICES:*
🔒 Metal Coded Seal: €7
🚪 Door-to-Door Delivery (Zimbabwe): €25

*WHAT'S INCLUDED:*
✅ FREE collection anywhere in Ireland
✅ Full tracking
✅ 6 weeks shipping time (drums)
✅ 10-14 days (parcels)
✅ Professional handling

*PAYMENT OPTIONS:*
💳 Card payment
💶 Cash on collection
🏦 Bank transfer
📱 Mobile payment

Type *book* to start booking or *menu* for main menu.`;
}

export function getBookingMenu() {
  return `📦 *Start Your Booking*

I'll guide you through a simple booking process. We'll need:

✅ Your details (name, phone, address)
✅ Receiver details in Zimbabwe
✅ What you're shipping (drums/boxes)
✅ Collection address in Ireland

*Ready to start?*

First, may I have your full name please?

_(Type *cancel* anytime to return to main menu)_`;
}

export function getIrelandCities() {
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

export function getCityToRouteMap() {
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
