import express from 'express';
import crypto from 'crypto';
import { config, assertRuntimeConfig } from './config.js';
import { generateReply } from './ai.js';
import { extractIncomingMessages, sendTextMessage } from './whatsapp.js';
import { clearSession, sessionCount } from './sessionStore.js';

assertRuntimeConfig();

const app = express();
const seenMessageIds = new Set();

app.use(express.json({
  verify: (req, _res, buffer) => {
    req.rawBody = buffer;
  },
}));

function alreadySeen(id) {
  if (!id) return false;
  if (seenMessageIds.has(id)) return true;
  seenMessageIds.add(id);
  if (seenMessageIds.size > 2000) {
    seenMessageIds.delete(seenMessageIds.values().next().value);
  }
  return false;
}

function validSignature(req) {
  if (!config.whatsappAppSecret) return true;

  const signature = req.get('x-hub-signature-256');
  if (!signature || !req.rawBody) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', config.whatsappAppSecret)
    .update(req.rawBody)
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    name: 'Zimbabwe Shipping WhatsApp AI Bot',
    sessions: sessionCount(),
  });
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
    console.log('Webhook verified by Meta');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  if (!validSignature(req)) {
    console.warn('Invalid Meta webhook signature. Ignoring request.');
    return;
  }

  const messages = extractIncomingMessages(req.body);

  for (const message of messages) {
    if (alreadySeen(message.id)) continue;
    if (!message.from) continue;

    try {
      if (message.text.toLowerCase() === 'reset') {
        clearSession(message.from);
        await sendTextMessage(message.from, 'No problem, we can start fresh. How can I help you today?');
        continue;
      }

      if (!message.text) {
        await sendTextMessage(message.from, 'Please send a text message so I can help you.');
        continue;
      }

      console.log(`Incoming from ${message.from}: ${message.text}`);
      const reply = await generateReply(message.from, message.text);
      await sendTextMessage(message.from, reply);
      console.log(`Replied to ${message.from}: ${reply}`);
    } catch (error) {
      console.error('Message handling error:', error?.message || error);
      try {
        await sendTextMessage(message.from, 'Sorry, something went wrong. Please try again.');
      } catch (sendError) {
        console.error('Fallback send failed:', sendError?.message || sendError);
      }
    }
  }
});

app.post('/test-message', async (req, res) => {
  const from = req.body?.from || 'test-user';
  const text = req.body?.text || 'Hi';
  const reply = await generateReply(from, text);
  res.json({ from, text, reply });
});

app.listen(config.port, () => {
  console.log(`WhatsApp AI bot listening on port ${config.port}`);
  console.log('Webhook path: /webhook');
});
