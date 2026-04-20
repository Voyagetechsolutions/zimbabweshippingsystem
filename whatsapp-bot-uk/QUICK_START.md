# Quick Start Guide - UK WhatsApp Bot

Get your UK WhatsApp bot running in 5 minutes!

## ⚡ Super Quick Setup

### 1. Install Dependencies (1 minute)
```bash
cd whatsapp-bot-uk
npm install
```

### 2. Configure Environment (1 minute)
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials (already provided):
```env
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BOT_PHONE_NUMBER=+44_your_number
```

### 3. Start the Bot (30 seconds)
```bash
npm start
```

### 4. Scan QR Code (1 minute)
- Open `qr-code.png` that was just created
- Scan with WhatsApp: Settings → Linked Devices → Link a Device

### 5. Test It! (1 minute)
Send "hi" to the bot from another phone. You should get:
```
🇬🇧 Welcome to Zimbabwe Shipping
UK Branch
...
```

## ✅ That's It!

Your bot is now:
- ✅ Accepting bookings
- ✅ Providing pricing
- ✅ Tracking shipments
- ✅ Answering FAQs

## 🎯 Quick Commands

| Command | Action |
|---------|--------|
| `npm start` | Start the bot |
| `npm run dev` | Start with auto-reload |
| `pm2 start src/index.js --name uk-bot` | Production mode |
| `pm2 logs uk-bot` | View logs |

## 📱 Test Commands

Send these to the bot:
- `hi` - Welcome message
- `1` or `book` - Start booking
- `2` or `pricing` - View prices
- `3` or `track` - Track shipment
- `menu` - Main menu

## 🚨 Common Issues

**QR Code not showing?**
→ Open `qr-code.png` file

**Database error?**
→ Check `.env` has correct Supabase credentials

**Bot disconnects?**
→ Use PM2 for production: `pm2 start src/index.js --name uk-bot`

## 📞 Need Help?

- 📧 support@zimbabwe-shipping.co.uk
- 📱 +44 7984 099041
- 📖 See SETUP_GUIDE.md for detailed instructions

---

**You're all set! 🎉**
