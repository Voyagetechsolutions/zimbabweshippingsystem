# UK vs Ireland WhatsApp Bots - Complete Comparison

## 📊 Overview

You now have **TWO WhatsApp bots** for Zimbabwe Shipping:

1. **Ireland Bot** (`whatsapp-bot/`) - For Ireland operations
2. **UK Bot** (`whatsapp-bot-uk/`) - For UK operations

Both bots share the same core functionality but are customized for their respective markets.

## 🌍 Key Differences

### 1. Geographic Coverage

| Feature | UK Bot | Ireland Bot |
|---------|--------|-------------|
| **Country** | England & Wales | All of Ireland (Republic + Northern Ireland) |
| **Routing System** | Postcode-based | City-based |
| **Number of Routes** | 10 routes | 7 routes |
| **Restricted Areas** | Scotland, remote areas | None |

### 2. Pricing Structure

| Item | UK Bot (GBP) | Ireland Bot (EUR) |
|------|--------------|-------------------|
| **1 Drum** | £75 | €360 |
| **2-4 Drums** | £70 each | €350 each |
| **5+ Drums** | £65 each | €340 each |
| **1 Box** | £25 | €220 |
| **2-4 Boxes** | £23 each | €210 each |
| **5+ Boxes** | £20 each | €200 each |
| **Metal Seal** | £7 | €7 |
| **Door-to-Door** | £25 | €25 |

### 3. Collection Routes

#### UK Bot Routes (Postcode-Based)
1. **London Route** - EC, WC, N, NW, E, SE, SW, W, EN, IG, RM, DA, BR, UB, HA, WD
2. **Birmingham Route** - B, CV, WV, DY, WS, WR, SY, TF
3. **Manchester Route** - M, L, WA, OL, SK, ST, BB, PR, FY, BL, WN, CW, CH, LL
4. **Leeds Route** - LS, WF, HX, DN, S, HD, YO, BD, HG
5. **Cardiff Route** - CF, GL, BS, SN, BA, SP, NP, CP, SA
6. **Bournemouth Route** - SO, PO, RG, GU, BH, OX
7. **Nottingham Route** - NG, LE, DE, PE, LN
8. **Brighton Route** - BN, RH, SL, TN, CT, CR, TW, KT, ME
9. **Southend Route** - NR, IP, CO, CM, CB, SS, SG
10. **Northampton Route** - MK, LU, AL, HP, NN

#### Ireland Bot Routes (City-Based)
1. **Londonderry Route** - Larne, Ballyclare, Ballymena, Coleraine, etc.
2. **Belfast Route** - Belfast, Bangor, Lisburn, Newry, etc.
3. **Cavan Route** - Maynooth, Drogheda, Dundalk, Cavan, etc.
4. **Athlone Route** - Mullingar, Galway, Sligo, Athlone, etc.
5. **Limerick Route** - Limerick, Ennis, Portlaoise, etc.
6. **Dublin City Route** - Dublin, Bray, Malahide, etc.
7. **Cork Route** - Cork, Waterford, Wexford, etc.

### 4. Address Collection

| Aspect | UK Bot | Ireland Bot |
|--------|--------|-------------|
| **Postcode/Eircode** | Required (UK postcode) | Optional (Eircode) |
| **Validation** | Strict postcode validation | City-based validation |
| **Route Assignment** | Automatic from postcode | Automatic from city |
| **Format Example** | SW1A 1AA | D02 XY45 (optional) |

### 5. Welcome Messages

#### UK Bot Welcome
```
🇬🇧 Welcome to Zimbabwe Shipping
UK Branch

Thank you for contacting us! We're excited to serve you.

Our Services:
✈️ Ship drums, trunks & boxes to Zimbabwe
🚚 FREE collection across England & Wales
📦 Full tracking & insurance
💰 Competitive pricing with volume discounts
```

#### Ireland Bot Welcome
```
🇮🇪 Welcome to Zimbabwe Shipping
Ireland Branch

Thank you for contacting us! We're excited to serve you.

📢 Important Notice:
Collections in Ireland will commence in August 2026

Our Services:
✈️ Ship drums, trunks & boxes to Zimbabwe
🚚 FREE collection across Ireland
📦 Full tracking & insurance
💰 Competitive pricing with volume discounts
```

### 6. Contact Information

| Detail | UK Bot | Ireland Bot |
|--------|--------|-------------|
| **Email** | support@zimbabwe-shipping.co.uk | info@zimbabweshipping.com |
| **Phone 1** | +44 7984 099041 | +353 (Ireland number) |
| **Phone 2** | +44 7584 100552 | - |
| **Currency Symbol** | £ (GBP) | € (EUR) |

## 🔧 Technical Comparison

### Shared Features
Both bots have identical:
- ✅ Booking flow structure
- ✅ Session management
- ✅ Database integration (same Supabase project)
- ✅ Tracking system
- ✅ FAQ system
- ✅ Payment method options
- ✅ User data persistence

### Different Implementations

| Feature | UK Bot | Ireland Bot |
|---------|--------|-------------|
| **Routing Logic** | `getRouteFromPostcode()` | `getCityToRouteMap()` |
| **Validation** | Postcode format check | City name check |
| **Restricted Areas** | Yes (Scotland, etc.) | No |
| **Currency Formatting** | `en-GB`, GBP | `en-IE`, EUR |
| **Database Tag** | `bookingSource: 'whatsapp-bot-uk'` | `bookingSource: 'whatsapp-bot-ireland'` |

## 📁 File Structure Comparison

Both bots have identical structure:
```
whatsapp-bot[-uk]/
├── src/
│   ├── flows/
│   │   ├── bookingFlow.js
│   │   ├── trackingFlow.js
│   │   ├── pricingFlow.js
│   │   └── faqFlow.js
│   ├── handlers/
│   │   └── messageHandler.js
│   ├── menus/
│   │   └── mainMenu.js
│   ├── services/
│   │   ├── database.js
│   │   └── userSession.js
│   ├── utils/
│   │   ├── messageUtils.js
│   │   └── pricingUtils.js
│   └── index.js
├── .env
├── package.json
└── README.md
```

## 🚀 Running Both Bots

### Option 1: Same Server, Different Processes

```bash
# Terminal 1 - Ireland Bot
cd whatsapp-bot
pm2 start src/index.js --name ireland-bot

# Terminal 2 - UK Bot
cd whatsapp-bot-uk
pm2 start src/index.js --name uk-bot

# View both
pm2 status
```

### Option 2: Different Servers

- **Server 1** (Ireland): Run Ireland bot
- **Server 2** (UK): Run UK bot

### Option 3: Same Server, Manual Start

```bash
# Terminal 1
cd whatsapp-bot
npm start

# Terminal 2 (new terminal)
cd whatsapp-bot-uk
npm start
```

## 📊 Database Integration

Both bots save to the **same Supabase database** but are tagged differently:

### UK Bot Bookings
```javascript
{
  tracking_number: 'ZS-ABC12345',
  metadata: {
    bookingSource: 'whatsapp-bot-uk',
    sender: { country: 'England', postcode: 'SW1A 1AA' }
  }
}
```

### Ireland Bot Bookings
```javascript
{
  tracking_number: 'ZS-XYZ67890',
  metadata: {
    bookingSource: 'whatsapp-bot-ireland',
    sender: { country: 'Ireland', eircode: 'D02 XY45' }
  }
}
```

### Querying by Source
```sql
-- UK bookings only
SELECT * FROM shipments 
WHERE metadata->>'bookingSource' = 'whatsapp-bot-uk';

-- Ireland bookings only
SELECT * FROM shipments 
WHERE metadata->>'bookingSource' = 'whatsapp-bot-ireland';
```

## 🎯 Use Cases

### When to Use UK Bot
- Customer is in England or Wales
- Customer provides UK postcode
- Pricing in GBP (£)
- Collection from UK addresses

### When to Use Ireland Bot
- Customer is in Ireland (Republic or Northern Ireland)
- Customer provides Irish city/town
- Pricing in EUR (€)
- Collection from Irish addresses
- Collections starting August 2026

## 📱 Customer Experience

### UK Customer Journey
1. Message UK bot number
2. See UK welcome (🇬🇧)
3. Provide UK address + postcode
4. See GBP pricing
5. Get UK collection route
6. Receive tracking number

### Ireland Customer Journey
1. Message Ireland bot number
2. See Ireland welcome (🇮🇪)
3. Provide Irish address + city
4. See EUR pricing
5. Get Ireland collection route
6. Receive tracking number

## 🔐 Security & Isolation

### Separate Sessions
- Each bot maintains its own user sessions
- No cross-contamination between UK and Ireland users
- Independent WhatsApp connections

### Shared Database
- Both bots write to same database
- Tagged for easy filtering
- Unified tracking system

## 📈 Monitoring Both Bots

### PM2 Dashboard
```bash
pm2 status
```

Output:
```
┌─────┬──────────────┬─────────┬─────────┐
│ id  │ name         │ status  │ cpu     │
├─────┼──────────────┼─────────┼─────────┤
│ 0   │ ireland-bot  │ online  │ 0.3%    │
│ 1   │ uk-bot       │ online  │ 0.2%    │
└─────┴──────────────┴─────────┴─────────┘
```

### View Logs
```bash
# Ireland bot logs
pm2 logs ireland-bot

# UK bot logs
pm2 logs uk-bot

# Both bots
pm2 logs
```

## 🎉 Summary

You now have:
- ✅ **2 WhatsApp bots** (UK + Ireland)
- ✅ **Separate phone numbers** for each market
- ✅ **Market-specific pricing** (GBP vs EUR)
- ✅ **Localized routing** (postcodes vs cities)
- ✅ **Unified database** for all bookings
- ✅ **Independent operation** of each bot

Both bots provide the same excellent customer experience, just tailored to their specific markets!

---

**Questions? Contact support@zimbabwe-shipping.co.uk**
