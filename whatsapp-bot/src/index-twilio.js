import express from 'express';
import twilio from 'twilio';
import dotenv from 'dotenv';
import { handleMessage } from './handlers/messageHandler.js';
import { initializeDatabase } from './services/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., whatsapp:+14155238886

if (!accountSid || !authToken || !twilioWhatsAppNumber) {
  console.error('❌ Missing Twilio credentials in .env file');
  console.error('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER');
  process.exit(1);
}

const twilioClient = twilio(accountSid, authToken);

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Create a mock sock object that mimics Baileys interface
function createTwilioSock(client, fromNumber) {
  return {
    sendMessage: async (to, content) => {
      console.log(`📤 Twilio sending to: ${to}`);
      
      // Convert WhatsApp JID format to Twilio format
      let twilioTo = to;
      if (to.includes('@')) {
        // Extract phone number from JID format (e.g., 353871234567@s.whatsapp.net)
        const phoneNumber = to.split('@')[0];
        twilioTo = `whatsapp:+${phoneNumber}`;
      }
      
      try {
        const message = await client.messages.create({
          body: content.text,
          from: fromNumber,
          to: twilioTo
        });
        
        console.log(`✅ Twilio message sent: ${message.sid}`);
        return { key: { id: message.sid, remoteJid: to } };
      } catch (error) {
        console.error(`❌ Twilio send error:`, error.message);
        throw error;
      }
    },
    user: {
      id: fromNumber
    }
  };
}

// Webhook endpoint for incoming WhatsApp messages
app.post('/webhook', async (req, res) => {
  try {
    console.log('📨 Incoming webhook from Twilio');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const incomingMessage = req.body.Body;
    const fromNumber = req.body.From; // Format: whatsapp:+353871234567
    const messageId = req.body.MessageSid;
    
    // Convert Twilio format to Baileys JID format
    const phoneNumber = fromNumber.replace('whatsapp:+', '') + '@s.whatsapp.net';
    
    console.log(`📱 From: ${fromNumber} → ${phoneNumber}`);
    console.log(`📝 Message: ${incomingMessage}`);
    
    // Create mock message object that matches Baileys format
    const mockMessage = {
      key: {
        remoteJid: phoneNumber,
        fromMe: false,
        id: messageId
      },
      message: {
        conversation: incomingMessage
      }
    };
    
    // Create Twilio sock adapter
    const sock = createTwilioSock(twilioClient, twilioWhatsAppNumber);
    
    // Handle the message using existing handler
    await handleMessage(sock, mockMessage);
    
    // Respond to Twilio (required to acknowledge receipt)
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    res.status(500).send('Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Zimbabwe Shipping WhatsApp Bot (Twilio)',
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Zimbabwe Shipping WhatsApp Bot</title></head>
      <body style="font-family: Arial; padding: 40px; max-width: 600px; margin: 0 auto;">
        <h1>🇮🇪 Zimbabwe Shipping WhatsApp Bot</h1>
        <p><strong>Status:</strong> ✅ Running (Twilio)</p>
        <p><strong>Webhook URL:</strong> ${process.env.WEBHOOK_URL || 'Not configured'}/webhook</p>
        <p><strong>WhatsApp Number:</strong> ${twilioWhatsAppNumber}</p>
        <hr>
        <h3>Setup Instructions:</h3>
        <ol>
          <li>Copy your webhook URL: <code>${process.env.WEBHOOK_URL || 'https://your-domain.com'}/webhook</code></li>
          <li>Go to <a href="https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox" target="_blank">Twilio WhatsApp Sandbox</a></li>
          <li>Paste the webhook URL in "WHEN A MESSAGE COMES IN" field</li>
          <li>Set method to POST</li>
          <li>Save configuration</li>
          <li>Send a message to your Twilio WhatsApp number to test</li>
        </ol>
      </body>
    </html>
  `);
});

// Initialize and start
(async () => {
  try {
    console.log('🚀 Starting Zimbabwe Shipping WhatsApp Bot (Twilio)...');
    console.log('📞 Twilio Account SID:', accountSid);
    console.log('📱 WhatsApp Number:', twilioWhatsAppNumber);
    
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Webhook URL: ${process.env.WEBHOOK_URL || `http://localhost:${PORT}`}/webhook`);
      console.log(`📊 Status page: ${process.env.WEBHOOK_URL || `http://localhost:${PORT}`}/`);
      console.log('\n⚠️  IMPORTANT: Configure this webhook URL in Twilio Console');
      console.log('   https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox\n');
    });
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
})();
