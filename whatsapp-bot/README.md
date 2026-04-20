# Zimbabwe Shipping WhatsApp Bot - Ireland

A comprehensive WhatsApp bot for handling shipping bookings from Ireland to Zimbabwe. The bot provides full booking functionality, pricing information, shipment tracking, and customer support through WhatsApp.

## 🌟 Features

### Core Functionality
- ✅ **Complete Booking System** - Full 5-step booking process via WhatsApp
- 💰 **Dynamic Pricing** - Automatic price calculation based on quantity
- 📦 **Shipment Tracking** - Real-time tracking with status updates
- 👤 **User Recognition** - Remembers users by phone number and name
- 🇮🇪 **Ireland-Specific** - All 7 Ireland collection routes supported
- 💳 **Payment Options** - Multiple payment methods supported
- 📍 **Collection Scheduling** - Automatic route assignment based on city

### User Experience
- 🤖 **Conversational Interface** - Natural language interactions
- 📱 **Mobile-First** - Optimized for WhatsApp mobile experience
- 🔄 **Session Management** - Maintains conversation context
- ❓ **FAQ System** - Comprehensive help and support
- 🌐 **Multi-Language Ready** - Easy to extend for multiple languages

### Technical Features
- 🔐 **Secure** - Encrypted communications via WhatsApp
- 💾 **Database Integration** - Full Supabase integration
- 📊 **Session Caching** - Fast response times with in-memory cache
- 🔄 **Auto-Reconnect** - Handles disconnections gracefully
- 📝 **Logging** - Comprehensive logging for debugging

## 📋 Prerequisites

- Node.js 18+ installed
- WhatsApp Business account or personal WhatsApp account
- Supabase account (for database integration)
- Ireland phone number for the bot

## 🚀 Installation

### 1. Clone and Install

```bash
cd whatsapp-bot
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Bot Configuration
BOT_NAME=Zimbabwe Shipping Ireland
BOT_PHONE_NUMBER=+353_your_number_here

# Admin Configuration (comma-separated)
ADMIN_PHONE_NUMBERS=+353123456789,+353987654321

# Session Configuration
SESSION_PATH=./whatsapp-session

# Environment
NODE_ENV=production
```

### 3. Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key
4. Paste them into your `.env` file

### 4. Start the Bot

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 5. Connect WhatsApp

1. When you start the bot, a QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to Settings > Linked Devices > Link a Device
4. Scan the QR code
5. The bot will connect and show "✅ WhatsApp Bot Connected Successfully!"

## 📱 How to Use

### Main Menu

Users can interact with the bot by sending:

- **1** or **book** - Start a new booking
- **2** or **pricing** - View pricing information
- **3** or **track** - Track a shipment
- **4** or **collection** - View collection schedule
- **5** or **faq** - Get help and FAQs
- **6** or **contact** - Contact information

### Booking Flow

The bot guides users through a complete booking process:

1. **Sender Details**
   - Full name
   - Phone number
   - Email address
   - Collection address
   - City (from Ireland cities list)
   - Eircode (optional)

2. **Receiver Details**
   - Full name
   - Phone number
   - Delivery address in Zimbabwe
   - City in Zimbabwe

3. **Shipment Details**
   - Type (drums, boxes, or both)
   - Quantity
   - Metal seal option (€7)
   - Door-to-door delivery (€25)

4. **Payment Method**
   - Cash on collection
   - Card payment
   - Bank transfer
   - Mobile payment

5. **Confirmation**
   - Review summary
   - Confirm booking
   - Receive tracking number

### User Recognition

The bot remembers users by their WhatsApp number:
- Greets returning users by name
- Maintains conversation context
- Stores booking history
- Provides personalized service

## 🇮🇪 Ireland Coverage

The bot supports all 7 Ireland collection routes:

1. **Londonderry Route** - Larne, Ballyclare, Ballymena, Coleraine, etc.
2. **Belfast Route** - Belfast, Bangor, Lisburn, Newry, etc.
3. **Cavan Route** - Maynooth, Drogheda, Dundalk, Cavan, etc.
4. **Athlone Route** - Mullingar, Sligo, Galway, Athlone, etc.
5. **Limerick Route** - Limerick, Ennis, Portlaoise, etc.
6. **Dublin City Route** - Dublin, Bray, Malahide, etc.
7. **Cork Route** - Cork, Waterford, Wexford, etc.

## 💰 Pricing (EUR)

### Drums (200-220L)
- 5+ drums: €340 per drum
- 2-4 drums: €350 per drum
- 1 drum: €360 per drum

### Trunks/Storage Boxes
- 5+ items: €200 per item
- 2-4 items: €210 per item
- 1 item: €220 per item

### Additional Services
- Metal Coded Seal: €7
- Door-to-Door Delivery: €25

## 🗂️ Project Structure

```
whatsapp-bot/
├── src/
│   ├── index.js                 # Main entry point
│   ├── handlers/
│   │   └── messageHandler.js    # Message routing
│   ├── flows/
│   │   ├── bookingFlow.js       # Booking conversation flow
│   │   ├── trackingFlow.js      # Tracking functionality
│   │   ├── pricingFlow.js       # Pricing information
│   │   └── faqFlow.js           # FAQ system
│   ├── menus/
│   │   └── mainMenu.js          # Menu definitions
│   ├── services/
│   │   ├── database.js          # Supabase integration
│   │   └── userSession.js       # Session management
│   └── utils/
│       ├── messageUtils.js      # Message helpers
│       └── pricingUtils.js      # Price calculations
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔧 Configuration

### Session Management

Sessions are stored in-memory with a 24-hour TTL. Each session includes:
- Phone number
- Current conversation state
- Booking data in progress
- User name
- Last activity timestamp

### Database Integration

The bot integrates with your existing Supabase database:
- Creates shipments in the `shipments` table
- Tracks shipment status
- Stores complete booking metadata
- Links to user profiles (if authenticated)

### Customization

You can customize:
- **Pricing** - Edit `src/utils/pricingUtils.js`
- **Cities/Routes** - Edit `src/menus/mainMenu.js`
- **Messages** - Edit flow files in `src/flows/`
- **Menu Options** - Edit `src/menus/mainMenu.js`

## 📊 Database Schema

The bot uses the existing `shipments` table with this structure:

```sql
{
  tracking_number: 'ZS-ABC12345',
  status: 'Pending Collection',
  origin: 'Dublin, Ireland',
  destination: 'Harare, Zimbabwe',
  metadata: {
    sender: { name, email, phone, address, city, eircode },
    recipient: { name, phone, address, city },
    shipment: { drums, boxes, metalSeal, doorToDoor },
    payment: { method, currency },
    bookingType: 'whatsapp',
    whatsappNumber: '+353...'
  }
}
```

## 🛠️ Troubleshooting

### QR Code Not Appearing
- Ensure you're running Node.js 18+
- Check your internet connection
- Try deleting `whatsapp-session/` folder and restart

### Bot Not Responding
- Check if the bot is still connected (look for connection logs)
- Verify your phone has internet connection
- Restart the bot

### Database Errors
- Verify Supabase credentials in `.env`
- Check if the `shipments` table exists
- Ensure RLS policies allow inserts

### Session Issues
- Sessions expire after 24 hours of inactivity
- Users can type "menu" to reset their session
- Clear cache by restarting the bot

## 🔐 Security

- WhatsApp messages are end-to-end encrypted
- Supabase credentials should never be committed
- Use environment variables for all sensitive data
- Admin phone numbers are configurable
- Session data is stored in-memory (not persisted)

## 📈 Monitoring

The bot logs:
- Connection status
- Message handling
- Database operations
- Errors and warnings

Check logs for:
```bash
# View real-time logs
npm start

# Or with more detail
NODE_ENV=development npm start
```

## 🚀 Deployment

### Production Deployment

1. **Use a VPS or Cloud Server**
   - DigitalOcean, AWS, Google Cloud, etc.
   - Ensure Node.js 18+ is installed

2. **Use PM2 for Process Management**
   ```bash
   npm install -g pm2
   pm2 start src/index.js --name zimbabwe-bot
   pm2 save
   pm2 startup
   ```

3. **Set Up Auto-Restart**
   ```bash
   pm2 restart zimbabwe-bot --cron "0 3 * * *"
   ```

4. **Monitor Logs**
   ```bash
   pm2 logs zimbabwe-bot
   ```

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "src/index.js"]
```

Build and run:
```bash
docker build -t zimbabwe-bot .
docker run -d --env-file .env zimbabwe-bot
```

## 🤝 Support

For issues or questions:
- Check the troubleshooting section
- Review logs for error messages
- Contact the development team

## 📝 License

MIT License - See LICENSE file for details

## 🎉 Features Roadmap

- [ ] Multi-language support (Shona, Ndebele)
- [ ] Image support for packaging guidelines
- [ ] Payment link generation
- [ ] Automated status updates
- [ ] Customer feedback collection
- [ ] Analytics dashboard
- [ ] Bulk booking support
- [ ] Integration with payment gateways

---

**Built with ❤️ for Zimbabwe Shipping**
