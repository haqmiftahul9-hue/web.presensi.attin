// Generator QR Code (mode Byte, ECC level M, versi 1-10).
//
// Ditulis di dalam repo supaya halaman Cetak Kartu ID tidak bergantung pada
// CDN/layanan pihak ketiga: kartu yang sudah tercetak harus tetap bisa
// direproduksi persis dari data pegawai yang sama.
//
// Alur: byte -> bit stream -> codeword data + Reed-Solomon -> penempatan modul
// (finder, timing, alignment) -> masking 8 pola -> memilih mask penalties
// terendah -> matriks siap render (SVG) dan siap cetak (canvas/PDF).

const PRIMITIVE = 0x11d
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)

;(function initGaloisField() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= PRIMITIVE
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return EXP[LOG[a] + LOG[b]]
}

// Polinomial generator untuk degree ECC (1 + a^1 + ... + a^n).
function rsGeneratorPoly(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount)
  const remainder = new Array(ecCount).fill(0)
  for (const byte of data) {
    const factor = byte ^ remainder[0]
    remainder.shift()
    remainder.push(0)
    for (let i = 0; i < ecCount; i++) {
      remainder[i] ^= gfMul(gen[i + 1], factor)
    }
  }
  return remainder
}

// Jumlah codeword data per versi (isi ECC level M saja, sesuai kebutuhan kartu
// ID: payload "SIMPRESPEG-{NIY}" selalu jauh di bawah kapasitas).
const VERSION_SPEC = {
  1: { total: 26, ec: 10, blocks: [[1, 16]] },
  2: { total: 44, ec: 16, blocks: [[1, 28]] },
  3: { total: 70, ec: 26, blocks: [[1, 44]] },
  4: { total: 100, ec: 18, blocks: [[2, 32]] },
  5: { total: 134, ec: 24, blocks: [[2, 43]] },
  6: { total: 172, ec: 16, blocks: [[4, 27]] },
  7: { total: 196, ec: 18, blocks: [[4, 31]] },
  8: { total: 242, ec: 22, blocks: [[2, 38], [2, 39]] },
  9: { total: 292, ec: 22, blocks: [[3, 36], [2, 37]] },
  10: { total: 346, ec: 26, blocks: [[4, 43], [1, 44]] },
}

// Pusat alignment pattern untuk versi 2-10.
const ALIGNMENT_CENTERS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
}

const ECC_FORMAT_BITS = 0b00 // level M
const VERSION_LIMIT = 10

function dataCodewordCount(spec) {
  return spec.blocks.reduce((sum, [blocks, words]) => sum + blocks * words, 0)
}

function smallestVersionFor(byteLength) {
  for (let v = 1; v <= VERSION_LIMIT; v++) {
    // Count field: 8 bit untuk versi 1-9, 16 bit mulai versi 10.
    const countBits = v < 10 ? 8 : 16
    const capacity = dataCodewordCount(VERSION_SPEC[v]) * 8 - 4 - countBits
    if (byteLength * 8 <= capacity) return v
  }
  return null
}

function toUtf8Bytes(text) {
  const out = []
  for (const char of String(text)) {
    let code = char.codePointAt(0)
    if (code < 0x80) {
      out.push(code)
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }
  return out
}

function buildCodewords(text, version) {
  const spec = VERSION_SPEC[version]
  const totalData = dataCodewordCount(spec)
  const bytes = toUtf8Bytes(text)
  const countBits = version < 10 ? 8 : 16

  const bits = []
  const pushBits = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1)
  }
  pushBits(0b0100, 4) // mode byte
  pushBits(bytes.length, countBits)
  for (const byte of bytes) pushBits(byte, 8)

  // Terminator (maks 4 bit) + padding ke batas codeword.
  const capacityBits = totalData * 8
  pushBits(0, Math.min(4, capacityBits - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)

  const data = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]
    data.push(byte)
  }
  const padBytes = [0xec, 0x11]
  let padIndex = 0
  while (data.length < totalData) {
    data.push(padBytes[padIndex % 2])
    padIndex++
  }

  // Split per blok, hitung ECC tiap blok, lalu interleave.
  const dataBlocks = []
  const ecBlocks = []
  let offset = 0
  for (const [blocks, words] of spec.blocks) {
    for (let b = 0; b < blocks; b++) {
      const chunk = data.slice(offset, offset + words)
      offset += words
      dataBlocks.push(chunk)
      ecBlocks.push(rsEncode(chunk, spec.ec))
    }
  }

  const result = []
  const maxData = Math.max(...dataBlocks.map((b) => b.length))
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) if (i < block.length) result.push(block[i])
  }
  for (let i = 0; i < spec.ec; i++) {
    for (const block of ecBlocks) result.push(block[i])
  }
  return result
}

function bchFormatBits(maskIndex) {
  const data = (ECC_FORMAT_BITS << 3) | maskIndex
  let remainder = data
  for (let i = 0; i < 10; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537)
  }
  return ((data << 10) | remainder) ^ 0x5412
}

function bchVersionBits(version) {
  let remainder = version
  for (let i = 0; i < 12; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25)
  }
  return (version << 12) | remainder
}

// Mask 0-7 (x = baris, y = kolom) sesuai spesifikasi ISO/IEC 18004.
const MASK_FUNCTIONS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => x % 2 === 0,
  (x, y) => y % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 2) + Math.floor(y / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => ((x * y) % 3) + (x % 2) + (y % 2) === 0,
  (x, y) => (((x * y) % 3) + (x % 2) + (y % 2)) % 2 === 0,
]

const FINDER_RUN_PATTERN = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]

function createCanvas(version) {
  const size = version * 4 + 17
  const modules = Array.from({ length: size }, () => new Array(size).fill(0))
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false))

  const setFunction = (row, col, value) => {
    modules[row][col] = value ? 1 : 0
    isFunction[row][col] = true
  }

  // Finder pattern 7x7 + separator putih 8x8 di tiga sudut.
  const placeFinder = (top, left) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r
        const col = left + c
        if (row < 0 || row >= size || col < 0 || col >= size) continue
        const inRing =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6))
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4
        setFunction(row, col, inRing || inCore)
      }
    }
  }
  placeFinder(0, 0)
  placeFinder(0, size - 7)
  placeFinder(size - 7, 0)

  // Timing pattern.
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0
    setFunction(6, i, dark)
    setFunction(i, 6, dark)
  }

  // Alignment pattern 5x5.
  const centers = ALIGNMENT_CENTERS[version]
  for (const row of centers) {
    for (const col of centers) {
      const nearFinder =
        (row <= 8 && col <= 8) ||
        (row <= 8 && col >= size - 9) ||
        (row >= size - 9 && col <= 8)
      if (nearFinder) continue
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFunction(row + dr, col + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1)
        }
      }
    }
  }

  // Area format info (dipasang setelah mask terpilih) + dark module.
  for (let i = 0; i <= 8; i++) {
    isFunction[i][8] = true
    isFunction[8][i] = true
  }
  for (let i = 0; i < 8; i++) {
    isFunction[size - 1 - i][8] = true
    isFunction[8][size - 1 - i] = true
  }
  setFunction(size - 8, 8, true)

  // Version info (hanya versi >= 7).
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      isFunction[b][a] = true
      isFunction[a][b] = true
    }
  }

  return { size, modules, isFunction }
}

function placeData(canvas, codewords) {
  const { size, modules, isFunction } = canvas
  const bits = []
  for (const byte of codewords) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1)
  }
  let index = 0
  let upward = true
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5 // kolom timing dilewati
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i
      for (const col of [right, right - 1]) {
        if (isFunction[row][col]) continue
        modules[row][col] = index < bits.length ? bits[index] : 0
        index++
      }
    }
    upward = !upward
  }
}

function applyFormatInfo(canvas, maskIndex, version) {
  const { size, modules } = canvas
  const bits = bchFormatBits(maskIndex)
  const bit = (i) => ((bits >> i) & 1) === 1

  // Salinan pertama (dekat finder kiri-atas).
  for (let i = 0; i <= 5; i++) modules[i][8] = bit(i) ? 1 : 0
  modules[7][8] = bit(6) ? 1 : 0
  modules[8][8] = bit(7) ? 1 : 0
  modules[8][7] = bit(8) ? 1 : 0
  for (let i = 9; i < 15; i++) modules[8][14 - i] = bit(i) ? 1 : 0

  // Salinan kedua (membelah sisi kanan atas dan bawah kiri).
  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = bit(i) ? 1 : 0
  for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = bit(i) ? 1 : 0
  modules[size - 8][8] = 1

  if (version >= 7) {
    const vbits = bchVersionBits(version)
    for (let i = 0; i < 18; i++) {
      const on = ((vbits >> i) & 1) === 1 ? 1 : 0
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      modules[b][a] = on
      modules[a][b] = on
    }
  }
}

function applyMask(canvas, maskIndex) {
  const { size, modules, isFunction } = canvas
  const fn = MASK_FUNCTIONS[maskIndex]
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isFunction[row][col]) continue
      if (fn(row, col)) modules[row][col] ^= 1
    }
  }
}

function countPenalty(modules) {
  const size = modules.length
  let penalty = 0
  let dark = 0

  const scoreLine = (line) => {
    let result = 0
    let runLength = 1
    for (let i = 1; i < line.length; i++) {
      if (line[i] === line[i - 1]) {
        runLength++
      } else {
        if (runLength >= 5) result += 3 + (runLength - 5)
        runLength = 1
      }
    }
    if (runLength >= 5) result += 3 + (runLength - 5)

    for (let i = 0; i + 10 < line.length; i++) {
      let matches = true
      for (let j = 0; j < 11; j++) {
        if (line[i + j] !== FINDER_RUN_PATTERN[j]) {
          matches = false
          break
        }
      }
      if (matches) result += 40
    }
    return result
  }

  for (let row = 0; row < size; row++) {
    penalty += scoreLine(modules[row])
    for (let col = 0; col < size; col++) if (modules[row][col]) dark++
  }
  for (let col = 0; col < size; col++) {
    penalty += scoreLine(modules.map((row) => row[col]))
  }

  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const v = modules[row][col]
      if (
        v === modules[row][col + 1] &&
        v === modules[row + 1][col] &&
        v === modules[row + 1][col + 1]
      ) {
        penalty += 3
      }
    }
  }

  const total = size * size
  const percent = (dark * 100) / total
  penalty += Math.floor(Math.abs(percent - 50) / 5) * 10
  return penalty
}

// Cache per payload supaya 209 kartu tidak di-encode berulang kali saat
// re-render, filter, atau pindah halaman.
const matrixCache = new Map()

// Quiet zone (zona-tenang): 4 modul putih di sekeliling QR. Wajib menurut
// ISO/IEC 18004 dan tidak boleh dipotong, karena tanpa zona tenang pemindai
// laser/handphone sering gagal mengunci finder pattern. Ditambahkan saat
// render, bukan saat encode, supaya logika masking & penalty tetap memakai
// matriks kode yang bersih.
export const QR_QUIET_ZONE = 4

/** Jumlah modul total yang harus digambar termasuk quiet zone. */
export function qrRenderSize(matrix) {
  return matrix.size + QR_QUIET_ZONE * 2
}

/**
 * Bangun matriks QR untuk sebuah teks.
 * @returns {{ size:number, modules:number[][], version:number, dark:number } | null}
 *          null bila payload melebihi kapasitas versi 1-10.
 */
export function encodeQrMatrix(text) {
  const value = String(text ?? '')
  if (!value) return null
  if (matrixCache.has(value)) return matrixCache.get(value)

  const bytes = toUtf8Bytes(value)
  const version = smallestVersionFor(bytes.length)
  if (!version) return null

  const codewords = buildCodewords(value, version)

  let best = null
  for (let maskIndex = 0; maskIndex < 8; maskIndex++) {
    const canvas = createCanvas(version)
    placeData(canvas, codewords)
    applyMask(canvas, maskIndex)
    applyFormatInfo(canvas, maskIndex, version)
    const penalty = countPenalty(canvas.modules)
    if (!best || penalty < best.penalty) best = { penalty, canvas, maskIndex }
  }

  const result = {
    size: best.canvas.size,
    modules: best.canvas.modules,
    version,
    maskIndex: best.maskIndex,
    dark: best.canvas.modules.flat().filter(Boolean).length,
  }
  matrixCache.set(value, result)
  return result
}

// Helper untuk pengujian: matriks sebagai string "0"/"1" per baris.
export function qrMatrixToRows(text) {
  const matrix = encodeQrMatrix(text)
  if (!matrix) return []
  return matrix.modules.map((row) => row.join(''))
}
