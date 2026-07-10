# ✅ Railway Deployment Checklist

## 🎯 Essential Configuration

### 1. Environment Variables
Verify these are set in Railway → Settings → Variables:

```env
# Required
PORT=3000
SESSION_PATH=/app/data/whatsapp-session

# Database (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional
LOG_LEVEL=info
NODE_ENV=production
```

### 2. Persistent Volume
**CRITICAL:** Without this, bot will disconnect on every restart!

- Go to: Railway → Your Service → Settings → Volumes
- Click: "New Volume"
- Mount Path: `/app/data`
- Size: 1 GB (minimum)

This ensures session files survive restarts.

### 3. Start Command
Railway → Settings → Deploy → Start Command:
```bash
npm start
```

### 4. Health Checks (Optional but Recommended)
Railway → Settings → Health Checks:
- Path: `/health`
- Interval: 60 seconds
- Timeout: 10 seconds
- Unhealthy threshold: 3

## 🔍 Verification Steps

### After Deployment:

#### Step 1: Check Deployment Status
- [ ] Railway shows "Active" status
- [ ] No build errors in logs
- [ ] Service is running

#### Step 2: Access Bot URL
- [ ] Visit: `https://your-bot.railway.app`
- [ ] Page loads successfully
- [ ] Shows QR code or connection status

#### Step 3: Scan QR Code
- [ ] QR code is visible
- [ ] Scan with WhatsApp
- [ ] Connection successful
- [ ] Page shows "connected" status

#### Step 4: Test Health Endpoint
```bash
curl https://your-bot.railway.app/health
```
- [ ] Returns JSON response
- [ ] Status is "connected"
- [ ] Shows uptime information

#### Step 5: Test Bot Functionality
- [ ] Send "hi" to bot number
- [ ] Bot responds with menu
- [ ] Try booking flow (option 1)
- [ ] Verify responses are correct

## 🚨 Common Issues & Fixes

### Issue 1: Bot Disconnects on Restart
**Cause:** No persistent volume
**Fix:** Add volume at `/app/data` (see step 2 above)

### Issue 2: QR Code Not Showing
**Cause:** Port misconfiguration
**Fix:** Ensure `PORT=3000` in environment variables

### Issue 3: Database Errors
**Cause:** Missing Supabase credentials
**Fix:** Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Issue 4: Bot Keeps Disconnecting
**Cause:** Phone went offline or multiple instances
**Fix:** 
- Keep phone online 24/7
- Ensure only ONE Railway service is running
- Check for duplicate deployments

### Issue 5: 401 Logged Out Error
**Cause:** Session invalidated
**Fix:**
1. Stop all Railway services
2. Clear volume (or delete and recreate)
3. Restart service
4. Scan new QR code

## 📊 Monitoring Setup

### 1. Railway Notifications
- Go to: Railway → Project Settings → Notifications
- Enable: "Deployment Failed"
- Enable: "Service Crashed"
- Add your email

### 2. Uptime Monitoring (Optional)
Use external service like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor: `https://your-bot.railway.app/health`

### 3. Log Monitoring
Set up log alerts for:
- "401" (logged out)
- "connection closed"
- "error"
- "failed"

## 🔄 Maintenance Schedule

### Daily (Automated)
- Railway health checks run automatically
- Bot sends keep-alive pings

### Weekly (Manual - 5 min)
- [ ] Check Railway dashboard
- [ ] Review logs for errors
- [ ] Verify uptime > 7 days
- [ ] Test bot with a message

### Monthly (Manual - 15 min)
- [ ] Update npm dependencies
- [ ] Review Railway usage/costs
- [ ] Backup session files
- [ ] Check for Baileys updates

## 💰 Cost Optimization

### Free Tier Limits:
- $5 free credit per month
- Enough for 1 bot running 24/7
- No credit card required

### Paid Tier Benefits:
- More resources
- Better uptime SLA
- Priority support
- Multiple environments

### Cost Monitoring:
- Check: Railway → Project → Usage
- Set up: Billing alerts
- Review: Monthly usage reports

## 🔐 Security Best Practices

### 1. Environment Variables
- [ ] Never commit `.env` files
- [ ] Use Railway's variable management
- [ ] Rotate keys periodically

### 2. Session Files
- [ ] Never share session files
- [ ] Keep volume private
- [ ] Backup encrypted

### 3. Access Control
- [ ] Limit Railway project access
- [ ] Use strong passwords
- [ ] Enable 2FA on Railway account

## 📈 Performance Optimization

### 1. Resource Allocation
- Default: 512 MB RAM, 0.5 vCPU
- Recommended: 1 GB RAM, 1 vCPU
- Adjust in: Railway → Settings → Resources

### 2. Region Selection
- Choose closest to your users
- Ireland bot → Europe region
- Check: Railway → Settings → Region

### 3. Logging Level
- Production: `LOG_LEVEL=info`
- Debugging: `LOG_LEVEL=debug`
- Minimal: `LOG_LEVEL=error`

## 🎯 Success Metrics

### Deployment is successful when:
- ✅ Service shows "Active" in Railway
- ✅ Bot URL loads correctly
- ✅ Health endpoint returns "connected"
- ✅ Bot responds to messages
- ✅ Uptime increases daily
- ✅ No errors in logs
- ✅ Session persists across restarts

## 📞 Support Resources

### Railway Support:
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Help: https://railway.app/help

### Bot Issues:
- Check: `PREVENT_DISCONNECTION.md`
- Review: `DISCONNECTION_FIX_SUMMARY.md`
- Reference: `QUICK_REFERENCE.md`

## 🚀 Deployment Commands

### Initial Deployment:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

### Update Deployment:
```bash
# Push changes
git push

# Railway auto-deploys from GitHub
# Or manually: railway up
```

### View Logs:
```bash
railway logs --tail 100
```

### Restart Service:
```bash
railway restart
```

## ✅ Final Checklist

Before going live:
- [ ] Persistent volume configured
- [ ] Environment variables set
- [ ] Bot connected and tested
- [ ] Health endpoint working
- [ ] Notifications enabled
- [ ] Documentation reviewed
- [ ] Backup plan in place
- [ ] Monitoring set up

---

**Last Updated:** May 13, 2026
**Railway Version:** Latest
**Bot Version:** 1.0.0
