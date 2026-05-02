#!/usr/bin/env node

/**
 * SUPER SIMPLE WhatsApp Bot Test
 * This will respond to EVERY message with "Bot is working!"
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';

const logger = pino({ level: 'error' }); // Only show errors
const SESSION_PATH = './whatsapp-session';

console.log('🚀 Starting SUPER SIMPLE WhatsApp Bot Test...\n');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: true,
    getMessage: async () => ({ conversation: '' })
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('📱 QR CODE ABOVE - Scan with your WhatsApp!\n');
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('Reconnecting...');
        setTimeout(() => startBot(), 3000);
      }
    } else if (connection === 'open') {
      console.log('\n✅ CONNECTED!');
      console.log(`📱 Bot Number: ${sock.user?.id}`);
      console.log(`👤 Bot Name: ${sock.user?.name}`);
      console.log('\n🎯 Now send ANY message to this number from ANOTHER phone.');
      console.log('   The bot will respond with "Bot is working!"\n');
      console.log('⏳ Waiting for messages...\n');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // SUPER SIMPLE MESSAGE HANDLER
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`\n📬 Event: ${type}, Messages: ${messages.length}`);
    
    for (const msg of messages) {
      try {
        const from = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const isGroup = from?.endsWith('@g.us');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📨 From: ${from}`);
        console.log(`   From Me: ${fromMe}`);
        console.log(`   Is Group: ${isGroup}`);
        console.log(`   Has Message: ${!!msg.message}`);
        
        // Skip if from bot itself
        if (fromMe) {
          console.log('⏭️  Skipping (from bot itself)');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          continue;
        }
        
        // Skip groups
        if (isGroup) {
          console.log('⏭️  Skipping (group message)');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          continue;
        }
        
        // Skip if no message
        if (!msg.message) {
          console.log('⏭️  Skipping (no message content)');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          continue;
        }
        
        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          ''
        ).trim();
        
        console.log(`   Text: "${text}"`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // RESPOND TO EVERY MESSAGE
        console.log('📤 Sending response...');
        
        const response = `✅ *BOT IS WORKING!*\n\n` +
          `You sent: "${text}"\n\n` +
          `Time: ${new Date().toLocaleTimeString()}\n` +
          `Your number: ${from}\n\n` +
          `🎉 The bot is responding correctly!`;
        
        await sock.sendMessage(from, { text: response });
        
        console.log('✅ Response sent successfully!\n');
        console.log('🎉 TEST PASSED! Bot is working!\n');
        
      } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
      }
    }
  });
}

startBot().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
