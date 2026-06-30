import OpenAI from 'openai';
import { buildSystemPrompt } from './systemPrompt.js';
import { TOOL_SCHEMAS, executeTool } from './tools.js';
import { sendMessage } from '../utils/messageUtils.js';
import { getBotSettings } from '../utils/pricingUtils.js';
import { updateUserSession } from '../services/userSession.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TOOL_ROUNDS = 6;   // safety cap so a tool loop can't run forever
const MAX_HISTORY = 40;      // messages kept per customer (tokens stay bounded)

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

// Keep the stored history valid for the OpenAI API: cap length and never
// let it start with an orphaned tool result (whose assistant turn was cut).
function trimHistory(history) {
  let h = history.length > MAX_HISTORY ? history.slice(history.length - MAX_HISTORY) : history;
  while (h.length && h[0].role === 'tool') h = h.slice(1);
  return h;
}

export async function runAgent(sock, phoneNumber, userText, session) {
  const settings = await getBotSettings();
  const system = buildSystemPrompt(settings);

  const history = Array.isArray(session.aiMessages) ? [...session.aiMessages] : [];
  history.push({ role: 'user', content: userText });

  const messages = [{ role: 'system', content: system }, ...history];

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
          const result = await executeTool(tc.function.name, args, { phoneNumber, session });
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue; // let the model read the tool results and respond
      }

      // Final assistant reply — send it to the customer.
      const reply = (msg.content || '').trim();
      if (reply) await sendMessage(sock, phoneNumber, toWhatsApp(reply));
      break;
    }
  } catch (err) {
    console.error('AI agent error:', err?.message || err);
    await sendMessage(sock, phoneNumber,
      "Sorry, I had a hiccup just now 🙏 Could you send that again? Or type *agent* to reach our team.");
    return;
  }

  // Persist the conversation (minus the system prompt) for next time.
  await updateUserSession(phoneNumber, { aiMessages: trimHistory(messages.slice(1)) });
}
