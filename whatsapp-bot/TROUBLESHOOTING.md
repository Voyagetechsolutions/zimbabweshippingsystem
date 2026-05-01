# 🔧 WhatsApp Bot Troubleshooting Guide

## Bot Not Responding to Messages

If the bot is not responding when customers send "hi" or any message, follow these steps:

---

## 🎯 Quick Diagnosis

### Step 1: Test the Bot

```bash
cd whatsapp-bot
node test-bot.js
```

This will:
- ✅ Check if bot can connect
- ✅ Show QR code if needed
- ✅ Test message receiving
- ✅ Test message sending

**Send a test message from another phone and see if the bot responds.**

---

## 🔍 Common Issues & Solutions

### Issue 1: Bot Not Connected

**Symptoms:**
- No QR code shown
- Connection keeps closing
- "Session logged out" errors

**Solution:**
```bash
# Clear session and reconnect
rm -rf whatsapp-session/
node test-bot.js
# Scan the new QR code
```

---

### Issue 2: Bot Connected But Not Responding

**Symptoms:**
- Bot shows "Connected Successfully"
- Messages are received (shown in logs)
- But no response sent

**Solution A: Use Simple Bot**
```bash
# Stop current bot
pm2 stop zimship-bot

# Start simple bot
pm2 start src/index-simple.js --name zimship-bot-simple
pm2 logs zimship-bot-simple

# Send "hi" from another phone
# Simple bot responds to EVERYTHING
```

**Solution B: Check Logs**
```bash
pm2 logs zimship-bot --lines 100

# Look for:
# - "📨 Received message" (bot is receiving)
# - "✅ Sent response" (bot is sending)
# - Any error messages
```

---

### Issue 3: QR Code Expired

**Symptoms:**
- QR code shown but can't scan
- "QR code expired" message

**Solution:**
```bash
# Restart bot to get new QR
pm2 restart zimship-bot
pm2 logs zimship-bot

# Scan within 60 seconds
```

---

### Issue 4: Multiple Bot Instances

**Symptoms:**
- Bot responds sometimes
- Duplicate messages
- Connection keeps dropping

**Solution:**
```bash
# Check running instances
pm2 list

# Stop all bot instances
pm2 stop all
pm2 delete all

# Start only one instance
pm2 start src/index.js --name zimship-bot
```

---

### Issue 5: Group Messages

**Symptoms:**
- Bot works in private chats
- But not in groups

**This is intentional!** The bot ignores group messages by design.

To enable group responses, edit `src/handlers/messageHandler.js`:

```javascript
// Find this line:
if (rawJid.endsWith('@g.us')) {
  console.log('⏭️  Skipping group message');
  return;
}

// Comment it out:
// if (rawJid.endsWith('@g.us')) {
//   console.log('⏭️  Skipping group message');
//   return;
// }
```

---

### Issue 6: LID Format Issues

**Symptoms:**
- Bot receives messages
- But can't send responses
- Error: "Invalid JID"

**Solution:**
The bot already handles LID format. If still having issues:

```bash
# Update Baileys to latest version
cd whatsapp-bot
npm update @whiskeysockets/baileys
pm2 restart zimship-bot
```

---

## 🚀 Fresh Start (Nuclear Option)

If nothing works, start completely fresh:

### Step 1: Backup Current Session (Optional)
```bash
cd whatsapp-bot
tar -czf session-backup-$(date +%Y%m%d).tar.gz whatsapp-session/
```

### Step 2: Clean Everything
```bash
# Stop bot
pm2 stop zimship-bot
pm2 delete zimship-bot

# Remove session
rm -rf whatsapp-session/

# Remove node modules
rm -rf node_modules/
rm package-lock.json

# Fresh install
npm install
```

### Step 3: Test with Simple Bot
```bash
# Run test bot
node test-bot.js

# Scan QR code
# Send test message
# Verify it responds
```

### Step 4: Start Production Bot
```bash
# If test works, start main bot
pm2 start src/index.js --name zimship-bot
pm2 save
pm2 logs zimship-bot
```

---

## 🧪 Testing Checklist

Use this to verify bot is working:

- [ ] Bot connects without errors
- [ ] QR code scans successfully
- [ ] "Connected Successfully" message appears
- [ ] Send "hi" from another phone
- [ ] Bot responds within 2 seconds
- [ ] Response includes main menu
- [ ] Can select menu options (1-6)
- [ ] Booking flow starts when selecting "1"

---

## 📊 Diagnostic Commands

### Check Bot Status
```bash
pm2 status
```

### View Live Logs
```bash
pm2 logs zimship-bot
```

### View Last 100 Lines
```bash
pm2 logs zimship-bot --lines 100
```

### View Only Errors
```bash
pm2 logs zimship-bot --err
```

### Check Process Info
```bash
pm2 info zimship-bot
```

### Monitor Resources
```bash
pm2 monit
```

---

## 🔍 Log Analysis

### Good Logs (Bot Working)
```
✅ WhatsApp Bot Connected Successfully!
📨 Received message from 353871234567@s.whatsapp.net: "hi"
👋 Sending welcome message to user
✅ Sent response to 353871234567@s.whatsapp.net
```

### Bad Logs (Bot Not Working)
```
❌ Connection closed
⚠️  Session logged out
❌ Error sending message: Invalid JID
⚠️  No message text extracted
```

---

## 🆘 Still Not Working?

### Option 1: Use Simple Bot Permanently

The simple bot (`src/index-simple.js`) responds to EVERY message with the main menu. It's bulletproof.

```bash
pm2 stop zimship-bot
pm2 delete zimship-bot
pm2 start src/index-simple.js --name zimship-bot
pm2 save
```

### Option 2: Check Environment Variables

```bash
cd whatsapp-bot
cat .env

# Verify these are set:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# BOT_NAME=Zimbabwe Shipping Ireland
# SESSION_PATH=./whatsapp-session
```

### Option 3: Check Node Version

```bash
node --version
# Should be v18.x.x or higher

# If not, update Node.js:
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Option 4: Check Permissions

```bash
# Make sure bot can write to session folder
cd whatsapp-bot
chmod -R 755 whatsapp-session/
chown -R $USER:$USER whatsapp-session/
```

---

## 📱 Test from Customer Perspective

1. **Save bot number** in your phone: +353 87 195 4910
2. **Open WhatsApp** on your phone
3. **Send "hi"** to the bot number
4. **Wait 2 seconds**
5. **Should receive:** Welcome message with menu

If you don't receive a response:
- Check bot logs: `pm2 logs zimship-bot`
- Look for "Received message" in logs
- Look for any error messages

---

## 🔧 Advanced Debugging

### Enable Verbose Logging

Edit `src/index.js`:

```javascript
// Change this:
const logger = pino({ level: 'info' });

// To this:
const logger = pino({ level: 'debug' });
```

Then restart:
```bash
pm2 restart zimship-bot
pm2 logs zimship-bot
```

### Test Message Sending Manually

```bash
node -e "
import makeWASocket from '@whiskeysockets/baileys';
// ... test code
"
```

---

## 📞 Emergency Fallback

If bot completely fails and you need immediate solution:

### Option 1: Manual Responses
Temporarily respond manually while fixing bot.

### Option 2: Use Twilio Bot
The project includes a Twilio-based bot as backup:

```bash
pm2 start src/index-twilio.js --name zimship-bot-twilio
```

(Requires Twilio account and configuration)

---

## ✅ Success Criteria

Bot is working when:

1. ✅ Connects without errors
2. ✅ Shows "Connected Successfully"
3. ✅ Responds to "hi" within 2 seconds
4. ✅ Shows main menu with 6 options
5. ✅ Can start booking flow
6. ✅ Saves data to database

---

## 📚 Related Files

- `test-bot.js` - Connection test script
- `src/index-simple.js` - Simplified bot (always responds)
- `src/index.js` - Full-featured bot
- `src/handlers/messageHandler.js` - Message handling logic

---

## 💡 Prevention Tips

1. **Don't run multiple instances** - Only one bot per WhatsApp number
2. **Keep session backed up** - Backup `whatsapp-session/` folder weekly
3. **Monitor logs daily** - Check for errors: `pm2 logs zimship-bot --err`
4. **Update regularly** - Keep Baileys library updated
5. **Test after changes** - Always test with `node test-bot.js` first

---

## 🎯 Quick Fix Commands

```bash
# Quick restart
pm2 restart zimship-bot

# Fresh start
pm2 stop zimship-bot && rm -rf whatsapp-session/ && pm2 start zimship-bot

# Switch to simple bot
pm2 stop zimship-bot && pm2 start src/index-simple.js --name zimship-bot

# View logs
pm2 logs zimship-bot --lines 50

# Test connection
node test-bot.js
```

---

**Need more help?** Check the logs first - they usually tell you exactly what's wrong!

```bash
pm2 logs zimship-bot --lines 100
```
