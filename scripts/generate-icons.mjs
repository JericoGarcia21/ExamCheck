// Generates ExamCheck PWA icons without external image tools.
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

function drawIcon(size, maskable = false) {
  const rgba = Buffer.alloc(size * size * 4)
  const backgroundRadius = size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * (size - 1))
      const i = (y * size + x) * 4
      rgba[i] = Math.round(37 + (117 - 37) * t)
      rgba[i + 1] = Math.round(99 + (88 - 99) * t)
      rgba[i + 2] = Math.round(235 + (238 - 235) * t)
      rgba[i + 3] = maskable
        ? 255
        : Math.round(coverage(roundedRectDistance(x + 0.5, y + 0.5, 0, 0, size, size, backgroundRadius), 0.75) * 255)
    }
  }

  function paint(color, alphaAt) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const alpha = alphaAt(x + 0.5, y + 0.5)
        if (alpha <= 0) continue
        const i = (y * size + x) * 4
        const sourceAlpha = Math.min(1, alpha)
        const destAlpha = rgba[i + 3] / 255
        const outAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha)
        for (let channel = 0; channel < 3; channel++) {
          rgba[i + channel] = Math.round(
            (color[channel] * sourceAlpha + rgba[i + channel] * destAlpha * (1 - sourceAlpha)) / outAlpha,
          )
        }
        rgba[i + 3] = Math.round(outAlpha * 255)
      }
    }
  }

  const rect = (x0, y0, x1, y1, radius, color, opacity = 1) =>
    paint(color, (x, y) =>
      coverage(roundedRectDistance(x, y, x0 * size, y0 * size, x1 * size, y1 * size, radius * size), 0.75) *
      opacity,
    )
  const circle = (cx, cy, radius, color, opacity = 1) =>
    paint(color, (x, y) => coverage(Math.hypot(x - cx * size, y - cy * size) - radius * size, 0.75) * opacity)
  const line = (ax, ay, bx, by, stroke, color) =>
    paint(color, (x, y) =>
      coverage(distToSegment(x, y, ax * size, ay * size, bx * size, by * size) - stroke * size / 2, 0.75),
    )

  function roundedRectDistance(x, y, x0, y0, x1, y1, radius) {
    const qx = Math.abs(x - (x0 + x1) / 2) - ((x1 - x0) / 2 - radius)
    const qy = Math.abs(y - (y0 + y1) / 2) - ((y1 - y0) / 2 - radius)
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
  }

  const paperShadow = maskable ? [27, 43, 112] : [18, 48, 133]
  rect(0.28, 0.205, 0.705, 0.755, 0.065, paperShadow, 0.24)
  rect(0.28, 0.19, 0.705, 0.74, 0.065, [255, 255, 255])

  const rule = [191, 210, 250]
  line(0.375, 0.37, 0.61, 0.37, 0.022, rule)
  line(0.375, 0.465, 0.61, 0.465, 0.022, rule)
  line(0.375, 0.56, 0.55, 0.56, 0.022, rule)

  circle(0.685, 0.68, 0.17, [27, 43, 112], 0.24)
  circle(0.68, 0.66, 0.165, [255, 255, 255])
  line(0.605, 0.665, 0.655, 0.715, 0.038, [37, 99, 235])
  line(0.655, 0.715, 0.765, 0.585, 0.038, [37, 99, 235])

  return encodePng(size, size, rgba)
}

mkdirSync('public', { recursive: true })
writeFileSync('public/pwa-192x192.png', drawIcon(192))
writeFileSync('public/pwa-512x512.png', drawIcon(512))
writeFileSync('public/maskable-512x512.png', drawIcon(512, true))
writeFileSync('public/apple-touch-icon.png', drawIcon(180))
console.log('icons written')
