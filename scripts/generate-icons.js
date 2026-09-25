/**
 * Generates PWA icons (SVG, 192x192, 512x512, apple-touch-icon, favicon)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create high quality SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4c1d95" />
      <stop offset="40%" stop-color="#2e1065" />
      <stop offset="85%" stop-color="#090514" />
      <stop offset="100%" stop-color="#020204" />
    </linearGradient>
    <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="30%" stop-color="#e9d5ff" />
      <stop offset="70%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d8b4fe" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#7e22ce" stop-opacity="0.2" />
    </linearGradient>
    <filter id="sciFiGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background Gradient -->
  <rect width="512" height="512" rx="108" fill="url(#bg)" />

  <!-- Subtle Cyber Sci-Fi Background Tech Lines -->
  <g opacity="0.15" stroke="#c084fc" stroke-width="1.5" fill="none">
    <path d="M 64 128 L 448 128" stroke-dasharray="8 8" />
    <path d="M 64 384 L 448 384" stroke-dasharray="8 8" />
    <path d="M 128 64 L 128 448" stroke-dasharray="8 8" />
    <path d="M 384 64 L 384 448" stroke-dasharray="8 8" />
    <!-- Sci-fi Corner Brackets -->
    <path d="M 72 100 L 72 72 L 100 72" stroke-width="3" />
    <path d="M 440 100 L 440 72 L 412 72" stroke-width="3" />
    <path d="M 72 412 L 72 440 L 100 440" stroke-width="3" />
    <path d="M 440 412 L 440 440 L 412 440" stroke-width="3" />
  </g>

  <!-- Sci-Fi Futuristic 'P' Glyph -->
  <g filter="url(#sciFiGlow)">
    <!-- Outer Sci-Fi P Shape with Chamfered Cyber Angles -->
    <path d="M 148 108
             L 326 108
             L 374 156
             L 374 252
             L 326 300
             L 242 300
             L 242 404
             L 182 404
             L 148 370
             Z"
          fill="url(#pGrad)" />

    <!-- Inner Hollow Cutout with Cyber Chamfer -->
    <path d="M 218 168
             L 302 168
             L 322 188
             L 322 220
             L 302 240
             L 218 240
             Z"
          fill="#170b2c" />

    <!-- Sci-Fi Stencil Notch / Cyber Energy Accent -->
    <polygon points="140,224 168,224 180,240 140,240" fill="#f3e8ff" opacity="0.9" />
    <rect x="180" y="328" width="4" height="42" fill="#c084fc" opacity="0.8" />
    <polygon points="340,118 360,138 348,138 332,122" fill="#ffffff" opacity="0.9" />
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');

// Helper to write raw PNG files with node:zlib
function createPNG(width, height, drawFn) {
  // RGBA buffer: 4 bytes per pixel + 1 filter byte per scanline
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x / width, y / height, x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ byte) & 1) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc = crc >>> 1;
        }
        byte = byte >>> 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Point-in-polygon helper
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const pOuter = [
  [148/512, 108/512],
  [326/512, 108/512],
  [374/512, 156/512],
  [374/512, 252/512],
  [326/512, 300/512],
  [242/512, 300/512],
  [242/512, 404/512],
  [182/512, 404/512],
  [148/512, 370/512]
];

const pHole = [
  [218/512, 168/512],
  [302/512, 168/512],
  [322/512, 188/512],
  [322/512, 220/512],
  [302/512, 240/512],
  [218/512, 240/512]
];

function renderPixel(u, v, isMaskable = false) {
  // Background gradient from top-left (dark purple #4c1d95) to bottom-right (black #05020a)
  const diag = (u + v) / 2;
  const bgR = Math.round(76 * (1 - diag * 0.95) + 3 * diag);
  const bgG = Math.round(29 * (1 - diag * 0.95) + 2 * diag);
  const bgB = Math.round(149 * (1 - diag * 0.95) + 8 * diag);

  // Check rounded squircle boundary if not maskable
  let alpha = 255;
  if (!isMaskable) {
    // corner radius 22%
    const rx = 0.21;
    const dx = Math.max(0, Math.abs(u - 0.5) - (0.5 - rx));
    const dy = Math.max(0, Math.abs(v - 0.5) - (0.5 - rx));
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > rx) {
      return [0, 0, 0, 0];
    }
  }

  // Check if inside P glyph
  // Safe scaling for maskable icons (centered in 80% safe zone)
  const scale = isMaskable ? 0.78 : 0.94;
  const su = (u - 0.5) / scale + 0.5;
  const sv = (v - 0.5) / scale + 0.5;

  const inOuter = pointInPoly(su, sv, pOuter);
  const inHole = pointInPoly(su, sv, pHole);

  if (inOuter && !inHole) {
    // Sci-fi P glyph gradient: silver-white at top, neon violet-purple at bottom
    const glyphDiag = (su * 0.3 + sv * 0.7);
    const pR = Math.round(255 * (1 - glyphDiag) + 168 * glyphDiag);
    const pG = Math.round(245 * (1 - glyphDiag) + 85 * glyphDiag);
    const pB = Math.round(255 * (1 - glyphDiag) + 247 * glyphDiag);
    return [pR, pG, pB, 255];
  }

  return [bgR, bgG, bgB, alpha];
}

// Generate files
const sizes = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon.ico', size: 48, maskable: false }
];

for (const s of sizes) {
  const buf = createPNG(s.size, s.size, (u, v) => renderPixel(u, v, s.maskable));
  fs.writeFileSync(path.join(publicDir, s.name), buf);
  console.log(`Generated public/${s.name} (${s.size}x${s.size})`);
}

console.log('All PWA icons generated successfully.');
