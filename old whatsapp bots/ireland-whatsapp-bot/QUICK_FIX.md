# 🚨 QR Code Not Loading? Quick Fix Guide

## 1️⃣ Check Bot Status (30 seconds)

```bash
cd ireland-whatsapp-bot
node check-status.js
```

**Expected output:**
```
✅ Health check response:
{
  "status": "awaiting_scan",
  "hasQr": true,
  "connected": false,
  "uptime": 45
}

📱 Bot is waiting for QR scan
Visit http://localhost:3000 to scan the QR code
```

## 2️⃣ If Status Check Fails

### Option A: Bot Not Running
```bash
npm start
```

### Option B: Port Conflict
```bash
PORT=3001 npm start
```

### Option C: Database Issue
Check `.env` file has correct Supabase credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key-here
```

## 3️⃣ Test QR Server Independently

```bash
node test-qr-server.js
```

Visit http://localhost:3000 - you should see:
1. "Starting up" message
2. After 3 seconds: QR code appears
3. After 10 seconds: Success message

## 4️⃣ Railway Deployment Issues

### Check Health Endpoint
```bash
curl https://your-url.railway.app/health
```

### Check Railway Logs
1. Go to Railway dashboard
2. Click your service
3. Click "Deployments"
4. Check logs for errors

### Common Railway Issues

**Issue:** Service not responding
**Fix:** Restart service in Railway dashboard

**Issue:** Environment variables missing
**Fix:** Add in Railway → Settings → Variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NODE_ENV=production`

**Issue:** Build failed
**Fix:** Check Railway logs, usually missing dependencies

## 5️⃣ Nuclear Option (Reset Everything)

```bash
# Stop bot (Ctrl+C)

# Delete session
rm -rf session

# Reinstall dependencies
rm -rf node_modules
npm install

# Start fresh
npm start
```

## 🎯 Quick Checklist

- [ ] Bot is running (`npm start`)
- [ ] Port 3000 is available (or use different port)
- [ ] Environment variables are set (`.env` file)
- [ ] Database connection works
- [ ] Visit http://localhost:3000 shows QR page
- [ ] `/health` endpoint returns JSON

## 📞 Still Not Working?

1. **Run full diagnostics:**
   ```bash
   bash diagnose.sh  # Linux/Mac
   diagnose.bat      # Windows
   ```

2. **Read detailed guide:**
   - [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - All issues
   - [DEPLOY.md](DEPLOY.md) - Railway deployment
   - [FIXES_APPLIED.md](FIXES_APPLIED.md) - What was fixed

3. **Check these files:**
   - `.env` - Environment variables
   - `package.json` - Dependencies
   - Railway logs - Deployment errors

## 💡 Pro Tips

- **Local testing:** Use `node test-qr-server.js` first
- **Health check:** Always check `/health` endpoint first
- **Railway:** Free tier sleeps - upgrade to Hobby ($5/mo)
- **Session:** Delete `session` folder if connection issues
- **Logs:** Railway logs show everything - check there first

## 🔗 Quick Links

- Health check: http://localhost:3000/health
- QR page: http://localhost:3000
- Railway: https://railway.app
- Supabase: https://supabase.com

---

**Most Common Fix:** Just restart the bot! 🔄
```bash
# Ctrl+C to stop
npm start
```
