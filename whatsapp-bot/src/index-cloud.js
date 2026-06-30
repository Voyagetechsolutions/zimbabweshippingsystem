// Entry point for running the bot on Meta's official WhatsApp Cloud API.
// Start with:  node src/index-cloud.js   (script: npm run start:cloud)
//
// Required env vars:
//   WHATSAPP_TOKEN            - Meta access token (System User token for production)
//   WHATSAPP_PHONE_NUMBER_ID  - the Phone Number ID from the Meta WhatsApp dashboard
//   WHATSAPP_VERIFY_TOKEN     - any string you choose; must match the dashboard webhook config
//   WHATSAPP_APP_SECRET       - (optional) app secret, enables webhook signature verification
//   OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY - as usual
import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { cloudSock } from './cloud/metaClient.js';
import { runAgent, aiEnabled } from './ai/agent.js';
import { getUserSession } from './services/userSession.js';
import { initializeDatabase } from './services/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

const app = express();
// Keep the raw body so we can verify Meta's signature.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Dedupe: Meta retries webhooks, so remember recently handled message IDs.
const seen = new Set();
function alreadyHandled(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 1000) seen.delete(seen.values().next().value); // cap memory
  return false;
}

function signatureValid(req) {
  if (!APP_SECRET) return true; // verification disabled if no secret configured
  const sig = req.get('x-hub-signature-256');
  if (!sig || !req.rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

function extractText(message) {
  if (message.type === 'text') return message.text?.body?.trim() || '';
  // Button / list replies come back as interactive responses.
  if (message.type === 'interactive') {
    const i = message.interactive;
    return (i?.button_reply?.title || i?.list_reply?.title || i?.button_reply?.id || i?.list_reply?.id || '').trim();
  }
  if (message.type === 'button') return message.button?.text?.trim() || '';
  return '';
}

// ── Webhook verification (Meta calls this once when you save the webhook) ──
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified by Meta');
    return res.status(200).send(challenge);
  }
  console.warn('⚠️  Webhook verification failed');
  return res.sendStatus(403);
});

// ── Incoming messages ──
app.post('/webhook', async (req, res) => {
  // Always ack within a few seconds, or Meta retries and may disable the webhook.
  res.sendStatus(200);

  if (!signatureValid(req)) {
    console.warn('⚠️  Invalid webhook signature — ignoring');
    return;
  }

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return; // delivery/read status update, not a customer message

    if (alreadyHandled(message.id)) return;

    const from = message.from; // customer's wa_id (digits, e.g. 353871234567)
    const text = extractText(message);

    if (!text) {
      await cloudSock.sendMessage(from, { text: 'Please send a text message and I’ll help you 🙂' });
      return;
    }

    const session = await getUserSession(from);
    if (session.humanTakeover) {
      console.log(`🧑‍💼 Human takeover active for ${from} — bot paused`);
      return;
    }

    if (!aiEnabled()) {
      await cloudSock.sendMessage(from, { text: 'Our assistant is offline right now. Please try again shortly.' });
      return;
    }

    await runAgent(cloudSock, from, text, session);
  } catch (err) {
    console.error('Webhook handling error:', err);
  }
});

// Health check
app.get('/', (_req, res) => res.send('Zimbabwe Shipping WhatsApp Cloud API bot is running ✅'));

initializeDatabase();
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Cloud API bot listening on port ${PORT}`);
  console.log(`   Webhook URL path: /webhook`);
  if (!process.env.OPENAI_API_KEY) console.warn('⚠️  OPENAI_API_KEY not set — AI replies disabled');
});
