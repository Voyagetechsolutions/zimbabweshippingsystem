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

// QR Code tracking
let qrCodeGenerated = false;
let qrCodeTimestamp = null;
const QR_CODE_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds
const TARGET_WHATSAPP_NUMBER = process.env.TARGET_WHATSAPP_NUMBER || '+27745846005'; // Target number to send QR code

// Use persistent session path
const SESSION_PATH = process.env.SESSION_PATH || '/app/data/whatsapp-session';

// Helper function to reset QR code generation (for manual override)
function resetQRCodeGeneration() {
  qrCodeGenerated = false;
  qrCodeTimestamp = null;
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
        // Check if we should generate a new QR code
        const now = Date.now();
        const shouldGenerateQR = !qrCodeGenerated || 
          (qrCodeTimestamp && (now - qrCodeTimestamp) > QR_CODE_TIMEOUT);
        
        if (shouldGenerateQR) {
          console.log('\n🔗 Generating ONE-TIME QR code for WhatsApp connection:\n');
          qrcode.generate(qr, { small: true });
          
          // Mark QR code as generated and set timestamp
          qrCodeGenerated = true;
          qrCodeTimestamp = now;
          
          // Save QR code as image file
          try {
            const QRCode = await import('qrcode');
            const qrFileName = `./qr-code-${Date.now()}.png`;
            await QRCode.toFile(qrFileName, qr, {
              width: 400,
              margin: 2
            });
            
            console.log(`\n📸 QR code saved to: ${qrFileName}`);
            console.log('💡 This is a ONE-TIME QR code - no spam!');
            console.log('⚠️  QR code expires in 2 minutes');
            console.log(`📱 Sending QR code to: ${TARGET_WHATSAPP_NUMBER}`);
            
            // Try to send QR code to target number (this will work once bot is connected)
            setTimeout(async () => {
              try {
                if (sock.user) {
                  const qrCodeBuffer = await QRCode.toBuffer(qr, {
                    width: 400,
                    margin: 2
                  });
                  
                  const targetJid = TARGET_WHATSAPP_NUMBER.replace('+', '') + '@s.whatsapp.net';
                  
                  await sock.sendMessage(targetJid, {
                    image: qrCodeBuffer,
                    caption: `🔗 *Zimbabwe Shipping Bot - QR Code*\n\n` +
                            `📱 Scan this QR code to connect the bot\n` +
                            `⏰ Expires in 2 minutes\n` +
                            `🚫 This is a ONE-TIME code - no more spam!\n\n` +
                            `Generated: ${new Date().toLocaleString()}`
                  });
                  
                  console.log(`✅ QR code sent to ${TARGET_WHATSAPP_NUMBER}`);
                }
              } catch (sendError) {
                console.log('Note: Could not send QR code via WhatsApp (bot not connected yet)');
                console.log('QR code is available in the generated PNG file');
              }
            }, 2000); // Wait 2 seconds for potential connection
            
          } catch (qrError) {
            console.log('Could not save QR code file:', qrError.message);
          }
        } else {
          console.log('⏭️  QR code already generated recently - skipping to prevent spam');
          console.log(`⏰ Next QR code available in: ${Math.ceil((QR_CODE_TIMEOUT - (now - qrCodeTimestamp)) / 1000)}s`);
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
        console.log('✅ WhatsApp Bot Connected Successfully!');
        console.log('🇮🇪 Zimbabwe Shipping Ireland Bot is now active');
        console.log('🔒 Session saved - no QR code needed on restart!');
        
        // Send confirmation to target number
        try {
          const targetJid = TARGET_WHATSAPP_NUMBER.replace('+', '') + '@s.whatsapp.net';
          await sock.sendMessage(targetJid, {
            text: `🎉 *Zimbabwe Shipping Bot Connected!*\n\n` +
                  `✅ Bot is now active and ready to help\n` +
                  `🇮🇪 Ireland shipping services available\n` +
                  `📱 Connected: ${new Date().toLocaleString()}\n\n` +
                  `Type "help" to see available commands`
          });
          console.log(`📱 Connection confirmation sent to ${TARGET_WHATSAPP_NUMBER}`);
        } catch (confirmError) {
          console.log('Could not send connection confirmation:', confirmError.message);
        }
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
