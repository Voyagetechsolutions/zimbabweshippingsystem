# 🚀 Railway Deployment Guide - Ireland WhatsApp Bot

## Quick Deploy to Railway

### 1. Prerequisites
- Railway account (sign up at [railway.app](https://railway.app))
- Git repository with this bot code
- WhatsApp phone number for scanning QR code

### 2. Deploy Steps

#### Option A: Deploy from GitHub (Recommended)
1. Push this code to a GitHub repository
2. Go to [railway.app](https://railway.app) and login
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect and deploy

#### Option B: Deploy with Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

### 3. Environment Variables
Set these in Railway Dashboard → Project → Variables:

```env
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA
BOT_NAME=Zimbabwe Shipping Ireland
BOT_PHONE_NUMBER=+353_your_number_here
ADMIN_PHONE_NUMBERS=+353123456789,+353987654321
SESSION_PATH=./whatsapp-session
NODE_ENV=production
```

### 4. Connect WhatsApp
1. After deployment, check Railway logs for QR code
2. Scan QR code with WhatsApp mobile app
3. Bot will connect and start working

### 5. Monitor Deployment
- View logs: Railway Dashboard → Project → Deployments → View Logs
- Check status: Railway Dashboard → Project → Overview

## 🔧 Deployment Files Created

- `railway.json` - Railway configuration
- `Dockerfile` - Container setup
- `nixpacks.toml` - Nixpacks build config
- `.dockerignore` - Files to exclude from build

## 📱 Post-Deployment

1. **QR Code Access**: Check Railway logs for QR code or download qr-code.png
2. **WhatsApp Scan**: Use WhatsApp mobile → Settings → Linked Devices → Link Device
3. **Test Bot**: Send a message to verify it's working
4. **Monitor**: Keep an eye on Railway logs for any issues

## 🚨 Important Notes

- **Persistent Storage**: Railway provides ephemeral storage. WhatsApp session will persist during deployment but may reset on container restart
- **QR Code**: You'll need to re-scan QR code if the container restarts and session is lost
- **Logs**: Always check Railway logs if the bot isn't responding
- **Scaling**: Railway auto-scales, but WhatsApp bots work best with single instance

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI](https://docs.railway.app/develop/cli)
- [Project Dashboard](https://railway.app/dashboard)

## 🆘 Troubleshooting

### Bot Not Responding
1. Check Railway logs for errors
2. Verify environment variables are set
3. Ensure QR code was scanned successfully
4. Check Supabase connection

### Connection Issues
1. Bot will auto-reconnect up to 5 times
2. If it fails, check logs for specific error
3. May need to re-scan QR code

### Session Lost
1. Container restart may clear session
2. Re-scan QR code to reconnect
3. Consider using persistent volume for production

---

**Ready to deploy? Follow the steps above and your Ireland WhatsApp bot will be live on Railway! 🇮🇪🚀**