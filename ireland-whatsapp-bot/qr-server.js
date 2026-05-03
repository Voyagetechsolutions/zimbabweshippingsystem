import http from 'http';
import QRCode from 'qrcode';

let currentQr = null;
let connectedUser = null;
let lastUpdated = Date.now();

export function setQr(qr) {
  currentQr = qr;
  connectedUser = null;
  lastUpdated = Date.now();
}

export function setConnected(user) {
  currentQr = null;
  connectedUser = user;
  lastUpdated = Date.now();
}

export function setDisconnected() {
  currentQr = null;
  connectedUser = null;
  lastUpdated = Date.now();
}

function renderPage(body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Zimbabwe Shipping — Ireland Bot</title>
  <meta http-equiv="refresh" content="3" />
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
    .card { background:#1e293b; border-radius:16px; padding:32px; max-width:480px; width:100%; text-align:center; box-shadow:0 10px 40px rgba(0,0,0,.4); }
    h1 { font-size:18px; margin:0 0 8px; color:#10b981; }
    p { margin:6px 0; font-size:14px; color:#94a3b8; }
    img { background:#fff; padding:12px; border-radius:8px; margin:16px 0; max-width:100%; height:auto; }
    .ok { color:#10b981; font-weight:600; font-size:16px; margin:16px 0; }
    .pending { color:#f59e0b; font-weight:600; font-size:16px; margin:16px 0; }
    ol { text-align:left; padding-left:20px; font-size:13px; color:#cbd5e1; }
    code { background:#0f172a; padding:2px 6px; border-radius:4px; font-size:12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🇮🇪 Zimbabwe Shipping — Ireland Bot</h1>
    ${body}
    <p style="font-size:11px; color:#64748b; margin-top:24px;">Auto-refreshes every 3 seconds · Updated ${new Date(lastUpdated).toLocaleTimeString()}</p>
  </div>
</body>
</html>`;
}

async function handleRequest(req, res) {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: connectedUser ? 'connected' : currentQr ? 'awaiting_scan' : 'starting', updated: lastUpdated }));
    return;
  }

  if (req.url === '/qr.png' && currentQr) {
    try {
      const buf = await QRCode.toBuffer(currentQr, { width: 360, margin: 2 });
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      res.end(buf);
      return;
    } catch (err) {
      res.writeHead(500);
      res.end('QR error: ' + err.message);
      return;
    }
  }

  let body = '';
  if (connectedUser) {
    body = `
      <p class="ok">✅ Bot is connected and ready</p>
      <p>Phone: <code>${connectedUser}</code></p>
      <p>You can close this page. The bot is now answering messages.</p>
    `;
  } else if (currentQr) {
    body = `
      <p class="pending">📱 Waiting for QR scan</p>
      <img src="/qr.png?t=${lastUpdated}" alt="WhatsApp QR Code" />
      <ol>
        <li>Open WhatsApp on the phone you want to use as the bot</li>
        <li>Tap <b>Settings → Linked Devices</b></li>
        <li>Tap <b>Link a Device</b> and scan this QR</li>
      </ol>
    `;
  } else {
    body = `<p class="pending">⏳ Starting up — waiting for WhatsApp to issue a QR code…</p>`;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderPage(body));
}

export function startQrServer(port) {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      console.error('QR server error:', err);
      res.writeHead(500);
      res.end('Internal error');
    });
  });
  server.listen(port, () => {
    console.log(`🌐 QR server listening on port ${port}`);
  });
  return server;
}
