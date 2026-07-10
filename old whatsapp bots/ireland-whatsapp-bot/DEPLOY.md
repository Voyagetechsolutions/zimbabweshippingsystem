# Deployment Guide - Ireland WhatsApp Bot

## Quick Deploy to Railway

### 1. Prerequisites
- Railway account (https://railway.app)
- Supabase project with the bot tables set up
- GitHub repository with this code

### 2. Deploy Steps

#### A. Create New Service
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `ireland-whatsapp-bot` folder as the root

#### B. Configure Environment Variables
In Railway, go to your service → Variables tab and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
BOT_NAME=Zimbabwe Shipping Ireland
SESSION_PATH=./session
NODE_ENV=production
```

**Important:** Railway automatically sets `PORT` - don't override it!

#### C. Configure Build Settings
Railway should auto-detect the settings from `railway.json`, but verify:
- **Build Command:** `npm install`
- **Start Command:** `node bot.js`
- **Health Check Path:** `/health`

#### D. Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Check the logs for any errors

### 3. Get Your Public URL

1. In Railway, go to your service
2. Click "Settings" tab
3. Scroll to "Networking"
4. Click "Generate Domain"
5. Copy the URL (e.g., `ireland-bot-production.up.railway.app`)

### 4. Scan QR Code

1. Visit your Railway URL in a browser
2. You should see "Waiting for QR scan" with a QR code
3. Open WhatsApp on your phone
4. Go to Settings → Linked Devices
5. Tap "Link a Device"
6. Scan the QR code

### 5. Verify Connection

After scanning, the page should show:
```
✅ Bot is connected and ready
Phone: 353871234567@s.whatsapp.net
```

## Troubleshooting Deployment

### QR Code Not Showing

**Check 1: Is the service running?**
```bash
curl https://your-url.railway.app/health
```

Expected response:
```json
{
  "status": "awaiting_scan",
  "updated": 1234567890,
  "hasQr": true,
  "connected": false,
  "uptime": 45
}
```

**Check 2: View Railway logs**
1. Go to your service in Railway
2. Click "Deployments" tab
3. Click the latest deployment
4. Check for errors in the logs

Common errors:
- `Cannot find module` - Build failed, check package.json
- `ECONNREFUSED` - Database connection failed, check Supabase credentials
- `Port already in use` - Restart the service

**Check 3: Test locally first**
```bash
cd ireland-whatsapp-bot
npm install
node test-qr-server.js
```

Visit http://localhost:3000 - you should see the QR page.

### Bot Keeps Disconnecting

**Solution 1: Upgrade Railway Plan**
Free tier services sleep after inactivity. Upgrade to Hobby plan ($5/month) for always-on service.

**Solution 2: Keep-Alive Ping**
Set up a cron job to ping `/health` every 5 minutes:
```bash
*/5 * * * * curl https://your-url.railway.app/health
```

### Session Issues

If the bot was connected but now won't start:

1. In Railway, go to your service
2. Click "Data" tab (if available) or use Railway CLI
3. Delete the `session` folder
4. Restart the service
5. Scan QR code again

### Database Connection Issues

**Check Supabase credentials:**
```bash
# Test connection
node -e "import('./utils/database.js').then(m => m.initDatabase()).then(() => console.log('✅ DB OK')).catch(e => console.error('❌', e))"
```

**Verify tables exist:**
- `bot_settings`
- `collection_schedules`
- `pricing_tiers`
- `bookings`

## Monitoring

### Health Check
Visit: `https://your-url.railway.app/health`

### Railway Logs
Real-time logs in Railway dashboard show:
- Incoming messages
- Outgoing responses
- Connection status
- Errors

### Test the Bot
Send "hi" to the bot number from WhatsApp.

Expected response:
```
Hello! 👋

🇮🇪 Zimbabwe Shipping - Ireland

📢 Collections commence in August 2026

Main Menu:
1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
...
```

## Production Checklist

- [ ] Environment variables set correctly
- [ ] Health check endpoint responding
- [ ] QR code displays and can be scanned
- [ ] Bot responds to "hi" message
- [ ] Booking flow works (send "1")
- [ ] Database connection working
- [ ] Railway service on paid plan (for 24/7 uptime)
- [ ] Monitoring/alerts set up

## Updating the Bot

1. Push changes to GitHub
2. Railway auto-deploys (if enabled)
3. Or manually trigger deploy in Railway dashboard
4. Bot will reconnect automatically (session preserved)

## Backup Session

To backup your WhatsApp session:

1. Download the `session` folder from Railway
2. Store securely (contains authentication keys)
3. To restore: upload to Railway and restart

## Support

If you're still having issues:
1. Check Railway status: https://status.railway.app
2. Check Supabase status: https://status.supabase.com
3. Review logs for specific error messages
4. See TROUBLESHOOTING.md for common issues
