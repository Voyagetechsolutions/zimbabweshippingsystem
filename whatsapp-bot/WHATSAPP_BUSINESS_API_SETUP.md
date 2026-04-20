# WhatsApp Business API Setup Guide

## Why Use WhatsApp Business API?

✅ **No QR Code Scanning** - Connect via API credentials
✅ **Official Verification** - Green checkmark badge
✅ **Professional** - Better for business use
✅ **Reliable** - More stable connection
✅ **Scalable** - Handle more messages
✅ **Multi-Agent** - Multiple people can manage

## Providers Comparison

### 1. Twilio (Recommended for Beginners)
- **Setup:** Easy
- **Cost:** $0.005 per message
- **Support:** Excellent
- **Website:** https://www.twilio.com/whatsapp

### 2. 360dialog (Best for Europe/Ireland)
- **Setup:** Medium
- **Cost:** €0.004 per message
- **Support:** Good
- **Website:** https://www.360dialog.com

### 3. MessageBird
- **Setup:** Easy
- **Cost:** $0.006 per message
- **Support:** Good
- **Website:** https://messagebird.com/whatsapp

### 4. Meta Direct (Most Professional)
- **Setup:** Complex
- **Cost:** Lowest
- **Support:** Limited
- **Website:** https://business.facebook.com/whatsapp

## Quick Setup: Twilio (Easiest)

### Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up (free trial with $15 credit)
3. Verify your email and phone

### Step 2: Request WhatsApp Access

1. Go to Twilio Console
2. Navigate to Messaging → Try it out → Send a WhatsApp message
3. Follow the WhatsApp Business API setup wizard
4. Submit business information:
   - Business name: Zimbabwe Shipping
   - Business description: International shipping from Ireland to Zimbabwe
   - Business website: your-website.com
   - Business category: Logistics/Shipping

### Step 3: Get Credentials

Once approved (1-3 days), you'll get:
- Account SID
- Auth Token
- WhatsApp number (e.g., +1 415 xxx xxxx)

### Step 4: Configure Bot

Update your `.env` file:

```env
# WhatsApp Business API (Twilio)
WHATSAPP_API_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Supabase (same as before)
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=your_key_here

# Bot Configuration
BOT_NAME=Zimbabwe Shipping Ireland
NODE_ENV=production
```

### Step 5: Update Bot Code

The bot needs to be modified to use Twilio instead of Baileys. I can create this version for you.

## Cost Estimate

**For 1000 messages/month:**
- Twilio: $5/month
- 360dialog: €4/month
- MessageBird: $6/month

**For 10,000 messages/month:**
- Twilio: $50/month
- 360dialog: €40/month
- MessageBird: $60/month

## Verification Process

To get the green checkmark:

1. **Business Verification**
   - Provide business documents
   - Verify business address
   - Verify business phone

2. **Display Name Approval**
   - Submit "Zimbabwe Shipping" as display name
   - Wait 1-3 days for approval

3. **Official Business Account**
   - Green checkmark appears
   - Customers see verified badge
   - Increased trust

## Alternative: Keep QR Code Method

If you want to avoid monthly costs:

**Option A: You Scan Once**
- Use your business phone
- Scan QR code once when setting up
- Bot runs on your number
- Customers just message your number
- **Cost:** $0/month (just server hosting)

**Option B: Dedicated Phone**
- Get a cheap Android phone (~$50)
- Keep it connected to power
- Scan QR code once
- Leave it running
- **Cost:** $0/month (just server hosting)

## Recommendation

**For Your Business:**

If budget allows: **Use Twilio WhatsApp Business API**
- Professional setup
- No QR code hassle
- Official verification
- Better reliability
- Cost: ~$50-100/month

If budget is tight: **Use QR Code Method**
- You scan once with your phone
- Customers don't scan anything
- Works perfectly fine
- Cost: $6/month (just server)

## Next Steps

**Option 1: WhatsApp Business API**
1. Choose provider (Twilio recommended)
2. Sign up and get approved
3. I'll modify the bot code for API
4. Deploy and test

**Option 2: Keep QR Code Method**
1. Deploy bot to server
2. You scan QR code once with your phone
3. Bot runs on your number
4. Customers message your number (no QR code for them!)

Which option would you like to proceed with?
