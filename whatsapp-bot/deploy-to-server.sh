#!/bin/bash

# Zimbabwe Shipping WhatsApp Bot - Server Deployment Script
# Run this script on your Ubuntu server after cloning the repository

echo "🚀 Starting Zimbabwe Shipping WhatsApp Bot deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version:"
node --version
echo "✅ npm version:"
npm --version

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Navigate to bot directory
cd /opt/zimbabwe-shipping-whatsapp-bot || exit

# Install dependencies
echo "📦 Installing bot dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "🔧 Please edit the .env file with your credentials:"
    echo "   nano .env"
    echo ""
    echo "Then run this script again or start the bot manually with:"
    echo "   pm2 start src/index.js --name zimbabwe-bot"
    exit 1
fi

# Start bot with PM2
echo "🚀 Starting WhatsApp bot with PM2..."
pm2 start src/index.js --name zimbabwe-bot

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on boot
echo "🔄 Setting up auto-start on boot..."
pm2 startup

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Next steps:"
echo "1. View logs to see QR code: pm2 logs zimbabwe-bot"
echo "2. Scan QR code with WhatsApp"
echo "3. Test by sending a message to the bot"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status              - Check bot status"
echo "   pm2 logs zimbabwe-bot   - View logs"
echo "   pm2 restart zimbabwe-bot - Restart bot"
echo "   pm2 stop zimbabwe-bot   - Stop bot"
echo "   pm2 monit               - Monitor resources"
echo ""
