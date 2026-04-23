# Twilio WhatsApp Bot Setup Guide

## Overview
This bot now supports **Twilio** for more reliable WhatsApp messaging. Twilio uses the official WhatsApp Business API.

## Credentials Setup
Add your Twilio credentials to the `.env` file (credentials are in `.env` - never commit them to git):

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## Setup Steps

### 1. Start the Twilio Bot

**Ireland Bot:**
```bash
cd whatsapp-bot
npm run start:twilio
```

**UK Bot:**
```bash
cd whatsapp-bot-uk
npm run start:twilio
```

### 2. Configure Webhook in Twilio

1. Go to [Twilio WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox)
2. Log in with your Twilio account
3. Find "WHEN A MESSAGE COMES IN" section
4. Enter your webhook URL:
   - **Ireland**: `https://your-railway-app.railway.app/webhook`
   - **UK**: `https://your-railway-app-uk.railway.app/webhook`
5. Set HTTP method to **POST**
6. Click **Save**

### 3. Join the Sandbox

1. In Twilio Console, you'll see a message like: "join <code-word>"
2. Send that message from your WhatsApp to `+1 415 523 8886`
3. Example: `join abc-def`
4. You'll receive a confirmation message

### 4. Test the Bot

Send "hi" or "test" to the Twilio number from your WhatsApp.

## Key Differences: Baileys vs Twilio

| Feature | Baileys (Current) | Twilio (New) |
|---------|------------------|--------------|
| Setup | QR code scanning | Webhook configuration |
| Cost | Free | Paid (conversation-based) |
| Reliability | Can disconnect | Very reliable |
| Official | Unofficial | Official WhatsApp API |
| Message Delivery | Sometimes fails | Guaranteed delivery |
| Rate Limits | WhatsApp's limits | Twilio's limits |

## Running Both Versions

You can run both versions simultaneously:

**Baileys (QR Code):**
```bash
npm start
```

**Twilio (Webhook):**
```bash
npm run start:twilio
```

## Environment Variables

Both bots share the same `.env` file with these additions:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WEBHOOK_URL=https://your-railway-app.railway.app
PORT=3000
```

## Deployment on Railway

1. Update your Railway service to use Twilio:
   - Change start command to: `npm run start:twilio`
   - Add environment variables from `.env`
   - Get your Railway URL and update `WEBHOOK_URL`

2. Configure the webhook in Twilio with your Railway URL

## Troubleshooting

### Messages not received
- Check webhook is configured correctly in Twilio
- Verify webhook URL is accessible (test with `/health` endpoint)
- Check Twilio logs in console

### Webhook errors
- Ensure your server is publicly accessible
- Check Railway logs for errors
- Verify Twilio credentials are correct

### Sandbox limitations
- Sandbox only works with pre-approved numbers
- For production, you need to apply for WhatsApp Business API approval
- Sandbox has message template restrictions

## Production Setup

For production use:
1. Apply for WhatsApp Business API access through Twilio
2. Get your own WhatsApp Business number
3. Update `TWILIO_WHATSAPP_NUMBER` in `.env`
4. Remove sandbox restrictions

## Cost Estimate

Twilio WhatsApp pricing (approximate):
- **Business-initiated**: $0.005 - $0.02 per message
- **User-initiated**: Free for 24 hours after user message
- **Session**: 24-hour window after user message

For 1000 conversations/month: ~$10-50 depending on region.

## Support

- Twilio Console: https://console.twilio.com
- Twilio Docs: https://www.twilio.com/docs/whatsapp
- WhatsApp Business API: https://www.twilio.com/whatsapp
