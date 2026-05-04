@echo off
REM Quick diagnostic script for Ireland WhatsApp Bot (Windows)

echo.
echo 🔍 Ireland WhatsApp Bot Diagnostics
echo ====================================
echo.

REM Check if we're in the right directory
if not exist "bot.js" (
    echo ❌ Error: bot.js not found. Are you in the ireland-whatsapp-bot directory?
    exit /b 1
)

echo ✅ Found bot.js
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo ⚠️  node_modules not found. Running npm install...
    call npm install
    echo.
)

echo ✅ Dependencies installed
echo.

REM Check environment variables
echo 📋 Checking environment variables...
if exist ".env" (
    echo ✅ .env file found
    
    findstr /C:"SUPABASE_URL" .env >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ SUPABASE_URL is set
    ) else (
        echo ❌ SUPABASE_URL is missing
    )
    
    findstr /C:"SUPABASE_ANON_KEY" .env >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ SUPABASE_ANON_KEY is set
    ) else (
        echo ❌ SUPABASE_ANON_KEY is missing
    )
) else (
    echo ⚠️  .env file not found (OK if running on Railway)
)
echo.

REM Check if session folder exists
if exist "session" (
    echo ✅ Session folder exists (bot was previously connected)
) else (
    echo ℹ️  No session folder (first time setup)
)
echo.

REM Try to connect to database
echo 🔌 Testing database connection...
node -e "import('./utils/database.js').then(m => m.initDatabase()).then(() => console.log('✅ Database connection OK')).catch(e => console.error('❌ Database error:', e.message))"
echo.

REM Check port
if "%PORT%"=="" set PORT=3000
echo 🌐 Port will be: %PORT%
echo.

REM Summary
echo ====================================
echo 📊 Diagnostic Summary
echo ====================================
echo.
echo Next steps:
echo 1. If all checks passed, run: npm start
echo 2. Visit http://localhost:%PORT% to see QR code
echo 3. Or run: node test-qr-server.js for a quick test
echo.
echo For deployment to Railway, see DEPLOY.md
echo For troubleshooting, see TROUBLESHOOTING.md
echo.

pause
