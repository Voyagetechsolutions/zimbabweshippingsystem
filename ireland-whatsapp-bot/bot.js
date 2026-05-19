/**
 * Ireland WhatsApp Bot - Simple & Clean
 * Zimbabwe Shipping Ireland Branch
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import readline from 'readline';
import { initDatabase, getCollectionSchedules } from './utils/database.js';
import { getPricingMessage } from './utils/pricing.js';
import { getUserSession, updateUserSession, enableHumanTakeover, disableHumanTakeover, isHumanTakeover } from './utils/sessions.js';
import { handleBookingFlow } from './flows/booking.js';
import { handleTrackingFlow } from './flows/tracking.js';
import { startQrServer, setQr, setConnected, setDisconnected } from './qr-server.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SESSION_FOLDER = process.env.SESSION_PATH || './session';
const logger = pino({ level: 'silent' }); // Quiet mode

// Bot state
let botConnected = false;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║         🇮🇪 IRELAND WHATSAPP BOT 🇿🇼                         ║');
console.log('║         Zimbabwe Shipping Ireland Branch                     ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

/**
 * Main Menu
 */
export function getMainMenu() {
  return `Hello! 👋

🇮🇪 *Zimbabwe Shipping - Ireland*

📢 *Collections commence in August 2026*

*Main Menu:*
1️⃣ 📦 Book a Shipment
2️⃣ 💰 View Pricing
3️⃣ 🔍 Track Shipment
4️⃣ 📍 Collection Areas
5️⃣ ❓ FAQ & Help
6️⃣ 🧑‍💼 Speak to an Agent

_Reply with a number (1-6) or describe what you need._`;
}

/**
 * Pricing Information (Dynamic from Database)
 */
async function getPricing() {
  return await getPricingMessage();
}

/**
 * Collection Areas (Dynamic from Database)
 */
async function getCollectionAreas() {
  const schedules = await getCollectionSchedules();
  
  let routeLines = '';
  if (schedules && schedules.length > 0) {
    routeLines = schedules.map(s => {
      const date = s.pickup_date && s.pickup_date !== 'Not set' && s.pickup_date !== 'To be confirmed' 
        ? s.pickup_date 
        : 'Date TBC';
      return `🔹 *${s.route}* — ${date}`;
    }).join('\n');
  } else {
    // Fallback if database unavailable
    routeLines = [
      '🔹 *Londonderry Route* — Date TBC',
      '🔹 *Belfast Route* — Date TBC',
      '🔹 *Cavan Route* — Date TBC',
      '🔹 *Athlone Route* — Date TBC',
      '🔹 *Limerick Route* — Date TBC',
      '🔹 *Dublin City Route* — Date TBC',
      '🔹 *Cork Route* — Date TBC',
    ].join('\n');
  }
  
  return `📍 *Collection Areas — Ireland*

We offer FREE collection across all of Ireland!

*Collection Routes & Next Dates:*
${routeLines}

*How it works:*
1️⃣ Book your shipment
2️⃣ We confirm your collection date
3️⃣ Our driver collects from your address
4️⃣ Items shipped to Zimbabwe

Type *book* to start your booking or *menu* for main menu.`;
}

/**
 * Contact Information
 */
function getContact() {
  return `🧑‍💼 *Speak to an Agent*

Please press the 📞 *call icon* and click *Voice Call* to speak to one of our agents.

🌐 Website: www.zimbabweshipping.ie

*Office Hours:*
Open daily: 7:00 AM - 8:00 PM

⏱️ *Response times:*
• Off-peak: 0–15 minutes
• Peak times: 30–45 minutes

Type *menu* to return to main menu.`;
}

/**
 * Handle incoming messages
 */
async function handleMessage(sock, msg) {
  try {
    const from = msg.key.remoteJid;
    const fromMe = msg.key.fromMe;
    const isGroup = from?.endsWith('@g.us');

    console.log(`➡️  handleMessage: from=${from} fromMe=${fromMe} isGroup=${isGroup}`);

    if (isGroup) {
      console.log('   ⏭️  skip — group chat');
      return;
    }
    if (!msg.message) {
      console.log('   ⏭️  skip — no message content (likely encrypted/unavailable)');
      return;
    }

    // Extract message text from any of the supported message types
    const m = msg.message;
    const text = (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.buttonsResponseMessage?.selectedDisplayText ||
      m.listResponseMessage?.title ||
      m.templateButtonReplyMessage?.selectedDisplayText ||
      ''
    ).trim();
    
    // ── 🧑‍💼 AGENT COMMANDS VIA WHATSAPP ──────────────────────────────
    // Detect /takeover, /release, /status sent from the bot's linked devices.
    // We rely on fromMe (set by Baileys) instead of number matching because
    // LID addresses (e.g. 198448997527559@lid) don't match the bot's phone number.
    if (fromMe && text && text.startsWith('/')) {
      console.log(`🧑‍💼 Agent command detected: "${text}"`);
      
      const takeoverMatch = text.match(/\/takeover\s+(\d+)/i);
      const releaseMatch = text.match(/\/release\s+(\d+)/i);
      const statusMatch = text.match(/\/status\s+(\d+)/i);
      
      if (takeoverMatch) {
        const digits = takeoverMatch[1];
        // Set takeover on BOTH JID formats — customers may message
        // from either @s.whatsapp.net or @lid depending on WhatsApp version
        const targetWA = `${digits}@s.whatsapp.net`;
        const targetLID = `${digits}@lid`;
        await enableHumanTakeover(targetWA, 'Agent');
        await enableHumanTakeover(targetLID, 'Agent');
        try { await sock.sendMessage(targetWA, { 
          text: '🧑‍💼 *An agent has joined the conversation*\n\nYou are now chatting with a human agent. The bot is paused.' 
        }); } catch (e) { /* target may not exist in this format */ }
        await sock.sendMessage(from, { text: `✅ Takeover enabled for ${digits}\n(both phone & LID formats)` });
        console.log(`✅ Takeover enabled for ${digits} (both ${targetWA} and ${targetLID})`);
        return;
      }
      if (releaseMatch) {
        const digits = releaseMatch[1];
        const targetWA = `${digits}@s.whatsapp.net`;
        const targetLID = `${digits}@lid`;
        await disableHumanTakeover(targetWA);
        await disableHumanTakeover(targetLID);
        try { await sock.sendMessage(targetWA, { 
          text: '🤖 *Agent has left the conversation*\n\nYou are now chatting with the automated bot again. Type *menu* to see options.' 
        }); } catch (e) { /* target may not exist in this format */ }
        await sock.sendMessage(from, { text: `✅ Bot control restored for ${digits}` });
        console.log(`✅ Bot control restored for ${digits} (both ${targetWA} and ${targetLID})`);
        return;
      }
      if (statusMatch) {
        const digits = statusMatch[1];
        const targetWA = `${digits}@s.whatsapp.net`;
        const targetLID = `${digits}@lid`;
        const isTakenOverWA = await isHumanTakeover(targetWA);
        const isTakenOverLID = await isHumanTakeover(targetLID);
        const isTakenOver = isTakenOverWA || isTakenOverLID;
        const targetSession = isTakenOverWA ? await getUserSession(targetWA) : await getUserSession(targetLID);
        let statusMsg = `📊 *Status for ${digits}*\n\n`;
        statusMsg += `Human Takeover: ${isTakenOver ? '✅ YES' : '❌ NO'}\n`;
        if (isTakenOver) {
          statusMsg += `Taken over by: ${targetSession.takenOverBy || 'Unknown'}\n`;
          statusMsg += `Taken over at: ${targetSession.takenOverAt || 'Unknown'}\n`;
        }
        statusMsg += `Current state: ${targetSession.state}\n`;
        statusMsg += `Current step: ${targetSession.step || 'None'}`;
        await sock.sendMessage(from, { text: statusMsg });
        console.log(`📊 Status sent for ${digits}`);
        return;
      }
      // Unknown / command — show help
      const helpMsg = `🧑‍💼 *Agent Commands*\n\n` +
        `*/takeover 353871234567* — Pause bot, talk to customer\n` +
        `*/release 353871234567* — Give control back to bot\n` +
        `*/status 353871234567* — Check takeover status\n\n` +
        `*Note:* Use digits only, no + or spaces!`;
      await sock.sendMessage(from, { text: helpMsg });
      return;
    }
    
    // Skip ALL other fromMe messages (not agent commands)
    if (fromMe) {
      console.log('   ⏭️  skip — fromMe (not an agent command)');
      return;
    }
    
    // 🛡️ ECHO DETECTION — prevent infinite loop
    // The bot's own outgoing messages sometimes echo back as fromMe=false via LID.
    // Detect them by checking if the text matches known bot output patterns.
    if (text.startsWith('Hello! 👋') && text.includes('*Main Menu:*')) {
      console.log(`   🔁 skip — echo of bot's own menu message from ${from}`);
      return;
    }
    if (text.startsWith('🧑‍💼 *An agent') || text.startsWith('🤖 *Agent has left') || text.startsWith('✅ Takeover') || text.startsWith('✅ Bot control')) {
      console.log(`   🔁 skip — echo of bot's own system message from ${from}`);
      return;
    }
    
    const lowerText = text.toLowerCase();
    
    console.log(`📨 Message from ${from}: "${text}"`);
    
    // Get user session to check state
    const session = await getUserSession(from);
    
    // 🆕 CHECK FOR HUMAN TAKEOVER MODE
    if (session.humanTakeover) {
      console.log(`🧑‍💼 Human takeover active for ${from} - bot is paused`);
      // Bot is silent when human agent is in control
      // Agent can still see messages and respond manually
      return;
    }
    
    // If user is in booking flow, handle it there
    if (session.state === 'BOOKING_FLOW') {
      console.log(`📦 Routing to booking flow (step: ${session.step})`);
      return await handleBookingFlow(sock, from, text, session);
    }

    // If user is in tracking flow, handle it there
    if (session.state === 'TRACKING') {
      console.log('🔍 Routing to tracking flow');
      return await handleTrackingFlow(sock, from, text);
    }
    
    let response = '';
    
    // Route messages - Bot responds to ANY message (not just greetings)
    // This is important for Facebook users who may not know to say "hi"
    if (!text) {
      return; // Empty message
    } else if (['hi', 'hello', 'hey', 'start', 'menu', 'main'].includes(lowerText)) {
      // Explicit menu request - reset to main menu
      await updateUserSession(from, { state: 'MAIN_MENU', step: null, bookingData: {} });
      response = getMainMenu();
    } else if (['1', 'book', 'booking'].includes(lowerText)) {
      // Start booking flow
      console.log(`🚀 Starting booking flow for ${from}`);
      await updateUserSession(from, { state: 'BOOKING_FLOW', step: 'START', bookingData: {} });
      return await handleBookingFlow(sock, from, '', session);
    } else if (['2', 'price', 'pricing', 'prices'].includes(lowerText)) {
      response = await getPricingMessage();
    } else if (['3', 'track', 'tracking'].includes(lowerText)) {
      await updateUserSession(from, { state: 'TRACKING', step: null });
      response = `🔍 *Track Your Shipment*

Please send your tracking number.

Format: *ZS-ABC12345*

Type *menu* to return to main menu.`;
    } else if (['4', 'collection', 'areas', 'schedule'].includes(lowerText)) {
      response = await getCollectionAreas();
    } else if (['5', 'faq', 'help'].includes(lowerText)) {
      response = `❓ *FAQ & Help*

*Common Questions:*

Q: How long does shipping take?
A: 6-8 weeks from Ireland to Zimbabwe

Q: Do you collect from my address?
A: Yes! FREE collection anywhere in Ireland

Q: What can I ship?
A: Drums, boxes, trunks, household items

Q: How do I pay?
A: Card, bank transfer, or cash on collection

For more help, contact us:
📞 +353 87 195 4910

Type *menu* to return to main menu.`;
    } else if (['6', 'contact', 'agent'].includes(lowerText)) {
      response = getContact();
    } else {
      // Default response for ANY other message
      // This ensures bot responds even if user doesn't say "hi"
      response = getMainMenu();
    }
    
    // Send response
    if (response) {
      await sock.sendMessage(from, { text: response });
      console.log(`✅ Response sent to ${from}`);
    }
    
  } catch (error) {
    console.error('❌ Error handling message:', error.message);
  }
}

/**
 * Terminal command prompt: lets you send a test message to verify outbound works.
 *   send <digits>           → sends "Bot is alive!" to that number
 *   send <digits> <text>    → sends a custom message
 *   takeover <digits>       → enable human takeover for a customer
 *   release <digits>        → release customer back to bot
 *   status <digits>         → check takeover status for a customer
 */
let cliStarted = false;
function startCliPrompt(sock) {
  if (cliStarted) return;
  cliStarted = true;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) return;
    
    // Handle takeover command
    const takeoverMatch = input.match(/^takeover\s+(\d+)$/i);
    if (takeoverMatch) {
      const digits = takeoverMatch[1];
      const jid = `${digits}@s.whatsapp.net`;
      try {
        await enableHumanTakeover(jid, 'Agent');
        console.log(`✅ Human takeover enabled for ${jid}`);
        await sock.sendMessage(jid, { 
          text: '🧑‍💼 *An agent has joined the conversation*\n\nYou are now chatting with a human agent. The bot is paused.' 
        });
        console.log('📤 Notification sent to customer');
      } catch (err) {
        console.error('❌ Takeover failed:', err.message);
      }
      return;
    }
    
    // Handle release command
    const releaseMatch = input.match(/^release\s+(\d+)$/i);
    if (releaseMatch) {
      const digits = releaseMatch[1];
      const jid = `${digits}@s.whatsapp.net`;
      try {
        await disableHumanTakeover(jid);
        console.log(`✅ Bot control restored for ${jid}`);
        await sock.sendMessage(jid, { 
          text: '🤖 *Agent has left the conversation*\n\nYou are now chatting with the automated bot again. Type *menu* to see options.' 
        });
        console.log('📤 Notification sent to customer');
      } catch (err) {
        console.error('❌ Release failed:', err.message);
      }
      return;
    }
    
    // Handle status command
    const statusMatch = input.match(/^status\s+(\d+)$/i);
    if (statusMatch) {
      const digits = statusMatch[1];
      const jid = `${digits}@s.whatsapp.net`;
      try {
        const isTakenOver = await isHumanTakeover(jid);
        const session = await getUserSession(jid);
        console.log(`📊 Status for ${jid}:`);
        console.log(`   Human Takeover: ${isTakenOver ? '✅ YES' : '❌ NO'}`);
        if (isTakenOver) {
          console.log(`   Taken over by: ${session.takenOverBy || 'Unknown'}`);
          console.log(`   Taken over at: ${session.takenOverAt || 'Unknown'}`);
        }
        console.log(`   Current state: ${session.state}`);
        console.log(`   Current step: ${session.step || 'None'}`);
      } catch (err) {
        console.error('❌ Status check failed:', err.message);
      }
      return;
    }
    
    // Handle send command
    const match = input.match(/^send\s+(\d+)(?:\s+(.+))?$/i);
    if (!match) {
      console.log('   usage: send <digits> [message]   (digits only, no + or spaces)');
      console.log('          takeover <digits>         (enable human takeover)');
      console.log('          release <digits>          (release back to bot)');
      console.log('          status <digits>           (check takeover status)');
      return;
    }
    const digits = match[1];
    const text = match[2] || 'Bot is alive! ✅ This is an outbound test from the Ireland bot.';
    const jid = `${digits}@s.whatsapp.net`;
    try {
      console.log(`📤 Sending to ${jid}: "${text}"`);
      await sock.sendMessage(jid, { text });
      console.log('✅ Sent. If it arrived, the socket is fully working.');
    } catch (err) {
      console.error('❌ Send failed:', err.message);
    }
  });
}

/**
 * Start the bot
 */
async function startBot() {
  try {
    console.log('🔌 Initializing database...');
    await initDatabase();
    
    console.log('🔌 Loading session...');
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
    
    console.log('🔌 Fetching WhatsApp version...');
    const { version } = await fetchLatestBaileysVersion();
    
    console.log('🔌 Creating WhatsApp connection...\n');
    const sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
      getMessage: async () => ({ conversation: '' }),
      // Keep-alive settings to prevent disconnection
      keepAliveIntervalMs: 10000, // Send keep-alive every 10 seconds
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      emitOwnEvents: true,
      // Session sync settings
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      // Retry configuration
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5
    });
    
    // Connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        setQr(qr);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        qrcode.generate(qr, { small: true });
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🌐 Or scan from the web: open the public URL of this Railway service`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }

      if (connection === 'close') {
        setDisconnected();
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log('\n❌ Connection closed');
        console.log(`Status: ${statusCode}`);
        console.log(`Reconnecting: ${shouldReconnect}\n`);

        if (shouldReconnect) {
          console.log('🔄 Reconnecting in 3 seconds...\n');
          setTimeout(() => startBot(), 3000);
        } else {
          console.log('🚨 Logged out. Please restart the bot and scan QR code again.\n');
          process.exit(0);
        }
      } else if (connection === 'open') {
        botConnected = true;
        setConnected(sock.user?.id || 'Unknown');
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ BOT CONNECTED SUCCESSFULLY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📱 Bot Number: ${sock.user?.id || 'Unknown'}`);
        console.log(`👤 Bot Name: ${sock.user?.name || 'Unknown'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🎯 Bot is active.');
        console.log('📥 INBOUND TEST: ask someone to send "hi" to the bot number.');
        console.log('📤 OUTBOUND TEST: type a number in this terminal to send a test message:');
        console.log('     e.g.  send 353871954910');
        console.log('     (digits only, no + or spaces)\n');
        startCliPrompt(sock);
      }
    });
    
    // Save credentials
    sock.ev.on('creds.update', saveCreds);
    
    // Suppress non-critical decryption errors (they're expected and harmless)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const msg = args.join(' ');
      // Filter out known non-critical Baileys errors
      if (msg.includes('Bad MAC') || 
          msg.includes('Failed to decrypt message') || 
          msg.includes('Session error') ||
          msg.includes('MessageCounterError') ||
          msg.includes('Key used already')) {
        // Silently ignore - these are expected during message sync
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      console.log(`\n🔔 messages.upsert event — type=${type}, count=${messages.length}`);
      for (const msg of messages) {
        console.log(`   • from=${msg.key.remoteJid} fromMe=${msg.key.fromMe} hasMessage=${!!msg.message} keys=${msg.message ? Object.keys(msg.message).join(',') : 'none'}`);
      }
      if (type !== 'notify') {
        console.log(`   ⏭️  skipping — type is "${type}" not "notify"`);
        return;
      }
      for (const msg of messages) {
        await handleMessage(sock, msg);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Bot stopped by user');
  process.exit(0);
});

// Don't let stray async errors kill the bot — log and keep running.
process.on('unhandledRejection', (reason) => {
  console.warn('⚠️  unhandledRejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.warn('⚠️  uncaughtException:', err?.message || err);
});

// Start the QR server (Railway provides PORT, locally defaults to 3000)
const QR_PORT = parseInt(process.env.PORT || '3000', 10);
console.log(`🌐 Starting QR server on port ${QR_PORT}...`);
startQrServer(QR_PORT);

// Start the bot
console.log('🚀 Starting bot...\n');

// Initialize database first
console.log('🔌 Initializing database connection...');
try {
  await initDatabase();
  console.log('✅ Database initialized successfully\n');
} catch (err) {
  console.error('❌ Database initialization failed:', err.message);
  console.error('The bot will continue but database features may not work.\n');
}

startBot();
