# Quick Reference Card

## 🚀 Quick Start

```bash
cd whatsapp-bot
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
# Scan QR code with WhatsApp
```

## 📱 User Commands

| Command | Action |
|---------|--------|
| `hi`, `hello`, `menu` | Show main menu |
| `1`, `book` | Start booking |
| `2`, `pricing` | View prices |
| `3`, `track` | Track shipment |
| `4`, `collection` | Collection info |
| `5`, `faq` | Help & FAQs |
| `6`, `contact` | Contact details |
| `cancel` | Cancel current action |

## 💰 Pricing Quick Reference

### Drums (200-220L)
- 5+ drums: **€340** each
- 2-4 drums: **€350** each
- 1 drum: **€360**

### Trunks/Boxes
- 5+ items: **€200** each
- 2-4 items: **€210** each
- 1 item: **€220**

### Add-ons
- Metal seal: **€7**
- Door-to-door: **€25**

## 🗺️ Ireland Routes

1. **Londonderry** - Larne, Ballyclare, Coleraine, etc.
2. **Belfast** - Belfast, Bangor, Lisburn, Newry, etc.
3. **Cavan** - Maynooth, Drogheda, Dundalk, etc.
4. **Athlone** - Mullingar, Sligo, Galway, etc.
5. **Limerick** - Limerick, Ennis, Portlaoise, etc.
6. **Dublin City** - Dublin, Bray, Malahide, etc.
7. **Cork** - Cork, Waterford, Wexford, etc.

## 🔧 PM2 Commands

```bash
# Start
pm2 start src/index.js --name zimbabwe-bot

# Status
pm2 status

# Logs
pm2 logs zimbabwe-bot

# Restart
pm2 restart zimbabwe-bot

# Stop
pm2 stop zimbabwe-bot

# Monitor
pm2 monit

# Save config
pm2 save

# Auto-start on boot
pm2 startup
```

## 📂 File Structure

```
whatsapp-bot/
├── src/
│   ├── index.js              # Main entry
│   ├── handlers/
│   │   └── messageHandler.js # Message routing
│   ├── flows/
│   │   ├── bookingFlow.js    # Booking logic
│   │   ├── trackingFlow.js   # Tracking
│   │   ├── pricingFlow.js    # Pricing
│   │   └── faqFlow.js        # FAQs
│   ├── menus/
│   │   └── mainMenu.js       # Menu definitions
│   ├── services/
│   │   ├── database.js       # Supabase
│   │   └── userSession.js    # Sessions
│   └── utils/
│       ├── messageUtils.js   # Messaging
│       └── pricingUtils.js   # Calculations
├── .env                      # Configuration
└── package.json
```

## 🔑 Environment Variables

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
BOT_NAME=Zimbabwe Shipping Ireland
BOT_PHONE_NUMBER=+353...
ADMIN_PHONE_NUMBERS=+353...
SESSION_PATH=./whatsapp-session
NODE_ENV=production
```

## 🐛 Troubleshooting

### QR Code Not Showing
```bash
rm -rf whatsapp-session
npm start
```

### Bot Not Responding
```bash
pm2 restart zimbabwe-bot
pm2 logs zimbabwe-bot
```

### Database Errors
- Check `.env` credentials
- Verify Supabase is accessible
- Check table permissions

### Connection Lost
```bash
pm2 restart zimbabwe-bot
# Bot will auto-reconnect
```

## 📊 Monitoring

```bash
# Real-time logs
pm2 logs zimbabwe-bot

# Resource usage
pm2 monit

# Process info
pm2 info zimbabwe-bot

# List all processes
pm2 list
```

## 🔄 Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Restart bot
pm2 restart zimbabwe-bot
```

## 🔐 Security

- Never commit `.env` file
- Use strong Supabase passwords
- Limit admin phone numbers
- Keep Node.js updated
- Monitor logs regularly

## 📞 Support Contacts

- **Technical Issues**: Check logs first
- **Database**: Verify Supabase connection
- **WhatsApp**: Ensure phone is online
- **Booking Issues**: Check user input validation

## 🎯 Testing Checklist

- [ ] Bot connects successfully
- [ ] Responds to "hi"
- [ ] Main menu displays
- [ ] Booking flow works
- [ ] Pricing shows correctly
- [ ] Tracking works
- [ ] Database creates records
- [ ] User name remembered

## 📈 Performance Tips

- Use PM2 for process management
- Enable log rotation
- Monitor memory usage
- Set up auto-restart
- Regular backups
- Keep dependencies updated

## 🚨 Emergency Commands

```bash
# Force restart
pm2 restart zimbabwe-bot --force

# Kill all PM2 processes
pm2 kill

# Start fresh
pm2 flush
pm2 start src/index.js --name zimbabwe-bot

# Check system resources
top
df -h
free -m
```

## 📱 Customer Support Script

**When customers ask how to use:**

"Simply send a WhatsApp message to [your number]:
1. Type 'hi' to start
2. Choose option 1 to book
3. Follow the simple steps
4. Get your tracking number instantly!

Available 24/7 🇮🇪🇿🇼"

## 🔗 Useful Links

- [Baileys Docs](https://github.com/WhiskeySockets/Baileys)
- [Supabase Docs](https://supabase.com/docs)
- [PM2 Docs](https://pm2.keymetrics.io/docs)
- [Node.js Docs](https://nodejs.org/docs)

---

**Keep this card handy for quick reference! 📋**
