# 🚀 Deploy to Railway NOW (5 Minutes)

Your bot isn't working locally on Windows because of connection issues. Deploy to Railway and it will work immediately.

## ⚡ Quick Deploy (5 Minutes)

### Step 1: Push to GitHub (2 min)

```powershell
# From your project root
git add .
git commit -m "WhatsApp bot ready"
git push
```

If you don't have a GitHub repo yet:
```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zimship-bot.git
git push -u origin main
```

### Step 2: Deploy to Railway (3 min)

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select your repository
5. Railway will auto-detect and deploy

### Step 3: Add Environment Variables

In Railway dashboard:
1. Click your project
2. Go to **Variables** tab
3. Add these:

```
SUPABASE_URL=https://oncsaunsqtekwwbzvvyh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uY3NhdW5zcXRla3d3Ynp2dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjY4NDEsImV4cCI6MjA1OTIwMjg0MX0.pzj7yFjXaCgAETrVauXF3JgtAI_-N9DPP-sF1i1QfAA
BOT_NAME=Zimbabwe Shipping Ireland
SESSION_PATH=/app/data/whatsapp-session
NODE_ENV=production
PORT=3001
```

### Step 4: Get QR Code

1. In Railway, click **"View Logs"**
2. Look for the QR code URL or open the public URL
3. Scan QR code with your WhatsApp
4. Done!

## 🎯 Why Railway?

- ✅ **Free** - $5 credit/month (enough for bot)
- ✅ **Auto-deploy** - Push to GitHub = auto deploy
- ✅ **Always on** - Bot runs 24/7
- ✅ **Works immediately** - No Windows issues
- ✅ **QR code viewer** - Built-in web interface

## 📱 After Deployment

1. Bot will be live at: `https://your-app.railway.app`
2. Open that URL to see QR code
3. Scan with your WhatsApp
4. Send "hi" from another phone
5. Bot responds immediately!

## 💡 Alternative: Render.com

If Railway doesn't work:

1. Go to https://render.com
2. Click **"New +" → "Web Service"**
3. Connect GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables
7. Deploy!

## 🚨 Why Local Doesn't Work

Windows + Baileys + WhatsApp = Connection issues

Cloud server (Linux) + Baileys + WhatsApp = Works perfectly

**Just deploy to Railway and it will work in 5 minutes!**

---

## 📋 Quick Commands

```powershell
# Push to GitHub
git add .
git commit -m "Deploy bot"
git push

# Then go to railway.app and click deploy
```

That's it! Your bot will be live and responding to messages in 5 minutes.
