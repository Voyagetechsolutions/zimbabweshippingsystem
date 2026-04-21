# WhatsApp Bot Deployment Guide

## ✅ Latest Updates

### QR Code Configuration
- **Validity**: 12 hours (no more spam!)
- **Download Link**: Available via HTTP endpoint
- **No WhatsApp Number**: Removed automatic sending to phone number

## 🚀 How to Deploy

### 1. Deploy to Railway
```bash
cd whatsapp-bot
railway up
```

### 2. Get Your QR Code Download Link

Once deployed, Railway will provide you with a public URL. Your QR code will be available at:

```
https://your-app-name.railway.app/qr-code
```

### 3. Available Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Bot information and status |
| `/qr-code` | Download the latest QR code (PNG file) |
| `/health` | Health check endpoint |

## 📱 How to Connect Your Device

1. **Deploy the bot** to Railway
2. **Copy the Railway URL** from the deployment logs
3. **Open in browser**: `https://your-app.railway.app/qr-code`
4. **Download the QR code** image
5. **Scan with WhatsApp**:
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Tap "Link a Device"
   - Scan the downloaded QR code

## ⏰ QR Code Validity

- **Valid for**: 12 hours
- **After 12 hours**: A new QR code will be generated automatically
- **After connection**: Session is saved, no QR code needed on restart

## 🔧 Environment Variables

Make sure these are set in Railway:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
BOT_NAME=Zimbabwe Shipping Ireland
SESSION_PATH=/app/data/whatsapp-session
NODE_ENV=production
PORT=3000
```

## 📊 Monitoring

Check your bot status:
- **Logs**: Railway dashboard > Deployments > View Logs
- **Health**: `https://your-app.railway.app/health`
- **QR Status**: Check logs for QR code generation messages

## 🎯 Key Features

✅ QR code valid for 12 hours (no spam)
✅ HTTP download endpoint for easy access
✅ Persistent session storage
✅ Auto-reconnect on connection loss
✅ Health monitoring endpoints

## 🆘 Troubleshooting

### QR Code Not Available
- Check Railway logs for QR generation messages
- Visit `/` endpoint to see bot status
- Wait a few seconds after deployment

### Connection Issues
- Ensure QR code is scanned within 12 hours
- Check that WhatsApp is properly linked
- Review Railway logs for error messages

### Session Lost
- New QR code will be generated automatically
- Download from `/qr-code` endpoint
- Scan with your device again

---

**Last Updated**: ${new Date().toLocaleString()}
**Status**: Ready for deployment ✅
