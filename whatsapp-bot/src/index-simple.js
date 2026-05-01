import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

const logger = pino({ level: 'silent' }); // Quiet logger
const SESSION_PATH = process.env.SESSION_PATH || './whatsapp-session';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true, // Show QR in terminal
    auth: state,
    getMessage: async () => ({ conversation: '' })
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\n📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:\n');
      // QR is already printed by printQRInTerminal
      
      // Also save as image
      try {
        const QRCode = await import('qrcode');
        await QRCode.toFile('qr-code.png', qr, { width: 400 });
        console.log('\n✅ QR code also saved to: qr-code.png\n');
      } catch (err) {
        console.log('Could not save QR image:', err.message);
      }
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(), 3000);
      }
    } else if (connection === 'open') {
      console.log('\n✅ BOT CONNECTED SUCCESSFULLY!');
      console.log('🤖 Bot is now listening for messages...\n');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // SIMPLE MESSAGE HANDLER - RESPONDS TO EVERYTHING
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Skip messages from bot itself
      if (msg.key.fromMe) continue;
      
      // Skip group messages
      if (msg.key.remoteJid.endsWith('@g.us')) continue;
      
      // Skip if no message content
      if (!msg.message) continue;

      const from = msg.key.remoteJid;
      const text = (
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        ''
      ).trim();

      console.log(`\n📨 Message from ${from}: "${text}"`);

      // RESPOND TO EVERY MESSAGE
      try {
        const response = `✅ *Bot is working!*\n\n` +
          `You said: "${text}"\n\n` +
          `🇮🇪 *Zimbabwe Shipping Ireland*\n\n` +
          `*Main Menu:*\n` +
          `1️⃣ Book a Shipment\n` +
          `2️⃣ View Pricing\n` +
          `3️⃣ Track Shipment\n` +
          `4️⃣ Collection Areas\n` +
          `5️⃣ FAQ & Help\n` +
          `6️⃣ Contact Us\n\n` +
          `Reply with a number (1-6) to continue.`;

        await sock.sendMessage(from, { text: response });
        console.log(`✅ Sent response to ${from}`);
      } catch (error) {
        console.error(`❌ Error sending message:`, error.message);
      }
    }
  });

  return sock;
}

// Start the bot
console.log('🚀 Starting Simple WhatsApp Bot...\n');
connectToWhatsApp().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
