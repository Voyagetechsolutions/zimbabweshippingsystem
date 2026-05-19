/**
 * UK WhatsApp Bot - Simple & Clean
 * Zimbabwe Shipping UK Branch
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
import { getUserSession, updateUserSession, enableHumanTakeover, disableHumanTakeover, isHumanTakeover, registerJidAlias, getLidForDigits } from './utils/sessions.js';
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
console.log('║         🇬🇧 UK WHATSAPP BOT 🇿🇼                              ║');
console.log('║         Zimbabwe Shipping UK Branch                          ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

/**
 * Main Menu
 */
export function getMainMenu() {
  return `Hello! 👋

🇬🇧 *Zimbabwe Shipping - UK*

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
      '🔹 *London Route* — Date TBC',
      '🔹 *Birmingham Route* — Date TBC',
      '🔹 *Manchester Route* — Date TBC',
      '🔹 *Leeds Route* — Date TBC',
      '🔹 *Cardiff Route* — Date TBC',
      '🔹 *Bournemouth Route* — Date TBC',
      '🔹 *Nottingham Route* — Date TBC',
      '🔹 *Brighton Route* — Date TBC',
      '🔹 *Southend Route* — Date TBC',
      '🔹 *Northampton Route* — Date TBC',
    ].join('\n');
  }

  return `📍 *Collection Areas — UK*

We offer FREE collection across England!

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

🌐 Website: www.zimbabweshipping.com

*Office Hours:*
Open daily: 7:00 AM - 8:00 PM

⏱️ *Response times:*
• Off-peak: 0–15 minutes
• Peak times: 30–45 minutes

Type *menu* to return to main menu.`;
}

/**
/**
 * Handle incoming messages
 */
async function handleMessage(sock, msg) {
  try {
    const from = msg.key.remoteJid;
    const fromMe = msg.key.fromMe;
    const isGroup = from?.endsWith('@g.us');
    const isNewsletter = from?.endsWith('@newsletter');

    console.log(`➡️  handleMessage: from=${from} fromMe=${fromMe} isGroup=${isGroup}`);

    if (isGroup || isNewsletter) {
      console.log(`   ⏭️  skip — ${isGroup ? 'group' : 'newsletter'} chat`);
      return;
    }
    if (!msg.message) {
      console.log('   ⏭️  skip — no message content (likely encrypted/unavailable)');
      return;
    }

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

    // Build phone<->LID alias map
    if (msg.participant && from.endsWith('@lid')) registerJidAlias(msg.participant, from);
    if (msg.key?.participant && from.endsWith('@lid')) registerJidAlias(msg.key.participant, from);

    // -- AGENT COMMANDS (any fromMe message starting with /) --
    if (fromMe && text && text.startsWith('/')) {
      console.log(`🧑💼 Agent command detected: "${text}"`);
      const takeoverMatch = text.match(/\/takeover(?:\s+(\d+))?/i);
      const releaseMatch = text.match(/\/release(?:\s+(\d+))?/i);
      const statusMatch = text.match(/\/status(?:\s+(\d+))?/i);

      if (takeoverMatch) {
        // If a number is provided, use it. Otherwise, target the chat where the command was sent.
        const targetNumber = takeoverMatch[1] ? `${takeoverMatch[1]}@s.whatsapp.net` : from;
        
        await enableHumanTakeover(targetNumber, 'Agent');
        try { await sock.sendMessage(targetNumber, { 
          text: '🧑‍💼 *An agent has joined the conversation*\n\nYou are now chatting with a human agent. The bot is paused for up to 30 minutes.' 
        }); } catch (e) { /* target may not exist */ }
        
        // If sent from the bot's own "Notes to Self" chat to target someone else, confirm back to the agent
        if (takeoverMatch[1] && !from.includes(takeoverMatch[1])) {
          await sock.sendMessage(from, { text: `✅ Takeover enabled for ${takeoverMatch[1]}\n\n⏰ Auto-releases in 30 min, or use /release ${takeoverMatch[1]}` });
        }
        console.log(`✅ Takeover enabled for ${targetNumber}`);
        return;
      }
      
      if (releaseMatch) {
        const targetNumber = releaseMatch[1] ? `${releaseMatch[1]}@s.whatsapp.net` : from;
        await disableHumanTakeover(targetNumber);
        
        try { await sock.sendMessage(targetNumber, { 
          text: '🤖 *Agent has left the conversation*\n\nYou are now chatting with the automated bot again. Type *menu* to see options.' 
        }); } catch (e) { /* target may not exist */ }
        
        if (releaseMatch[1] && !from.includes(releaseMatch[1])) {
          await sock.sendMessage(from, { text: `✅ Bot control restored for ${releaseMatch[1]}` });
        }
        console.log(`✅ Bot control restored for ${targetNumber}`);
        return;
      }
      
      if (statusMatch) {
        const targetNumber = statusMatch[1] ? `${statusMatch[1]}@s.whatsapp.net` : from;
        const isTakenOver = await isHumanTakeover(targetNumber);
        const targetSession = await getUserSession(targetNumber);
        
        let statusMsg = `📊 *Status for ${statusMatch[1] || 'this chat'}*\n\n`;
        statusMsg += `Human Takeover: ${isTakenOver ? '✅ YES' : '❌ NO'}\n`;
        if (isTakenOver) {
          statusMsg += `Taken over by: ${targetSession.takenOverBy || 'Unknown'}\n`;
          statusMsg += `Taken over at: ${targetSession.takenOverAt || 'Unknown'}\n`;
        }
        statusMsg += `Current state: ${targetSession.state}\n`;
        statusMsg += `Current step: ${targetSession.step || 'None'}`;
        await sock.sendMessage(from, { text: statusMsg });
        console.log(`📊 Status sent for ${targetNumber}`);
        return;
      }
      
      // Unknown / command — show help
      const helpMsg = `🧑‍💼 *Agent Commands*\n\n` +
        `*Directly in a customer's chat:*\n` +
        `*/takeover* — Pause bot for this customer\n` +
        `*/release* — Resume bot for this customer\n` +
        `*/status* — Check bot status\n\n` +
        `*From your own chat (requires number):*\n` +
        `*/takeover 447123456789*\n` +
        `*/release 447123456789*`;
      await sock.sendMessage(from, { text: helpMsg });
      return;
    }

    if (fromMe) {
      console.log('   ⏭️  skip — fromMe (not an agent command)');
      return;
    }

    const lowerText = text.toLowerCase();
    console.log(`📨 Message from ${from}: "${text}"`);

    const session = await getUserSession(from);

    if (await isHumanTakeover(from)) {
      console.log(`🧑💼 Human takeover active for ${from} - bot is paused`);
      return;
    }

    if (session.state === 'BOOKING_FLOW') {
      console.log(`📦 Routing to booking flow (step: ${session.step})`);
      return await handleBookingFlow(sock, from, text, session);
    }
    if (session.state === 'TRACKING') {
      console.log('🔍 Routing to tracking flow');
      return await handleTrackingFlow(sock, from, text);
    }

    let response = '';
    if (!text) {
      return;
    } else if (['hi', 'hello', 'hey', 'start', 'menu', 'main'].includes(lowerText)) {
      await updateUserSession(from, { state: 'MAIN_MENU', step: null, bookingData: {} });
      response = getMainMenu();
    } else if (['1', 'book', 'booking'].includes(lowerText)) {
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
A: 6-8 weeks from UK to Zimbabwe

Q: Do you collect from my address?
A: Yes! FREE collection anywhere in England

Q: What can I ship?
A: Drums, boxes, household items, electronics

Q: Can I buy a drum from you?
A: Yes - metal drums and plastic barrels available at collection.

Q: How do I pay?
A: Card, bank transfer, or cash on collection

For more help, contact us:
📞 +44 7584 100552

Type *menu* to return to main menu.`;
    } else if (['6', 'contact', 'agent'].includes(lowerText)) {
      response = getContact();
    } else {
      response = getMainMenu();
    }

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
 */
let cliStarted = false;
function startCliPrompt(sock) {
  if (cliStarted) return;
  cliStarted = true;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) return;
    const match = input.match(/^send\s+(\d+)(?:\s+(.+))?$/i);
    if (!match) {
      console.log('   usage: send <digits> [message]   (digits only, no + or spaces)');
      return;
    }
    const digits = match[1];
    const text = match[2] || 'Bot is alive! ✅ This is an outbound test from the UK bot.';
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
      getMessage: async () => ({ conversation: '' })
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
        console.log('Steps:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Go to Settings → Linked Devices');
        console.log('3. Tap "Link a Device"');
        console.log('4. Scan the QR code above');
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
        console.log('     e.g.  send 447584100552');
        console.log('     (digits only, no + or spaces)\n');
        startCliPrompt(sock);
      }
    });
    
    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Build LID<->phone alias map from WhatsApp contact sync
    sock.ev.on('contacts.upsert', (contacts) => {
      for (const c of contacts) {
        if (c.id && c.lid) registerJidAlias(c.id, c.lid);
      }
    });
    sock.ev.on('contacts.update', (updates) => {
      for (const c of updates) {
        if (c.id && c.lid) registerJidAlias(c.id, c.lid);
      }
    });
    
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
startQrServer(QR_PORT);

// Start the bot
console.log('🚀 Starting bot...\n');

// Initialize database first
console.log('🔌 Initializing database connection...');
await initDatabase();

startBot();
