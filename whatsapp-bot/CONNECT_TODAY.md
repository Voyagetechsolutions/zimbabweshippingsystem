# 🚀 Connect WhatsApp Bot to Customer Number TODAY

## Quick Overview
**Time needed:** 20-30 minutes  
**Cost:** $6/month (or FREE with DigitalOcean $200 credit)  
**Result:** Bot running 24/7 on customer's WhatsApp number

---

## ✅ Prerequisites Checklist

Before starting, make sure you have:

- [ ] Customer's WhatsApp Business phone number (e.g., +353 87 195 4910)
- [ ] Access to that phone (to scan QR code)
- [ ] Supabase credentials (already in `.env` file)
- [ ] GitHub account (to push code)
- [ ] Credit card for hosting (DigitalOcean gives $200 free credit)

---

## 🎯 OPTION 1: Quick Deploy (Recommended - 20 minutes)

### Step 1: Push Code to GitHub (5 min)

```powershell
# From your project root
cd whatsapp-bot
git init
git add .
git commit -m "WhatsApp bot ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zimship-whatsapp-bot.git
git push -u origin main
```

### Step 2: Create DigitalOcean Server (5 min)

1. **Sign up:** https://www.digitalocean.com
   - Get **$200 FREE credit** (33 months free!)
   
2. **Create Droplet:**
   - Click "Create" → "Droplets"
   - Choose: **Ubuntu 22.04 LTS**
   - Plan: **Basic $6/month** (1GB RAM, 25GB SSD)
   - Datacenter: **London** (closest to Ireland)
   - Authentication: Choose **Password** (easier) or SSH key
   - Hostname: `zimship-whatsapp-bot`
   - Click **Create Droplet**

3. **Note your IP address** (e.g., 165.232.123.45)

### Step 3: Connect to Server (1 min)

```powershell
# Open PowerShell and connect
ssh root@YOUR_SERVER_IP
# Enter password when prompted
```

### Step 4: Install Dependencies (3 min)

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

### Step 5: Deploy Bot (3 min)

```bash
# Clone your repository
cd /opt
git clone https://github.com/YOUR_USERNAME/zimship-whatsapp-bot.git
cd zimship-whatsapp-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
nano .env
```

**Edit the `.env` file** (already has correct values, just verify):
```env
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BOT_NAME=Zimbabwe Shipping Ireland
BOT_PHONE_NUMBER=+353871954910
SESSION_PATH=/opt/zimship-whatsapp-bot/whatsapp-session
NODE_ENV=production
PORT=3001
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Start Bot & Get QR Code (2 min)

```bash
# Start the bot
pm2 start src/index.js --name zimship-bot

# View logs to see QR code
pm2 logs zimship-bot
```

**You'll see:**
```
📸 QR code saved to: /opt/zimship-whatsapp-bot/qr-code.png
💡 Download this file and scan it with your phone!
⏰ QR code expires in 60 seconds - scan quickly!
```

### Step 7: Download QR Code (1 min)

**Open a NEW PowerShell window** on your local computer:

```powershell
# Download QR code to your computer
scp root@YOUR_SERVER_IP:/opt/zimship-whatsapp-bot/qr-code.png ./Desktop/

# Enter password when prompted
# File will be saved to your Desktop
```

### Step 8: Scan QR Code with Customer's Phone (1 min)

1. **Open the QR code image** on your computer (from Desktop)
2. **On the customer's phone:**
   - Open WhatsApp
   - Go to **Settings** (⚙️)
   - Tap **Linked Devices**
   - Tap **Link a Device**
   - Scan the QR code from your computer screen

3. **Wait for confirmation:**
   ```
   ✅ Connected successfully!
   🤖 Bot is now active on +353871954910
   ```

### Step 9: Make Bot Permanent (2 min)

```bash
# Save PM2 configuration
pm2 save

# Setup auto-start on server reboot
pm2 startup
# Copy and run the command it shows (usually starts with 'sudo env...')

# Verify bot is running
pm2 status
```

### Step 10: Test the Bot! (1 min)

**Send a test message:**
1. From another phone, send "Hi" to **+353 87 195 4910**
2. Bot should respond within 2 seconds with:
   ```
   Welcome to Zimbabwe Shipping Ireland Branch 🇮🇪🇿🇼
   
   Collections commence in August 2026
   
   How can I help you today?
   
   1️⃣ 📦 Book a Shipment
   2️⃣ 💰 View Pricing
   3️⃣ 🔍 Track Shipment
   4️⃣ 📍 Collection Areas
   5️⃣ ❓ FAQ & Help
   6️⃣ 📞 Contact Us
   ```

---

## 🎉 SUCCESS! Bot is Live

### What Just Happened?

✅ Bot is running 24/7 on DigitalOcean server  
✅ Connected to customer's WhatsApp number (+353 87 195 4910)  
✅ Responds automatically to ALL messages  
✅ Saves bookings to Supabase database  
✅ Auto-restarts if it crashes  
✅ Survives server reboots  

### Monthly Cost

- **First 33 months:** FREE (using $200 credit)
- **After that:** $6/month

---

## 📱 Share with Customers

Create a direct WhatsApp link:
```
https://wa.me/353871954910?text=Hi
```

**Add this link to:**
- Website "Contact Us" button
- Facebook page
- Instagram bio
- Email signature
- Google My Business
- Business cards

---

## 🔧 Useful Commands

```bash
# Check bot status
pm2 status

# View live logs
pm2 logs zimship-bot

# Restart bot
pm2 restart zimship-bot

# Stop bot
pm2 stop zimship-bot

# Monitor resources
pm2 monit

# Update bot code
cd /opt/zimship-whatsapp-bot
git pull
npm install
pm2 restart zimship-bot
```

---

## 🆘 Troubleshooting

### QR Code Expired?
```bash
pm2 restart zimship-bot
pm2 logs zimship-bot
# Download new qr-code.png and scan again
```

### Bot Not Responding?
```bash
# Check logs for errors
pm2 logs zimship-bot --lines 50

# Restart bot
pm2 restart zimship-bot

# Check if bot is running
pm2 status
```

### Can't Download QR Code?
```bash
# Check if file exists
ls -la /opt/zimship-whatsapp-bot/qr-code.png

# Make it readable
chmod 644 /opt/zimship-whatsapp-bot/qr-code.png

# Try downloading again
```

### Connection Lost?
The bot saves session data, so it should reconnect automatically. If not:
```bash
# Clear session and restart
rm -rf /opt/zimship-whatsapp-bot/whatsapp-session
pm2 restart zimship-bot
# Scan QR code again
```

---

## 🎯 OPTION 2: Local Testing First (Optional)

If you want to test locally before deploying:

### Step 1: Run Locally

```powershell
# From whatsapp-bot directory
npm install
npm start
```

### Step 2: Scan QR Code

- QR code appears in terminal
- Scan with customer's phone
- Test the bot

### Step 3: Deploy to Server

Once satisfied, follow **Option 1** above to deploy to DigitalOcean.

**Note:** Local testing means your computer must stay on 24/7. For production, use DigitalOcean.

---

## 📊 Monitor Bot Performance

### View Statistics

```bash
# Check uptime
pm2 info zimship-bot

# View memory usage
pm2 monit

# Check logs for errors
pm2 logs zimship-bot --err
```

### Database Check

Go to Supabase dashboard:
- Check `user_sessions` table for active users
- Check `bookings` table for new bookings
- Check `bot_settings` table for pricing

---

## 🔐 Security Best Practices

1. **Change root password:**
   ```bash
   passwd
   ```

2. **Setup firewall:**
   ```bash
   ufw allow 22
   ufw allow 3001
   ufw enable
   ```

3. **Keep system updated:**
   ```bash
   apt update && apt upgrade -y
   ```

4. **Backup session data:**
   ```bash
   # Create backup
   tar -czf session-backup.tar.gz whatsapp-session/
   
   # Download backup
   scp root@YOUR_SERVER_IP:/opt/zimship-whatsapp-bot/session-backup.tar.gz ./
   ```

---

## 📞 Customer Support

### Admin Panel Access

Admins can manage bot settings at:
```
https://your-website.com/admin
```

Navigate to **WhatsApp Bot Settings** tab to:
- Update pricing
- Edit bot messages
- View bot status

### Bot Features

✅ **Automatic responses** to any message  
✅ **Complete booking flow** (5 steps)  
✅ **Pricing calculator** with discounts  
✅ **Shipment tracking** by tracking number  
✅ **FAQ system** with common questions  
✅ **User memory** (saves customer details)  
✅ **Database integration** (all data in Supabase)  
✅ **Group message filtering** (ignores groups)  

---

## 🎊 You're All Set!

The WhatsApp bot is now:
- ✅ Connected to customer's number
- ✅ Running 24/7 on cloud server
- ✅ Responding automatically
- ✅ Saving all bookings
- ✅ Ready for customers

**Next Steps:**
1. Share WhatsApp link with customers
2. Monitor first few bookings
3. Adjust pricing if needed (via admin panel)
4. Promote the WhatsApp booking option

---

## 💡 Pro Tips

1. **Test thoroughly** before sharing with customers
2. **Monitor logs** for first 24 hours
3. **Have backup plan** (phone number for manual bookings)
4. **Update bot messages** seasonally (via admin panel)
5. **Check database** regularly for new bookings

---

**Need help?** Check the logs first:
```bash
pm2 logs zimship-bot --lines 100
```

**Still stuck?** The bot code is well-documented in `src/` folder.

---

🚀 **Happy Shipping!** 🇮🇪🇿🇼
