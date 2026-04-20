# Zimbabwe Shipping WhatsApp Bot - UK

A comprehensive WhatsApp bot for handling shipping bookings from UK to Zimbabwe. The bot provides full booking functionality, pricing information, shipment tracking, and customer support through WhatsApp.

## 🌟 Features

### Core Functionality
- ✅ **Complete Booking System** - Full end-to-end booking through WhatsApp
- ✅ **Smart Postcode Routing** - Automatic collection route assignment based on UK postcodes
- ✅ **Pricing Calculator** - Real-time pricing with volume discounts
- ✅ **Shipment Tracking** - Track shipments using tracking numbers
- ✅ **FAQ System** - Comprehensive help and information
- ✅ **Session Management** - Remembers user details for faster bookings
- ✅ **Database Integration** - All bookings saved to Supabase

### UK-Specific Features
- 🇬🇧 UK postcode validation and routing
- 🚚 10 major collection routes across England & Wales
- 💷 GBP pricing (£75 drums, £25 boxes)
- 📍 Restricted area detection (Scotland, Northern Ireland, remote areas)
- 🏙️ Coverage: London, Birmingham, Manchester, Leeds, Cardiff, and more

## 📋 Prerequisites

- Node.js (v18 or higher)
- WhatsApp Business account or personal WhatsApp account
- Supabase account (for database integration)
- UK phone number for the bot

## 🚀 Installation

### 1. Clone and Install

```bash
cd whatsapp-bot-uk
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your details:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
BOT_NAME=Zimbabwe Shipping UK
BOT_PHONE_NUMBER=+44_your_number_here
ADMIN_PHONE_NUMBERS=+447984099041,+447584100552
SESSION_PATH=./whatsapp-session
NODE_ENV=production
```

### 3. Start the Bot

```bash
npm start
```

### 4. Scan QR Code

When the bot starts, it will:
1. Display a QR code in the terminal
2. Save the QR code as `qr-code.png`
3. Scan this QR code with your WhatsApp to connect

## 📱 How It Works

### First Contact
When a user messages the bot for the first time, they receive:
```
🇬🇧 Welcome to Zimbabwe Shipping
UK Branch

Thank you for contacting us! We're excited to serve you.

Our Services:
✈️ Ship drums, trunks & boxes to Zimbabwe
🚚 FREE collection across England & Wales
📦 Full tracking & insurance
💰 Competitive pricing with volume discounts

How can we help you today?

1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 📞 Contact Us
```

### Booking Flow
1. **Sender Details** - Name, phone, email, address, city, postcode
2. **Postcode Validation** - Automatic route assignment
3. **Receiver Details** - Name, phone, address, city in Zimbabwe
4. **Shipment Details** - Drums and/or boxes quantity
5. **Additional Services** - Metal seals, door-to-door delivery
6. **Payment Method** - Cash, card, bank transfer, mobile payment
7. **Confirmation** - Tracking number generated and saved

### Collection Routes

The bot automatically assigns collection routes based on UK postcodes:

- **London Route** - EC, WC, N, NW, E, SE, SW, W, EN, IG, RM, DA, BR, UB, HA, WD
- **Birmingham Route** - B, CV, WV, DY, WS, WR, SY, TF
- **Manchester Route** - M, L, WA, OL, SK, ST, BB, PR, FY, BL, WN, CW, CH, LL
- **Leeds Route** - LS, WF, HX, DN, S, HD, YO, BD, HG
- **Cardiff Route** - CF, GL, BS, SN, BA, SP, NP, CP, SA
- **Bournemouth Route** - SO, PO, RG, GU, BH, OX
- **Nottingham Route** - NG, LE, DE, PE, LN
- **Brighton Route** - BN, RH, SL, TN, CT, CR, TW, KT, ME
- **Southend Route** - NR, IP, CO, CM, CB, SS, SG
- **Northampton Route** - MK, LU, AL, HP, NN

### Restricted Areas
The bot detects and handles restricted postcodes (Scotland, Northern Ireland, remote areas):
- EX, TQ, DT, LD, HR, HU, TS, DL, SR, CA, NE, TD, EH, ML, KA, DG, G, DH, KY, PA, IV, AB, DD

## 💰 Pricing Structure

### Drums (200-220L)
- 1 drum: £75
- 2-4 drums: £70 each
- 5+ drums: £65 each

### Trunks/Boxes
- 1 box: £25
- 2-4 boxes: £23 each
- 5+ boxes: £20 each

### Additional Services
- Metal coded seal: £7 per seal
- Door-to-door delivery (Zimbabwe): £25

### Included FREE
- Collection anywhere in England & Wales
- Full tracking
- Insurance
- 6 weeks delivery time

## 🗂️ Project Structure

```
whatsapp-bot-uk/
├── src/
│   ├── flows/
│   │   ├── bookingFlow.js      # Complete booking conversation flow
│   │   ├── trackingFlow.js     # Shipment tracking
│   │   ├── pricingFlow.js      # Pricing information
│   │   └── faqFlow.js          # FAQ system
│   ├── handlers/
│   │   └── messageHandler.js   # Main message routing
│   ├── menus/
│   │   └── mainMenu.js         # Menu systems and postcode routing
│   ├── services/
│   │   ├── database.js         # Supabase integration
│   │   └── userSession.js      # Session management
│   ├── utils/
│   │   ├── messageUtils.js     # Message sending utilities
│   │   └── pricingUtils.js     # Price calculations
│   └── index.js                # Bot entry point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Development

### Run in Development Mode
```bash
npm run dev
```

This uses nodemon to auto-restart on file changes.

### Testing the Bot

1. Send "hi" or any message to trigger welcome
2. Type "1" or "book" to start booking
3. Type "2" or "pricing" to see prices
4. Type "3" or "track" to track a shipment
5. Type "menu" anytime to return to main menu

## 📊 Database Schema

The bot saves bookings to the `shipments` table in Supabase:

```javascript
{
  tracking_number: 'ZS-ABC12345',
  status: 'Pending Collection',
  origin: 'London, UK',
  destination: 'Harare, Zimbabwe',
  metadata: {
    sender: { name, phone, email, address, city, postcode, collectionRoute },
    recipient: { name, phone, address, city },
    shipment: { drums, boxes, metalSeal, doorToDoor },
    payment: { method, status },
    bookingSource: 'whatsapp-bot-uk',
    whatsappNumber: '+44...'
  }
}
```

## 🚀 Deployment

### Option 1: VPS (Recommended)
1. Get a VPS (DigitalOcean, Linode, AWS EC2)
2. Install Node.js
3. Clone the repository
4. Install dependencies
5. Configure `.env`
6. Use PM2 to keep it running:
```bash
npm install -g pm2
pm2 start src/index.js --name whatsapp-bot-uk
pm2 save
pm2 startup
```

### Option 2: Local Machine
Run on your computer (must stay on):
```bash
npm start
```

## 📞 Support

For issues or questions:
- Email: support@zimbabwe-shipping.co.uk
- Phone: +44 7984 099041 / +44 7584 100552
- Website: www.zimbabweshipping.com

## 🔐 Security Notes

- Never commit `.env` file
- Keep `whatsapp-session/` folder secure
- Regularly backup the session folder
- Use environment variables for sensitive data

## 📝 License

MIT License - Zimbabwe Shipping Ltd

## 🎉 Features Comparison: UK vs Ireland Bot

| Feature | UK Bot | Ireland Bot |
|---------|--------|-------------|
| Currency | GBP (£) | EUR (€) |
| Routing | Postcode-based | City-based |
| Drum Price | £75/£70/£65 | €360/€350/€340 |
| Box Price | £25/£23/£20 | €220/€210/€200 |
| Collection Areas | England & Wales | All Ireland |
| Routes | 10 routes | 7 routes |
| Restricted Areas | Scotland, NI, remote | None |

---

**Built with ❤️ for Zimbabwe Shipping UK operations**
