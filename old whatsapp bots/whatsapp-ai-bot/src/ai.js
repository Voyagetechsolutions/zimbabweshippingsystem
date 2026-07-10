import OpenAI from 'openai';
import { config } from './config.js';
import { buildSystemPrompt } from './prompt.js';
import { getSession, rememberTurn, updateSession } from './sessionStore.js';

const greetings = new Set(['hi', 'hie', 'hello', 'hey', 'start']);

let client;

function openai() {
  if (!client) {
    client = new OpenAI({ apiKey: config.openAiApiKey });
  }
  return client;
}

function normalise(text) {
  return (text || '').trim().toLowerCase().replace(/[.!?]+$/g, '');
}

function isGreeting(text) {
  return greetings.has(normalise(text));
}

function cleanForWhatsApp(text) {
  return (text || '')
    .replace(/\*\*(.+?)\*\*/gs, '*$1*')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

export async function generateReply(phoneNumber, userText) {
  const session = getSession(phoneNumber);

  if (isGreeting(userText)) {
    const reply = `Hi! Welcome to ${config.businessName}. How can I help you today?`;
    rememberTurn(phoneNumber, userText, reply);
    return reply;
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...session.messages,
    { role: 'user', content: userText },
  ];

  try {
    const response = await openai().chat.completions.create({
      model: config.openAiModel,
      messages,
      temperature: 0.45,
      max_tokens: 220,
    });

    const reply = cleanForWhatsApp(response.choices[0]?.message?.content)
      || 'I can help with a booking, pricing, collection, or tracking. What would you like to do today?';

    rememberTurn(phoneNumber, userText, reply);
    return reply;
  } catch (error) {
    console.error('OpenAI error:', error?.message || error);
    updateSession(phoneNumber, { greeted: true });
    return 'Sorry, I had a problem replying just now. Please send that again, or ask for an agent.';
  }
}
