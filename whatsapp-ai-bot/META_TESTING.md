# Testing With Meta's WhatsApp Test Phone Number

Use this before connecting the client's real number.

## 1. Get Meta Test Values

In Meta Developer Dashboard:

1. Open your app.
2. Add the WhatsApp product if it is not already added.
3. Go to WhatsApp > API Setup.
4. Copy the temporary access token into `WHATSAPP_TOKEN`.
5. Copy the test Phone Number ID into `WHATSAPP_PHONE_NUMBER_ID`.
6. Add your own WhatsApp number as a recipient/test number.
7. Copy your WhatsApp number into `WHATSAPP_TEST_RECIPIENT`.

Use international format with digits only, for example:

```env
WHATSAPP_TEST_RECIPIENT=27611234567
```

## 2. Test Outbound Sending

Meta only allows the first outbound test message as a template unless the user has already messaged you.

Run:

```powershell
npm run send:test
```

This sends Meta's built-in `hello_world` template from the test phone number.

## 3. Run The Bot

```powershell
npm start
```

The bot listens on:

```text
http://localhost:3000/webhook
```

## 4. Expose The Local Webhook

Use a tunnel:

```powershell
ngrok http 3000
```

Copy the HTTPS URL, then set this in Meta:

```text
https://YOUR-NGROK-URL/webhook
```

Webhook verify token:

```text
zimship-ai-webhook-verify-2026
```

Subscribe to the `messages` webhook field.

## 5. Test AI Replies

From your WhatsApp, reply to the test phone number:

```text
Hi
```

Expected bot reply:

```text
Hi! Welcome to Zimbabwe Shipping. How can I help you today?
```

Then test:

```text
I want to ship two drums to Harare
```

The bot should continue naturally and ask for the next booking detail.

## Notes

- Meta temporary tokens are for testing only.
- For the client launch, create a permanent System User token.
- The client real number should be added only after the test bot works end to end.
