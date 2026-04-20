import NodeCache from 'node-cache';

// In-memory cache for user sessions (24 hour TTL)
const sessionCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

export async function getUserSession(phoneNumber) {
  let session = sessionCache.get(phoneNumber);
  
  if (!session) {
    session = {
      phoneNumber,
      state: 'MAIN_MENU',
      step: null,
      bookingData: {},
      userName: null,
      userEmail: null,
      userAddress: null,
      userCity: null,
      userEircode: null,
      hasBeenGreeted: false,
      bookingHistory: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    sessionCache.set(phoneNumber, session);
  } else {
    // Update last activity
    session.lastActivity = new Date().toISOString();
    sessionCache.set(phoneNumber, session);
  }
  
  return session;
}

export async function updateUserSession(phoneNumber, updates) {
  const session = await getUserSession(phoneNumber);
  const updatedSession = { ...session, ...updates };
  sessionCache.set(phoneNumber, updatedSession);
  return updatedSession;
}

export async function clearUserSession(phoneNumber) {
  sessionCache.del(phoneNumber);
}

export function getAllSessions() {
  const keys = sessionCache.keys();
  return keys.map(key => sessionCache.get(key));
}
