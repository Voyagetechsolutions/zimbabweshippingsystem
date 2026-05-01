#!/bin/bash

# WhatsApp Bot Quick Fix Script
# This script will diagnose and fix common bot issues

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║         WHATSAPP BOT QUICK FIX                               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in whatsapp-bot directory${NC}"
    echo "Please run this script from the whatsapp-bot folder:"
    echo "  cd whatsapp-bot"
    echo "  ./quick-fix.sh"
    exit 1
fi

echo "🔍 Step 1: Checking current bot status..."
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 not installed${NC}"
    echo "Installing PM2..."
    npm install -g pm2
fi

# Check if bot is running
BOT_RUNNING=$(pm2 list | grep -c "zimship-bot")

if [ "$BOT_RUNNING" -gt 0 ]; then
    echo -e "${GREEN}✅ Bot process found${NC}"
    echo ""
    echo "Current status:"
    pm2 list | grep zimship-bot
    echo ""
    
    echo "📋 Recent logs:"
    pm2 logs zimship-bot --lines 10 --nostream
    echo ""
    
    read -p "Do you want to restart the bot? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Restarting bot..."
        pm2 restart zimship-bot
        echo ""
        echo -e "${GREEN}✅ Bot restarted${NC}"
        echo ""
        echo "📋 Watching logs (Ctrl+C to stop):"
        pm2 logs zimship-bot
    fi
else
    echo -e "${YELLOW}⚠️  Bot not running${NC}"
    echo ""
    
    read -p "Do you want to start the bot? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Which bot do you want to start?"
        echo "1) Full-featured bot (src/index.js)"
        echo "2) Simple bot - responds to everything (src/index-simple.js)"
        echo "3) Test bot - diagnostic mode (test-bot.js)"
        echo ""
        read -p "Enter choice (1-3): " -n 1 -r
        echo ""
        
        case $REPLY in
            1)
                echo "🚀 Starting full-featured bot..."
                pm2 start src/index.js --name zimship-bot
                pm2 save
                ;;
            2)
                echo "🚀 Starting simple bot..."
                pm2 start src/index-simple.js --name zimship-bot
                pm2 save
                ;;
            3)
                echo "🧪 Starting test bot..."
                node test-bot.js
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                exit 1
                ;;
        esac
        
        echo ""
        echo -e "${GREEN}✅ Bot started${NC}"
        echo ""
        echo "📋 Watching logs (Ctrl+C to stop):"
        pm2 logs zimship-bot
    fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Quick Fix Complete                                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Test the bot by sending 'hi' to your WhatsApp number"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check bot status"
echo "  pm2 logs zimship-bot    - View logs"
echo "  pm2 restart zimship-bot - Restart bot"
echo "  node test-bot.js        - Run diagnostic test"
echo ""
