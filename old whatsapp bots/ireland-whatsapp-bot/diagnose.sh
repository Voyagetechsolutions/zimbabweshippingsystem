#!/bin/bash

# Quick diagnostic script for Ireland WhatsApp Bot
# Run this to check if everything is working

echo "🔍 Ireland WhatsApp Bot Diagnostics"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "bot.js" ]; then
    echo "❌ Error: bot.js not found. Are you in the ireland-whatsapp-bot directory?"
    exit 1
fi

echo "✅ Found bot.js"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Running npm install..."
    npm install
    echo ""
fi

echo "✅ Dependencies installed"
echo ""

# Check environment variables
echo "📋 Checking environment variables..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    if grep -q "SUPABASE_URL" .env; then
        echo "✅ SUPABASE_URL is set"
    else
        echo "❌ SUPABASE_URL is missing"
    fi
    
    if grep -q "SUPABASE_ANON_KEY" .env; then
        echo "✅ SUPABASE_ANON_KEY is set"
    else
        echo "❌ SUPABASE_ANON_KEY is missing"
    fi
else
    echo "⚠️  .env file not found (OK if running on Railway)"
fi
echo ""

# Check if session folder exists
if [ -d "session" ]; then
    echo "✅ Session folder exists (bot was previously connected)"
    echo "   Files: $(ls -1 session | wc -l)"
else
    echo "ℹ️  No session folder (first time setup)"
fi
echo ""

# Try to connect to database
echo "🔌 Testing database connection..."
node -e "import('./utils/database.js').then(m => m.initDatabase()).then(() => console.log('✅ Database connection OK')).catch(e => console.error('❌ Database error:', e.message))"
echo ""

# Check if port is available
PORT=${PORT:-3000}
echo "🌐 Checking if port $PORT is available..."
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use"
    echo "   Kill the process or use a different PORT"
else
    echo "✅ Port $PORT is available"
fi
echo ""

# Summary
echo "===================================="
echo "📊 Diagnostic Summary"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. If all checks passed, run: npm start"
echo "2. Visit http://localhost:$PORT to see QR code"
echo "3. Or run: node test-qr-server.js for a quick test"
echo ""
echo "For deployment to Railway, see DEPLOY.md"
echo "For troubleshooting, see TROUBLESHOOTING.md"
echo ""
