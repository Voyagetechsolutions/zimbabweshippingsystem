# Zimbabwe Shipping WhatsApp Bot (Ireland)

A WhatsApp bot for Zimbabwe Shipping's Ireland operations, built with Baileys library and deployed on Railway.

## Features

- 🔐 Persistent session storage (no QR code needed after first connection)
- 📱 QR code generation and HTTP download endpoint
- 🔄 Automatic reconnection with exponential backoff
- 🗄️ PostgreSQL database integration
- 📊 Comprehensive logging and error handling
- 🧹 Automatic QR code cleanup after successful connection

## Deployment on Railway

### Prerequisites

1. Railway account
2. PostgreSQL database provisioned on Railway
3. Environment variables configured

### Environment Variables

```env
# Database (automatically provided by Railway PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Session storage path
SESSION_PATH=/app/data/whatsapp-session

# Railway domain (automatically provided)
RAILWAY_PUBLIC_DOMAIN=your-app.railway.app

# Optional: Logging level
LOG_LEVEL=info
```

### Deployment Steps

1. **Connect Repository to Railway**
   - Link your GitHub repository to Railway
   - Railway will auto-detect the Dockerfile

2. **Add PostgreSQL Database**
   - Add PostgreSQL service from Railway marketplace
   - DATABASE_URL will be automatically injected

3. **Deploy**
   - Railway will build and deploy automatically
   - Check logs for QR code URL

4. **Connect WhatsApp**
   - Open the QR code URL from logs: `https://your-app.railway.app/qr-code`
   - Download the QR code image
   - Scan with WhatsApp on your phone within 60 seconds
   - Bot will connect and save session

5. **Verify Connection**
   - Check logs for "✅ WhatsApp Bot Connected Successfully!"
   - Session is now saved - no QR code needed on restart

## API Endpoints

### GET /qr-code
Download the latest QR code for WhatsApp connection.

**Response:** PNG image file

**Status Codes:**
- 200: QR code available
- 404: No QR code generated yet
- 500: Server error

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "WhatsApp Bot QR Server is running"
}
```

### GET /
Information about available endpoints.

**Response:**
```json
{
  "message": "Zimbabwe Shipping WhatsApp Bot - QR Code Server",
  "endpoints": {
    "download": "/qr-code - Download the latest QR code",
    "health": "/health - Health check"
  },
  "qrCodeAvailable": true,
  "qrCodeCount": 1
}
```

## Connection Process

1. **First Connection**
   - Bot starts and generates QR code
   - QR code saved to `/app/data/qr-code-latest.png`
   - QR code accessible via HTTP endpoint
   - User scans QR code with WhatsApp
   - Session credentials saved to PostgreSQL
   - Old QR codes automatically cleaned up

2. **Subsequent Connections**
   - Bot uses saved session from PostgreSQL
   - No QR code needed
   - Automatic reconnection on disconnects

## Handling Sync Errors

The bot may show sync errors after connection:
```
failed to sync state from version
tried remove, but no previous op
```

**These are normal and usually non-critical.** The bot includes:
- Graceful error handling for sync issues
- Connection stability monitoring
- Automatic recovery mechanisms
- `syncFullHistory: false` to reduce sync load

## Troubleshooting

### QR Code Not Loading
- Check Railway logs for QR code generation messages
- Verify `/app/data` directory exists and is writable
- Ensure PORT environment variable is set correctly

### Connection Drops After Scan
- Sync errors are normal - monitor if connection stays stable
- Check Railway logs for disconnect reasons
- Verify DATABASE_URL is correct
- Ensure session directory has write permissions

### Bot Not Responding to Messages
- Check message handler implementation
- Verify database connection
- Review logs for error messages

### Max Reconnection Attempts Reached
- Check network connectivity
- Verify WhatsApp account is not banned
- Clear session and reconnect with new QR code

## Monitoring

Monitor the bot through Railway logs:

```bash
# Key log messages to watch for:
✅ WhatsApp Bot Connected Successfully!
🔒 Session saved - no QR code needed on restart!
📚 Received X messages, Y chats, Z contacts
⚠️ Connection error: [error message]
🔄 Reconnection attempt X/5
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run in development mode
npm run dev
```

### Project Structure

```
whatsapp-bot/
├── src/
│   ├── index.js           # Main bot entry point
│   ├── qrServer.js        # QR code HTTP server
│   ├── handlers/          # Message handlers
│   ├── services/          # Database and external services
│   ├── flows/             # Conversation flows
│   ├── menus/             # Menu definitions
│   └── utils/             # Utility functions
├── Dockerfile             # Container configuration
├── .dockerignore          # Docker ignore rules
├── package.json           # Dependencies
└── README.md             # This file
```

## Security Notes

- Session credentials are stored securely in PostgreSQL
- QR codes are automatically cleaned up after connection
- No sensitive data logged to console
- Environment variables used for all configuration

## Support

For issues or questions:
1. Check Railway logs first
2. Review this README
3. Contact development team

## License

MIT
