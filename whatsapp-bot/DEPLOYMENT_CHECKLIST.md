# ✅ WhatsApp Bot Deployment Checklist

## Pre-Deployment (5 minutes)

- [ ] Customer's WhatsApp phone number ready: **+353 87 195 4910**
- [ ] Access to that phone for QR code scanning
- [ ] Supabase credentials verified in `.env` file
- [ ] GitHub account created
- [ ] DigitalOcean account created (get $200 free credit)

---

## Deployment Steps (20 minutes)

### 1. Push to GitHub
- [ ] Navigate to `whatsapp-bot` folder
- [ ] Initialize git repository
- [ ] Commit all files
- [ ] Push to GitHub
- [ ] Verify code is visible on GitHub

### 2. Create Server
- [ ] Sign up at digitalocean.com
- [ ] Create Ubuntu 22.04 Droplet ($6/month)
- [ ] Choose London datacenter
- [ ] Set root password
- [ ] Note IP address: `___________________`

### 3. Setup Server
- [ ] SSH into server: `ssh root@YOUR_IP`
- [ ] Install Node.js 18
- [ ] Install PM2
- [ ] Verify installations

### 4. Deploy Bot
- [ ] Clone repository to `/opt/`
- [ ] Run `npm install`
- [ ] Copy and configure `.env` file
- [ ] Verify all environment variables

### 5. Start Bot
- [ ] Start with PM2: `pm2 start src/index.js --name zimship-bot`
- [ ] Check logs: `pm2 logs zimship-bot`
- [ ] Verify "QR code saved" message appears

### 6. Connect WhatsApp
- [ ] Download QR code: `scp root@IP:/opt/zimship-whatsapp-bot/qr-code.png ./`
- [ ] Open QR code image on computer
- [ ] Open WhatsApp on customer's phone
- [ ] Go to Settings → Linked Devices → Link a Device
- [ ] Scan QR code
- [ ] Wait for "Connected successfully!" message

### 7. Make Permanent
- [ ] Save PM2 config: `pm2 save`
- [ ] Setup auto-start: `pm2 startup`
- [ ] Run the command PM2 provides
- [ ] Verify: `pm2 status` shows "online"

### 8. Test Bot
- [ ] Send "Hi" from another phone to +353 87 195 4910
- [ ] Verify bot responds with welcome menu
- [ ] Test booking flow (optional but recommended)
- [ ] Check Supabase for saved data

---

## Post-Deployment (10 minutes)

### Security
- [ ] Change root password: `passwd`
- [ ] Setup firewall: `ufw allow 22 && ufw allow 3001 && ufw enable`
- [ ] Update system: `apt update && apt upgrade -y`

### Monitoring
- [ ] Check bot status: `pm2 status`
- [ ] View logs: `pm2 logs zimship-bot`
- [ ] Monitor resources: `pm2 monit`
- [ ] Verify database connection in Supabase

### Documentation
- [ ] Save server IP address
- [ ] Save root password (securely)
- [ ] Document any custom changes
- [ ] Share WhatsApp link with team

---

## Customer Activation

### Share WhatsApp Link
- [ ] Create link: `https://wa.me/353871954910?text=Hi`
- [ ] Add to website
- [ ] Add to Facebook page
- [ ] Add to Instagram bio
- [ ] Add to email signature
- [ ] Add to Google My Business

### Admin Panel Setup
- [ ] Login to admin panel
- [ ] Navigate to WhatsApp Bot Settings
- [ ] Verify pricing is correct
- [ ] Customize bot messages if needed
- [ ] Test admin controls

---

## Testing Checklist

### Basic Functions
- [ ] Bot responds to "Hi"
- [ ] Main menu displays correctly
- [ ] All menu options work (1-6)
- [ ] Bot ignores group messages

### Booking Flow
- [ ] Step 1: Sender details collected
- [ ] Step 2: Receiver details collected
- [ ] Step 3: Items selection works
- [ ] Step 4: Pricing calculated correctly
- [ ] Step 5: Booking saved to database

### Advanced Features
- [ ] Saved user details work (returning customers)
- [ ] Pricing calculator accurate
- [ ] Tracking number generated
- [ ] FAQ responses correct
- [ ] Contact info displayed

---

## Troubleshooting Reference

### QR Code Issues
```bash
# QR expired - restart and get new one
pm2 restart zimship-bot
pm2 logs zimship-bot
# Download new qr-code.png
```

### Bot Not Responding
```bash
# Check logs
pm2 logs zimship-bot --lines 50

# Restart bot
pm2 restart zimship-bot

# Check status
pm2 status
```

### Connection Lost
```bash
# Clear session and reconnect
rm -rf /opt/zimship-whatsapp-bot/whatsapp-session
pm2 restart zimship-bot
# Scan QR code again
```

---

## Success Criteria

✅ Bot responds within 2 seconds  
✅ All menu options work  
✅ Bookings save to database  
✅ Bot runs 24/7 without intervention  
✅ Auto-restarts on crash  
✅ Survives server reboot  

---

## Important Commands

```bash
# Status
pm2 status

# Logs
pm2 logs zimship-bot

# Restart
pm2 restart zimship-bot

# Stop
pm2 stop zimship-bot

# Monitor
pm2 monit

# Update code
cd /opt/zimship-whatsapp-bot
git pull
npm install
pm2 restart zimship-bot
```

---

## Contact Information

**Server IP:** `___________________`  
**Root Password:** `(stored securely)`  
**GitHub Repo:** `___________________`  
**Supabase URL:** `https://oncsaunsqtekwwbzvvyh.supabase.co`  
**Bot Phone:** `+353 87 195 4910`  

---

## Monthly Maintenance

- [ ] Check bot uptime: `pm2 info zimship-bot`
- [ ] Review logs for errors: `pm2 logs zimship-bot --err`
- [ ] Update system: `apt update && apt upgrade -y`
- [ ] Backup session: `tar -czf session-backup.tar.gz whatsapp-session/`
- [ ] Check database for bookings
- [ ] Verify pricing is current

---

## Notes

_Use this space for deployment-specific notes:_

```
Date deployed: ___________________
Deployed by: ___________________
Server location: ___________________
Any issues: ___________________
Custom changes: ___________________
```

---

**Deployment Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Last Updated:** ___________________

---

🎉 **Once all boxes are checked, your WhatsApp bot is LIVE!**
