# Session 401 Error - Recovery Guide

## What Happened?

Your bot received a **401 status code** from WhatsApp, which means:
```
Connection closed. Status: 401
Should reconnect: false
Bot logged out. Stopping...
```

This indicates the WhatsApp session has been **logged out or invalidated**.

## Why Does This Happen?

### Common Causes:

1. **Manual Logout**
   - Someone logged out the bot from the WhatsApp device
   - "Linked Devices" was used to remove the bot

2. **Multiple Instances**
   - The same session was used on another server/instance
   - Railway restarted and created duplicate connections

3. **WhatsApp Security**
   - WhatsApp detected suspicious activity
   - Too many connection attempts
   - Session was flagged for review

4. **Session Expiration**
   - Session credentials became invalid over time
   - WhatsApp rotated security keys

## Immediate Recovery Steps

### Step 1: Clear the Session
The session is now invalid and must be cleared.

**Option A: Delete Session Files (Recommended)**
```bash
# In Railway, you need to clear the /app/data/whatsapp-session directory
# This will happen automatically on restart since it's ephemeral storage
```

**Option B: Clear PostgreSQL Session (if using DB storage)**
```sql
-- Connect to your PostgreSQL database
-- Delete session data
DELETE FROM whatsapp_sessions WHERE id = 'your_session_id';
```

### Step 2: Restart the Bot
```bash
# In Railway dashboard:
# 1. Go to your bot service
# 2. Click "Restart"
# 3. Wait for bot to start
```

### Step 3: Generate New QR Code
After restart, the bot will generate a fresh QR code:
```
1. Check Railway logs for QR code URL
2. Open: https://your-app.railway.app/qr-code
3. Download the QR code
4. Scan with WhatsApp within 60 seconds
```

### Step 4: Verify Connection
```
✅ Look for: "WhatsApp Bot Connected Successfully!"
✅ Verify: "Session saved - no QR code needed on restart!"
✅ Check: No 401 errors in logs
```

## Prevention Strategies

### 1. Avoid Multiple Instances
**Problem**: Running the bot on multiple servers with the same session causes 401 errors.

**Solution**:
- Only run ONE instance of the bot at a time
- If using Railway, ensure only one deployment is active
- Don't run local dev and production simultaneously

### 2. Handle Railway Restarts
**Problem**: Railway restarts can create temporary duplicate connections.

**Solution**: The bot already includes connection management:
```javascript
// Automatic reconnection with limits
MAX_RECONNECT_ATTEMPTS = 5
RECONNECT_DELAY = 5000ms
```

### 3. Monitor Session Health
**Problem**: Sessions can expire without warning.

**Solution**: Check logs regularly for:
- Connection status messages
- Unusual disconnection patterns
- 401 error codes

### 4. Proper Logout Handling
**Problem**: Improper shutdowns can corrupt sessions.

**Solution**: The bot includes graceful shutdown:
```javascript
process.on('SIGTERM', () => {
  sock.end();
  process.exit(0);
});
```

## Advanced Troubleshooting

### Check if Session Files Exist
```bash
# In Railway logs, look for:
"📁 Session directory exists: /app/data/whatsapp-session"
```

### Verify Database Connection
```bash
# Check if DATABASE_URL is set correctly
echo $DATABASE_URL
```

### Review Recent Activity
```bash
# Check Railway logs for patterns before 401:
- Multiple connection attempts?
- Unusual error messages?
- Network issues?
```

## When to Contact Support

Contact the development team if:

1. **401 errors persist** after following recovery steps
2. **QR code scanning fails** repeatedly
3. **Session invalidates** within hours of connection
4. **Multiple 401 errors** per day
5. **WhatsApp account** shows unusual activity

## Technical Details

### What is a 401 Error?

HTTP 401 = Unauthorized. In WhatsApp context:
- Session credentials are invalid
- Authentication failed
- Bot needs to re-authenticate

### Session Storage

The bot stores session in:
```
/app/data/whatsapp-session/
├── creds.json          # Main credentials
├── app-state-*.json    # App state sync
├── pre-key-*.json      # Encryption keys
└── session-*.json      # Session data
```

### Baileys Disconnect Reasons

```javascript
DisconnectReason.loggedOut = 401  // Manual logout
DisconnectReason.restartRequired = 515  // Restart needed
DisconnectReason.connectionClosed = 428  // Connection lost
```

## Recovery Checklist

- [ ] Confirmed 401 error in logs
- [ ] Stopped all bot instances
- [ ] Cleared session files/database
- [ ] Restarted bot service
- [ ] Generated new QR code
- [ ] Scanned QR code successfully
- [ ] Verified "Connected Successfully" message
- [ ] Tested message handling
- [ ] Monitored for 1 hour (no 401 errors)
- [ ] Documented incident (date, time, cause)

## Prevention Checklist

- [ ] Only one bot instance running
- [ ] Railway deployment is stable
- [ ] No local dev instances active
- [ ] Session backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Team knows recovery procedure

## Quick Reference

| Issue | Solution |
|-------|----------|
| 401 error | Clear session, restart, scan new QR |
| Multiple instances | Stop all but one |
| Session corruption | Delete session files |
| QR scan fails | Wait 60s, generate new QR |
| Repeated 401s | Check WhatsApp account status |

## Automation (Future Enhancement)

Consider adding automatic session recovery:

```javascript
// Detect 401 and auto-clear session
if (statusCode === DisconnectReason.loggedOut) {
  console.log('🔄 Session logged out - clearing files...');
  await clearSessionFiles();
  console.log('📱 Please scan new QR code');
}
```

## Summary

**401 errors are recoverable** but require manual intervention:

1. ✅ Clear the invalid session
2. ✅ Restart the bot
3. ✅ Scan a new QR code
4. ✅ Verify connection
5. ✅ Monitor for stability

**This is not a bug** - it's WhatsApp's security mechanism working as intended.

---

**Last Updated**: April 21, 2026  
**Status**: Session Recovery Required  
**Action**: Follow recovery steps above
