import NodeCache from 'node-cache';

// In-memory cache for user sessions (24 hour TTL)
const sessionCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

export async function getUserSession(phoneNumber) {
  let session = sessionCache.get(phoneNumber);
  const now = new Date();
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  
  if (!session) {
    // New session - needs greeting
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
      receiverName: null,
      receiverPhone: null,
      receiverAddress: null,
      receiverCity: null,
      hasBeenGreeted: false,
      needsGreeting: true,
      bookingHistory: [],
      createdAt: now.toISOString(),
      lastActivity: now.toISOString()
    };
    sessionCache.set(phoneNumber, session);
  } else {
    // Check if session has expired (30 minutes of inactivity)
    const lastActivityTime = new Date(session.lastActivity);
    const timeSinceLastActivity = now - lastActivityTime;
    
    if (timeSinceLastActivity > SESSION_TIMEOUT_MS) {
      // Session expired - reset and needs greeting
      console.log(`🔄 Session expired for ${phoneNumber} (${Math.round(timeSinceLastActivity / 60000)} minutes inactive)`);
      session.hasBeenGreeted = false;
      session.needsGreeting = true;
      session.state = 'MAIN_MENU';
      session.step = null;
      session.bookingData = {};
    }
    
    // Update last activity
    session.lastActivity = now.toISOString();
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
