import NodeCache from 'node-cache';
import { supabase } from './database.js';

// L1: in-memory cache (24-hour TTL).
// L2: Supabase bot_sessions table — survives bot restarts.
const sessionCache = new NodeCache({ stdTTL: 86400 });

const BOT_SOURCE = 'whatsapp-bot-uk';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

function newSession(phoneNumber, now) {
  return {
    phoneNumber,
    state: 'MAIN_MENU',
    step: null,
    hasBeenGreeted: false,
    needsGreeting: true,
    bookingData: {},
    bookingHistory: [],
    userName: null,           // first name, used in greetings
    userFirstName: null,
    userLastName: null,
    userEmail: null,
    userPhone: null,
    userPhone2: null,
    userAddress: null,
    userCity: null,
    userPostcode: null,
    receiverName: null,
    receiverPhone: null,
    receiverPhone2: null,
    receiverAddress: null,
    receiverCity: null,
    createdAt: now.toISOString(),
    lastActivity: now.toISOString(),
  };
}

async function loadFromDB(phoneNumber) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('bot_sessions')
      .select('session_data')
      .eq('phone_number', phoneNumber)
      .eq('bot_source', BOT_SOURCE)
      .maybeSingle();
    if (error || !data) return null;
    return data.session_data;
  } catch (err) {
    console.warn('Session DB read failed:', err?.message || err);
    return null;
  }
}

// Fire-and-forget — bot response shouldn't wait for the DB write.
function saveToDBAsync(phoneNumber, session) {
  if (!supabase) return;
  supabase
    .from('bot_sessions')
    .upsert(
      {
        phone_number: phoneNumber,
        bot_source: BOT_SOURCE,
        session_data: session,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone_number,bot_source' },
    )
    .then(({ error }) => {
      if (error) console.warn('Session DB write failed:', error.message);
    });
}

function expireIfStale(session, now) {
  const lastActivity = new Date(session.lastActivity || session.createdAt);
  const idleMs = now - lastActivity;
  if (idleMs > SESSION_TIMEOUT_MS) {
    console.log(`🔄 Session expired for ${session.phoneNumber} (${Math.round(idleMs / 60000)} min idle)`);
    session.hasBeenGreeted = false;
    session.needsGreeting = true;
    session.state = 'MAIN_MENU';
    session.step = null;
    session.bookingData = {};
  }
  session.lastActivity = now.toISOString();
}

export async function getUserSession(phoneNumber) {
  const now = new Date();
  let session = sessionCache.get(phoneNumber);

  if (!session) {
    // L1 miss — try L2
    session = await loadFromDB(phoneNumber);
  }

  if (!session) {
    session = newSession(phoneNumber, now);
    sessionCache.set(phoneNumber, session);
    saveToDBAsync(phoneNumber, session);
    return session;
  }

  expireIfStale(session, now);
  sessionCache.set(phoneNumber, session);
  return session;
}

export async function updateUserSession(phoneNumber, updates) {
  const session = await getUserSession(phoneNumber);
  const updated = { ...session, ...updates, lastActivity: new Date().toISOString() };
  sessionCache.set(phoneNumber, updated);
  saveToDBAsync(phoneNumber, updated);
  return updated;
}

export async function clearUserSession(phoneNumber) {
  sessionCache.del(phoneNumber);
  if (!supabase) return;
  try {
    await supabase
      .from('bot_sessions')
      .delete()
      .eq('phone_number', phoneNumber)
      .eq('bot_source', BOT_SOURCE);
  } catch (err) {
    console.warn('Session DB delete failed:', err?.message || err);
  }
}

// ── Human Takeover helpers ──────────────────────────────────────
export async function enableHumanTakeover(phoneNumber, agentName = 'Agent') {
  return updateUserSession(phoneNumber, {
    humanTakeover: true,
    takenOverBy: agentName,
    takenOverAt: new Date().toISOString(),
  });
}

export async function disableHumanTakeover(phoneNumber) {
  return updateUserSession(phoneNumber, {
    humanTakeover: false,
    takenOverBy: null,
    takenOverAt: null,
  });
}

export async function isHumanTakeover(phoneNumber) {
  const session = await getUserSession(phoneNumber);
  return !!session.humanTakeover;
}

export function getAllSessions() {
  return sessionCache.keys().map(key => sessionCache.get(key));
}
