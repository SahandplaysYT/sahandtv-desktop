// Generates a 256x256 icon.png using only Node.js built-ins (no canvas needed)
// Uses a minimal PNG encoder to create a solid #e9a23b square with "S" implied by color

const fs = require('fs')
const zlib = require('zlib')

const SIZE = 256

// Colors
const BG = [0xe9, 0xa2, 0x3b]   // #e9a23b (amber)
const FG = [0x08, 0x09, 0x0d]   // #08090d (near black)

// Build raw RGBA pixel data
const pixels = []
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    // Rounded rectangle mask (radius 48)
    const r = 48
    const inCorner = (
      (x < r && y < r && Math.hypot(x - r, y - r) > r) ||
      (x > SIZE - r - 1 && y < r && Math.hypot(x - (SIZE - r - 1), y - r) > r) ||
      (x < r && y > SIZE - r - 1 && Math.hypot(x - r, y - (SIZE - r - 1)) > r) ||
      (x > SIZE - r - 1 && y > SIZE - r - 1 && Math.hypot(x - (SIZE - r - 1), y - (SIZE - r - 1)) > r)
    )

    // Draw a bold "S" shape in the center using simple geometry
    const cx = x - SIZE / 2
    const cy = y - SIZE / 2

    // S shape: two arcs connected — approximate with rectangles + circles
    const inS = drawS(cx, cy)

    if (inCorner) {
      pixels.push(0, 0, 0, 0) // transparent
    } else if (inS) {
      pixels.push(...FG, 255)
    } else {
      pixels.push(...BG, 255)
    }
  }
}

function drawS(cx, cy) {
  const scale = 68
  // Normalize to -1..1 range
  const nx = cx / scale
  const ny = cy / scale

  const thick = 0.18
  const r = 0.55
  const ri = r - thick

  // Top arc (upper half circle, left side)
  if (ny < 0) {
    const dist = Math.hypot(nx + 0.18, ny + 0.28)
    if (dist < r && dist > ri && nx < 0.18) return true
  }

  // Bottom arc (lower half circle, right side)
  if (ny > 0) {
    const dist = Math.hypot(nx - 0.18, ny - 0.28)
    if (dist < r && dist > ri && nx > -0.18) return true
  }

  // Middle bar
  if (Math.abs(ny) < thick && Math.abs(nx) < r) return true

  // Top horizontal bar
  if (ny < -0.52 && ny > -0.52 - thick && Math.abs(nx) < r) return true

  // Bottom horizontal bar
  if (ny > 0.52 && ny < 0.52 + thick && Math.abs(nx) < r) return true

  // Left vertical top
  if (nx < -r + thick && nx > -r && ny < -0.28 && ny > -0.52) return true

  // Right vertical bottom
  if (nx > r - thick && nx < r && ny > 0.28 && ny < 0.52) return true

  return false
}

// Encode as PNG
function encodePNG(width, height, pixels) {
  const chunks = []

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeB = Buffer.from(type)
    const crcBuf = Buffer.concat([typeB, data])
    let crc = 0xffffffff
    const table = makeCRCTable()
    for (const b of crcBuf) crc = (table[(crc ^ b) & 0xff] ^ (crc >>> 8)) & 0xffffffff
    crc ^= 0xffffffff
    const crcOut = Buffer.alloc(4)
    crcOut.writeUInt32BE(crc >>> 0)
    return Buffer.concat([len, typeB, data, crcOut])
  }

  function makeCRCTable() {
    const t = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  }

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  chunks.push(chunk('IHDR', ihdr))

  // IDAT
  const raw = []
  for (let y = 0; y < height; y++) {
    raw.push(0) // filter type none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw))
  chunks.push(chunk('IDAT', compressed))

  // IEND
  chunks.push(chunk('IEND', Buffer.alloc(0)))

  return Buffer.concat(chunks)
}

const png = encodePNG(SIZE, SIZE, pixels)
fs.writeFileSync('icon.png', png)
console.log('icon.png generated at 256x256')
