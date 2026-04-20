# Simple Setup Guide - QR Code Image Method

## 🎯 What You'll Do

1. Deploy bot to server
2. Bot creates QR code image file
3. Download the image to your computer
4. Scan it with your phone
5. Done! Bot connected forever

## 📋 Complete Steps

### Step 1: Push to GitHub

```powershell
cd C:\Users\Mthokozisi.DESKTOP-DPOBCC1\Documents\zimbabwe-shipping-nexus\whatsapp-bot

git init
git add .
git commit -m "WhatsApp bot for Zimbabwe Shipping"
git remote add origin https://github.com/YOUR_USERNAME/zimbabwe-shipping-whatsapp-bot.git
git push -u origin main
```

### Step 2: Create DigitalOcean Server

1. Go to https://www.digitalocean.com
2. Sign up (get $200 free credit!)
3. Click "Create" → "Droplets"
4. Choose:
   - **Ubuntu 22.04 LTS**
   - **Basic $6/month**
   - **London datacenter**
   - **Password authentication**
5. Create Droplet
6. Note your server IP address

### Step 3: Connect to Server

```powershell
ssh root@YOUR_SERVER_IP
```

Enter password when prompted.

### Step 4: Install Node.js

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Verify
node --version
npm --version
```

### Step 5: Clone Your Bot

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/zimbabwe-shipping-whatsapp-bot.git
cd zimbabwe-shipping-whatsapp-bot
```

### Step 6: Install Dependencies

```bash
npm install
```

### Step 7: Create .env File

```bash
nano .env
```

Paste this (with your actual credentials):
```env
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA
BOT_NAME=Zimbabwe Shipping Ireland
SESSION_PATH=./whatsapp-session
NODE_ENV=production
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 8: Start Bot

```bash
pm2 start src/index.js --name zimbabwe-bot
pm2 logs zimbabwe-bot
```

You'll see:
```
🚀 Starting Zimbabwe Shipping WhatsApp Bot (Ireland)...
✅ Database connection initialized
🔗 Scan this QR code with WhatsApp:
📸 QR code saved to: qr-code.png
💡 Download this file and scan it with your phone!
```

### Step 9: Download QR Code Image

**Keep the server terminal open!**

Open a **NEW PowerShell window** on your computer:

```powershell
# Download QR code image
scp root@YOUR_SERVER_IP:/opt/zimbabwe-shipping-whatsapp-bot/qr-code.png C:\Users\Mthokozisi.DESKTOP-DPOBCC1\Downloads\
```

Enter server password when prompted.

### Step 10: Scan QR Code

1. Open `qr-code.png` from your Downloads folder
2. Open WhatsApp on your phone
3. Go to **Settings** → **Linked Devices** → **Link a Device**
4. Point camera at the QR code on your computer screen
5. Wait for connection...

### Step 11: Verify Connection

Back in the server terminal, you should see:
```
✅ WhatsApp Bot Connected Successfully!
🇮🇪 Zimbabwe Shipping Ireland Bot is now active
```

### Step 12: Make Bot Auto-Start

```bash
pm2 save
pm2 startup
# Copy and run the command it shows
```

### Step 13: Test the Bot

Send a WhatsApp message to your connected number:
```
Hi
```

Bot should respond with the welcome message!

## 🎉 Done!

Your bot is now:
- ✅ Running 24/7 on the server
- ✅ Connected to your WhatsApp number
- ✅ Responding automatically
- ✅ Saving to database
- ✅ Auto-restarting if it crashes

## 📊 Useful Commands

```bash
# Check bot status
pm2 status

# View logs
pm2 logs zimbabwe-bot

# Restart bot
pm2 restart zimbabwe-bot

# Stop bot
pm2 stop zimbabwe-bot

# Monitor resources
pm2 monit
```

## ⚠️ Important Notes

### QR Code Expires in 60 Seconds
- Download and scan quickly
- If expired, restart bot: `pm2 restart zimbabwe-bot`
- New QR code will be generated

### Delete QR Code After Scanning
```bash
# On server
rm /opt/zimbabwe-shipping-whatsapp-bot/qr-code.png
```

### One-Time Process
- You only scan QR code ONCE
- Bot stays connected forever
- Even after server restarts

## 🆘 Troubleshooting

### Can't download qr-code.png
```bash
# Check if file exists
ls -la /opt/zimbabwe-shipping-whatsapp-bot/qr-code.png

# If not there, check logs
pm2 logs zimbabwe-bot
```

### QR code expired
```bash
# Restart bot
pm2 restart zimbabwe-bot

# Download new QR code
scp root@YOUR_SERVER_IP:/opt/zimbabwe-shipping-whatsapp-bot/qr-code.png ./
```

### Bot not responding
```bash
# Check status
pm2 status

# Check logs
pm2 logs zimbabwe-bot --lines 50

# Restart if needed
pm2 restart zimbabwe-bot
```

## 💰 Cost

- **DigitalOcean:** $6/month
- **With $200 credit:** FREE for 33 months!

## 🎯 Next Steps

1. Test all bot features
2. Share WhatsApp number with customers
3. Add link to website
4. Monitor for 24 hours
5. Celebrate! 🎉

---

**Your bot is now live and ready to serve customers!** 🚀🇮🇪🇿🇼
