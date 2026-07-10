# 🔒 Preventing WhatsApp Bot Disconnections

## Why Bots Disconnect After ~1 Week

### Primary Causes:
1. **WhatsApp Session Expiration** - Sessions expire after 7-14 days without proper keep-alive
2. **Phone Goes Offline** - The phone that scanned the QR must stay connected to internet
3. **Multiple Devices** - Having too many linked devices can cause disconnections
4. **Platform Restarts** - Railway/hosting platforms may restart services
5. **Session File Loss** - If session files aren't persisted, bot loses authentication

## ✅ Solutions Implemented

### 1. Keep-Alive Configuration (DONE)
```javascript
keepAliveIntervalMs: 10000,  // Ping WhatsApp every 10 seconds
markOnlineOnConnect: true,    // Mark bot as online
```

### 2. Session Persistence
Ensure your Railway service has a **persistent volume** mounted at `/app/data`:
- Go to Railway Dashboard → Your Service → Settings → Volumes
- Add volume: `/app/data` (if not already present)
- This ensures session files survive restarts

### 3. Environment Variables
Make sure these are set in Railway:
```env
SESSION_PATH=/app/data/whatsapp-session
PORT=3000
LOG_LEVEL=info
```

## 🛡️ Best Practices

### For the Phone That Scanned QR:
1. ✅ Keep the phone **connected to internet 24/7**
2. ✅ Don't log out of WhatsApp on that phone
3. ✅ Don't unlink the bot from WhatsApp settings
4. ✅ Keep WhatsApp app updated
5. ❌ Don't scan the QR with a phone you'll turn off

### For the Bot:
1. ✅ Use a dedicated WhatsApp Business number (recommended)
2. ✅ Monitor bot logs daily for connection issues
3. ✅ Set up Railway notifications for service restarts
4. ✅ Keep session files backed up

### For Railway Deployment:
1. ✅ Use persistent volumes for `/app/data`
2. ✅ Enable auto-restart on failure
3. ✅ Monitor service health
4. ✅ Consider upgrading to paid tier for better uptime

## 🔄 If Disconnection Still Happens

### Quick Recovery:
1. Check Railway logs for error messages
2. Look for "401" or "logged out" errors
3. If logged out, restart the service
4. Scan new QR code with the same phone
5. Verify connection success

### Long-term Fix:
Consider using **WhatsApp Business API** (official) instead of Baileys:
- More stable for production use
- No QR code scanning needed
- Better session management
- Costs money but worth it for business use

## 📊 Monitoring

### Check Bot Health:
```bash
# View Railway logs
railway logs

# Check if bot is connected
curl https://your-bot-url.railway.app/
```

### Signs of Impending Disconnection:
- Frequent "connection.update" events in logs
- "Bad MAC" or decryption errors
- Slow message responses
- QR code regeneration requests

## 🆘 Emergency Contacts

If bot goes down:
1. Check Railway dashboard first
2. Review logs for error codes
3. Restart service if needed
4. Re-scan QR if session lost
5. Contact Railway support if platform issue

## 📝 Maintenance Schedule

**Daily:**
- Check bot is responding to messages
- Monitor Railway service status

**Weekly:**
- Review logs for errors
- Verify session files exist
- Test message sending/receiving

**Monthly:**
- Update dependencies
- Review WhatsApp API changes
- Backup session files

## 🔗 Additional Resources

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [Railway Volumes Guide](https://docs.railway.app/reference/volumes)
- [WhatsApp Business API](https://business.whatsapp.com/products/business-platform)
