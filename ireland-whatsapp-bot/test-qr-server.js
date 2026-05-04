/**
 * Test QR server independently
 * This helps diagnose if the issue is with the QR server or the bot
 */

import { startQrServer, setQr, setConnected } from './qr-server.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

console.log('🧪 Testing QR server...\n');
console.log(`Starting server on port ${PORT}...`);

startQrServer(PORT);

console.log('\n✅ QR server started!');
console.log(`\n📱 Visit http://localhost:${PORT} to see the page`);
console.log('\nThe page should show: "Starting up — waiting for WhatsApp to issue a QR code…"\n');

// Simulate QR code after 3 seconds
setTimeout(() => {
  console.log('📱 Simulating QR code generation...');
  setQr('https://wa.me/qr/FAKE-QR-CODE-FOR-TESTING');
  console.log('✅ QR code set! Refresh the page to see it.');
  console.log('   (It will show a real QR code that you can scan, but it won\'t work)\n');
}, 3000);

// Simulate connection after 10 seconds
setTimeout(() => {
  console.log('✅ Simulating successful connection...');
  setConnected('353871234567@s.whatsapp.net');
  console.log('✅ Connection set! Refresh the page to see the success message.\n');
}, 10000);

console.log('Press Ctrl+C to stop the test server.\n');
