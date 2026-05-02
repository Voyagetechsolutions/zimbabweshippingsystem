# 🇮🇪 Ireland WhatsApp Bot 🇿🇼

Simple, clean WhatsApp bot for Zimbabwe Shipping Ireland Branch.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ireland-whatsapp-bot
npm install
```

### 2. Start the Bot

```bash
npm start
```

### 3. Scan QR Code

- A QR code will appear in the terminal
- Open WhatsApp on your phone
- Go to Settings → Linked Devices → Link a Device
- Scan the QR code

### 4. Test the Bot

From **another phone**, send "hi" to the WhatsApp number you connected.

The bot will respond with the main menu!

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

### Bot not responding?
1. Check if bot is connected (should say "BOT CONNECTED SUCCESSFULLY")
2. Make sure you're testing from a DIFFERENT phone
3. Check terminal for error messages

### QR code expired?
1. Stop bot (Ctrl+C)
2. Start again (npm start)
3. Scan new QR code within 60 seconds

### Connection keeps dropping?
1. Check internet connection
2. Delete session folder
3. Restart bot

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
