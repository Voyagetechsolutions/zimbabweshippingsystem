import NodeCache from 'node-cache';
import { getSupabase } from './database.js';

// L1: in-memory (fast, 24h TTL). L2: bot_sessions table (survives restarts).
const sessionCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

// Maps phone digits → real LID JID and vice-versa so /takeover <phone> works
// even when the customer's messages arrive from a @lid address.
const jidAliasMap = new Map();

export function registerJidAlias(phoneJid, lidJid) {
  if (!phoneJid || !lidJid) return;
  const digits = phoneJid.replace('@s.whatsapp.net', '');
  jidAliasMap.set(digits, lidJid);
  jidAliasMap.set(lidJid, `${digits}@s.whatsapp.net`);
}

export function getLidForDigits(digits) {
  return jidAliasMap.get(digits) || null;
}

export function getPhoneForLid(lidJid) {
  return jidAliasMap.get(lidJid) || null;
}

const BOT_SOURCE = 'whatsapp-bot-uk';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function newSession(phoneNumber, now) {
  return {
    phoneNumber,
    state: 'MAIN_MENU',
    step: null,
    bookingData: {},
    userName: null,
    userFirstName: null,
    userLastName: null,
    userEmail: null,
    userPhone: null,
    userPhone2: null,
    userAddress: null,
    userCity: null,
    receiverName: null,
    receiverPhone: null,
    receiverPhone2: null,
    receiverAddress: null,
    receiverCity: null,
    hasBeenGreeted: false,
    needsGreeting: true,
    bookingHistory: [],
    humanTakeover: false,  // NEW: Human agent control flag
    takenOverBy: null,     // NEW: Agent identifier
    takenOverAt: null,     // NEW: Timestamp of takeover
    createdAt: now.toISOString(),
    lastActivity: now.toISOString(),
  };
}

async function loadFromDB(phoneNumber) {
  const supabase = getSupabase();
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

// Fire-and-forget so the bot's reply isn't blocked by the DB round-trip.
function saveToDBAsync(phoneNumber, session) {
  const supabase = getSupabase();
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
    })
    .catch((err) => {
      console.warn('Session DB write threw:', err?.message || err);
    });
}

function expireIfStale(session, now) {
  const lastActivity = new Date(session.lastActivity || session.createdAt);
  const idleMs = now - lastActivity;
  if (idleMs > SESSION_TIMEOUT_MS) {
    console.log(`Session expired for ${session.phoneNumber} (${Math.round(idleMs / 60000)} min idle)`);
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
    session = await loadFromDB(phoneNumber);
    if (session) console.log(`Session restored from DB for ${phoneNumber} (state=${session.state}, step=${session.step})`);
  }

  if (!session) {
    session = newSession(phoneNumber, now);
    sessionCache.set(phoneNumber, session);
    saveToDBAsync(phoneNumber, session);
    console.log(`New session created for ${phoneNumber}`);
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
  console.log(`Session updated for ${phoneNumber}: state=${updated.state}, step=${updated.step}`);
  return updated;
}

export async function clearUserSession(phoneNumber) {
  sessionCache.del(phoneNumber);
  const supabase = getSupabase();
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

export function getAllSessions() {
  const keys = sessionCache.keys();
  return keys.map(key => sessionCache.get(key));
}

// NEW: Human takeover functions
export async function enableHumanTakeover(phoneNumber, agentName = 'Agent') {
  const session = await getUserSession(phoneNumber);
  const updated = {
    ...session,
    humanTakeover: true,
    takenOverBy: agentName,
    takenOverAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };
  sessionCache.set(phoneNumber, updated);
  saveToDBAsync(phoneNumber, updated);
  console.log(`🧑‍💼 Human takeover enabled for ${phoneNumber} by ${agentName}`);
  return updated;
}

export async function disableHumanTakeover(phoneNumber) {
  const session = await getUserSession(phoneNumber);
  const updated = {
    ...session,
    humanTakeover: false,
    takenOverBy: null,
    takenOverAt: null,
    lastActivity: new Date().toISOString(),
  };
  sessionCache.set(phoneNumber, updated);
  saveToDBAsync(phoneNumber, updated);
  console.log(`🤖 Bot control restored for ${phoneNumber}`);
  return updated;
}

export async function isHumanTakeover(jid) {
  const check = async (j) => {
    const s = await getUserSession(j);
    if (!s.humanTakeover) return false;
    // Auto-expire after 30 minutes
    const takenAt = s.takenOverAt ? new Date(s.takenOverAt).getTime() : 0;
    if (Date.now() - takenAt > TAKEOVER_TIMEOUT_MS) {
      await disableHumanTakeover(j);
      console.log(`⏰ Takeover auto-expired for ${j} (30 min timeout)`);
      return false;
    }
    return true;
  };

  if (await check(jid)) return true;

  // If this is a LID, also check the phone-number session
  if (jid.endsWith('@lid')) {
    const phoneJid = getPhoneForLid(jid);
    if (phoneJid && await check(phoneJid)) {
      await enableHumanTakeover(jid, (await getUserSession(phoneJid)).takenOverBy || 'Agent');
      return true;
    }
  }

  return false;
}
