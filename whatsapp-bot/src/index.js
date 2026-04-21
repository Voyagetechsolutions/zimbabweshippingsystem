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

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

// Use persistent session path
const SESSION_PATH = process.env.SESSION_PATH || '/app/data/whatsapp-session';

async function connectToWhatsApp() {
  try {
    // Ensure session directory exists
    const fs = await import('fs');
    const path = await import('path');
    
    if (!fs.existsSync(SESSION_PATH)) {
      fs.mkdirSync(SESSION_PATH, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      getMessage: async () => ({ conversation: '' }),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      markOnlineOnConnect: true,
      // Enhanced session options
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      shouldIgnoreJid: () => false,
      patchMessageBeforeSending: (message) => {
        const requiresPatch = !!(
          message.buttonsMessage ||
          message.templateMessage ||
          message.listMessage
        );
        if (requiresPatch) {
          message = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadataVersion: 2,
                  deviceListMetadata: {},
                },
                ...message,
              },
            },
          };
        }
        return message;
      },
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('\n🔗 Scan this QR code with WhatsApp:\n');
        qrcode.generate(qr, { small: true });
        
        // Save QR code as image file for remote scanning
        try {
          const QRCode = await import('qrcode');
          await QRCode.toFile('./qr-code.png', qr, {
            width: 400,
            margin: 2
          });
          console.log('\n📸 QR code saved to: qr-code.png');
          console.log('💡 Download this file and scan it with your phone!');
          console.log('⚠️  This QR code will expire in ~30 seconds');
          console.log('🔄 A new QR code will be generated automatically\n');
        } catch (qrError) {
          console.log('Could not save QR code file:', qrError.message);
        }
      }
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log('Connection closed. Status:', statusCode);
        console.log('Should reconnect:', shouldReconnect);
        
        if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY/1000}s...`);
          
          setTimeout(() => {
            connectToWhatsApp();
          }, RECONNECT_DELAY);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('Max reconnection attempts reached. Bot stopped.');
          process.exit(1);
        } else {
          console.log('Bot logged out. Stopping...');
          process.exit(0);
        }
      } else if (connection === 'open') {
        reconnectAttempts = 0; // Reset counter on successful connection
        console.log('✅ WhatsApp Bot Connected Successfully!');
        console.log('🇮🇪 Zimbabwe Shipping Ireland Bot is now active');
        console.log('🔒 Session saved - no QR code needed on restart!');
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const message of messages) {
          if (!message.key.fromMe && message.message) {
            try {
              await handleMessage(sock, message);
            } catch (error) {
              console.error('Error handling message:', error);
            }
          }
        }
      }
    });

    // Handle process termination gracefully
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down bot gracefully...');
      sock.end();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down...');
      sock.end();
      process.exit(0);
    });

    return sock;
  } catch (error) {
    console.error('Error in connectToWhatsApp:', error);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Retrying connection in ${RECONNECT_DELAY/1000}s... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => {
        connectToWhatsApp();
      }, RECONNECT_DELAY);
    } else {
      console.error('Failed to connect after maximum attempts');
      process.exit(1);
    }
  }
}

// Initialize and start
(async () => {
  try {
    console.log('🚀 Starting Zimbabwe Shipping WhatsApp Bot (Ireland)...');
    await initializeDatabase();
    await connectToWhatsApp();
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
})();
