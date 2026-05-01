#!/usr/bin/env node

/**
 * WhatsApp Bot Connection Test
 * 
 * This script tests if the bot can:
 * 1. Connect to WhatsApp
 * 2. Receive messages
 * 3. Send responses
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

const logger = pino({ level: 'error' }); // Only show errors
const SESSION_PATH = process.env.SESSION_PATH || './whatsapp-session';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║         WHATSAPP BOT CONNECTION TEST                         ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration:');
console.log(`   Session Path: ${SESSION_PATH}`);
console.log(`   Node Version: ${process.version}`);
console.log(`   Platform: ${process.platform}\n`);

async function testBot() {
  try {
    console.log('🔌 Step 1: Loading session...');
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    console.log('✅ Session loaded\n');

    console.log('🔌 Step 2: Fetching WhatsApp version...');
    const { version } = await fetchLatestBaileysVersion();
    console.log(`✅ Using version: ${version.join('.')}\n`);

    console.log('🔌 Step 3: Creating WhatsApp socket...');
    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
      auth: state,
      getMessage: async () => ({ conversation: '' })
    });
    console.log('✅ Socket created\n');

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 QR CODE GENERATED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n👆 Scan the QR code above with WhatsApp\n');
        console.log('Steps:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Go to Settings → Linked Devices');
        console.log('3. Tap "Link a Device"');
        console.log('4. Scan the QR code above\n');
        
        // Save QR as image
        try {
          const QRCode = await import('qrcode');
          await QRCode.toFile('qr-code.png', qr, { width: 400 });
          console.log('✅ QR code saved to: qr-code.png\n');
        } catch (err) {
          console.log('⚠️  Could not save QR image\n');
        }
      }
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ CONNECTION CLOSED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Status Code: ${statusCode}`);
        console.log(`Should Reconnect: ${shouldReconnect}\n`);
        
        if (!shouldReconnect) {
          console.log('🚨 Session logged out. Please restart and scan QR code again.\n');
          process.exit(0);
        }
      } else if (connection === 'open') {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ BOT CONNECTED SUCCESSFULLY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Bot Phone: ${sock.user?.id || 'Unknown'}`);
        console.log(`Bot Name: ${sock.user?.name || 'Unknown'}`);
        console.log('\n🎯 TEST STATUS:');
        console.log('   ✅ Connection: SUCCESS');
        console.log('   ✅ Authentication: SUCCESS');
        console.log('   ✅ Socket: ACTIVE\n');
        console.log('📱 Now send a message to this WhatsApp number from another phone.');
        console.log('   The bot will respond with a test message.\n');
        console.log('⏳ Waiting for messages... (Press Ctrl+C to stop)\n');
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      console.log(`\n📬 Received ${messages.length} message(s) - type: ${type}`);
      
      if (type !== 'notify') {
        console.log('⏭️  Skipping (not a notify event)\n');
        return;
      }

      for (const msg of messages) {
        const from = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const isGroup = from.endsWith('@g.us');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📨 MESSAGE DETAILS:');
        console.log(`   From: ${from}`);
        console.log(`   From Me: ${fromMe}`);
        console.log(`   Is Group: ${isGroup}`);
        console.log(`   Has Message: ${!!msg.message}`);
        
        if (fromMe) {
          console.log('⏭️  Skipping (message from bot itself)\n');
          continue;
        }
        
        if (isGroup) {
          console.log('⏭️  Skipping (group message)\n');
          continue;
        }
        
        if (!msg.message) {
          console.log('⏭️  Skipping (no message content)\n');
          continue;
        }

        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          ''
        ).trim();

        console.log(`   Text: "${text}"`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Send test response
        try {
          console.log('📤 Sending test response...');
          
          const response = `✅ *TEST SUCCESSFUL!*\n\n` +
            `Your message: "${text}"\n\n` +
            `🤖 Bot Status: WORKING\n` +
            `⏰ Time: ${new Date().toLocaleString()}\n` +
            `📱 Your Number: ${from}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🇮🇪 *Zimbabwe Shipping Ireland*\n\n` +
            `*Main Menu:*\n` +
            `1️⃣ Book a Shipment\n` +
            `2️⃣ View Pricing\n` +
            `3️⃣ Track Shipment\n` +
            `4️⃣ Collection Areas\n` +
            `5️⃣ FAQ & Help\n` +
            `6️⃣ Contact Us\n\n` +
            `Reply with a number to continue.`;

          await sock.sendMessage(from, { text: response });
          
          console.log('✅ Response sent successfully!\n');
          console.log('🎉 TEST PASSED! Bot is working correctly.\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } catch (error) {
          console.log('❌ Failed to send response!');
          console.log(`   Error: ${error.message}\n`);
          console.log('🚨 TEST FAILED! Bot cannot send messages.\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }
      }
    });

  } catch (error) {
    console.log('\n❌ TEST FAILED!');
    console.log(`Error: ${error.message}\n`);
    console.log('Stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test stopped by user');
  process.exit(0);
});

// Start test
testBot();
