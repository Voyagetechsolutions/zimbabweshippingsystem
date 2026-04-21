#!/bin/bash

echo "🚀 Deploying Ireland WhatsApp Bot to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Logging into Railway..."
railway login

# Initialize project if not already done
if [ ! -f "railway.toml" ]; then
    echo "📦 Initializing Railway project..."
    railway init
fi

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables set SUPABASE_URL="https://oncsaunsqtekwwbzvvyh.supabase.co"
railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA"
railway variables set BOT_NAME="Zimbabwe Shipping Ireland"
railway variables set SESSION_PATH="./whatsapp-session"
railway variables set NODE_ENV="production"

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "📱 Check Railway logs for QR code to scan with WhatsApp"
echo "🔗 Visit your Railway dashboard to monitor the deployment"