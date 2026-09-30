// Generator barcode Code 128 (Subset B) untuk NIY/NIP pegawai.
//
// Dipakai kartu ID sebagai alat identifikasi cepat di loket:_lines_ yang jauh
// lebih mudah dibaca pemindai 1D dibanding QR, sementara QR tetap membawa
// payload integrasi (SIMPRESPEG-{NIY}).
//
// Code 128 B dipilih (bukan C) supaya karakter non-angka pada NIY/NIP tetap
// aman, tanpa perlu logika subset switching.

// Lebar tiap simbol (6 elemen, kecuali stop = 7) dalam satuan modul.
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
]

const START_B = 104
const STOP = 106

function isEncodable(text) {
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code < 32 || code > 126) return false
  }
  return true
}

/**
 * @param {string} value teks yang di-encode (ASCII 32-126)
 * @returns {{ modules: number[], text: string, ok: boolean }}
 *          modules = lebar tiap elemen (bar/space) dalam satuan modul.
 */
export function encodeCode128(value) {
  const text = String(value ?? '')
  if (!text || !isEncodable(text)) return { modules: [], text, ok: false }

  const values = text.split('').map((c) => c.charCodeAt(0) - 32)

  // Checksum: start + sum(posisi * nilai) mod 103.
  let checksum = START_B
  values.forEach((v, i) => { checksum += v * (i + 1) })
  checksum %= 103

  const symbols = [START_B, ...values, checksum, STOP]
  const modules = []
  for (const symbol of symbols) {
    const pattern = PATTERNS[symbol]
    if (!pattern) return { modules: [], text, ok: false }
    for (const digit of pattern) modules.push(Number(digit))
  }
  return { modules, text, ok: true }
}

// Quiet zone barcode 1D: 10 kali lebar modul terkecil di sisi kiri dan kanan.
// Tanpa zona ini pemindai bisa salah baca simbol pertama/terakhir, terutama
// kalau kartu dilapis laminasi atau dipotong dekat tepi.
export const BARCODE_QUIET_MODULES = 10

/**
 * Ubah hasil encode menjadi daftar run (bar/space) untuk langsung di-render
 * sebagai SVG atau digambar ke PDF. Quiet zone disertakan agar kartu di
 * layar, di cetak, dan di PDF identik.
 * @returns {{ runs: { bar: boolean, width: number }[], totalWidth: number, quietWidth: number, ok: boolean }}
 */
export function toBarRuns(value) {
  const { modules, ok } = encodeCode128(value)
  if (!ok) return { runs: [], totalWidth: 0, quietWidth: 0, ok: false }
  const runs = modules.map((width, i) => ({ bar: i % 2 === 0, width }))
  const totalWidth = modules.reduce((sum, w) => sum + w, 0)
  return {
    runs,
    totalWidth,
    // Quiet zone di kiri dan kanan (satu sisi saja yang dihitung di sini).
    quietWidth: BARCODE_QUIET_MODULES,
    ok: true,
  }
}

export const CODE128_START_B = START_B
export const CODE128_STOP = STOP
