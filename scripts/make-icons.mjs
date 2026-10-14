// 產生 PWA 圖示（純 Node，不需任何套件）：藍色圓角方塊 + 白色紙飛機
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.join(process.cwd(), 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 幾何：點是否在三角形內
function inTri(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
function inRoundedRect(px, py, r) {
  const x = Math.min(px, 1 - px);
  const y = Math.min(py, 1 - py);
  if (x >= r || y >= r) return px >= 0 && px <= 1 && py >= 0 && py <= 1;
  return (x - r) ** 2 + (y - r) ** 2 <= r * r;
}

// 紙飛機（單位座標）
const TIP = [0.86, 0.17];
const TAIL_L = [0.14, 0.47];
const NOTCH = [0.45, 0.56];
const TAIL_B = [0.55, 0.85];
const FOLD = [0.59, 0.63];

function render(size, { rounded, pad }) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 3; // 超取樣
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const inside = rounded ? inRoundedRect(u, v, 0.22) : true;
          if (!inside) continue;
          // 背景漸層
          const t = (u + v) / 2;
          let cr = 0x3b + (0x17 - 0x3b) * t;
          let cg = 0x67 + (0x3d - 0x67) * t;
          let cb = 0xff + (0xdb - 0xff) * t;
          // 紙飛機
          const gu = (u - pad) / (1 - 2 * pad);
          const gv = (v - pad) / (1 - 2 * pad);
          if (inTri(gu, gv, TIP, TAIL_L, NOTCH) || inTri(gu, gv, TIP, NOTCH, TAIL_B)) {
            if (inTri(gu, gv, NOTCH, TAIL_B, FOLD)) {
              cr = 0xbf; cg = 0xd2; cb = 0xff;
            } else {
              cr = cg = cb = 0xff;
            }
          }
          r += cr; g += cg; b += cb; a += 255;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      if (a === 0) continue;
      buf[i] = Math.round(r / (a / 255));
      buf[i + 1] = Math.round(g / (a / 255));
      buf[i + 2] = Math.round(b / (a / 255));
      buf[i + 3] = Math.round(a / n);
    }
  }
  return png(size, buf);
}

fs.writeFileSync(path.join(OUT, 'icon-192.png'), render(192, { rounded: true, pad: 0.12 }));
fs.writeFileSync(path.join(OUT, 'icon-512.png'), render(512, { rounded: true, pad: 0.12 }));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), render(180, { rounded: false, pad: 0.14 }));
fs.writeFileSync(path.join(OUT, 'maskable-512.png'), render(512, { rounded: false, pad: 0.22 }));
console.log('icons written to', OUT);
