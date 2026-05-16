# 🇮🇪 Ireland WhatsApp Bot 🇿🇼

**Version 2.0.0** - Now with Human Takeover & Enhanced Stability!

Simple, clean WhatsApp bot for Zimbabwe Shipping Ireland Branch.

## 🎉 What's New (May 2026)

### ✅ Major Updates:
1. **Disconnection Fix** - Bot stays connected indefinitely (no more weekly disconnects!)
2. **Human Takeover** - Agents can pause bot and chat directly with customers
3. **Health Monitoring** - Real-time connection status and uptime tracking

### 📚 New Documentation:
- **[Agent Commands](AGENT_COMMANDS.md)** - Quick reference for agents
- **[Complete Solution](COMPLETE_SOLUTION.md)** - Full overview
- **[Visual Guide](VISUAL_GUIDE.md)** - Step-by-step with diagrams

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ireland-whatsapp-bot
npm install
```

### 2. Run Diagnostics (Recommended)

Before starting the bot, run diagnostics to check everything is set up correctly:

```bash
# Linux/Mac
bash diagnose.sh

# Windows
diagnose.bat

# Or use Node.js
node check-status.js
```

### 3. Start the Bot

```bash
npm start
```

### 4. Scan QR Code

- Visit http://localhost:3000 in your browser (or check terminal for QR code)
- Open WhatsApp on your phone
- Go to Settings → Linked Devices → Link a Device
- Scan the QR code

### 5. Test the Bot

From **another phone**, send "hi" to the WhatsApp number you connected.

The bot will respond with the main menu!

## 🧑‍💼 Human Takeover Feature

Agents can now pause the bot and chat directly with customers!

### Quick Commands:
```bash
takeover 353871234567  # Take control
release 353871234567   # Give back to bot
status 353871234567    # Check status
```

**Where to type:** Railway logs or terminal where bot is running  
**Number format:** Digits only, no + or spaces!

### Learn More:
- **[Agent Commands](AGENT_COMMANDS.md)** - 1-page quick reference
- **[Visual Guide](VISUAL_GUIDE.md)** - Step-by-step walkthrough
- **[Full Guide](HUMAN_TAKEOVER_GUIDE.md)** - Comprehensive documentation

---

## 📊 Health Monitoring

Check bot status anytime:

```bash
# Via health endpoint
curl https://your-bot.railway.app/health

# Via script
node check-health.js https://your-bot.railway.app

# Via browser
https://your-bot.railway.app
```

Shows:
- Connection status
- Uptime duration
- Connected phone number

---

## 📱 Bot Features

### Main Menu
- 📦 Book a Shipment
- 💰 View Pricing
- 🔍 Track Shipment
- 📍 Collection Areas
- ❓ FAQ & Help
- 📞 Contact Us

### Commands
- `hi`, `hello`, `hey`, `start`, `menu` - Show main menu
- `1` or `book` - Booking information
- `2` or `pricing` - View pricing
- `3` or `track` - Track shipment
- `4` or `collection` - Collection areas
- `5` or `faq` - FAQ & Help
- `6` or `contact` - Contact information

## 🔧 How It Works

1. **User sends message** → Bot receives it
2. **Bot processes message** → Matches command
3. **Bot sends response** → User gets information

## 📊 Pricing (Ireland - EUR)

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

## 🗂️ Project Structure

```
ireland-whatsapp-bot/
├── bot.js           # Main bot code
├── package.json     # Dependencies
├── session/         # WhatsApp session (auto-created)
└── README.md        # This file
```

## 🧪 Testing

**Important:** You need TWO phones to test:

1. **Phone A** - Connected to bot (scans QR code)
2. **Phone B** - Sends messages to Phone A

You cannot test by sending messages from the same phone that's connected to the bot.

## 🔄 Restart Bot

If the bot stops responding:

```bash
# Stop the bot (Ctrl+C)

# Delete session
rm -rf session

# Start again
npm start

# Scan new QR code
```

## 📞 Contact Information

- **Phone:** +353 87 195 4910
- **Email:** info@zimbabweshipping.ie
- **Website:** www.zimbabweshipping.ie

## 💡 Tips

1. **Keep terminal open** - Bot runs in the terminal
2. **Test from another phone** - Can't test from connected phone
3. **Session persists** - Only need to scan QR once
4. **Restart if issues** - Delete session folder and restart

## 🚨 Troubleshooting

### QR Code Not Loading?

**Quick Fix:**
```bash
# Check bot status
node check-status.js

# Test QR server independently
node test-qr-server.js
```

**See detailed guide:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Bot not responding?
1. Check if bot is connected (should say "BOT CONNECTED SUCCESSFULLY")
2. Make sure you're testing from a DIFFERENT phone
3. Check terminal for error messages
4. Visit http://localhost:3000/health to check status

### QR code expired?
1. Stop bot (Ctrl+C)
2. Start again (npm start)
3. Scan new QR code within 60 seconds

### Connection keeps dropping?
1. Check internet connection
2. Delete session folder
3. Restart bot

## 📚 Documentation

- **[DEPLOY.md](DEPLOY.md)** - Deploy to Railway (production)
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Detailed troubleshooting guide
- **[FEATURES.md](FEATURES.md)** - Complete feature list
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Technical details

## 🛠️ Diagnostic Tools

### check-status.js
Quick health check:
```bash
node check-status.js
```

### test-qr-server.js
Test QR server independently:
```bash
node test-qr-server.js
```

### diagnose.sh / diagnose.bat
Full system diagnostic:
```bash
bash diagnose.sh  # Linux/Mac
diagnose.bat      # Windows
```

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Bot started (`npm start`)
- [ ] QR code scanned
- [ ] "BOT CONNECTED SUCCESSFULLY" message shown
- [ ] Tested from another phone
- [ ] Bot responds with main menu

## 🎯 Next Steps

Once the bot is working:

1. **Deploy to server** - For 24/7 operation
2. **Add database** - Save customer data
3. **Add booking flow** - Complete booking process
4. **Add tracking** - Real shipment tracking

For now, this basic bot proves the concept works!

---

**Made with ❤️ for Zimbabwe Shipping Ireland**
