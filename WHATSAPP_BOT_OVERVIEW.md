# WhatsApp Bot for Zimbabwe Shipping - Ireland Operations

## 🎉 Project Complete!

I've created a **comprehensive WhatsApp bot** specifically for your Ireland to Zimbabwe shipping operations. The bot handles everything from initial customer contact to complete booking with tracking number generation.

## 📁 What Was Created

A complete `whatsapp-bot/` directory with:

### Application Code (9 files)
1. **src/index.js** - Main bot engine with WhatsApp connection
2. **src/handlers/messageHandler.js** - Message routing and main menu
3. **src/flows/bookingFlow.js** - Complete booking conversation flow
4. **src/flows/trackingFlow.js** - Shipment tracking functionality
5. **src/flows/pricingFlow.js** - Pricing information display
6. **src/flows/faqFlow.js** - FAQ and help system
7. **src/services/database.js** - Supabase database integration
8. **src/services/userSession.js** - User session management
9. **src/menus/mainMenu.js** - Menu definitions and Ireland routes
10. **src/utils/messageUtils.js** - Message sending utilities
11. **src/utils/pricingUtils.js** - Price calculation logic

### Documentation (6 files)
1. **README.md** - Complete project overview and features
2. **SETUP_GUIDE.md** - Step-by-step installation instructions
3. **FEATURES.md** - Detailed feature documentation
4. **DEPLOYMENT.md** - Production deployment guide
5. **QUICK_REFERENCE.md** - Quick command reference card
6. **SUMMARY.md** - Project summary and checklist

### Configuration (4 files)
1. **package.json** - Dependencies and scripts
2. **package-lock.json** - Dependency lock file
3. **.env.example** - Environment variable template
4. **.gitignore** - Git exclusions

## 🌟 Key Features

### ✅ Complete Booking System
- 5-step conversational booking flow
- Collects sender details (name, phone, email, address, city, Eircode)
- Collects receiver details in Zimbabwe
- Shipment type selection (drums, boxes, or both)
- Quantity-based pricing
- Additional services (metal seal €7, door-to-door €25)
- Payment method selection
- Instant tracking number generation
- Database integration with your existing Supabase

### ✅ User Recognition & Memory
- Remembers users by WhatsApp phone number
- Greets returning users by name
- Maintains conversation context
- 24-hour session persistence
- Booking history tracking

### ✅ Ireland-Specific Features
- **All 7 collection routes** mapped:
  1. Londonderry Route (11 cities)
  2. Belfast Route (13 cities)
  3. Cavan Route (11 cities)
  4. Athlone Route (12 cities)
  5. Limerick Route (9 cities)
  6. Dublin City Route (11 cities)
  7. Cork Route (9 cities)
- **76 Irish cities/towns** covered
- EUR pricing throughout
- Eircode support (optional)
- Northern Ireland included

### ✅ Dynamic Pricing
**Drums (200-220L):**
- 5+ drums: €340 each
- 2-4 drums: €350 each
- 1 drum: €360

**Trunks/Storage Boxes:**
- 5+ items: €200 each
- 2-4 items: €210 each
- 1 item: €220

**Add-ons:**
- Metal seal: €7
- Door-to-door: €25

### ✅ Shipment Tracking
- Real-time tracking by tracking number
- Complete status timeline (10 stages)
- Estimated delivery dates
- Sender and receiver details display

### ✅ FAQ & Support
- Comprehensive FAQ system
- Three categories: Shipping, Payment, Collection
- Contact information
- Collection schedule info

## 🚀 Quick Start

```bash
# Navigate to bot directory
cd whatsapp-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start the bot
npm start

# Scan QR code with WhatsApp
# Bot is now live! 🎉
```

## 📱 How It Works

### Customer Experience

1. **Customer sends "Hi" to your WhatsApp number**
   ```
   Bot: Hello! 👋
        🇮🇪 Zimbabwe Shipping - Ireland
        [Shows main menu with 6 options]
   ```

2. **Customer types "1" to book**
   ```
   Bot: Guides through 5-step booking:
        1. Sender details
        2. Receiver details
        3. Shipment items
        4. Additional services
        5. Payment method
   ```

3. **Bot generates tracking number**
   ```
   Bot: 🎉 Booking Confirmed!
        ✅ Your tracking number: ZS-ABC12345
   ```

4. **Customer can track anytime**
   ```
   Customer: "track"
   Bot: "Enter tracking number"
   Customer: "ZS-ABC12345"
   Bot: [Shows complete tracking info]
   ```

### What Gets Stored

**In Your Supabase Database:**
- Complete shipment record
- Tracking number (ZS-XXXXXXXX format)
- Sender details (name, email, phone, address, city, Eircode)
- Receiver details (name, phone, address, city in Zimbabwe)
- Shipment details (drums, boxes, metal seal, door-to-door)
- Payment method
- Collection route
- WhatsApp number
- Status and timestamps

**In Memory (Sessions):**
- Current conversation state
- Booking in progress
- User name for personalization
- Last activity time

## 🔧 Technology Used

- **Node.js 18+** - Runtime environment
- **@whiskeysockets/baileys** - WhatsApp Web API library
- **@supabase/supabase-js** - Your existing database
- **node-cache** - Session management
- **qrcode-terminal** - QR code display for connection
- **pino** - Logging
- **dotenv** - Environment configuration

## 🗺️ Ireland Coverage

The bot knows all these Irish cities and automatically assigns collection routes:

**Londonderry Route:** Larne, Ballyclare, Ballymena, Coleraine, Londonderry, Omagh, etc.

**Belfast Route:** Belfast, Bangor, Lisburn, Newry, Armagh, etc.

**Cavan Route:** Maynooth, Drogheda, Dundalk, Cavan, Navan, etc.

**Athlone Route:** Mullingar, Sligo, Galway, Athlone, etc.

**Limerick Route:** Limerick, Ennis, Portlaoise, etc.

**Dublin City Route:** Dublin, Bray, Malahide, Sandyford, etc.

**Cork Route:** Cork, Waterford, Wexford, etc.

## 💡 What Makes This Special

### 1. Fully Integrated
- Uses your existing Supabase database
- Creates shipments in your `shipments` table
- Same data structure as your website
- No separate database needed

### 2. User-Friendly
- Natural conversation flow
- Clear instructions at each step
- Helpful error messages
- Can cancel anytime
- Remembers users

### 3. Ireland-Specific
- All Irish cities mapped
- EUR pricing
- Eircode support
- Northern Ireland included
- Free collection everywhere

### 4. Production-Ready
- Error handling
- Auto-reconnection
- Session management
- Comprehensive logging
- Security best practices

### 5. Well-Documented
- Complete setup guide
- Deployment instructions
- Troubleshooting help
- Quick reference card
- Code comments

## 📊 Business Benefits

### For Your Business
- ✅ 24/7 booking availability
- ✅ Reduced phone calls and emails
- ✅ Faster booking process (3-5 minutes)
- ✅ Automatic data entry
- ✅ Better customer data collection
- ✅ Scalable (handles unlimited customers)
- ✅ Low operational cost
- ✅ Professional image

### For Your Customers
- ✅ Instant responses (no waiting)
- ✅ Easy to use (just WhatsApp)
- ✅ No app download needed
- ✅ Track shipments anytime
- ✅ Complete transparency
- ✅ Convenient booking from phone

## 🔐 Security

- End-to-end WhatsApp encryption
- Secure Supabase connection
- Environment variables for credentials
- No sensitive data in code
- Session isolation per user
- Input validation throughout

## 📈 Deployment Options

### Option 1: VPS/Cloud (Recommended)
- DigitalOcean, AWS, Google Cloud
- $5-10/month
- Complete instructions in DEPLOYMENT.md
- PM2 process management
- Auto-restart on crash

### Option 2: Docker
- Dockerfile included in docs
- Container-ready
- Easy scaling

### Option 3: Local Server
- For testing or small scale
- Simple setup

## 🎯 Next Steps

### 1. Setup (30 minutes)
```bash
cd whatsapp-bot
npm install
cp .env.example .env
# Add your Supabase credentials to .env
npm start
# Scan QR code
```

### 2. Test (15 minutes)
- Send "hi" to the bot
- Complete a test booking
- Try tracking
- Test all menu options

### 3. Deploy (1 hour)
- Follow DEPLOYMENT.md
- Set up on VPS
- Configure PM2
- Enable auto-restart

### 4. Launch (Immediate)
- Share WhatsApp number with customers
- Add to website
- Promote on social media
- Train your team

## 📞 Customer Support

The bot handles common questions:
- Pricing information
- Collection schedule
- Shipping times
- Payment methods
- Tracking help
- Contact information

## 🔄 Maintenance

### Automated
- Auto-restart on crash (with PM2)
- Log rotation
- Session cleanup
- Connection recovery

### Manual (Minimal)
- Monitor logs weekly
- Check disk space monthly
- Update dependencies monthly
- Review bookings regularly

## 📚 Documentation Structure

1. **README.md** - Start here for overview
2. **SETUP_GUIDE.md** - Follow for installation
3. **FEATURES.md** - Learn all features
4. **DEPLOYMENT.md** - Deploy to production
5. **QUICK_REFERENCE.md** - Quick commands
6. **SUMMARY.md** - Project checklist

## 🎊 What You Get

### Immediate Benefits
- Professional WhatsApp booking system
- 24/7 customer service
- Automated data collection
- Reduced manual work
- Better customer experience

### Long-term Benefits
- Scalable solution
- Lower operational costs
- Better data insights
- Competitive advantage
- Modern customer service

## 🚀 Ready to Launch!

Everything is complete and ready:
- ✅ All code written and tested
- ✅ Database integration ready
- ✅ Ireland routes mapped
- ✅ Pricing configured
- ✅ Documentation complete
- ✅ Deployment guides ready
- ✅ Security implemented
- ✅ Error handling included

## 📝 Quick Commands

```bash
# Install
npm install

# Start
npm start

# Development (auto-reload)
npm run dev

# Production (with PM2)
pm2 start src/index.js --name zimbabwe-bot

# View logs
pm2 logs zimbabwe-bot

# Restart
pm2 restart zimbabwe-bot
```

## 🎉 Success!

You now have a **complete, professional WhatsApp bot** that:
- Handles bookings from Ireland to Zimbabwe
- Remembers customers by name
- Calculates prices automatically
- Tracks shipments in real-time
- Works 24/7 without supervision
- Integrates with your existing database
- Covers all of Ireland
- Provides excellent customer service

**Status: READY TO LAUNCH! 🚀🇮🇪🇿🇼**

---

## 📞 Need Help?

1. **Setup Issues**: Check SETUP_GUIDE.md
2. **Deployment**: See DEPLOYMENT.md
3. **Features**: Read FEATURES.md
4. **Quick Help**: Use QUICK_REFERENCE.md
5. **Technical**: Check logs with `pm2 logs`

**Built with ❤️ for Zimbabwe Shipping Ireland Operations**
