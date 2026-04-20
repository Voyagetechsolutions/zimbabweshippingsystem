# Production Deployment Guide

Complete guide for deploying the WhatsApp bot to production.

## 🎯 Deployment Options

### Option 1: VPS/Cloud Server (Recommended)

Best for: Full control, reliability, scalability

**Providers:**
- DigitalOcean ($5-10/month)
- AWS EC2 (Free tier available)
- Google Cloud Compute Engine
- Linode
- Vultr

### Option 2: Dedicated Server

Best for: High volume, enterprise use

### Option 3: Local Server

Best for: Testing, small scale operations

## 🚀 VPS Deployment (Step-by-Step)

### 1. Create a VPS

**DigitalOcean Example:**
1. Sign up at digitalocean.com
2. Create a new Droplet
3. Choose Ubuntu 22.04 LTS
4. Select $5/month plan (1GB RAM)
5. Add SSH key
6. Create Droplet

### 2. Connect to Your Server

```bash
ssh root@your_server_ip
```

### 3. Install Node.js

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 4. Install Git

```bash
apt install -y git
```

### 5. Clone Your Repository

```bash
# Create app directory
mkdir -p /opt/apps
cd /opt/apps

# Clone your repo (or upload files)
git clone https://github.com/your-repo/whatsapp-bot.git
cd whatsapp-bot

# Or upload via SCP
# scp -r whatsapp-bot root@your_server_ip:/opt/apps/
```

### 6. Install Dependencies

```bash
npm install --production
```

### 7. Configure Environment

```bash
# Create .env file
nano .env
```

Paste your configuration:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key_here
BOT_NAME=Zimbabwe Shipping Ireland
BOT_PHONE_NUMBER=+353123456789
ADMIN_PHONE_NUMBERS=+353123456789
SESSION_PATH=./whatsapp-session
NODE_ENV=production
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### 8. Install PM2

```bash
npm install -g pm2
```

### 9. Start the Bot

```bash
# Start with PM2
pm2 start src/index.js --name zimbabwe-bot

# View logs to get QR code
pm2 logs zimbabwe-bot
```

### 10. Scan QR Code

1. The QR code will appear in the logs
2. Scan it with WhatsApp on your phone
3. Wait for "Connected Successfully" message

### 11. Configure PM2 Startup

```bash
# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Copy and run the command it shows
```

### 12. Configure Firewall

```bash
# Allow SSH
ufw allow 22

# Enable firewall
ufw enable

# Check status
ufw status
```

## 🔧 PM2 Configuration

### Create ecosystem.config.js

```bash
nano ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'zimbabwe-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

Start with config:
```bash
pm2 start ecosystem.config.js
```

## 📊 Monitoring

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs zimbabwe-bot

# View only errors
pm2 logs zimbabwe-bot --err

# Monitor resources
pm2 monit

# Restart
pm2 restart zimbabwe-bot

# Stop
pm2 stop zimbabwe-bot

# Delete
pm2 delete zimbabwe-bot
```

### Set Up Log Rotation

```bash
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## 🔄 Auto-Updates

### Create Update Script

```bash
nano /opt/apps/whatsapp-bot/update.sh
```

Add:
```bash
#!/bin/bash
cd /opt/apps/whatsapp-bot
git pull origin main
npm install --production
pm2 restart zimbabwe-bot
echo "Bot updated successfully!"
```

Make executable:
```bash
chmod +x update.sh
```

Run updates:
```bash
./update.sh
```

## 🔐 Security Best Practices

### 1. Create Non-Root User

```bash
# Create user
adduser botuser

# Add to sudo group
usermod -aG sudo botuser

# Switch to user
su - botuser
```

### 2. Secure SSH

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Change:
```
PermitRootLogin no
PasswordAuthentication no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Install Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Keep System Updated

```bash
# Create update script
sudo nano /etc/cron.weekly/system-update
```

Add:
```bash
#!/bin/bash
apt update && apt upgrade -y
apt autoremove -y
```

Make executable:
```bash
sudo chmod +x /etc/cron.weekly/system-update
```

## 📈 Performance Optimization

### 1. Increase Node.js Memory

```bash
pm2 start src/index.js --name zimbabwe-bot --max-memory-restart 500M
```

### 2. Enable Clustering (if needed)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'zimbabwe-bot',
    script: 'src/index.js',
    instances: 2,  // Run 2 instances
    exec_mode: 'cluster'
  }]
};
```

### 3. Optimize Database Queries

- Use connection pooling
- Cache frequently accessed data
- Index important fields

## 🔔 Alerts & Notifications

### Set Up PM2 Notifications

```bash
# Install module
pm2 install pm2-slack

# Configure
pm2 set pm2-slack:slack_url https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Email Alerts

Create monitoring script:
```bash
nano /opt/apps/whatsapp-bot/monitor.sh
```

Add:
```bash
#!/bin/bash
if ! pm2 status | grep -q "online"; then
    echo "Bot is down!" | mail -s "WhatsApp Bot Alert" admin@yourdomain.com
fi
```

Add to crontab:
```bash
crontab -e
```

Add:
```
*/5 * * * * /opt/apps/whatsapp-bot/monitor.sh
```

## 🔄 Backup Strategy

### 1. Backup Session Data

```bash
# Create backup script
nano /opt/apps/whatsapp-bot/backup.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/whatsapp-bot"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/session_$DATE.tar.gz whatsapp-session/

# Keep only last 7 backups
ls -t $BACKUP_DIR/session_*.tar.gz | tail -n +8 | xargs rm -f
```

Make executable:
```bash
chmod +x backup.sh
```

Add to crontab (daily at 2 AM):
```bash
crontab -e
```

Add:
```
0 2 * * * /opt/apps/whatsapp-bot/backup.sh
```

### 2. Backup to Cloud

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure (follow prompts)
rclone config

# Add to backup script
rclone copy $BACKUP_DIR remote:whatsapp-bot-backups
```

## 🐳 Docker Deployment (Alternative)

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Create session directory
RUN mkdir -p whatsapp-session

# Start bot
CMD ["node", "src/index.js"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  whatsapp-bot:
    build: .
    container_name: zimbabwe-bot
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./whatsapp-session:/app/whatsapp-session
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. Deploy with Docker

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📱 Multiple Instances

To run multiple bots (different numbers):

```bash
# Bot 1
pm2 start src/index.js --name bot-ireland-1 -- --session ./session1

# Bot 2
pm2 start src/index.js --name bot-ireland-2 -- --session ./session2
```

## 🔍 Troubleshooting Production Issues

### Bot Won't Start

```bash
# Check logs
pm2 logs zimbabwe-bot --lines 100

# Check if port is in use
netstat -tulpn | grep node

# Check permissions
ls -la whatsapp-session/
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart with memory limit
pm2 restart zimbabwe-bot --max-memory-restart 500M
```

### Connection Issues

```bash
# Check internet
ping google.com

# Check DNS
nslookup supabase.co

# Test Supabase connection
curl https://your-project.supabase.co
```

## 📊 Health Checks

Create health check endpoint:

```javascript
// Add to src/index.js
import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  }
});

server.listen(3000);
```

Monitor with:
```bash
curl http://localhost:3000/health
```

## 🎯 Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] PM2 configured and running
- [ ] Startup script enabled
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Monitoring set up
- [ ] Logs rotating
- [ ] Security hardened
- [ ] QR code scanned
- [ ] Bot responding to messages
- [ ] Test booking completed
- [ ] Tracking tested
- [ ] Admin notified

## 📞 Support

For production issues:
- Check logs first: `pm2 logs zimbabwe-bot`
- Review this guide
- Check server resources: `pm2 monit`
- Verify database connection
- Test WhatsApp connection

---

**Your bot is now production-ready! 🚀**
