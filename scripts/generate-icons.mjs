// Generates PWA PNG icons (no external image tools needed).
// Draws a rounded blue square with a white checkmark and writes PNGs using zlib.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

function coverage(dist, half) {
  return Math.max(0, Math.min(1, half + 0.5 - dist))
}

// Draws the icon scaled to `size`. `pad` shrinks the artwork for maskable icons.
function drawIcon(size, pad, opaque = false) {
  const rgba = Buffer.alloc(size * size * 4)
  const S = size
  const inset = S * pad
  const radius = (S - inset * 2) * 0.22
  const x0 = inset
  const y0 = inset
  const x1 = S - inset
  const y1 = S - inset

  // Checkmark geometry (relative to the inner box)
  const w = x1 - x0
  const h = y1 - y0
  const ax = x0 + w * 0.24
  const ay = y0 + h * 0.53
  const bx = x0 + w * 0.42
  const by = y0 + h * 0.72
  const ccx = x0 + w * 0.78
  const ccy = y0 + h * 0.30
  const stroke = w * 0.055

  const white = [255, 255, 255]

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const px = x + 0.5
      const py = y + 0.5

      // Rounded-rect signed distance
      const qx = Math.abs(px - (x0 + x1) / 2) - ((x1 - x0) / 2 - radius)
      const qy = Math.abs(py - (y0 + y1) / 2) - ((y1 - y0) / 2 - radius)
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
      const inside = Math.min(Math.max(qx, qy), 0)
      const rectDist = outside + inside - radius
      const bgA = coverage(rectDist, 0.75)

      const chk =
        Math.min(distToSegment(px, py, ax, ay, bx, by), distToSegment(px, py, bx, by, ccx, ccy)) - stroke
      const chkA = coverage(chk, 0.75)

      const gradient = py / S
      const base = [59 - 30 * gradient, 130 - 52 * gradient, 246 - 30 * gradient]
      const r = base[0] + (white[0] - base[0]) * chkA
      const g = base[1] + (white[1] - base[1]) * chkA
      const b = base[2] + (white[2] - base[2]) * chkA
      const a = (opaque ? 1 : bgA) * 255

      const i = (y * S + x) * 4
      rgba[i] = Math.round(r)
      rgba[i + 1] = Math.round(g)
      rgba[i + 2] = Math.round(b)
      rgba[i + 3] = Math.round(a)
    }
  }
  return encodePng(S, S, rgba)
}

mkdirSync('public', { recursive: true })
// Standard icons (small padding)
writeFileSync('public/pwa-192x192.png', drawIcon(192, 0.02))
writeFileSync('public/pwa-512x512.png', drawIcon(512, 0.02))
// Maskable icons need extra safe-zone padding
writeFileSync('public/maskable-512x512.png', drawIcon(512, 0.14, true))
// Apple touch icon
writeFileSync('public/apple-touch-icon.png', drawIcon(180, 0, true))
console.log('icons written')
