# WhatsApp Bot Setup Guide - Step by Step

This guide will walk you through setting up the Zimbabwe Shipping WhatsApp bot for Ireland operations.

## 📋 Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Node.js version 18 or higher installed
- [ ] A WhatsApp account (Business or Personal)
- [ ] Access to your Supabase project
- [ ] A phone that can scan QR codes
- [ ] Basic command line knowledge

## 🔧 Step 1: Install Node.js

### Check if Node.js is installed:
```bash
node --version
```

If you see `v18.x.x` or higher, you're good to go!

### If not installed:
- **Windows/Mac**: Download from [nodejs.org](https://nodejs.org/)
- **Linux**: 
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

## 📦 Step 2: Install Dependencies

Navigate to the bot directory and install packages:

```bash
cd whatsapp-bot
npm install
```

This will install:
- `@whiskeysockets/baileys` - WhatsApp connection library
- `@supabase/supabase-js` - Database client
- `qrcode-terminal` - QR code display
- `pino` - Logging
- `dotenv` - Environment variables
- `node-cache` - Session management

## 🔑 Step 3: Configure Environment Variables

### 3.1 Copy the example file:
```bash
cp .env.example .env
```

### 3.2 Get your Supabase credentials:

1. Go to [supabase.com](https://supabase.com) and log in
2. Select your project
3. Click on the **Settings** icon (⚙️) in the sidebar
4. Go to **API** section
5. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### 3.3 Edit your .env file:

Open `.env` in a text editor and fill in:

```env
# Paste your Supabase URL here
SUPABASE_URL=https://your-project-id.supabase.co

# Paste your Supabase anon key here
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your bot's name (optional)
BOT_NAME=Zimbabwe Shipping Ireland

# Your Ireland phone number (optional, for reference)
BOT_PHONE_NUMBER=+353123456789

# Admin phone numbers (comma-separated, optional)
ADMIN_PHONE_NUMBERS=+353123456789,+353987654321

# Session storage path (leave as is)
SESSION_PATH=./whatsapp-session

# Environment (production or development)
NODE_ENV=production
```

**Important**: Never share your `.env` file or commit it to Git!

## 🚀 Step 4: Start the Bot

### 4.1 First time startup:

```bash
npm start
```

You should see:
```
🚀 Starting Zimbabwe Shipping WhatsApp Bot (Ireland)...
✅ Database connection initialized
```

### 4.2 Scan the QR Code:

A QR code will appear in your terminal. Now:

1. Open WhatsApp on your phone
2. Tap the **three dots** (⋮) or **Settings**
3. Select **Linked Devices**
4. Tap **Link a Device**
5. Point your camera at the QR code in the terminal
6. Wait for connection...

You should see:
```
✅ WhatsApp Bot Connected Successfully!
🇮🇪 Zimbabwe Shipping Ireland Bot is now active
```

🎉 **Congratulations! Your bot is now running!**

## 📱 Step 5: Test the Bot

### 5.1 Send a test message:

From any WhatsApp account, send a message to the phone number you connected:

```
Hi
```

The bot should respond with:
```
Hello! 👋
🇮🇪 Zimbabwe Shipping - Ireland

Welcome to our WhatsApp booking service!
...
```

### 5.2 Test the booking flow:

Send:
```
1
```

The bot should start the booking process.

### 5.3 Test tracking:

Send:
```
3
```

Then enter a tracking number like:
```
ZS-TEST1234
```

## 🔄 Step 6: Keep the Bot Running

### Option A: Keep Terminal Open (Simple)

Just leave the terminal window open. The bot will run as long as the terminal is open.

**Pros**: Simple, good for testing
**Cons**: Stops when you close the terminal

### Option B: Use PM2 (Recommended for Production)

PM2 keeps your bot running even after you close the terminal.

#### Install PM2:
```bash
npm install -g pm2
```

#### Start the bot with PM2:
```bash
pm2 start src/index.js --name zimbabwe-bot
```

#### Useful PM2 commands:
```bash
# View logs
pm2 logs zimbabwe-bot

# Stop the bot
pm2 stop zimbabwe-bot

# Restart the bot
pm2 restart zimbabwe-bot

# View status
pm2 status

# Make PM2 start on system boot
pm2 startup
pm2 save
```

### Option C: Use Screen (Linux/Mac)

```bash
# Start a screen session
screen -S whatsapp-bot

# Run the bot
npm start

# Detach from screen (press): Ctrl+A then D

# Reattach later
screen -r whatsapp-bot
```

## 🛠️ Troubleshooting

### Problem: QR Code doesn't appear

**Solution**:
1. Make sure you're using Node.js 18+
2. Check your internet connection
3. Try deleting the session folder:
   ```bash
   rm -rf whatsapp-session
   npm start
   ```

### Problem: "Database not initialized" warning

**Solution**:
1. Check your `.env` file has correct Supabase credentials
2. Make sure there are no extra spaces in the values
3. Verify your Supabase project is active

### Problem: Bot disconnects frequently

**Solution**:
1. Check your internet connection stability
2. Make sure your phone has internet
3. Don't log out from WhatsApp on your phone
4. Use PM2 for auto-restart:
   ```bash
   pm2 start src/index.js --name zimbabwe-bot --restart-delay=3000
   ```

### Problem: Bot doesn't respond to messages

**Solution**:
1. Check if the bot is still running (look at terminal)
2. Make sure you're sending messages to the correct number
3. Check logs for errors:
   ```bash
   pm2 logs zimbabwe-bot
   ```
4. Restart the bot:
   ```bash
   pm2 restart zimbabwe-bot
   ```

### Problem: "Cannot find module" error

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## 📊 Monitoring Your Bot

### View real-time logs:
```bash
# If using npm start
# Logs appear in the terminal

# If using PM2
pm2 logs zimbabwe-bot

# View only errors
pm2 logs zimbabwe-bot --err
```

### Check bot status:
```bash
pm2 status
```

### Monitor resource usage:
```bash
pm2 monit
```

## 🔐 Security Best Practices

1. **Never share your `.env` file**
2. **Don't commit `.env` to Git** (it's already in `.gitignore`)
3. **Use strong Supabase passwords**
4. **Regularly update dependencies**:
   ```bash
   npm update
   ```
5. **Monitor logs for suspicious activity**
6. **Limit admin phone numbers** to trusted users only

## 🔄 Updating the Bot

When you make changes to the code:

### If using npm start:
1. Stop the bot (Ctrl+C)
2. Start it again: `npm start`

### If using PM2:
```bash
pm2 restart zimbabwe-bot
```

### If using Screen:
1. Reattach: `screen -r whatsapp-bot`
2. Stop: Ctrl+C
3. Start: `npm start`
4. Detach: Ctrl+A then D

## 📞 Getting Help

If you're stuck:

1. **Check the logs** - Most issues show up in logs
2. **Review this guide** - Make sure you followed all steps
3. **Check the main README** - More detailed information
4. **Test your Supabase connection** - Make sure database is accessible
5. **Verify WhatsApp connection** - Make sure phone is online

## ✅ Success Checklist

Your bot is working correctly if:

- [ ] QR code appears and you can scan it
- [ ] Bot shows "Connected Successfully" message
- [ ] Bot responds to "hi" or "menu"
- [ ] Booking flow works (type "1")
- [ ] Pricing information displays (type "2")
- [ ] Bot remembers your name after first interaction
- [ ] Tracking works (type "3")
- [ ] Database creates shipments (check Supabase)

## 🎉 Next Steps

Now that your bot is running:

1. **Test all features** - Go through booking, tracking, FAQ
2. **Customize messages** - Edit files in `src/flows/` and `src/menus/`
3. **Add your branding** - Update bot name and messages
4. **Set up monitoring** - Use PM2 or similar
5. **Train your team** - Show them how to use the bot
6. **Promote to customers** - Share your WhatsApp number

## 📱 Sharing Your Bot

To let customers use your bot:

1. Share your WhatsApp Business number
2. Add a WhatsApp button to your website
3. Include the number in email signatures
4. Promote on social media
5. Add to business cards

Example message to customers:
```
📱 Book your shipment via WhatsApp!
Send "Hi" to +353 XXX XXXX
Available 24/7 for instant booking
```

---

**Need more help?** Check the main README.md or contact your development team.

**Happy Shipping! 🚢🇮🇪🇿🇼**
