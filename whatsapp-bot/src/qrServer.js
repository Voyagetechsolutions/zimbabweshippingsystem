import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const QR_DATA_PATH = '/app/data';

// Serve QR code files
app.get('/qr-code', (req, res) => {
  try {
    const files = fs.readdirSync(QR_DATA_PATH);
    const qrFiles = files.filter(f => f.startsWith('qr-code-') && f.endsWith('.png'));
    
    if (qrFiles.length === 0) {
      return res.status(404).json({ 
        error: 'No QR code available yet',
        message: 'QR code will be generated when bot starts connecting to WhatsApp'
      });
    }
    
    // Get the most recent QR code
    const latestQR = qrFiles.sort().reverse()[0];
    const qrPath = path.join(QR_DATA_PATH, latestQR);
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${latestQR}"`);
    res.sendFile(qrPath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve QR code', message: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WhatsApp Bot QR Server is running' });
});

// Info endpoint
app.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(QR_DATA_PATH);
    const qrFiles = files.filter(f => f.startsWith('qr-code-') && f.endsWith('.png'));
    
    res.json({
      message: 'Zimbabwe Shipping WhatsApp Bot - QR Code Server',
      endpoints: {
        download: '/qr-code - Download the latest QR code',
        health: '/health - Health check'
      },
      qrCodeAvailable: qrFiles.length > 0,
      qrCodeCount: qrFiles.length
    });
  } catch (error) {
    res.json({
      message: 'Zimbabwe Shipping WhatsApp Bot - QR Code Server',
      error: error.message
    });
  }
});

export function startQRServer() {
  app.listen(PORT, () => {
    console.log(`\n🌐 QR Code Server started on port ${PORT}`);
    console.log(`📥 Download QR code at: http://localhost:${PORT}/qr-code`);
    console.log(`🔗 Railway URL will be: https://your-app.railway.app/qr-code\n`);
  });
}
