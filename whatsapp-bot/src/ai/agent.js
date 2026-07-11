import OpenAI from 'openai';
import { buildSystemPrompt } from './systemPrompt.js';
import { TOOL_SCHEMAS, executeTool } from './tools.js';
import { sendMessage } from '../utils/messageUtils.js';
import { getBotSettings } from '../utils/pricingUtils.js';
import { updateUserSession } from '../services/userSession.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TOOL_ROUNDS = 6;   // safety cap so a tool loop can't run forever
const MAX_HISTORY = 40;      // messages kept per customer (tokens stay bounded)
const SIMPLE_GREETINGS = new Set(['hi', 'hello', 'hey', 'hie', 'start']);

let _client = null;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export function aiEnabled() {
  return !!process.env.OPENAI_API_KEY;
}

// WhatsApp doesn't render markdown. Normalise any markdown the model produces
// into WhatsApp formatting (*bold*, • bullets) so customers never see raw ** or #.
function toWhatsApp(text) {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '*$1*')  // **bold** -> *bold*
    .replace(/\*\*/g, '*')               // strip any stray **
    .replace(/^#{1,6}\s+/gm, '')         // drop markdown headers
    .replace(/^\s*[-*]\s+/gm, '• ');     // - / * bullets -> •
}

function normaliseInput(text) {
  return (text || '').toLowerCase().trim().replace(/[.!?]+$/g, '');
}

function isSimpleGreeting(text) {
  return SIMPLE_GREETINGS.has(normaliseInput(text));
}

function firstNameFromSession(session) {
  return session.userFirstName || session.userName || null;
}

function sanitiseHistory(history = []) {
  const clean = history
    .filter(msg => ['user', 'assistant'].includes(msg?.role))
    .map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content.trim() : '',
    }))
    .filter(msg => msg.content);

  return clean.length > MAX_HISTORY ? clean.slice(clean.length - MAX_HISTORY) : clean;
}

export async function runAgent(sock, phoneNumber, userText, session) {
  const settings = await getBotSettings();
  const system = buildSystemPrompt(settings);
  const isFreshConversation = session.needsGreeting || !session.hasBeenGreeted;

  if (isSimpleGreeting(userText)) {
    const firstName = firstNameFromSession(session);
    const reply = firstName
      ? `Hi ${firstName}! I'm Zimmy. How can I help you today?`
      : "Hi! I'm Zimmy, the Zimbabwe Shipping assistant. How can I help you today?";

    await sendMessage(sock, phoneNumber, reply);
    await updateUserSession(phoneNumber, {
      hasBeenGreeted: true,
      needsGreeting: false,
      state: 'MAIN_MENU',
      step: null,
      aiMessages: sanitiseHistory([
        { role: 'user', content: userText },
        { role: 'assistant', content: reply },
      ]),
    });
    return;
  }

  const history = isFreshConversation ? [] : sanitiseHistory(session.aiMessages);
  history.push({ role: 'user', content: userText });

  const messages = [{ role: 'system', content: system }, ...history];
  let replied = false;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const resp = await client().chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOL_SCHEMAS,
        tool_choice: 'auto',
        temperature: 0.4,
      });

      const msg = resp.choices[0].message;
      messages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length) {
        for (const tc of msg.tool_calls) {
          let args = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* malformed */ }
          const result = await executeTool(tc.function.name, args, { phoneNumber, session, sock });
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue; // let the model read the tool results and respond
      }

      // Final assistant reply — send it to the customer.
      const reply = (msg.content || '').trim();
      if (reply) {
        await sendMessage(sock, phoneNumber, toWhatsApp(reply));
        replied = true;
      }
      break;
    }

    if (!replied) {
      await sendMessage(sock, phoneNumber,
        'I can help with bookings, prices, collection areas, or tracking. What would you like to do today?');
    }
  } catch (err) {
    console.error('AI agent error:', err?.message || err);
    await sendMessage(sock, phoneNumber,
      "Sorry, I had a hiccup just now 🙏 Could you send that again? Or type *agent* to reach our team.");
    return;
  }

  // Persist the conversation (minus the system prompt) for next time.
  await updateUserSession(phoneNumber, {
    hasBeenGreeted: true,
    needsGreeting: false,
    state: 'MAIN_MENU',
    step: null,
    aiMessages: sanitiseHistory(messages.slice(1)),
  });
}
