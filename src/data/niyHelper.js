// Modul Utilitas NIY (Nomor Induk Yayasan) SIMPEG Attin
// Format 9 Digit: [Kode Unit: 2 digit][Tahun Berdiri Yayasan: 17][Tahun Masuk: 2 digit][Nomor Urut: 3 digit]
// Contoh resmi: 011722012 (01 = TK, 17 = Yayasan, 22 = Masuk 2022, 012 = Urutan ke-12 di unit TK)

export const KODE_UNIT_DEFAULT = {
  tk: '01',
  sd: '02',
  smp: '03',
  sma: '04',
}

export const LABEL_UNIT_DEFAULT = {
  '01': 'TK',
  '02': 'SD',
  '03': 'SMP',
  '04': 'SMA',
}

export const TAHUN_YAYASAN_DEFAULT = '17'

/**
 * Normalisasi id unit ke bentuk kanonis ('tk', 'sd', 'smp', 'sma')
 */
export function normalizeUnitId(unitId) {
  if (!unitId) return ''
  const str = String(unitId).toLowerCase().trim()
  if (str === 'tk' || str.includes('tk')) return 'tk'
  if (str === 'sd' || str.includes('sd')) return 'sd'
  if (str === 'smp' || str.includes('smp')) return 'smp'
  if (str === 'sma' || str.includes('sma')) return 'sma'
  return str
}

/**
 * Mendapatkan kode unit 2 digit ('01', '02', '03', '04') dari unitId atau objek settings
 */
export function getUnitCode(unitId, settings = null) {
  const norm = normalizeUnitId(unitId)
  const mapping = settings?.niy?.kodeUnit || KODE_UNIT_DEFAULT
  return mapping[norm] || KODE_UNIT_DEFAULT[norm] || ''
}

/**
 * Mendapatkan unitId kanonis dari kode unit 2 digit ('01' -> 'tk', dll)
 */
export function getUnitIdFromCode(code, settings = null) {
  const cleanCode = String(code || '').trim()
  const mapping = settings?.niy?.kodeUnit || KODE_UNIT_DEFAULT
  for (const [uid, c] of Object.entries(mapping)) {
    if (String(c) === cleanCode) return uid
  }
  for (const [uid, c] of Object.entries(KODE_UNIT_DEFAULT)) {
    if (String(c) === cleanCode) return uid
  }
  return null
}

/**
 * Ekstraksi 2 digit tahun dari tanggal (YYYY-MM-DD) atau nilai tahun
 */
export function extractYear2Digit(dateOrYear) {
  if (!dateOrYear) {
    const currentYear = new Date().getFullYear()
    return String(currentYear).slice(-2)
  }
  const str = String(dateOrYear).trim()
  // Format YYYY-MM-DD atau YYYY
  const match = str.match(/^(\d{4})/)
  if (match) {
    return match[1].slice(-2)
  }
  // Format 2 digit langsung (misal '22')
  if (/^\d{2}$/.test(str)) {
    return str
  }
  const currentYear = new Date().getFullYear()
  return String(currentYear).slice(-2)
}

/**
 * Menghitung nomor urut berikutnya untuk unit bersangkutan
 * Membaca data pegawai yang sudah ada untuk menentukan urutan tertinggi + 1
 */
export function getNextUnitSequence(unitId, staffList = [], settings = null) {
  const norm = normalizeUnitId(unitId)
  const unitCode = getUnitCode(norm, settings)
  const tahunYayasan = String(settings?.niy?.tahunBerdiriYayasan || TAHUN_YAYASAN_DEFAULT)

  let maxSeq = 0
  let countInUnit = 0

  for (const staff of staffList) {
    const staffUnitNorm = normalizeUnitId(staff.unitId)
    const niyStr = String(staff.niy || '').trim()

    // Cek apakah pegawai ini di unit yang sama
    const isSameUnit = staffUnitNorm === norm

    if (isSameUnit) {
      countInUnit++
    }

    // Jika NIY pegawai sesuai pola yayasan (9 digit) dengan kode unit yang cocok
    if (niyStr.length === 9 && /^\d{9}$/.test(niyStr)) {
      const codeInNiy = niyStr.slice(0, 2)
      const yayasanInNiy = niyStr.slice(2, 4)
      const seqInNiy = parseInt(niyStr.slice(6), 10)

      if (codeInNiy === unitCode && yayasanInNiy === tahunYayasan && !isNaN(seqInNiy)) {
        if (seqInNiy > maxSeq) {
          maxSeq = seqInNiy
        }
      }
    }
  }

  // Ambil yang terbesar antara nomor urut tertinggi + 1 atau jumlah pegawai + 1
  const nextSeq = Math.max(maxSeq + 1, countInUnit + 1)
  return Math.min(nextSeq, 999)
}

/**
 * Generate NIY resmi 9 digit
 * Contoh hasil: 011722012
 */
export function generateNiy({
  unitId,
  tahunMasuk = null,
  tanggalMasuk = null,
  nomorUrut = null,
  staffList = [],
  settings = null,
}) {
  const norm = normalizeUnitId(unitId)
  const kodeUnit = getUnitCode(norm, settings) || '01'
  const tahunYayasan = String(settings?.niy?.tahunBerdiriYayasan || TAHUN_YAYASAN_DEFAULT)
  const thnMasuk2Digit = extractYear2Digit(tanggalMasuk || tahunMasuk)

  let seqNum = nomorUrut
  if (seqNum === null || seqNum === undefined || isNaN(Number(seqNum)) || Number(seqNum) <= 0) {
    seqNum = getNextUnitSequence(norm, staffList, settings)
  }

  const paddedSeq = String(seqNum).padStart(3, '0').slice(-3)
  return `${kodeUnit}${tahunYayasan}${thnMasuk2Digit}${paddedSeq}`
}

/**
 * Parse dan dekonstruksi NIY menjadi komponen-komponennya
 */
export function parseNiy(niy, settings = null) {
  const raw = String(niy ?? '').trim()
  if (!/^\d{9}$/.test(raw)) {
    return {
      raw,
      isValid: false,
      error: 'Panjang NIY harus persis 9 digit angka',
      kodeUnit: '',
      unitId: null,
      tahunYayasan: '',
      tahunMasuk: '',
      nomorUrut: '',
    }
  }

  const kodeUnit = raw.slice(0, 2)
  const tahunYayasan = raw.slice(2, 4)
  const tahunMasuk = raw.slice(4, 6)
  const nomorUrut = raw.slice(6, 9)
  const unitId = getUnitIdFromCode(kodeUnit, settings)

  const tahunYayasanResmi = String(settings?.niy?.tahunBerdiriYayasan || TAHUN_YAYASAN_DEFAULT)
  const isYayasanMatch = tahunYayasan === tahunYayasanResmi
  const isUnitValid = Boolean(unitId)

  return {
    raw,
    isValid: isYayasanMatch && isUnitValid,
    error: !isUnitValid
      ? `Kode unit '${kodeUnit}' tidak dikenali`
      : !isYayasanMatch
      ? `Tahun berdiri yayasan harus '${tahunYayasanResmi}'`
      : null,
    kodeUnit,
    unitId,
    tahunYayasan,
    tahunMasuk,
    nomorUrut,
    rawSequence: parseInt(nomorUrut, 10),
  }
}

/**
 * Validasi ketat format NIY
 * Return { valid: boolean, error: string | null }
 */
export function validateNiy({
  niy,
  unitId = null,
  tanggalMasuk = null,
  staffList = [],
  excludeId = null,
  settings = null,
  allowEmpty = false,
}) {
  const val = String(niy ?? '').trim()
  if (!val) {
    if (allowEmpty) return { valid: true, error: null }
    return { valid: false, error: 'NIY wajib diisi' }
  }

  // 1. Format harus 9 digit numerik
  if (!/^\d{9}$/.test(val)) {
    return {
      valid: false,
      error: 'Format NIY harus 9 digit numerik: [Kode Unit 2 digit][Tahun Yayasan 17][Tahun Masuk 2 digit][No Urut 3 digit]. Contoh: 011722012',
    }
  }

  const kodeUnitNiy = val.slice(0, 2)
  const tahunYayasanNiy = val.slice(2, 4)
  const tahunMasukNiy = val.slice(4, 6)
  const nomorUrutNiy = val.slice(6, 9)

  // 2. Tahun berdiri yayasan wajib 17 (atau sesuai settings)
  const tahunYayasanResmi = String(settings?.niy?.tahunBerdiriYayasan || TAHUN_YAYASAN_DEFAULT)
  if (tahunYayasanNiy !== tahunYayasanResmi) {
    return {
      valid: false,
      error: `Tahun berdiri yayasan pada NIY harus '${tahunYayasanResmi}' (posisi digit ke-3 dan ke-4). Nilai terinput: '${tahunYayasanNiy}'`,
    }
  }

  // 3. Validasi kode unit
  const mappedUnit = getUnitIdFromCode(kodeUnitNiy, settings)
  if (!mappedUnit) {
    return {
      valid: false,
      error: `Kode unit '${kodeUnitNiy}' tidak valid. Pilihan: TK (01), SD (02), SMP (03), SMA (04)`,
    }
  }

  // Jika unitId diberikan, pastikan kode unit pada NIY cocok dengan unit pegawai
  if (unitId) {
    const expectedCode = getUnitCode(unitId, settings)
    if (expectedCode && kodeUnitNiy !== expectedCode) {
      const labelExpected = LABEL_UNIT_DEFAULT[expectedCode] || unitId.toUpperCase()
      const labelActual = LABEL_UNIT_DEFAULT[kodeUnitNiy] || kodeUnitNiy
      return {
        valid: false,
        error: `Kode unit pada NIY (${kodeUnitNiy} - ${labelActual}) tidak cocok dengan Unit Sekolah terpilih (${expectedCode} - ${labelExpected})`,
      }
    }
  }

  // 4. Validasi tahun masuk jika tanggalMasuk diisi
  if (tanggalMasuk) {
    const expectedYear = extractYear2Digit(tanggalMasuk)
    if (tahunMasukNiy !== expectedYear) {
      return {
        valid: false,
        error: `Tahun masuk pada NIY (${tahunMasukNiy}) tidak cocok dengan tahun Tanggal Masuk (${expectedYear})`,
      }
    }
  }

  // 5. Validasi nomor urut (harus > 000)
  const seqNum = parseInt(nomorUrutNiy, 10)
  if (isNaN(seqNum) || seqNum <= 0) {
    return {
      valid: false,
      error: 'Nomor urut pegawai pada 3 digit terakhir NIY harus lebih besar dari 000 (contoh: 012)',
    }
  }

  // 6. Cek duplikasi dengan pegawai lain
  if (staffList && staffList.length > 0) {
    const dup = staffList.find(
      (s) => String(s.niy || '').trim() === val && (excludeId === null || s.id !== excludeId),
    )
    if (dup) {
      return {
        valid: false,
        error: `NIY ${val} sudah terdaftar atas nama ${dup.name}`,
      }
    }
  }

  return { valid: true, error: null }
}
