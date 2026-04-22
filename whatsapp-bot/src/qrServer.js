import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const QR_DATA_PATH = '/app/data';

function resolveLatestQRPath() {
  const latestPath = path.join(QR_DATA_PATH, 'qr-code-latest.png');
  if (fs.existsSync(latestPath)) return latestPath;

  if (!fs.existsSync(QR_DATA_PATH)) return null;
  const files = fs.readdirSync(QR_DATA_PATH);
  const qrFiles = files.filter(f => f.startsWith('qr-code-') && f.endsWith('.png'));
  if (qrFiles.length === 0) return null;
  return path.join(QR_DATA_PATH, qrFiles.sort().reverse()[0]);
}

// Raw PNG — served with no-cache so the auto-refreshing viewer always gets the current QR
app.get('/qr-code.png', (req, res) => {
  const qrPath = resolveLatestQRPath();
  if (!qrPath) {
    return res.status(404).send('No QR code available yet. Wait a few seconds and refresh.');
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(qrPath);
});

// Legacy download endpoint kept for backwards compatibility
app.get('/qr-code', (req, res) => {
  const qrPath = resolveLatestQRPath();
  if (!qrPath) {
    return res.status(404).json({
      error: 'No QR code available yet',
      message: 'QR code will be generated when the bot starts connecting. Please wait and refresh.'
    });
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(qrPath);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WhatsApp Bot QR Server is running' });
});

// Auto-refreshing viewer — keeps the current QR on screen so you can scan whichever is valid RIGHT NOW
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scan WhatsApp QR — Zimbabwe Shipping Bot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b141a; color: #e9edef; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #111b21; border-radius: 16px; padding: 24px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 4px 0; color: #8696a0; font-size: 14px; }
    .qr-wrap { background: #fff; border-radius: 12px; padding: 16px; margin: 16px auto; display: inline-block; }
    .qr-wrap img { display: block; width: 320px; height: 320px; }
    .status { margin-top: 12px; font-size: 13px; color: #00a884; }
    .status.stale { color: #f1c40f; }
    .status.error { color: #e74c3c; }
    ol { text-align: left; color: #8696a0; font-size: 13px; padding-left: 20px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Scan this QR with WhatsApp</h1>
    <p>Auto-refreshes every 3 seconds. Keep this tab open.</p>
    <div class="qr-wrap">
      <img id="qr" src="/qr-code.png?t=${Date.now()}" alt="WhatsApp QR Code" />
    </div>
    <div class="status" id="status">Loading…</div>
    <ol>
      <li>Open WhatsApp on your phone</li>
      <li>Menu (⋮) or Settings → <b>Linked Devices</b></li>
      <li>Tap <b>Link a Device</b></li>
      <li>Point your camera at this screen</li>
    </ol>
  </div>
  <script>
    const img = document.getElementById('qr');
    const status = document.getElementById('status');
    let lastLoadedAt = Date.now();

    function refresh() {
      const next = new Image();
      next.onload = () => {
        img.src = next.src;
        lastLoadedAt = Date.now();
        status.textContent = 'Live — updated ' + new Date().toLocaleTimeString();
        status.className = 'status';
      };
      next.onerror = () => {
        status.textContent = 'Waiting for bot to generate QR…';
        status.className = 'status stale';
      };
      next.src = '/qr-code.png?t=' + Date.now();
    }

    refresh();
    setInterval(refresh, 3000);
  </script>
</body>
</html>`);
});

export function startQRServer() {
  // Parse JSON bodies for the send-message endpoint
  app.use(express.json());

  // Internal endpoint — called by Supabase Edge Function to push a WhatsApp message
  app.post('/send-message', async (req, res) => {
    const apiKey = process.env.BOT_API_KEY;
    if (apiKey && req.headers['x-api-key'] !== apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { phone_number, message } = req.body;
    if (!phone_number || !message) {
      return res.status(400).json({ error: 'phone_number and message are required' });
    }

    try {
      // Import the active sock from index.js via a shared module
      const { getActiveSock } = await import('./index.js');
      const sock = getActiveSock();
      if (!sock) return res.status(503).json({ error: 'Bot not connected' });

      await sock.sendMessage(phone_number, { text: message });
      res.json({ success: true });
    } catch (err) {
      console.error('send-message error:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.listen(PORT, () => {
    console.log(`\n🌐 QR Code Server started on port ${PORT}`);
    console.log(`📥 Download QR code at: http://localhost:${PORT}/qr-code`);
    console.log(`🔗 Railway URL will be: https://your-app.railway.app/qr-code\n`);
  });
}
