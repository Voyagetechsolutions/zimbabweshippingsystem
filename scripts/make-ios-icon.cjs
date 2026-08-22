#!/usr/bin/env node
/**
 * Build the App Store icon for the Expo apps.
 *
 * Apple rejects app icons that are non-square or carry an alpha channel, and
 * `assets/logo.png` is both (954x948, RGBA). This flattens it onto an opaque
 * square canvas at 1024x1024 and writes 24-bit RGB PNG — no alpha, no rounding
 * (iOS applies the squircle mask itself).
 *
 *   node scripts/make-ios-icon.js customer-app/assets/logo.png customer-app/assets/ios-icon.png
 *
 * An optional third argument sets the edge length, which the staff web PWA uses
 * for its home-screen and manifest icons:
 *
 *   node scripts/make-ios-icon.js staff-app/assets/logo.png out/icon-180.png 180
 *
 * Pure Node (zlib only) so it needs no native image dependency.
 */
const fs = require('fs');
const zlib = require('zlib');

const DEFAULT_SIZE = 1024;
const DEFAULT_PADDING = 0.07; // fraction of the canvas left clear on each side
const BG = [255, 255, 255];

// ---------- PNG decode ----------

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette = null;
  let trns = null;
  const idat = [];

  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      if (data.readUInt8(12) !== 0) throw new Error('interlaced PNG not supported');
    } else if (type === 'PLTE') palette = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    off += 12 + len;
  }

  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported color type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const px = Buffer.alloc(height * stride);

  // Undo the per-scanline filters (PNG spec 9.2).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = px.subarray(y * stride, y * stride + stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, (y - 1) * stride + stride) : null;

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= channels ? prev[i - channels] : 0;
      let v = src[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
  }

  // Normalise everything to RGBA so the compositor only handles one layout.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    let r;
    let g;
    let b;
    let a = 255;
    if (colorType === 0) { r = g = b = px[i]; }
    else if (colorType === 4) { r = g = b = px[i * 2]; a = px[i * 2 + 1]; }
    else if (colorType === 2) { r = px[i * 3]; g = px[i * 3 + 1]; b = px[i * 3 + 2]; }
    else if (colorType === 6) { r = px[i * 4]; g = px[i * 4 + 1]; b = px[i * 4 + 2]; a = px[i * 4 + 3]; }
    else {
      const idx = px[i];
      r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2];
      if (trns && idx < trns.length) a = trns[idx];
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }

  return { width, height, rgba };
}

// ---------- PNG encode (24-bit RGB, filter 0) ----------

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

// channels === 3 → colour type 2 (truecolour, no alpha), for App Store icons.
// channels === 4 → colour type 6 (truecolour + alpha), for Android adaptive
// foregrounds, where the launcher's background colour must show through.
function encodePng(width, height, pixels, channels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(channels === 4 ? 6 : 2, 9);

  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- compose ----------

function build(srcPath, outPath, SIZE = DEFAULT_SIZE, PADDING = DEFAULT_PADDING, keepAlpha = false) {
  const src = decodePng(fs.readFileSync(srcPath));

  const box = Math.round(SIZE * (1 - PADDING * 2));
  const scale = Math.min(box / src.width, box / src.height);
  const dw = Math.round(src.width * scale);
  const dh = Math.round(src.height * scale);
  const ox = Math.round((SIZE - dw) / 2);
  const oy = Math.round((SIZE - dh) / 2);

  const channels = keepAlpha ? 4 : 3;
  // Alpha mode starts fully transparent (zeroed); opaque mode starts on BG.
  const out = Buffer.alloc(SIZE * SIZE * channels);
  if (!keepAlpha) {
    for (let i = 0; i < SIZE * SIZE; i++) {
      out[i * 3] = BG[0]; out[i * 3 + 1] = BG[1]; out[i * 3 + 2] = BG[2];
    }
  }

  // Bilinear sample the source, then alpha-composite over the background.
  for (let y = 0; y < dh; y++) {
    const sy = (y + 0.5) / scale - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(src.height - 1, y0 + 1);
    const fy = Math.min(1, Math.max(0, sy - y0));

    for (let x = 0; x < dw; x++) {
      const sx = (x + 0.5) / scale - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(src.width - 1, x0 + 1);
      const fx = Math.min(1, Math.max(0, sx - x0));

      const p = [
        (y0 * src.width + x0) * 4,
        (y0 * src.width + x1) * 4,
        (y1 * src.width + x0) * 4,
        (y1 * src.width + x1) * 4,
      ];
      const w = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy];

      // Premultiply before interpolating so transparent pixels don't bleed
      // their (undefined) colour into the edges of the mark.
      let ar = 0; let ag = 0; let ab = 0; let aa = 0;
      for (let k = 0; k < 4; k++) {
        const alpha = src.rgba[p[k] + 3] / 255;
        ar += src.rgba[p[k]] * alpha * w[k];
        ag += src.rgba[p[k] + 1] * alpha * w[k];
        ab += src.rgba[p[k] + 2] * alpha * w[k];
        aa += alpha * w[k];
      }

      const di = ((oy + y) * SIZE + (ox + x)) * channels;
      if (keepAlpha) {
        // Un-premultiply back to straight alpha for storage.
        out[di] = aa > 0 ? Math.round(ar / aa) : 0;
        out[di + 1] = aa > 0 ? Math.round(ag / aa) : 0;
        out[di + 2] = aa > 0 ? Math.round(ab / aa) : 0;
        out[di + 3] = Math.round(aa * 255);
      } else {
        out[di] = Math.round(ar + BG[0] * (1 - aa));
        out[di + 1] = Math.round(ag + BG[1] * (1 - aa));
        out[di + 2] = Math.round(ab + BG[2] * (1 - aa));
      }
    }
  }

  fs.writeFileSync(outPath, encodePng(SIZE, SIZE, out, channels));
  const kind = keepAlpha ? 'RGBA (alpha kept)' : 'RGB (no alpha)';
  console.log(`${outPath}  ${SIZE}x${SIZE}  ${kind}  <- ${srcPath} ${src.width}x${src.height}`);
}

module.exports = { build };

// Only run as a CLI when invoked directly, so build-staff-web.cjs can require it.
if (require.main === module) {
  const [srcArg, outArg, sizeArg, paddingArg, alphaArg] = process.argv.slice(2);
  if (!srcArg || !outArg) {
    console.error(
      'usage: node scripts/make-ios-icon.js <source.png> <out.png> [size] [padding] [--alpha]',
    );
    process.exit(1);
  }
  build(
    srcArg,
    outArg,
    sizeArg ? Number(sizeArg) : DEFAULT_SIZE,
    paddingArg ? Number(paddingArg) : DEFAULT_PADDING,
    alphaArg === '--alpha',
  );
}
