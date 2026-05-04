/**
 * Quick status check for the Ireland bot
 * Run this to see if the bot is working
 */

import http from 'http';

const PORT = process.env.PORT || 3000;
const HOST = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`;

console.log(`🔍 Checking bot status at ${HOST}...\n`);

// Check health endpoint
fetch(`${HOST}/health`)
  .then(res => res.json())
  .then(data => {
    console.log('✅ Health check response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\nStatus:', data.status);
    console.log('Last updated:', new Date(data.updated).toLocaleString());
    
    if (data.status === 'connected') {
      console.log('\n✅ Bot is connected and ready!');
    } else if (data.status === 'awaiting_scan') {
      console.log('\n📱 Bot is waiting for QR scan');
      console.log(`Visit ${HOST} to scan the QR code`);
    } else {
      console.log('\n⏳ Bot is starting up...');
    }
  })
  .catch(err => {
    console.error('❌ Failed to connect to bot:');
    console.error(err.message);
    console.error('\nPossible issues:');
    console.error('1. Bot is not running (check Railway logs)');
    console.error('2. PORT environment variable is not set correctly');
    console.error('3. Railway deployment failed');
  });
