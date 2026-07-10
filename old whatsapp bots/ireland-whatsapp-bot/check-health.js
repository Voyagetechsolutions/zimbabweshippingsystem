#!/usr/bin/env node

/**
 * Health Check Script for Ireland WhatsApp Bot
 * 
 * Usage:
 *   node check-health.js
 *   node check-health.js https://your-bot.railway.app
 */

import https from 'https';
import http from 'http';

const url = process.argv[2] || process.env.BOT_URL || 'http://localhost:3000';

function checkHealth(url) {
  const healthUrl = url.endsWith('/') ? url + 'health' : url + '/health';
  const protocol = healthUrl.startsWith('https') ? https : http;
  
  console.log(`🔍 Checking bot health at: ${healthUrl}\n`);
  
  protocol.get(healthUrl, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const health = JSON.parse(data);
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🏥 BOT HEALTH STATUS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Status
        const statusEmoji = health.status === 'connected' ? '✅' : 
                           health.status === 'awaiting_scan' ? '⏳' : '🔄';
        console.log(`Status: ${statusEmoji} ${health.status.toUpperCase()}`);
        
        // Connection info
        if (health.connected) {
          console.log(`Phone: ${health.connectedUser || 'Unknown'}`);
          console.log(`Connected for: ${health.connectionUptimeFormatted || formatSeconds(health.connectionUptime)}`);
          
          // Warning if connection is too short (might indicate recent restart)
          if (health.connectionUptime < 300) { // Less than 5 minutes
            console.log('\n⚠️  WARNING: Bot recently connected. Monitor for stability.');
          }
          
          // Success message if connection is stable
          if (health.connectionUptime > 86400) { // More than 1 day
            console.log('\n🎉 Excellent! Bot has been stable for over 24 hours.');
          }
        } else if (health.hasQr) {
          console.log('\n📱 QR code is ready. Please scan it to connect the bot.');
          console.log(`   Visit: ${url}`);
        } else {
          console.log('\n⏳ Bot is starting up. Please wait...');
        }
        
        // Process uptime
        console.log(`\nProcess uptime: ${formatSeconds(health.processUptime)}`);
        console.log(`Last updated: ${new Date(health.updated).toLocaleString()}`);
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Exit code based on status
        if (health.status === 'connected') {
          console.log('✅ Bot is healthy and operational!\n');
          process.exit(0);
        } else if (health.status === 'awaiting_scan') {
          console.log('⚠️  Bot needs QR code scan to connect.\n');
          process.exit(1);
        } else {
          console.log('⏳ Bot is starting up.\n');
          process.exit(2);
        }
        
      } catch (error) {
        console.error('❌ Failed to parse health response:', error.message);
        console.error('Response:', data);
        process.exit(3);
      }
    });
    
  }).on('error', (error) => {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ HEALTH CHECK FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error(`Error: ${error.message}`);
    console.error(`URL: ${healthUrl}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 The bot service is not running or not accessible.');
      console.error('   - Check if the Railway service is deployed');
      console.error('   - Verify the URL is correct');
      console.error('   - Check Railway logs for errors\n');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 The domain could not be found.');
      console.error('   - Check if the URL is correct');
      console.error('   - Verify Railway deployment is active\n');
    }
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(4);
  });
}

function formatSeconds(seconds) {
  if (!seconds) return '0s';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Run the check
checkHealth(url);
