# WhatsApp Bot Hosting Checklist

## ✅ Pre-Deployment Checklist

- [ ] Bot works locally (tested with `npm start`)
- [ ] `.env` file is in `.gitignore` (already done)
- [ ] All code changes committed
- [ ] GitHub account created
- [ ] Hosting provider account created (DigitalOcean recommended)

## 📤 Push to GitHub

```powershell
cd C:\Users\Mthokozisi.DESKTOP-DPOBCC1\Documents\zimbabwe-shipping-nexus\whatsapp-bot

git init
git add .
git commit -m "WhatsApp bot for Zimbabwe Shipping Ireland"
git remote add origin https://github.com/YOUR_USERNAME/zimbabwe-shipping-whatsapp-bot.git
git push -u origin main
```

- [ ] Repository created on GitHub (private!)
- [ ] Code pushed successfully
- [ ] Verified `.env` is NOT in repository

## 🌐 Server Setup (DigitalOcean)

### Create Server
- [ ] DigitalOcean account created
- [ ] Droplet created (Ubuntu 22.04, $6/month)
- [ ] Server IP address noted
- [ ] Can SSH into server

### Deploy Bot
```bash
# On server
cd /opt
git clone https://github.com/YOUR_USERNAME/zimbabwe-shipping-whatsapp-bot.git
cd zimbabwe-shipping-whatsapp-bot
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

- [ ] Repository cloned to server
- [ ] Node.js installed
- [ ] Dependencies installed
- [ ] PM2 installed

### Configure
```bash
nano .env
```

- [ ] `.env` file created on server
- [ ] Supabase credentials added
- [ ] Configuration saved

### Start Bot
```bash
pm2 start src/index.js --name zimbabwe-bot
pm2 save
pm2 startup
```

- [ ] Bot started with PM2
- [ ] PM2 configuration saved
- [ ] Auto-start on reboot enabled

## 📱 Connect WhatsApp

```bash
pm2 logs zimbabwe-bot
```

- [ ] QR code visible in logs
- [ ] QR code scanned with WhatsApp
- [ ] Bot shows "Connected Successfully"

## 🧪 Testing

- [ ] Send "Hi" to bot → Receives welcome message
- [ ] Start booking → Bot guides through process
- [ ] Check Supabase → Booking saved to database
- [ ] Send message in group → Bot ignores it
- [ ] Restart server → Bot auto-starts

## 🔒 Security

```bash
ufw allow 22
ufw enable
```

- [ ] Firewall enabled
- [ ] Only SSH port open
- [ ] Strong password set
- [ ] Regular updates scheduled

## 📊 Monitoring

```bash
pm2 status
pm2 logs zimbabwe-bot
pm2 monit
```

- [ ] Bot status is "online"
- [ ] No errors in logs
- [ ] Memory usage normal (<500MB)

## 💰 Cost Summary

**DigitalOcean:**
- Monthly: $6
- With $200 credit: FREE for 33 months!

**Total Setup Time:** 20-30 minutes

## 🎯 Success Criteria

Your bot is successfully hosted when:

✅ Bot runs 24/7 without your computer
✅ Responds to WhatsApp messages automatically
✅ Saves bookings to Supabase database
✅ Remembers users by phone number
✅ Ignores group messages
✅ Auto-restarts if it crashes
✅ Survives server reboots

## 🆘 Troubleshooting

### Bot won't start
```bash
pm2 logs zimbabwe-bot --lines 50
```
Check for errors in logs

### Can't see QR code
```bash
pm2 logs zimbabwe-bot --lines 200
```
Scroll up to find QR code

### Bot disconnects
```bash
pm2 restart zimbabwe-bot
```
Restart and scan QR code again

### Database errors
Check `.env` file has correct Supabase credentials

## 📞 Next Steps After Hosting

1. **Test thoroughly** - Send various messages
2. **Monitor for 24 hours** - Check logs regularly
3. **Share bot number** - Add to website, social media
4. **Train team** - Show them how to monitor
5. **Set up alerts** - Get notified if bot goes down

## 🎉 You're Done!

Your WhatsApp bot is now:
- ✅ Hosted on cloud server
- ✅ Running 24/7
- ✅ Responding automatically
- ✅ Saving to database
- ✅ Professional and reliable

**Congratulations! Your bot is live!** 🚀🇮🇪🇿🇼
