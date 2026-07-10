const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_MESSAGES = 24;

const sessions = new Map();

function nowIso() {
  return new Date().toISOString();
}

function newSession(phoneNumber) {
  return {
    phoneNumber,
    greeted: false,
    messages: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function getSession(phoneNumber) {
  const existing = sessions.get(phoneNumber);
  const now = Date.now();

  if (!existing) {
    const session = newSession(phoneNumber);
    sessions.set(phoneNumber, session);
    return session;
  }

  const updatedAtMs = new Date(existing.updatedAt).getTime();
  if (Number.isFinite(updatedAtMs) && now - updatedAtMs > SESSION_TTL_MS) {
    const session = newSession(phoneNumber);
    sessions.set(phoneNumber, session);
    return session;
  }

  existing.updatedAt = nowIso();
  return existing;
}

export function updateSession(phoneNumber, updates) {
  const current = getSession(phoneNumber);
  const updated = {
    ...current,
    ...updates,
    updatedAt: nowIso(),
  };
  sessions.set(phoneNumber, updated);
  return updated;
}

export function rememberTurn(phoneNumber, userText, assistantText) {
  const session = getSession(phoneNumber);
  const messages = [
    ...session.messages,
    { role: 'user', content: userText },
    { role: 'assistant', content: assistantText },
  ].slice(-MAX_MESSAGES);

  return updateSession(phoneNumber, {
    greeted: true,
    messages,
  });
}

export function clearSession(phoneNumber) {
  sessions.delete(phoneNumber);
}

export function sessionCount() {
  return sessions.size;
}
