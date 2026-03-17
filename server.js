import http from 'http';
import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import {Jimp} from 'jimp';

const LOCAL_PORT = 3002;
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Fingerprint comparison endpoint ──────────────────────────────────────────
app.post('/api/fingerprint/compare', async (req, res) => {
  try {
    const { template1, template2 } = req.body;
    if (!template1 || !template2) {
      return res.status(400).json({ error: 'Missing templates' });
    }

    const score = await compareImages(template1, template2);
    res.json({ score });

  } catch (err) {
    console.error('[Compare] Error:', err.message);
    res.status(500).json({ error: err.message, score: 0 });
  }
});

// ── Image comparison using perceptual hashing ─────────────────────────────
async function compareImages(b64url1, b64url2) {
  try {
    const toBuffer = (s) => {
      if (s.startsWith('data:')) return Buffer.from(s.split(',')[1], 'base64');
      let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      return Buffer.from(b64, 'base64');
    };

    const buf1 = toBuffer(b64url1);
    const buf2 = toBuffer(b64url2);

    // Use Jimp.fromBuffer for newer versions
    const [img1, img2] = await Promise.all([
      Jimp.fromBuffer(buf1),
      Jimp.fromBuffer(buf2),
    ]);

    const SIZE = 128;
    img1.resize({ w: SIZE, h: SIZE });
    img2.resize({ w: SIZE, h: SIZE });

    // Convert to greyscale
    img1.greyscale();
    img2.greyscale();

    const pixels1 = [];
    const pixels2 = [];

    img1.scan(0, 0, SIZE, SIZE, (x, y, idx) => {
      pixels1.push(img1.bitmap.data[idx]);
    });
    img2.scan(0, 0, SIZE, SIZE, (x, y, idx) => {
      pixels2.push(img2.bitmap.data[idx]);
    });

    const avg1 = pixels1.reduce((a, b) => a + b, 0) / pixels1.length;
    const avg2 = pixels2.reduce((a, b) => a + b, 0) / pixels2.length;

    const hash1 = pixels1.map(p => p > avg1 ? 1 : 0);
    const hash2 = pixels2.map(p => p > avg2 ? 1 : 0);

    let matching = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matching++;
    }

    const score = matching / hash1.length;
    console.log(`[Compare] Score: ${(score * 100).toFixed(1)}%`);
    return score;

  } catch (err) {
    console.error('[Compare] Image processing error:', err.message ?? err);
    return 0;
  }
}

// ── Start server ──────────────────────────────────────────────────────────────
const server = http.createServer(app);
server.listen(LOCAL_PORT, () => {
  console.log(`[Server] Running on http://localhost:${LOCAL_PORT}`);
});