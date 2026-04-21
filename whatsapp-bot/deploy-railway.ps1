Write-Host "🚀 Deploying Ireland WhatsApp Bot to Railway..." -ForegroundColor Green

# Check if Railway CLI is installed
try {
    railway --version | Out-Null
    Write-Host "✅ Railway CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Login to Railway
Write-Host "🔐 Logging into Railway..." -ForegroundColor Cyan
railway login

# Initialize project if not already done
if (-not (Test-Path "railway.toml")) {
    Write-Host "📦 Initializing Railway project..." -ForegroundColor Cyan
    railway init
}

# Set environment variables
Write-Host "🔧 Setting environment variables..." -ForegroundColor Cyan
railway variables set SUPABASE_URL="https://oncsaunsqtekwwbzvvyh.supabase.co"
railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA"
railway variables set BOT_NAME="Zimbabwe Shipping Ireland"
railway variables set SESSION_PATH="./whatsapp-session"
railway variables set NODE_ENV="production"

# Deploy
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Green
railway up

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "📱 Check Railway logs for QR code to scan with WhatsApp" -ForegroundColor Yellow
Write-Host "🔗 Visit your Railway dashboard to monitor the deployment" -ForegroundColor Cyan