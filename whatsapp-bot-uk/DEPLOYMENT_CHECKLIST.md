# UK WhatsApp Bot - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Node.js v18+ installed
- [ ] npm or yarn installed
- [ ] Git installed (optional, for version control)
- [ ] Server/VPS access (if deploying remotely)
- [ ] UK phone number available for bot

### 2. Dependencies
- [ ] Run `npm install` successfully
- [ ] All packages installed without errors
- [ ] No security vulnerabilities (`npm audit`)

### 3. Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `SUPABASE_URL` configured
- [ ] `SUPABASE_ANON_KEY` configured
- [ ] `BOT_PHONE_NUMBER` set
- [ ] `ADMIN_PHONE_NUMBERS` set
- [ ] `SESSION_PATH` configured

### 4. Database
- [ ] Supabase project accessible
- [ ] `shipments` table exists
- [ ] Database connection tested
- [ ] Proper permissions configured

### 5. Testing
- [ ] Bot starts without errors
- [ ] QR code generates successfully
- [ ] WhatsApp connection works
- [ ] Welcome message sends correctly
- [ ] Booking flow completes end-to-end
- [ ] Tracking works
- [ ] Pricing displays correctly
- [ ] FAQ system works
- [ ] Database saves bookings

## 🚀 Deployment Steps

### Option 1: Local Deployment (Development/Testing)

#### Step 1: Install
```bash
cd whatsapp-bot-uk
npm install
```

#### Step 2: Configure
```bash
cp .env.example .env
# Edit .env with your credentials
```

#### Step 3: Start
```bash
npm start
```

#### Step 4: Connect
- Scan QR code from terminal or `qr-code.png`
- Verify connection message appears

#### Step 5: Test
- Send test message from another phone
- Complete a test booking
- Verify database entry

### Option 2: VPS Deployment (Production)

#### Step 1: Choose VPS Provider
- [ ] DigitalOcean
- [ ] Linode
- [ ] AWS EC2
- [ ] Google Cloud
- [ ] Azure
- [ ] Other: ___________

#### Step 2: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Git (optional)
sudo apt install git -y
```

#### Step 3: Upload Bot Files
```bash
# Option A: Git clone
git clone <your-repo-url>
cd whatsapp-bot-uk

# Option B: SCP upload
scp -r whatsapp-bot-uk user@server:/path/to/destination

# Option C: SFTP upload
# Use FileZilla or similar
```

#### Step 4: Install Dependencies
```bash
cd whatsapp-bot-uk
npm install --production
```

#### Step 5: Configure Environment
```bash
cp .env.example .env
nano .env  # or vim .env
# Fill in all values
```

#### Step 6: Start with PM2
```bash
pm2 start src/index.js --name uk-bot
pm2 save
pm2 startup
```

#### Step 7: Connect WhatsApp
```bash
# View QR code location
pm2 logs uk-bot

# Download qr-code.png
scp user@server:/path/to/whatsapp-bot-uk/qr-code.png ./

# Scan with WhatsApp
```

#### Step 8: Verify
```bash
# Check status
pm2 status

# View logs
pm2 logs uk-bot

# Test the bot
# Send message from another phone
```

### Option 3: Docker Deployment (Advanced)

#### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["node", "src/index.js"]
```

#### Step 2: Create docker-compose.yml
```yaml
version: '3.8'
services:
  uk-bot:
    build: .
    restart: always
    env_file:
      - .env
    volumes:
      - ./whatsapp-session:/app/whatsapp-session
```

#### Step 3: Deploy
```bash
docker-compose up -d
```

## 🔒 Security Checklist

### Environment Security
- [ ] `.env` file not committed to Git
- [ ] `.gitignore` includes `.env`
- [ ] `.gitignore` includes `whatsapp-session/`
- [ ] Strong Supabase credentials
- [ ] Admin phone numbers configured

### Server Security (VPS)
- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key authentication enabled
- [ ] Password authentication disabled
- [ ] Fail2ban installed
- [ ] Regular security updates enabled
- [ ] Non-root user created
- [ ] Proper file permissions set

### Application Security
- [ ] No sensitive data in logs
- [ ] Input validation enabled
- [ ] Error messages don't expose internals
- [ ] Session data encrypted
- [ ] Database connection secure

## 📊 Monitoring Setup

### PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Log Management
- [ ] Log rotation configured
- [ ] Log backup strategy in place
- [ ] Error alerting set up
- [ ] Performance monitoring enabled

### Database Monitoring
- [ ] Supabase dashboard access
- [ ] Query performance monitoring
- [ ] Storage usage tracking
- [ ] Backup schedule configured

## 🔄 Backup Strategy

### Session Backup
```bash
# Backup whatsapp-session folder daily
0 2 * * * tar -czf /backups/whatsapp-session-$(date +\%Y\%m\%d).tar.gz /path/to/whatsapp-bot-uk/whatsapp-session/
```

### Database Backup
- [ ] Supabase automatic backups enabled
- [ ] Manual backup schedule created
- [ ] Backup restoration tested

### Code Backup
- [ ] Git repository created
- [ ] Regular commits
- [ ] Remote repository (GitHub, GitLab, etc.)

## 📱 WhatsApp Setup

### Phone Number
- [ ] UK phone number acquired
- [ ] WhatsApp installed on phone
- [ ] Phone number verified in WhatsApp
- [ ] WhatsApp Business (optional) set up

### Connection
- [ ] QR code scanned successfully
- [ ] Connection confirmed
- [ ] Session saved
- [ ] Test message sent and received

### Settings
- [ ] Profile picture set (optional)
- [ ] Business name set (if using WhatsApp Business)
- [ ] About text set (optional)
- [ ] Auto-reply disabled (bot handles this)

## 🧪 Testing Checklist

### Functional Testing
- [ ] Welcome message works
- [ ] Main menu displays
- [ ] Booking flow completes
- [ ] Postcode validation works
- [ ] Route assignment correct
- [ ] Pricing calculation accurate
- [ ] Tracking works
- [ ] FAQ system works
- [ ] Session persistence works
- [ ] Database saves correctly

### Edge Cases
- [ ] Invalid postcode handled
- [ ] Restricted area detected
- [ ] Invalid email rejected
- [ ] Invalid phone rejected
- [ ] Cancel at any step works
- [ ] Menu navigation works
- [ ] Multiple users simultaneously

### Performance Testing
- [ ] Response time < 2 seconds
- [ ] Handles 10+ concurrent users
- [ ] No memory leaks
- [ ] Session cleanup works
- [ ] Database queries optimized

## 📞 Support Setup

### Documentation
- [ ] README.md reviewed
- [ ] SETUP_GUIDE.md available
- [ ] FEATURES.md documented
- [ ] Contact information updated

### Support Channels
- [ ] Support email configured
- [ ] Support phone numbers active
- [ ] Website link correct
- [ ] Admin contacts notified

## 🎯 Go-Live Checklist

### Final Checks
- [ ] All tests passed
- [ ] Bot running stable for 24 hours
- [ ] Database integration verified
- [ ] Backup systems in place
- [ ] Monitoring configured
- [ ] Documentation complete
- [ ] Team trained

### Launch
- [ ] Bot phone number shared with team
- [ ] Customer communication prepared
- [ ] Marketing materials updated
- [ ] Website updated with bot number
- [ ] Social media announcement ready

### Post-Launch
- [ ] Monitor for first 48 hours
- [ ] Check logs regularly
- [ ] Verify bookings in database
- [ ] Respond to any issues quickly
- [ ] Collect user feedback

## 📈 Maintenance Schedule

### Daily
- [ ] Check bot status (`pm2 status`)
- [ ] Review error logs
- [ ] Verify database connectivity
- [ ] Check booking count

### Weekly
- [ ] Review all bookings
- [ ] Check session folder size
- [ ] Update pricing if needed
- [ ] Review customer feedback

### Monthly
- [ ] Update dependencies (`npm update`)
- [ ] Security audit (`npm audit`)
- [ ] Backup verification
- [ ] Performance review
- [ ] Feature requests review

### Quarterly
- [ ] Major version updates
- [ ] Security patches
- [ ] Feature additions
- [ ] Documentation updates

## 🆘 Troubleshooting Guide

### Bot Won't Start
```bash
# Check logs
pm2 logs uk-bot

# Check Node.js version
node --version

# Reinstall dependencies
rm -rf node_modules
npm install
```

### WhatsApp Disconnects
```bash
# Check session folder
ls -la whatsapp-session/

# Restart bot
pm2 restart uk-bot

# Re-scan QR code if needed
```

### Database Errors
```bash
# Test connection
node -e "require('./src/services/database.js').initializeDatabase()"

# Check Supabase status
# Visit status.supabase.com
```

### High Memory Usage
```bash
# Check memory
pm2 monit

# Restart bot
pm2 restart uk-bot

# Check for memory leaks in code
```

## ✅ Deployment Complete!

Once all items are checked:
- [ ] Bot is live and operational
- [ ] Team is notified
- [ ] Customers can start booking
- [ ] Monitoring is active
- [ ] Support is ready

---

**Congratulations! Your UK WhatsApp bot is now deployed and ready to serve customers! 🎉**

**Support**: support@zimbabwe-shipping.co.uk | +44 7984 099041
