# 🚀 How to Connect WhatsApp Bot to Customer's Number

## 📋 Quick Summary

Your WhatsApp bot is **ready to deploy**. Here's what you need to do to connect it to the customer's WhatsApp number (+353 87 195 4910) **today**:

### Time Required: 20-30 minutes
### Cost: FREE for 33 months (with DigitalOcean $200 credit)

---

## 🎯 Choose Your Guide

We've created **4 different guides** to help you - pick the one that suits you best:

### 1. 📖 **CONNECT_TODAY.md** (RECOMMENDED)
   - **Best for:** First-time deployment
   - **Detail level:** Complete step-by-step with explanations
   - **Includes:** Troubleshooting, security tips, monitoring
   - **Length:** Comprehensive (full guide)

### 2. ✅ **DEPLOYMENT_CHECKLIST.md**
   - **Best for:** Following along with checkboxes
   - **Detail level:** Checklist format
   - **Includes:** Pre-deployment checks, testing checklist
   - **Length:** Medium (organized checklist)

### 3. ⚡ **QUICK_CONNECT_GUIDE.txt**
   - **Best for:** Visual learners
   - **Detail level:** Quick reference with ASCII art
   - **Includes:** Commands and visual flow
   - **Length:** Short (quick reference)

### 4. 📋 **COMMANDS_REFERENCE.txt**
   - **Best for:** Copy-paste commands
   - **Detail level:** Just the commands
   - **Includes:** All commands organized by task
   - **Length:** Reference sheet

---

## 🚀 Quick Start (3 Steps)

If you want to start **right now**, here's the absolute minimum:

### Step 1: Create Server (5 min)
1. Go to https://www.digitalocean.com
2. Sign up (get $200 FREE credit)
3. Create Ubuntu 22.04 Droplet ($6/month)
4. Note your IP address

### Step 2: Deploy Bot (10 min)
```bash
# Connect to server
ssh root@YOUR_SERVER_IP

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2

# Clone and start bot
cd /opt
git clone https://github.com/YOUR_USERNAME/zimship-bot.git
cd zimship-bot
npm install
pm2 start src/index.js --name zimship-bot
pm2 save
pm2 startup
```

### Step 3: Connect WhatsApp (5 min)
```bash
# Download QR code (from local computer)
scp root@YOUR_SERVER_IP:/opt/zimship-bot/qr-code.png ./Desktop/

# Open qr-code.png and scan with customer's phone:
# WhatsApp → Settings → Linked Devices → Link a Device
```

**Done!** Test by sending "Hi" to +353 87 195 4910

---

## 📱 What the Bot Does

Once connected, the bot will:

✅ **Respond automatically** to any message  
✅ **Show interactive menu** with 6 options  
✅ **Complete booking flow** (5 steps)  
✅ **Calculate pricing** with discounts  
✅ **Save customer details** for returning customers  
✅ **Track shipments** by tracking number  
✅ **Answer FAQs** automatically  
✅ **Ignore group messages**  
✅ **Save to database** (Supabase)  
✅ **Run 24/7** without intervention  

---

## 🎯 Bot Features

### Main Menu
```
Welcome to Zimbabwe Shipping Ireland Branch 🇮🇪🇿🇼

How can I help you today?

1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 📞 Contact Us
```

### Booking Flow (5 Steps)
1. **Sender Details** - Name, email, phone, address, city
2. **Receiver Details** - Name, phone, address, city in Zimbabwe
3. **Items Selection** - Drums, trunks, other items
4. **Pricing Summary** - Calculated total with discounts
5. **Confirmation** - Booking saved with tracking number

### Pricing (Ireland - EUR)
- 🥁 **Drums:** €340-€360 (volume discounts)
- 📦 **Boxes/Trunks:** €200-€220 (volume discounts)
- 🔒 **Metal Seal:** €7 per item
- 🚪 **Door-to-door:** €25

---

## 💰 Cost Breakdown

### Hosting (DigitalOcean)
- **Regular price:** $6/month
- **With $200 credit:** FREE for 33 months
- **After credit:** $6/month

### Total First Year Cost: $0 ✨

---

## 🔧 Management Commands

Once deployed, use these commands:

```bash
# Check status
pm2 status

# View logs
pm2 logs zimship-bot

# Restart bot
pm2 restart zimship-bot

# Monitor resources
pm2 monit
```

---

## 📞 Share with Customers

Once live, share this link:

```
https://wa.me/353871954910?text=Hi
```

Add to:
- ✅ Website "Contact Us" button
- ✅ Facebook page
- ✅ Instagram bio
- ✅ Email signature
- ✅ Google My Business
- ✅ Business cards

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
pm2 logs zimship-bot --lines 50
pm2 restart zimship-bot
```

### Connection Lost?
```bash
rm -rf /opt/zimship-bot/whatsapp-session
pm2 restart zimship-bot
# Scan QR code again
```

---

## 📊 Admin Panel

Manage bot settings at:
```
https://your-website.com/admin
```

Navigate to **WhatsApp Bot Settings** tab to:
- Update pricing (drums, boxes, seals)
- Edit bot messages
- Customize responses

Changes take effect within 5 minutes.

---

## 🔐 Security

After deployment, secure your server:

```bash
# Change root password
passwd

# Setup firewall
ufw allow 22
ufw allow 3001
ufw enable

# Update system
apt update && apt upgrade -y
```

---

## 📈 Monitoring

### Check Bot Health
```bash
pm2 status              # Is it running?
pm2 logs zimship-bot    # Any errors?
pm2 monit               # Resource usage
```

### Check Database
Go to Supabase dashboard:
- `user_sessions` - Active users
- `bookings` - New bookings
- `bot_settings` - Current pricing

---

## 💡 Pro Tips

1. **Test thoroughly** before sharing with customers
2. **Monitor logs** for first 24 hours
3. **Backup session data** weekly
4. **Update pricing** seasonally via admin panel
5. **Check database** regularly for new bookings

---

## 📚 All Documentation Files

| File | Purpose | Best For |
|------|---------|----------|
| `CONNECT_TODAY.md` | Complete guide | First deployment |
| `DEPLOYMENT_CHECKLIST.md` | Checklist format | Following steps |
| `QUICK_CONNECT_GUIDE.txt` | Visual guide | Quick reference |
| `COMMANDS_REFERENCE.txt` | Command list | Copy-paste |
| `START_HERE.txt` | Overview | Understanding |
| `QUICK_START.txt` | Quick start | Fast setup |
| `DEPLOYMENT.txt` | Basic steps | Simple guide |

---

## 🎯 Recommended Path

For first-time deployment, we recommend:

1. **Read:** `CONNECT_TODAY.md` (full guide)
2. **Follow:** `DEPLOYMENT_CHECKLIST.md` (check off steps)
3. **Reference:** `COMMANDS_REFERENCE.txt` (copy commands)

---

## ✅ Success Criteria

Your bot is successfully deployed when:

- ✅ Bot responds within 2 seconds
- ✅ All menu options work (1-6)
- ✅ Bookings save to database
- ✅ Bot runs 24/7 without intervention
- ✅ Auto-restarts on crash
- ✅ Survives server reboot

---

## 🎊 Ready to Start?

1. **Choose your guide** (we recommend `CONNECT_TODAY.md`)
2. **Follow the steps** (takes 20-30 minutes)
3. **Test the bot** (send "Hi" to +353 87 195 4910)
4. **Share with customers** (use WhatsApp link)

---

## 📞 Important Information

**Bot Phone Number:** +353 87 195 4910  
**Supabase URL:** https://oncsaunsqtekwwbzvvyh.supabase.co  
**Admin Panel:** https://your-website.com/admin  
**WhatsApp Link:** https://wa.me/353871954910?text=Hi  

---

## 🚀 Let's Go!

Everything is ready. The bot code is complete, tested, and ready to deploy.

**Next step:** Open `CONNECT_TODAY.md` and start with Step 1.

You'll have a professional WhatsApp bot running in 20-30 minutes! 🇮🇪🇿🇼

---

## 🆘 Need Help?

All troubleshooting is included in the guides. Common issues:

- **QR code expired** → Restart bot and get new QR
- **Bot not responding** → Check logs and restart
- **Can't connect** → Check firewall and network

Check `CONNECT_TODAY.md` for detailed troubleshooting.

---

**Good luck! You've got this! 🎉**
