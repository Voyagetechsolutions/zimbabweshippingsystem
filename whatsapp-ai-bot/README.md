# Zimbabwe Shipping WhatsApp AI Bot

Fresh WhatsApp bot built on the official Meta WhatsApp Cloud API.

This does not use Baileys, QR sessions, linked-device encryption, or `@lid` chats.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in:
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN`
   - `OPENAI_API_KEY`
3. Install and start:

```powershell
npm install
npm start
```

## Meta Webhook

In the Meta WhatsApp dashboard:

- Callback URL: `https://YOUR-DOMAIN/webhook`
- Verify token: same value as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to `messages`

For local testing, expose the server with a tunnel such as ngrok:

```powershell
ngrok http 3000
```

Then use the ngrok HTTPS URL as the webhook callback URL.

## Local AI Test

This tests the AI without sending a WhatsApp message:

```powershell
curl -X POST http://localhost:3000/test-message `
  -H "Content-Type: application/json" `
  -d "{\"from\":\"test-user\",\"text\":\"Hi\"}"
```

Expected reply:

```text
Hi! Welcome to Zimbabwe Shipping. How can I help you today?
```

## Meta Test Number

For testing with Meta's WhatsApp test phone number, follow:

[META_TESTING.md](./META_TESTING.md)

## Customer Reset

If a customer sends:

```text
reset
```

their chat memory is cleared.
