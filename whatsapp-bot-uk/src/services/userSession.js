import NodeCache from 'node-cache';

// Cache for user sessions (TTL: 24 hours)
const sessionCache = new NodeCache({ stdTTL: 86400 });

export async function getUserSession(phoneNumber) {
  let session = sessionCache.get(phoneNumber);
  
  if (!session) {
    session = {
      phoneNumber,
      state: 'MAIN_MENU',
      step: null,
      hasBeenGreeted: false,
      bookingData: {},
      bookingHistory: [],
      userName: null,
      userEmail: null,
      userAddress: null,
      userCity: null,
      userPostcode: null,
      createdAt: new Date().toISOString()
    };
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
  return sessionCache.keys().map(key => sessionCache.get(key));
}
