# 🤖 Zimbabwe Shipping WhatsApp Bot - Ireland

Professional WhatsApp bot for automated booking, tracking, and customer support.

---

## 🚨 Bot Not Responding? START HERE!

**Read this first:** [FIX_BOT_NOW.md](./FIX_BOT_NOW.md)

Quick fix:
```bash
cd whatsapp-bot
./quick-fix.sh
```

---

## 📚 Documentation Index

### 🚀 Getting Started
- **[CONNECT_TODAY.md](./CONNECT_TODAY.md)** - Complete deployment guide (20-30 min)
- **[QUICK_CONNECT_GUIDE.txt](./QUICK_CONNECT_GUIDE.txt)** - Visual quick reference
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[CONNECTION_FLOW.txt](./CONNECTION_FLOW.txt)** - How everything connects

### 🔧 Troubleshooting
- **[FIX_BOT_NOW.md](./FIX_BOT_NOW.md)** - Bot not responding? Fix it now!
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Detailed troubleshooting guide
- **[COMMANDS_REFERENCE.txt](./COMMANDS_REFERENCE.txt)** - All commands in one place

### 📖 Reference
- **[START_HERE.txt](./START_HERE.txt)** - Overview and introduction
- **[QUICK_START.txt](./QUICK_START.txt)** - Quick start guide
- **[DEPLOYMENT.txt](./DEPLOYMENT.txt)** - Basic deployment steps

---

## ⚡ Quick Start

### Option 1: Test Bot (Recommended First)

```bash
cd whatsapp-bot
npm install
node test-bot.js
```

Send "hi" from another phone to test.

### Option 2: Simple Bot (Always Works)

```bash
npm install
pm2 start src/index-simple.js --name zimship-bot
pm2 logs zimship-bot
```

Scan QR code, then send "hi" to test.

### Option 3: Full-Featured Bot

```bash
npm install
pm2 start src/index.js --name zimship-bot
pm2 save
pm2 logs zimship-bot
```

Scan QR code, then send "hi" to test.

---

## 🎯 Bot Features

### Customer Features
- ✅ **Automated Booking** - Complete 5-step booking flow
- ✅ **Pricing Calculator** - Real-time pricing with discounts
- ✅ **Shipment Tracking** - Track by tracking number
- ✅ **Collection Info** - View collection areas and schedules
- ✅ **FAQ System** - Automated answers to common questions
- ✅ **Agent Contact** - Connect with human support

### Technical Features
- ✅ **24/7 Operation** - Runs continuously without intervention
- ✅ **User Memory** - Remembers customer details
- ✅ **Database Integration** - Saves all data to Supabase
- ✅ **Auto-Restart** - Recovers from crashes automatically
- ✅ **Group Filtering** - Ignores group messages
- ✅ **Session Persistence** - No need to re-scan QR code

---

## 📱 Main Menu

```
Welcome to Zimbabwe Shipping Ireland Branch 🇮🇪🇿🇼

How can I help you today?

1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 📞 Contact Us
```

---

## 🔧 Management Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs zimship-bot

# Restart bot
pm2 restart zimship-bot

# Stop bot
pm2 stop zimship-bot

# Monitor resources
pm2 monit

# Test connection
node test-bot.js
```

---

## 📊 Bot Versions

### 1. Full-Featured Bot (`src/index.js`)
- Complete booking flow
- Database integration
- User memory
- All features enabled
- **Use for:** Production

### 2. Simple Bot (`src/index-simple.js`)
- Responds to every message
- Shows main menu
- No database required
- 100% reliable
- **Use for:** Testing or fallback

### 3. Test Bot (`test-bot.js`)
- Diagnostic mode
- Tests connection
- Tests messaging
- Verbose logging
- **Use for:** Troubleshooting

---

## 🚀 Deployment Options

### Local Testing
```bash
npm start
```
Bot runs on your computer. Must stay on 24/7.

### Production (DigitalOcean)
```bash
# On server
pm2 start src/index.js --name zimship-bot
pm2 save
pm2 startup
```
Bot runs on cloud server. Always online.

### Railway/Render
See [CONNECT_TODAY.md](./CONNECT_TODAY.md) for deployment guides.

---

## 💰 Pricing (Ireland - EUR)

### Drums (200-220L)
- 1 drum: €360
- 2-4 drums: €350 each
- 5+ drums: €340 each

### Trunks/Boxes
- 1 item: €220
- 2-4 items: €210 each
- 5+ items: €200 each

### Add-ons
- Metal seal: €7 per item
- Door-to-door: €25

### Payment Options
- 💳 Standard payment
- 💵 Cash on Collection (save €20/drum)
- ⏳ Pay on Arrival (+20% premium)

*Prices managed via admin panel*

---

## 🗂️ Project Structure

```
whatsapp-bot/
├── src/
│   ├── index.js              # Main bot (full-featured)
│   ├── index-simple.js       # Simple bot (always responds)
│   ├── handlers/
│   │   └── messageHandler.js # Message routing
│   ├── flows/
│   │   ├── bookingFlow.js    # Booking logic
│   │   ├── trackingFlow.js   # Tracking logic
│   │   └── faqFlow.js        # FAQ logic
│   ├── services/
│   │   ├── database.js       # Supabase integration
│   │   ├── userSession.js    # User state management
│   │   └── botMessages.js    # Message templates
│   └── utils/
│       ├── messageUtils.js   # WhatsApp messaging
│       └── pricingUtils.js   # Price calculations
├── test-bot.js               # Diagnostic test script
├── quick-fix.sh              # Automated fix script
├── .env                      # Environment variables
└── package.json              # Dependencies
```

---

## 🔐 Environment Variables

Required in `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Bot Configuration
BOT_NAME=Zimbabwe Shipping Ireland
BOT_PHONE_NUMBER=+353871954910

# Session
SESSION_PATH=./whatsapp-session

# Environment
NODE_ENV=production
PORT=3001
```

---

## 📊 Database Tables

### user_sessions
Stores customer conversation state and saved details.

### bookings
Stores completed bookings with tracking numbers.

### bot_settings
Stores pricing configuration (managed via admin panel).

### bot_messages
Stores bot response templates (managed via admin panel).

---

## 🔄 Update Bot Code

```bash
# On server
cd /opt/zimship-bot
git pull
npm install
pm2 restart zimship-bot
```

---

## 🆘 Common Issues

### Bot Not Responding
**Solution:** [FIX_BOT_NOW.md](./FIX_BOT_NOW.md)

### QR Code Expired
```bash
pm2 restart zimship-bot
pm2 logs zimship-bot
```

### Session Logged Out
```bash
rm -rf whatsapp-session/
pm2 restart zimship-bot
```

### Multiple Instances
```bash
pm2 list
pm2 stop all
pm2 delete all
pm2 start src/index.js --name zimship-bot
```

---

## 📈 Monitoring

### Check Bot Health
```bash
pm2 status              # Is it running?
pm2 logs zimship-bot    # Any errors?
pm2 monit               # Resource usage
```

### Check Database
Go to Supabase dashboard:
- `user_sessions` - Active users
- `bookings` - New bookings
- `bot_settings` - Current pricing

---

## 🎯 Testing Checklist

- [ ] Bot connects without errors
- [ ] QR code scans successfully
- [ ] "Connected Successfully" appears
- [ ] Send "hi" from another phone
- [ ] Bot responds within 2 seconds
- [ ] Main menu displays (1-6 options)
- [ ] Can select menu options
- [ ] Booking flow starts
- [ ] Data saves to database

---

## 💡 Pro Tips

1. **Always test first:** `node test-bot.js`
2. **Use simple bot for reliability:** `src/index-simple.js`
3. **Check logs regularly:** `pm2 logs zimship-bot`
4. **Backup session weekly:** `tar -czf session-backup.tar.gz whatsapp-session/`
5. **Only run one instance:** Avoid multiple bots on same number
6. **Monitor first 24 hours:** Watch for errors after deployment
7. **Update pricing via admin panel:** Don't edit code directly

---

## 📞 Customer Support

### WhatsApp Link
```
https://wa.me/353871954910?text=Hi
```

Add this link to:
- Website "Contact Us" button
- Facebook page
- Instagram bio
- Email signature
- Google My Business

### Admin Panel
```
https://your-website.com/admin
```

Navigate to **WhatsApp Bot Settings** to:
- Update pricing
- Edit bot messages
- View statistics

---

## 🔒 Security

### Change Root Password
```bash
passwd
```

### Setup Firewall
```bash
ufw allow 22
ufw allow 3001
ufw enable
```

### Update System
```bash
apt update && apt upgrade -y
```

### Backup Session
```bash
tar -czf session-backup.tar.gz whatsapp-session/
```

---

## 📚 Additional Resources

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [Supabase Documentation](https://supabase.com/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)

---

## 🎊 Success!

Once deployed, your bot will:
- ✅ Run 24/7 automatically
- ✅ Respond to all customer messages
- ✅ Handle complete bookings
- ✅ Save all data to database
- ✅ Auto-restart on crashes
- ✅ Survive server reboots

---

## 🆘 Need Help?

1. **Check logs first:** `pm2 logs zimship-bot --lines 50`
2. **Read troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. **Try simple bot:** `pm2 start src/index-simple.js --name zimship-bot`
4. **Run test:** `node test-bot.js`

---

## 📝 License

MIT License - Zimbabwe Shipping

---

## 🚀 Quick Links

- [Deploy Now](./CONNECT_TODAY.md)
- [Fix Bot](./FIX_BOT_NOW.md)
- [Troubleshoot](./TROUBLESHOOTING.md)
- [Commands](./COMMANDS_REFERENCE.txt)

---

**Ready to start?** Open [CONNECT_TODAY.md](./CONNECT_TODAY.md) and follow the steps!

🇮🇪🇿🇼 **Happy Shipping!**
