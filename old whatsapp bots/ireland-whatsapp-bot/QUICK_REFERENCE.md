# 🚀 Quick Reference - Ireland WhatsApp Bot

## 📊 Check Bot Status

### Web Interface
```
https://your-bot.railway.app
```
Shows: Connection status, uptime, QR code (if needed)

### Health Check API
```bash
curl https://your-bot.railway.app/health
```

### Health Check Script
```bash
npm run health:prod
```

## 🔧 Common Commands

### Start Bot Locally
```bash
npm start
```

### Check Health (Local)
```bash
npm run health
```

### Check Health (Production)
```bash
npm run health:prod
```

### View Railway Logs
```bash
railway logs --tail 100
```

## 🚨 Troubleshooting

### Bot Disconnected?
1. Check Railway logs: `railway logs`
2. Look for "401" or "logged out" errors
3. Restart service in Railway dashboard
4. Scan new QR code

### Bot Not Responding?
1. Check health: `npm run health:prod`
2. Verify status is "connected"
3. Test by sending "hi" to bot number
4. Check Railway logs for errors

### QR Code Not Showing?
1. Wait 30 seconds after restart
2. Refresh the web page
3. Check Railway logs for startup errors
4. Verify PORT environment variable is set

## 📈 Monitoring Checklist

### Daily (30 seconds)
- [ ] Visit bot URL
- [ ] Verify "connected" status
- [ ] Check uptime is increasing

### Weekly (5 minutes)
- [ ] Run health check script
- [ ] Review Railway logs
- [ ] Test bot with a message
- [ ] Verify phone is online

### Monthly (15 minutes)
- [ ] Update dependencies
- [ ] Review Baileys updates
- [ ] Backup session files
- [ ] Check Railway usage/costs

## 🎯 Key Metrics

### Healthy Bot:
- ✅ Status: "connected"
- ✅ Uptime: Increasing daily
- ✅ Response time: < 2 seconds
- ✅ No errors in logs

### Warning Signs:
- ⚠️ Uptime resets to 0
- ⚠️ Status: "awaiting_scan"
- ⚠️ Frequent reconnections
- ⚠️ "Bad MAC" errors in logs

### Critical Issues:
- 🚨 Status: "disconnected"
- 🚨 401 errors in logs
- 🚨 Bot not responding
- 🚨 QR code keeps regenerating

## 📞 Emergency Contacts

### Railway Issues:
- Dashboard: https://railway.app
- Support: https://railway.app/help

### WhatsApp Issues:
- Check phone is online
- Verify WhatsApp is updated
- Don't logout on phone

## 🔗 Important URLs

### Production Bot:
```
https://your-bot.railway.app
```

### Railway Dashboard:
```
https://railway.app/project/your-project-id
```

### Health Endpoint:
```
https://your-bot.railway.app/health
```

## 💡 Pro Tips

1. **Bookmark the bot URL** - Check it daily
2. **Set up Railway notifications** - Get alerts on restarts
3. **Use a dedicated phone** - Don't use your personal phone
4. **Keep phone charged** - Use a charger, not battery
5. **Monitor uptime** - Should reach 7+ days consistently

## 📚 Documentation

- `PREVENT_DISCONNECTION.md` - Prevention guide
- `DISCONNECTION_FIX_SUMMARY.md` - Fix details
- `README.md` - Setup instructions
- `FEATURES.md` - Feature list

## 🎓 Understanding Uptime

### Process Uptime:
How long the Railway service has been running since last restart.

### Connection Uptime:
How long the WhatsApp connection has been active.

**Goal:** Connection uptime should match process uptime (no disconnections).

## ✅ Success Criteria

Your bot is healthy when:
- ✅ Connection uptime > 7 days
- ✅ No 401 errors in logs
- ✅ Responds to messages instantly
- ✅ Health check returns "connected"
- ✅ Uptime increases every day

---

**Keep this file handy for quick reference!**
