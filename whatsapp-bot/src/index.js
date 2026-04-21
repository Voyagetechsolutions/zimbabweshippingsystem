import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import dotenv from 'dotenv';
import { handleMessage } from './handlers/messageHandler.js';
import { initializeDatabase } from './services/database.js';
import { startQRServer } from './qrServer.js';

dotenv.config();

const logger = pino({ 
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: false,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

let reconnectAttempts = 0;
const BASE_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_DELAY = 60000;

function nextReconnectDelay() {
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, Math.max(0, reconnectAttempts - 1)), MAX_RECONNECT_DELAY);
  return delay;
}

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
      browser: Browsers.ubuntu('Chrome'),
      getMessage: async () => ({ conversation: '' }),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      markOnlineOnConnect: true,
      // Enhanced session options to reduce sync errors
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      shouldIgnoreJid: () => false,
      // Retry configuration
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
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
        reconnectAttempts = 0;
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
              ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/`
              : 'https://zimship-bot-production.up.railway.app/';

            console.log(`\n📸 Latest QR saved to: ${qrFileName}`);
            console.log('\n🔗 OPEN THIS PAGE TO SCAN:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🖥️  ${railwayUrl}`);
            console.log('💡 Page auto-refreshes every 3s — keep it open and scan from screen');
            console.log('📱 WhatsApp rotates the QR every ~30s; the viewer always shows the current one');
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
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  CONNECTION CLOSED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Status Code:', statusCode);
        console.log('Reason:', statusCode === DisconnectReason.loggedOut ? 'LOGGED OUT (401)' : 'Connection Lost');
        console.log('Should Reconnect:', shouldReconnect);
        
        if (statusCode === DisconnectReason.loggedOut) {
          console.log('\n🚨 SESSION LOGGED OUT (401 ERROR)');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('This means the WhatsApp session has been invalidated.');
          console.log('\n📋 RECOVERY STEPS:');
          console.log('1. Restart this Railway service');
          console.log('2. Wait for new QR code generation');
          console.log('3. Scan the new QR code with WhatsApp');
          console.log('4. Verify connection success');
          console.log('\n📖 For detailed recovery guide, see:');
          console.log('   whatsapp-bot/SESSION_401_RECOVERY.md');
          console.log('\n💡 COMMON CAUSES:');
          console.log('   - Manual logout from WhatsApp device');
          console.log('   - Multiple bot instances running');
          console.log('   - WhatsApp security check');
          console.log('   - Session expiration');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          
          // Clear session files before exit
          try {
            const fs = await import('fs');
            const path = await import('path');
            
            if (fs.existsSync(SESSION_PATH)) {
              const files = fs.readdirSync(SESSION_PATH);
              for (const file of files) {
                const filePath = path.join(SESSION_PATH, file);
                fs.unlinkSync(filePath);
              }
              console.log('🧹 Cleared invalid session files');
              console.log('✅ Ready for fresh QR code on restart\n');
            }
          } catch (cleanupError) {
            console.log('⚠️  Could not clear session files:', cleanupError.message);
          }
          
          process.exit(0);
        }
        
        if (shouldReconnect) {
          reconnectAttempts++;
          const delay = nextReconnectDelay();
          console.log(`\n🔄 Reconnection attempt ${reconnectAttempts} in ${delay/1000}s (exponential backoff, no limit)...`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          setTimeout(() => {
            connectToWhatsApp();
          }, delay);
        }
      } else if (connection === 'open') {
        reconnectAttempts = 0; // Reset counter on successful connection
        qrCodeGenerated = false; // Reset QR code flag for future use
        currentQRCodePath = null;
        console.log('✅ WhatsApp Bot Connected Successfully!');
        console.log('🇮🇪 Zimbabwe Shipping Ireland Bot is now active');
        console.log('🔒 Session saved - no QR code needed on restart!');
        
        // Clean up old QR code files after successful connection
        try {
          const fs = await import('fs');
          const path = await import('path');
          const dataPath = '/app/data';
          
          if (fs.existsSync(dataPath)) {
            const files = fs.readdirSync(dataPath);
            const qrFiles = files.filter(f => f.startsWith('qr-code-') && f.endsWith('.png'));
            
            for (const file of qrFiles) {
              const filePath = path.join(dataPath, file);
              fs.unlinkSync(filePath);
              console.log(`🧹 Cleaned up QR code: ${file}`);
            }
          }
        } catch (cleanupError) {
          console.log('Note: Could not clean up QR codes:', cleanupError.message);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Handle sync errors gracefully (common with Baileys, usually non-critical)
    sock.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }) => {
      console.log(`📚 Received ${messages.length} messages, ${chats.length} chats, ${contacts.length} contacts (isLatest: ${isLatest})`);
    });

    // Handle connection errors
    sock.ev.on('connection.error', (error) => {
      console.error('⚠️ Connection error:', error.message);
      // Don't crash on connection errors, let connection.update handle reconnection
    });

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
    reconnectAttempts++;
    const delay = nextReconnectDelay();
    console.log(`Retrying connection in ${delay/1000}s (attempt ${reconnectAttempts})...`);
    setTimeout(() => {
      connectToWhatsApp();
    }, delay);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled promise rejection (non-fatal):', reason);
});
process.on('uncaughtException', (error) => {
  console.error('⚠️  Uncaught exception (non-fatal):', error);
});

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
