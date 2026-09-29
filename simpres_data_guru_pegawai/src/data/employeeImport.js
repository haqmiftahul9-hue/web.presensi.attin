import * as XLSX from 'xlsx'
import {
  EMPLOYEE_COLUMNS, normalizeHeader, validateEmployee,
} from './employeeSchema.js'

const MAX_SIZE = 10 * 1024 * 1024

// Header unik per baris; import milik template resmi ada 3 baris panduan di atas.
const GUIDE_ROWS = [
  /simpres\s*[-–—]\s*template/i,
  /^isi baris mulai baris ke-/i,
  /^kolom bertanda/i,
]

const looksLikeGuide = (cell) => GUIDE_ROWS.some((re) => re.test(String(cell || '').trim()))

// Baca file Excel/CSV menjadi baris objek. Mendukung .xlsx, .xls, dan .csv.
export async function readSpreadsheet(file) {
  if (!/\.(xlsx|xls|csv|txt)$/i.test(file.name)) {
    throw new Error('Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv.')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Ukuran file melebihi batas 10 MB.')
  }
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheet = book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('File tidak berisi worksheet yang dapat dibaca.')

  // raw:false memakai teks yang ditampilkan sel, sehingga nol di depan pada
  // NIY/NIP/KTP tetap terbaca sebagai teks, bukan angka.
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: '', raw: false })
  if (aoa.length === 0) throw new Error('File kosong — tidak ada data untuk diimpor.')

  let headerIndex = aoa.findIndex((r) => r.some((c) => normalizeHeader(c) === 'niy'))
  if (headerIndex === -1) {
    headerIndex = aoa.findIndex((r) => r.filter((c) => normalizeHeader(c)).length >= 2)
  }
  if (headerIndex === -1) {
    throw new Error('Header kolom tidak dikenali. Gunakan template resmi SimPres.')
  }

  const headerRow = aoa[headerIndex].map((h) => String(h ?? '').trim())
  // Nomor baris memakai indeks asli sheet agar cocok dengan yang dilihat di Excel,
  // termasuk ketika template memiliki baris panduan / baris kosong.
  const dataRows = aoa
    .slice(headerIndex + 1)
    .map((cells, i) => ({ cells, rowNum: headerIndex + 2 + i }))
    .filter(({ cells }) => cells.some((c) => String(c ?? '').trim() !== ''))
    .filter(({ cells }) => !looksLikeGuide(cells[0]))

  return {
    headerRow,
    dataRows,
    detectedHeaderRow: headerIndex + 1,
  }
}

// Validasi file terhadap store: kembalikan { rows, errors, mappedColumns }.
export function validateImport(file, state) {
  const { headerRow, dataRows, detectedHeaderRow } = file
  const columns = headerRow.map((h) => normalizeHeader(h))
  const unknown = headerRow.filter((h, i) => h && !columns[i])
  const mapped = EMPLOYEE_COLUMNS.filter((c) => columns.includes(c.key))

  const errors = []
  if (mapped.length === 0) {
    throw new Error('Tidak ada kolom yang dikenali pada file ini.')
  }
  for (const c of EMPLOYEE_COLUMNS) {
    if (c.required && !columns.includes(c.key)) {
      errors.push(`Kolom wajib "${c.label}" tidak ditemukan pada file.`)
    }
  }
  if (unknown.length > 0) {
    errors.push(`Kolom tidak dikenali dan diabaikan: ${unknown.join(', ')}.`)
  }
  if (dataRows.length === 0) {
    errors.push('Tidak ada baris data untuk diimpor.')
  }

  const unitByName = new Map(state.units.map((u) => [u.nama.toLowerCase(), u.id]))
  const seenNIY = new Set(state.staff.map((s) => String(s.niy).trim()))
  const valid = []

  dataRows.forEach(({ cells, rowNum }) => {
    const draft = {}
    headerRow.forEach((_, colIdx) => {
      const field = columns[colIdx]
      if (!field) return
      const raw = cells[colIdx]
      if (field === 'unitId') {
        const unitId = unitByName.get(String(raw ?? '').trim().toLowerCase())
        draft.unitId = unitId || ''
        if (!unitId) errors.push(`Baris ${rowNum}: Unit "${String(raw ?? '').trim()}" tidak terdaftar.`)
      } else {
        draft[field] = typeof raw === 'number' ? String(raw) : String(raw ?? '').trim()
      }
    })

    if (!Object.values(draft).some((v) => String(v).trim() !== '')) return

    const found = validateEmployee(draft, { staff: state.staff, units: state.units })
    for (const [field, message] of Object.entries(found)) {
      if (field === 'unitId' && errors.some((e) => e.startsWith(`Baris ${rowNum}: Unit`))) continue
      errors.push(`Baris ${rowNum}: ${message}`)
    }
    if (Object.keys(found).length > 0) return

    const niy = String(draft.niy).trim()
    if (seenNIY.has(niy)) {
      errors.push(`Baris ${rowNum}: NIY ${niy} sudah terdaftar.`)
      return
    }
    seenNIY.add(niy)
    valid.push({ rowNum, draft })
  })

  return { valid, errors, mapped, detectedHeaderRow }
}

// Ubah draft tervalidasi menjadi objek pegawai yang siap masuk store.
export function draftToStaff(draft) {
  const staff = { ...draft }
  if (!staff.status) staff.status = 'Aktif'
  staff.masuk = null
  staff.method = null
  staff.late = 0
  staff.alpha = false
  staff.outsideRadius = false
  return staff
}

export function previewRows(validated, limit = 5) {
  return validated.slice(0, limit).map(({ draft }) => draft)
}
