# 🚀 START HERE - UK WhatsApp Bot

## 👋 Welcome!

You now have a **complete UK WhatsApp bot** for Zimbabwe Shipping! This guide will get you up and running in **5 minutes**.

## ⚡ Super Quick Start

### Step 1: Navigate to UK Bot
```bash
cd whatsapp-bot-uk
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` file (use your existing Supabase credentials):
```env
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA
BOT_PHONE_NUMBER=+44_your_uk_number_here
ADMIN_PHONE_NUMBERS=+447984099041,+447584100552
```

### Step 4: Start the Bot
```bash
npm start
```

### Step 5: Connect WhatsApp
1. Open the `qr-code.png` file that was just created
2. Open WhatsApp on your phone
3. Go to **Settings** → **Linked Devices** → **Link a Device**
4. Scan the QR code

### Step 6: Test It!
Send "hi" to the bot from another phone. You should see:
```
🇬🇧 Welcome to Zimbabwe Shipping
UK Branch

Thank you for contacting us! We're excited to serve you.
...
```

## ✅ That's It!

Your UK bot is now running and ready to accept bookings!

## 📚 What to Read Next

### Essential Reading (5 minutes each)
1. **`whatsapp-bot-uk/README.md`** - Complete bot documentation
2. **`UK_VS_IRELAND_BOTS.md`** - Comparison with Ireland bot
3. **`IMPLEMENTATION_SUMMARY.md`** - What was built

### Detailed Guides (10-15 minutes each)
4. **`whatsapp-bot-uk/SETUP_GUIDE.md`** - Detailed setup instructions
5. **`whatsapp-bot-uk/FEATURES.md`** - Complete feature list
6. **`whatsapp-bot-uk/DEPLOYMENT_CHECKLIST.md`** - Production deployment

### Quick References
7. **`whatsapp-bot-uk/QUICK_START.md`** - Quick reference
8. **`WHATSAPP_BOTS_OVERVIEW.md`** - System overview
9. **`WHATSAPP_BOTS_COMPLETE.md`** - Complete guide

## 🎯 What Your Bot Does

### For Customers
✅ **Book Shipments** - Complete booking through WhatsApp
✅ **Get Pricing** - Instant quotes with volume discounts
✅ **Track Shipments** - Real-time tracking by number
✅ **Get Help** - FAQ system with 5 categories
✅ **Contact Info** - Easy access to support

### For You
✅ **24/7 Automation** - No manual booking needed
✅ **Database Integration** - All bookings saved to Supabase
✅ **Route Assignment** - Automatic from UK postcodes
✅ **Customer Data** - Collects and stores customer info
✅ **Session Memory** - Remembers returning customers

## 🇬🇧 UK-Specific Features

### Postcode Routing
The bot automatically assigns collection routes from UK postcodes:
- `SW1A 1AA` → **LONDON ROUTE**
- `M1 1AA` → **MANCHESTER ROUTE**
- `B1 1AA` → **BIRMINGHAM ROUTE**
- And 7 more routes!

### GBP Pricing
- **Drums**: £75 (1), £70 (2-4), £65 (5+)
- **Boxes**: £25 (1), £23 (2-4), £20 (5+)
- **Metal seals**: £7
- **Door-to-door**: £25

### Coverage
- ✅ England & Wales
- ❌ Scotland (restricted)
- ❌ Northern Ireland (restricted)

## 💬 Test Commands

Try these with your bot:

| Send | Bot Does |
|------|----------|
| `hi` | Shows welcome message |
| `1` or `book` | Starts booking |
| `2` or `pricing` | Shows prices |
| `3` or `track` | Track shipment |
| `4` or `collection` | Collection info |
| `5` or `help` | FAQ system |
| `6` or `contact` | Contact info |
| `menu` | Main menu |

## 🚀 Production Deployment

### Using PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start src/index.js --name uk-bot

# Save configuration
pm2 save

# Auto-start on reboot
pm2 startup
```

### Check Status
```bash
pm2 status
pm2 logs uk-bot
```

## 🗄️ Database

All bookings are saved to your existing Supabase database with the tag:
```javascript
bookingSource: 'whatsapp-bot-uk'
```

### View UK Bookings
```sql
SELECT * FROM shipments 
WHERE metadata->>'bookingSource' = 'whatsapp-bot-uk'
ORDER BY created_at DESC;
```

## 📱 Two Bots, One Database

You now have:

| Bot | Location | Currency | Routing | Tag |
|-----|----------|----------|---------|-----|
| **UK** | `whatsapp-bot-uk/` | GBP (£) | Postcode | `whatsapp-bot-uk` |
| **Ireland** | `whatsapp-bot/` | EUR (€) | City | `whatsapp-bot-ireland` |

Both save to the **same Supabase database** but with different tags.

## 🆘 Quick Troubleshooting

### Bot Won't Start
```bash
# Check Node.js version (need v18+)
node --version

# Reinstall dependencies
rm -rf node_modules
npm install
```

### QR Code Not Showing
- Check the `qr-code.png` file in the bot directory
- Download and scan it manually

### Database Error
- Verify `.env` has correct Supabase credentials
- Check Supabase is accessible

### Bot Disconnects
- Use PM2 for production: `pm2 start src/index.js --name uk-bot`
- Check internet connection

## 📞 Need Help?

### Documentation
- `whatsapp-bot-uk/README.md` - Complete guide
- `whatsapp-bot-uk/SETUP_GUIDE.md` - Detailed setup
- `UK_VS_IRELAND_BOTS.md` - Comparison guide

### Support
- **Email**: support@zimbabwe-shipping.co.uk
- **Phone**: +44 7984 099041 / +44 7584 100552

## ✅ Checklist

Before going live, make sure:
- [ ] Bot starts without errors
- [ ] QR code scanned successfully
- [ ] Test booking completes
- [ ] Database entry created
- [ ] Tracking works
- [ ] Pricing displays correctly
- [ ] PM2 configured (for production)
- [ ] Team knows the bot number

## 🎉 You're Ready!

Your UK WhatsApp bot is:
- ✅ Installed
- ✅ Configured
- ✅ Running
- ✅ Connected
- ✅ Tested
- ✅ Ready for customers!

**Start accepting bookings now!** 🚀📦

---

## 📂 File Structure Reference

```
whatsapp-bot-uk/
├── src/
│   ├── flows/          # Conversation flows
│   ├── handlers/       # Message handling
│   ├── menus/          # Menu systems
│   ├── services/       # Database & sessions
│   ├── utils/          # Utilities
│   └── index.js        # Entry point
├── .env                # Your configuration
├── package.json        # Dependencies
└── README.md           # Full documentation
```

## 🔗 Quick Links

- **Main README**: `whatsapp-bot-uk/README.md`
- **Quick Start**: `whatsapp-bot-uk/QUICK_START.md`
- **Setup Guide**: `whatsapp-bot-uk/SETUP_GUIDE.md`
- **Features**: `whatsapp-bot-uk/FEATURES.md`
- **Deployment**: `whatsapp-bot-uk/DEPLOYMENT_CHECKLIST.md`
- **Comparison**: `UK_VS_IRELAND_BOTS.md`
- **Overview**: `WHATSAPP_BOTS_OVERVIEW.md`

---

**Questions? Check the docs or contact support@zimbabwe-shipping.co.uk**

**Happy shipping! 🇬🇧🚀**
