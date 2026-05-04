# Troubleshooting Guide - Ireland WhatsApp Bot

## QR Code Not Loading

If you see "Waiting for QR scan" but the QR code image is broken or not showing:

### 1. Check if the bot is running
```bash
node check-status.js
```

This will tell you:
- ✅ Bot is connected and ready
- 📱 Bot is waiting for QR scan
- ⏳ Bot is starting up
- ❌ Bot is not responding

### 2. Check Railway logs
In Railway dashboard:
1. Go to your Ireland bot service
2. Click "Deployments" tab
3. Click on the latest deployment
4. Check the logs for errors

Common errors:
- `EADDRINUSE` - Port already in use (restart the service)
- `Connection timeout` - Database connection issue (check Supabase)
- `Authentication failed` - Supabase credentials issue

### 3. Verify environment variables
Make sure these are set in Railway:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `PORT` - Should be automatically set by Railway
- `NODE_ENV` - Set to `production`

### 4. Check the QR endpoint directly
Visit: `https://your-railway-url.railway.app/health`

You should see:
```json
{
  "status": "awaiting_scan",
  "updated": 1234567890
}
```

If you get a 404 or connection error, the bot is not running.

### 5. Force restart
In Railway:
1. Go to your service
2. Click "Settings"
3. Scroll to "Danger Zone"
4. Click "Restart"

### 6. Check session files
If the bot was previously connected but now won't start:
1. Delete the `session` folder in Railway (or locally)
2. Restart the bot
3. Scan the QR code again

### 7. Common issues

#### Bot starts but QR never appears
- Check if WhatsApp servers are accessible
- Try restarting the bot
- Check if your IP is blocked by WhatsApp

#### QR appears but scan fails
- Make sure you're using the correct WhatsApp account
- Try unlinking all devices first
- Wait 5 minutes and try again

#### Bot disconnects frequently
- Check your internet connection
- Verify Railway service is not sleeping (upgrade to paid plan if needed)
- Check if WhatsApp account is banned

## Testing the Bot

### 1. Check if bot is receiving messages
Send "hi" to the bot number from another WhatsApp account.

You should see in the logs:
```
📨 Message from 353871234567@s.whatsapp.net: "hi"
✅ Response sent to 353871234567@s.whatsapp.net
```

### 2. Check if bot can send messages
In the Railway logs terminal, type:
```
send 353871234567
```

Replace with your test number (digits only, no + or spaces).

### 3. Test booking flow
Send "1" or "book" to the bot and follow the prompts.

## Still Having Issues?

1. Check Railway status page: https://status.railway.app
2. Check WhatsApp Business API status
3. Contact support with:
   - Railway deployment logs
   - Screenshot of the error
   - Steps to reproduce

## Quick Fixes

### Reset everything
```bash
# Stop the bot
# Delete session folder
rm -rf session/

# Restart the bot
npm start
```

### Check database connection
```bash
node -e "import('./utils/database.js').then(m => m.initDatabase()).then(() => console.log('✅ DB OK')).catch(e => console.error('❌', e))"
```

### Test QR server only
```bash
node -e "import('./qr-server.js').then(m => { m.setQr('test'); m.startQrServer(3000); })"
```

Then visit http://localhost:3000
