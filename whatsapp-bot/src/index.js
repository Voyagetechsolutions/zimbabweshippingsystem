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
import { startQRServer } from './qrServer.js';

dotenv.config();

const logger = pino({ level: 'info' });

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

// QR Code tracking
let qrCodeGenerated = false;
let qrCodeTimestamp = null;
const QR_CODE_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
let currentQRCodePath = null;

// Use persistent session path
const SESSION_PATH = process.env.SESSION_PATH || '/app/data/whatsapp-session';

// Helper function to reset QR code generation (for manual override)
function resetQRCodeGeneration() {
  qrCodeGenerated = false;
  qrCodeTimestamp = null;
  currentQRCodePath = null;
  console.log('🔄 QR code generation reset - next QR will be generated');
}

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
        // Always generate and display QR code, but limit file saves to prevent spam
        console.log('\n🔗 New QR code received from WhatsApp:\n');
        qrcode.generate(qr, { small: true });
        
        // Check if we should save a new QR code file
        const now = Date.now();
        const shouldSaveQR = !qrCodeGenerated || 
          (qrCodeTimestamp && (now - qrCodeTimestamp) > QR_CODE_TIMEOUT);
        
        if (shouldSaveQR) {
          qrCodeGenerated = true;
          qrCodeTimestamp = now;
          
          // Save QR code as image file
          try {
            const QRCode = await import('qrcode');
            const qrFileName = `/app/data/qr-code-${Date.now()}.png`;
            await QRCode.toFile(qrFileName, qr, {
              width: 400,
              margin: 2
            });
            
            currentQRCodePath = qrFileName;
            
            const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
              ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/qr-code`
              : 'https://zimship-bot-production.up.railway.app/qr-code';
            
            console.log(`\n📸 QR code saved to: ${qrFileName}`);
            console.log('💡 QR code is valid for 12 hours');
            console.log('⏰ Expires at:', new Date(now + QR_CODE_TIMEOUT).toLocaleString());
            console.log('\n🔗 DOWNLOAD LINK:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📥 ${railwayUrl}`);
            console.log('💡 Open this URL in your browser to download the QR code');
            console.log('📱 Then scan it with your WhatsApp device');
            console.log('⚠️  IMPORTANT: Scan within 60 seconds!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
          } catch (qrError) {
            console.log('Could not save QR code file:', qrError.message);
            console.log('💡 QR code is displayed above - scan it with your phone!');
          }
        } else {
          // Still save the latest QR code even if within timeout
          try {
            const QRCode = await import('qrcode');
            const qrFileName = `/app/data/qr-code-latest.png`;
            await QRCode.toFile(qrFileName, qr, {
              width: 400,
              margin: 2
            });
            currentQRCodePath = qrFileName;
            console.log('📸 Updated QR code saved (latest)');
            console.log('⚠️  Scan this QR code within 60 seconds!');
          } catch (err) {
            console.log('Could not update QR code file');
          }
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
        qrCodeGenerated = false; // Reset QR code flag for future use
        currentQRCodePath = null;
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
    
    // Start QR code download server
    startQRServer();
    
    await initializeDatabase();
    await connectToWhatsApp();
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
})();
