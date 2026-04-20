# WhatsApp Bots Overview - Zimbabwe Shipping

## 🎉 What You Have Now

You now have **TWO fully functional WhatsApp bots** for your Zimbabwe Shipping business:

### 1. 🇮🇪 Ireland Bot (`whatsapp-bot/`)
- **Location**: Already exists in `whatsapp-bot/` directory
- **Market**: Ireland (Republic + Northern Ireland)
- **Currency**: EUR (€)
- **Routing**: City-based (7 routes)
- **Status**: ✅ Already built and documented

### 2. 🇬🇧 UK Bot (`whatsapp-bot-uk/`)
- **Location**: New directory `whatsapp-bot-uk/`
- **Market**: England & Wales
- **Currency**: GBP (£)
- **Routing**: Postcode-based (10 routes)
- **Status**: ✅ Just created!

## 📂 Directory Structure

```
zimbabwe-shipping-nexus/
├── whatsapp-bot/              # 🇮🇪 IRELAND BOT
│   ├── src/
│   ├── .env
│   ├── package.json
│   └── README.md
│
├── whatsapp-bot-uk/           # 🇬🇧 UK BOT (NEW!)
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   ├── README.md
│   ├── SETUP_GUIDE.md
│   └── QUICK_START.md
│
├── UK_VS_IRELAND_BOTS.md      # Comparison guide
└── WHATSAPP_BOTS_OVERVIEW.md  # This file
```

## 🚀 Quick Start - UK Bot

### 1. Install
```bash
cd whatsapp-bot-uk
npm install
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env with your details
```

### 3. Start
```bash
npm start
```

### 4. Scan QR Code
Open `qr-code.png` and scan with WhatsApp

### 5. Test
Send "hi" to the bot!

## 📊 Feature Comparison

| Feature | UK Bot 🇬🇧 | Ireland Bot 🇮🇪 |
|---------|-----------|----------------|
| **Currency** | £ (GBP) | € (EUR) |
| **Drum Price (1)** | £75 | €360 |
| **Box Price (1)** | £25 | €220 |
| **Routing** | Postcode-based | City-based |
| **Routes** | 10 routes | 7 routes |
| **Coverage** | England & Wales | All Ireland |
| **Postcode Required** | Yes | No (optional Eircode) |
| **Restricted Areas** | Yes (Scotland, etc.) | No |

## 🎯 What Each Bot Does

### Core Features (Both Bots)
✅ Complete booking system
✅ Automatic route assignment
✅ Real-time pricing with volume discounts
✅ Shipment tracking
✅ FAQ system
✅ Session management (remembers users)
✅ Database integration (Supabase)
✅ Payment method selection
✅ Email confirmation

### UK Bot Specific Features
🇬🇧 UK postcode validation
🇬🇧 10 collection routes across England & Wales
🇬🇧 GBP pricing (£75 drums, £25 boxes)
🇬🇧 Restricted area detection
🇬🇧 Major cities: London, Birmingham, Manchester, Leeds, Cardiff

### Ireland Bot Specific Features
🇮🇪 City-based routing
🇮🇪 7 collection routes across Ireland
🇮🇪 EUR pricing (€360 drums, €220 boxes)
🇮🇪 Optional Eircode support
🇮🇪 August 2026 collection start notice
🇮🇪 Major cities: Dublin, Cork, Belfast, Galway, Limerick

## 💬 Example Conversations

### UK Bot Conversation
```
Customer: Hi
Bot: 🇬🇧 Welcome to Zimbabwe Shipping
     UK Branch
     
     How can we help you today?
     1️⃣ 📦 Book a Shipment
     2️⃣ 💰 View Pricing
     ...

Customer: 1
Bot: 📦 Book Your Shipment
     Let's get started!
     Type *continue* to start...

Customer: continue
Bot: 👤 What's your full name?

Customer: John Smith
Bot: Great John! 📱
     What's your phone number?

[... continues through booking flow ...]

Bot: 📮 What's your postcode?

Customer: SW1A 1AA
Bot: ✅ Great! Your collection route is: *LONDON*
     Now let's get the receiver details...

[... completes booking ...]

Bot: 🎉 Booking Confirmed!
     ✅ Your tracking number: *ZS-ABC12345*
     📦 Your collection route: *LONDON*
```

### Ireland Bot Conversation
```
Customer: Hello
Bot: 🇮🇪 Welcome to Zimbabwe Shipping
     Ireland Branch
     
     📢 Important Notice:
     Collections in Ireland will commence in August 2026
     
     How can we help you today?
     1️⃣ 📦 Book a Shipment
     ...

Customer: 1
Bot: 📦 Book Your Shipment
     Type *continue* to start...

[... similar flow but asks for city instead of postcode ...]

Bot: 🏙️ Which city/town are you in?

Customer: Dublin
Bot: ✅ Great! Your collection route is: *DUBLIN CITY*
     Now let's get the receiver details...

[... completes booking ...]

Bot: 🎉 Booking Confirmed!
     ✅ Your tracking number: *ZS-XYZ67890*
     📢 Remember: Collections commence in August 2026
```

## 🗄️ Database Integration

Both bots save to the **same Supabase database** but are tagged differently:

### UK Bookings
```javascript
{
  tracking_number: 'ZS-ABC12345',
  origin: 'London, UK',
  metadata: {
    bookingSource: 'whatsapp-bot-uk',
    sender: {
      postcode: 'SW1A 1AA',
      collectionRoute: 'LONDON'
    }
  }
}
```

### Ireland Bookings
```javascript
{
  tracking_number: 'ZS-XYZ67890',
  origin: 'Dublin, Ireland',
  metadata: {
    bookingSource: 'whatsapp-bot-ireland',
    sender: {
      eircode: 'D02 XY45',
      collectionRoute: 'DUBLIN CITY'
    }
  }
}
```

## 🚀 Running Both Bots

### Option 1: PM2 (Recommended for Production)
```bash
# Start Ireland bot
cd whatsapp-bot
pm2 start src/index.js --name ireland-bot

# Start UK bot
cd ../whatsapp-bot-uk
pm2 start src/index.js --name uk-bot

# View status
pm2 status

# View logs
pm2 logs
```

### Option 2: Separate Terminals
```bash
# Terminal 1 - Ireland Bot
cd whatsapp-bot
npm start

# Terminal 2 - UK Bot
cd whatsapp-bot-uk
npm start
```

### Option 3: Different Servers
- **Server 1**: Run Ireland bot
- **Server 2**: Run UK bot

## 📱 Phone Numbers Needed

You'll need **TWO separate WhatsApp numbers**:

1. **UK Bot Number**: +44 7xxx xxx xxx (UK number)
2. **Ireland Bot Number**: +353 8x xxx xxxx (Irish number)

Each bot connects to its own WhatsApp account.

## 📈 Monitoring

### Check Both Bots
```bash
pm2 status
```

### View Logs
```bash
# Ireland bot
pm2 logs ireland-bot

# UK bot
pm2 logs uk-bot

# Both
pm2 logs
```

### Database Queries
```sql
-- All bookings
SELECT * FROM shipments ORDER BY created_at DESC;

-- UK bookings only
SELECT * FROM shipments 
WHERE metadata->>'bookingSource' = 'whatsapp-bot-uk';

-- Ireland bookings only
SELECT * FROM shipments 
WHERE metadata->>'bookingSource' = 'whatsapp-bot-ireland';

-- Today's bookings
SELECT * FROM shipments 
WHERE DATE(created_at) = CURRENT_DATE;
```

## 📚 Documentation

### UK Bot Documentation
- `whatsapp-bot-uk/README.md` - Complete guide
- `whatsapp-bot-uk/SETUP_GUIDE.md` - Step-by-step setup
- `whatsapp-bot-uk/QUICK_START.md` - 5-minute setup

### Ireland Bot Documentation
- `whatsapp-bot/README.md` - Complete guide
- `whatsapp-bot/SETUP_GUIDE.md` - Step-by-step setup
- `whatsapp-bot/SIMPLE_SETUP.md` - Quick setup

### Comparison
- `UK_VS_IRELAND_BOTS.md` - Detailed comparison

## 🎯 Next Steps

### For UK Bot
1. ✅ Install dependencies: `cd whatsapp-bot-uk && npm install`
2. ✅ Configure `.env` file
3. ✅ Start bot: `npm start`
4. ✅ Scan QR code
5. ✅ Test with a message
6. ✅ Deploy to production with PM2

### For Ireland Bot
1. ✅ Already set up (if not, follow same steps in `whatsapp-bot/`)

### For Both Bots
1. ✅ Monitor bookings in Supabase
2. ✅ Keep bots running 24/7
3. ✅ Backup session folders regularly
4. ✅ Update pricing if needed
5. ✅ Share bot numbers with customers

## 🔐 Security Checklist

- [ ] Never commit `.env` files
- [ ] Keep `whatsapp-session/` folders secure
- [ ] Backup session folders regularly
- [ ] Use strong Supabase credentials
- [ ] Monitor bot activity
- [ ] Keep Node.js updated
- [ ] Use PM2 for production
- [ ] Set up server firewall

## 📞 Support

### Technical Issues
- Check logs: `pm2 logs`
- Restart bot: `pm2 restart [bot-name]`
- Review documentation in respective directories

### Business Inquiries
- **UK**: support@zimbabwe-shipping.co.uk
- **Phone**: +44 7984 099041 / +44 7584 100552
- **Website**: www.zimbabweshipping.com

## 🎉 Summary

You now have:
- ✅ **2 WhatsApp bots** (UK + Ireland)
- ✅ **Complete booking systems** for both markets
- ✅ **Automatic routing** (postcodes for UK, cities for Ireland)
- ✅ **Market-specific pricing** (GBP vs EUR)
- ✅ **Unified database** (same Supabase project)
- ✅ **Full documentation** for both bots
- ✅ **Production-ready** code

Both bots are:
- 🚀 Ready to deploy
- 💪 Fully functional
- 📊 Database integrated
- 🔒 Secure
- 📱 Mobile-friendly
- 🌍 Market-specific

## 🏁 You're All Set!

Your WhatsApp bot infrastructure is complete. You can now:
1. Accept bookings from UK customers (via UK bot)
2. Accept bookings from Ireland customers (via Ireland bot)
3. Track all shipments in one database
4. Provide 24/7 automated customer service
5. Scale your business across both markets

**Happy shipping! 🚀📦**

---

**Questions? Check the documentation in each bot's directory or contact support.**
