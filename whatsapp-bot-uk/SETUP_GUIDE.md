# WhatsApp Bot Setup Guide - Step by Step

This guide will walk you through setting up the Zimbabwe Shipping WhatsApp bot for UK operations.

## 📋 Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Node.js installed (v18 or higher) - [Download here](https://nodejs.org/)
- [ ] A UK phone number for the bot (can be personal or business WhatsApp)
- [ ] Supabase account - [Sign up here](https://supabase.com/)
- [ ] Access to the Zimbabwe Shipping Supabase project
- [ ] A computer that can stay online (for hosting the bot)

## 🚀 Step-by-Step Setup

### Step 1: Install Node.js

**Windows:**
1. Download from [nodejs.org](https://nodejs.org/)
2. Run the installer
3. Verify installation:
```bash
node --version
npm --version
```

**Mac:**
```bash
brew install node
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Get Supabase Credentials

1. Log in to [Supabase](https://supabase.com/)
2. Open your Zimbabwe Shipping project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### Step 3: Install the Bot

1. Navigate to the bot directory:
```bash
cd whatsapp-bot-uk
```

2. Install dependencies:
```bash
npm install
```

This will install:
- WhatsApp Web library (Baileys)
- Supabase client
- QR code generator
- Session management
- Other utilities

### Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open `.env` in a text editor and fill in:

```env
# Supabase Configuration
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA

# Bot Configuration
BOT_NAME=Zimbabwe Shipping UK
BOT_PHONE_NUMBER=+44_your_uk_number_here

# Admin Configuration
ADMIN_PHONE_NUMBERS=+447984099041,+447584100552

# Session Configuration
SESSION_PATH=./whatsapp-session

# Environment
NODE_ENV=production
```

### Step 5: Start the Bot

```bash
npm start
```

You should see:
```
🚀 Starting Zimbabwe Shipping WhatsApp Bot (UK)...
✅ Database connection initialized
```

### Step 6: Connect WhatsApp

The bot will display a QR code in two ways:

**Option 1: Terminal QR Code**
- A QR code will appear in your terminal
- Open WhatsApp on your phone
- Go to **Settings** → **Linked Devices** → **Link a Device**
- Scan the QR code from the terminal

**Option 2: QR Code Image File**
- The bot saves `qr-code.png` in the bot directory
- Open this image file
- Scan it with WhatsApp on your phone

### Step 7: Verify Connection

Once connected, you'll see:
```
✅ WhatsApp Bot Connected Successfully!
🇬🇧 Zimbabwe Shipping UK Bot is now active
```

### Step 8: Test the Bot

1. Send a message to the bot's WhatsApp number from another phone
2. You should receive the welcome message:
```
🇬🇧 Welcome to Zimbabwe Shipping
UK Branch

Thank you for contacting us! We're excited to serve you.
...
```

3. Try these commands:
   - Type "1" to test booking flow
   - Type "2" to see pricing
   - Type "menu" to see main menu

## 🔧 Troubleshooting

### QR Code Not Appearing
- Make sure your terminal supports QR code display
- Use the `qr-code.png` file instead
- Try running with `npm start` again

### Database Connection Error
- Verify your Supabase URL and key are correct
- Check if the `shipments` table exists in Supabase
- Ensure your internet connection is stable

### Bot Disconnects
- The bot needs to stay running continuously
- Consider using PM2 for production (see below)
- Check your internet connection

### Messages Not Sending
- Verify WhatsApp is still connected
- Check the console for error messages
- Restart the bot if needed

## 🚀 Production Deployment

For production use, install PM2 to keep the bot running:

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
pm2 start src/index.js --name whatsapp-bot-uk

# Save the PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

### PM2 Commands

```bash
# View bot status
pm2 status

# View bot logs
pm2 logs whatsapp-bot-uk

# Restart bot
pm2 restart whatsapp-bot-uk

# Stop bot
pm2 stop whatsapp-bot-uk

# Delete bot from PM2
pm2 delete whatsapp-bot-uk
```

## 📊 Monitoring

### View Logs
```bash
# Real-time logs
pm2 logs whatsapp-bot-uk

# Last 100 lines
pm2 logs whatsapp-bot-uk --lines 100
```

### Check Database
1. Go to Supabase dashboard
2. Open **Table Editor**
3. Select `shipments` table
4. View bookings created by the bot (look for `bookingSource: 'whatsapp-bot-uk'`)

## 🔐 Security Best Practices

1. **Never share your `.env` file**
2. **Backup the `whatsapp-session/` folder regularly**
3. **Use a dedicated phone number for the bot**
4. **Monitor the bot's activity regularly**
5. **Keep Node.js and dependencies updated**

## 📱 Using the Bot

### For Customers

**Starting a Booking:**
1. Send any message to the bot
2. Reply with "1" or "book"
3. Follow the step-by-step prompts
4. Receive tracking number when complete

**Tracking a Shipment:**
1. Type "3" or "track"
2. Enter tracking number (e.g., ZS-ABC12345)
3. View shipment status

**Getting Help:**
1. Type "5" or "help"
2. Select a category
3. Read FAQ answers

### For Admins

**Viewing Sessions:**
- All active user sessions are stored in memory
- Sessions expire after 24 hours of inactivity

**Database Access:**
- All bookings are saved to Supabase
- Access via Supabase dashboard
- Filter by `bookingSource: 'whatsapp-bot-uk'`

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs:**
   ```bash
   pm2 logs whatsapp-bot-uk
   ```

2. **Restart the bot:**
   ```bash
   pm2 restart whatsapp-bot-uk
   ```

3. **Contact support:**
   - Email: support@zimbabwe-shipping.co.uk
   - Phone: +44 7984 099041

## ✅ Setup Complete!

Your UK WhatsApp bot is now ready to:
- ✅ Accept bookings 24/7
- ✅ Provide pricing information
- ✅ Track shipments
- ✅ Answer FAQs
- ✅ Save all data to database

**Next Steps:**
1. Test the bot thoroughly
2. Share the bot number with customers
3. Monitor bookings in Supabase
4. Keep the bot running continuously

---

**Need help? Contact the development team or refer to README.md for more details.**
