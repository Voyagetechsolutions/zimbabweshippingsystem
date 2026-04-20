# 🚀 Deploy Your WhatsApp Bot NOW

## ✅ What You've Done So Far:
- ✅ Bot code created
- ✅ Pushed to GitHub: https://github.com/Mtho-kozisi/zimbabwe-shipping-nexus
- ✅ Ready to deploy!

---

## 🎯 FASTEST WAY: DigitalOcean (Recommended)

### Why DigitalOcean?
- 💰 **$200 FREE credit** (33 months free!)
- ⚡ Takes 10 minutes to setup
- 🔒 Reliable and secure
- 📱 Perfect for WhatsApp bots

---

## 📋 STEP-BY-STEP DEPLOYMENT

### **STEP 1: Create DigitalOcean Account**

1. Go to: **https://www.digitalocean.com**
2. Click **"Sign Up"**
3. Use your email: `mthokozisi@zimbabweshipping.com`
4. Verify email
5. Add payment method (won't be charged - you have $200 credit!)

### **STEP 2: Create a Server (Droplet)**

1. Click **"Create"** → **"Droplets"**
2. Choose these settings:

   **Image:** Ubuntu 22.04 LTS
   
   **Plan:** Basic
   
   **CPU:** Regular - $6/month
   
   **Datacenter:** London (closest to Ireland)
   
   **Authentication:** Password
   - Create a strong password (save it!)
   
   **Hostname:** zimbabwe-shipping-bot

3. Click **"Create Droplet"**
4. Wait 1 minute for server to start
5. **COPY YOUR SERVER IP ADDRESS** (looks like: 123.45.67.89)

---

### **STEP 3: Connect to Your Server**

Open PowerShell and run:

```powershell
ssh root@YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with the IP you copied.

Type `yes` when asked about fingerprint.
Enter the password you created.

You're now inside your server! 🎉

---

### **STEP 4: Install Node.js (Copy & Paste These Commands)**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 (keeps bot running 24/7)
npm install -g pm2

# Verify installation
node --version
npm --version
```

Wait for each command to finish before running the next one.

---

### **STEP 5: Download Your Bot from GitHub**

```bash
# Go to /opt directory
cd /opt

# Clone your repository
git clone https://github.com/Mtho-kozisi/zimbabwe-shipping-nexus.git

# Go into the bot folder
cd zimbabwe-shipping-nexus/whatsapp-bot

# Install dependencies
npm install
```

This will take 2-3 minutes.

---

### **STEP 6: Create Environment File**

```bash
# Create .env file
nano .env
```

This opens a text editor. **Copy and paste this EXACTLY:**

```env
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA
BOT_NAME=Zimbabwe Shipping Ireland
SESSION_PATH=./whatsapp-session
NODE_ENV=production
```

**To save:**
1. Press `Ctrl + X`
2. Press `Y`
3. Press `Enter`

---

### **STEP 7: Start Your Bot!**

```bash
# Start the bot with PM2
pm2 start src/index.js --name zimbabwe-bot

# View the logs (you'll see the QR code message here)
pm2 logs zimbabwe-bot
```

You should see:
```
🚀 Starting Zimbabwe Shipping WhatsApp Bot (Ireland)...
✅ Database connection initialized
📸 QR code saved to: qr-code.png
💡 Download this file and scan it with your phone!
```

**IMPORTANT:** Keep this terminal window open!

---

### **STEP 8: Download QR Code to Your Computer**

Open a **NEW PowerShell window** on your computer (don't close the server one!):

```powershell
# Download the QR code image
scp root@YOUR_SERVER_IP:/opt/zimbabwe-shipping-nexus/whatsapp-bot/qr-code.png C:\Users\Mthokozisi.DESKTOP-DPOBCC1\Downloads\
```

Replace `YOUR_SERVER_IP` with your actual IP.

Enter your server password when asked.

The file will be saved to your Downloads folder!

---

### **STEP 9: Scan QR Code with Your Phone**

1. Open the file: `C:\Users\Mthokozisi.DESKTOP-DPOBCC1\Downloads\qr-code.png`
2. Open **WhatsApp** on your phone
3. Go to **Settings** → **Linked Devices**
4. Tap **"Link a Device"**
5. Point your camera at the QR code on your computer screen
6. Wait for it to connect...

**In the server terminal, you should see:**
```
✅ WhatsApp Bot Connected Successfully!
🇮🇪 Zimbabwe Shipping Ireland Bot is now active
```

🎉 **YOUR BOT IS NOW LIVE!**

---

### **STEP 10: Make Bot Auto-Start on Reboot**

Back in the server terminal:

```bash
# Save PM2 configuration
pm2 save

# Setup auto-start
pm2 startup

# Copy and run the command it shows you
```

It will show a command like:
```
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

Copy that entire line and run it.

---

### **STEP 11: Test Your Bot!**

1. Send a WhatsApp message to the number you connected
2. Type anything (e.g., "Hi")
3. Bot should respond with:

```
🇮🇪 Welcome to Zimbabwe Shipping
Ireland Branch

Thank you for contacting us! We're excited to serve you.

📢 Important Notice:
Collections in Ireland will commence in August 2026

Our Services:
✈️ Ship drums, trunks & boxes to Zimbabwe
🚚 FREE collection across Ireland
📦 Full tracking & insurance
💰 Competitive pricing with volume discounts

How can we help you today?

1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 📞 Contact Us

Reply with a number (1-6) or describe what you need.
```

---

## 🎉 SUCCESS! Your Bot is Live!

### What Your Bot Can Do:
✅ Responds to ANY message (not just "hi")
✅ Ignores group messages (only individual chats)
✅ Remembers customer details for future bookings
✅ Complete booking flow with pricing
✅ Tracks shipments
✅ Shows collection routes
✅ Answers FAQs
✅ Saves everything to database

---

## 📊 Useful Commands

**Check bot status:**
```bash
pm2 status
```

**View logs:**
```bash
pm2 logs zimbabwe-bot
```

**Restart bot:**
```bash
pm2 restart zimbabwe-bot
```

**Stop bot:**
```bash
pm2 stop zimbabwe-bot
```

**Monitor resources:**
```bash
pm2 monit
```

---

## 🔒 Security: Delete QR Code After Scanning

```bash
rm /opt/zimbabwe-shipping-nexus/whatsapp-bot/qr-code.png
```

---

## 💰 Cost Breakdown

- **Server:** $6/month
- **Your credit:** $200
- **Months free:** 33 months!
- **After credit:** $6/month (less than a coffee!)

---

## 📱 Share Your WhatsApp Number

Add your WhatsApp number to:
- Website contact page
- Facebook page
- Instagram bio
- Email signature
- Business cards

Example text:
```
💬 Chat with us on WhatsApp!
📱 +353 XXX XXX XXX

Get instant quotes, book shipments, and track your packages 24/7!
```

---

## 🆘 Troubleshooting

### QR Code Expired?
```bash
pm2 restart zimbabwe-bot
# Download new QR code
scp root@YOUR_SERVER_IP:/opt/zimbabwe-shipping-nexus/whatsapp-bot/qr-code.png ./
```

### Bot Not Responding?
```bash
pm2 logs zimbabwe-bot --lines 50
```

### Need to Update Bot?
```bash
cd /opt/zimbabwe-shipping-nexus/whatsapp-bot
git pull
npm install
pm2 restart zimbabwe-bot
```

---

## 🎯 Next Steps

1. ✅ Test all bot features (booking, tracking, pricing)
2. ✅ Add WhatsApp number to your website
3. ✅ Share with customers
4. ✅ Monitor for 24 hours
5. ✅ Celebrate! 🎉

---

## 📞 Need Help?

If you get stuck at any step, check the logs:
```bash
pm2 logs zimbabwe-bot
```

The logs will tell you exactly what's happening!

---

**You're ready to go! Follow these steps and your bot will be live in 15 minutes!** 🚀🇮🇪🇿🇼
