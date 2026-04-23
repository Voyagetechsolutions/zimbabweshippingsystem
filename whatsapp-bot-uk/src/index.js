import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import dotenv from 'dotenv';
import { handleMessage } from './handlers/messageHandler.js';
import { initializeDatabase } from './services/database.js';

dotenv.config();

const logger = pino({ level: 'info' });

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    process.env.SESSION_PATH || './whatsapp-session'
  );
  
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => ({ conversation: '' })
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\n🔗 Scan this QR code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      
      // Save QR code as image file for remote scanning
      const QRCode = await import('qrcode');
      await QRCode.toFile('./qr-code.png', qr, {
        width: 400,
        margin: 2
      });
      console.log('\n📸 QR code saved to: qr-code.png');
      console.log('💡 Download this file and scan it with your phone!\n');
    }
    
    if (connection === 'close') {
      const shouldReconnect = 
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Bot Connected Successfully!');
      console.log('🇬🇧 Zimbabwe Shipping UK Bot is now active');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`📨 messages.upsert type=${type} count=${messages.length}`);
    if (type === 'notify') {
      for (const message of messages) {
        const from = message.key.remoteJid;
        const fromMe = message.key.fromMe;
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '[non-text]';
        console.log(`  → from=${from} fromMe=${fromMe} text="${text}"`);
        if (from.endsWith('@lid')) {
          console.log('  LID message full key:', JSON.stringify(message.key));
          console.log('  LID message verifiedBizName:', message.verifiedBizName);
          console.log('  LID message pushName:', message.pushName);
        }
        if (!fromMe && message.message) {
          await handleMessage(sock, message);
        }
      }
    }
  });

  return sock;
}

// Initialize and start
(async () => {
  try {
    console.log('🚀 Starting Zimbabwe Shipping WhatsApp Bot (UK)...');
    await initializeDatabase();
    await connectToWhatsApp();
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
})();
