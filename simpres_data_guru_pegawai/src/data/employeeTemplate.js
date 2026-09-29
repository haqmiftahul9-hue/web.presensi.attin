import * as XLSX from 'xlsx'
import { EMPLOYEE_COLUMNS, toExcelRow } from './employeeSchema.js'

const PANDUAN = [
  ['SimPres — Template Import Data Pegawai'],
  ['Isi baris mulai baris ke-4. Jangan mengubah nama kolom pada baris ke-3.'],
  ['Kolom bertanda * wajib diisi. Unit Sekolah harus sama persis dengan nama unit di sistem.'],
]

// Template dibuat dari EMPLOYEE_COLUMNS, jadi kolomnya selalu sama dengan form.
// Kolom yang bisa kehilangan nol di depan bila Excel mengubahnya jadi angka.
const TEXT_FORMAT_KEYS = new Set([
  'niy', 'nip', 'nomorIdentitas', 'kontak', 'npwp',
  'bpjsKesehatan', 'bpjsKetenagakerjaan', 'rekeningBank',
  'tanggalLahir', 'tanggalMasuk', 'skPengangkatan',
])

export function buildTemplateSheet(state) {
  const headers = EMPLOYEE_COLUMNS.map((c) => (c.required ? `${c.label} *` : c.label))
  const sample = toExcelRow(
    {
      niy: '049001234',
      nip: '198501012005011001',
      name: 'Budi Santoso, S.Pd',
      gelar: 'S.Pd',
      nomorIdentitas: '3174012345678901',
      jenisKelamin: 'Laki-laki',
      tempatLahir: 'Jakarta',
      tanggalLahir: '1985-01-01',
      agama: 'Islam',
      alamat: state.units[0]?.alamat || '',
      unitId: state.units[0]?.id,
      role: 'Guru Kelas',
      status: 'Aktif',
      statusPegawai: 'GTT',
      tanggalMasuk: '2015-07-01',
      skPengangkatan: 'SK-001/2015',
      pendTerakhir: 'S1 Pendidikan Guru Sekolah Dasar',
      jurusan: 'Pendidikan Guru Sekolah Dasar',
      kontak: '081234567890',
      email: 'budi.santoso@simpres.sch.id',
      npwp: '12.345.678.9-012.000',
      bpjsKesehatan: '1234567890',
      bpjsKetenagakerjaan: '0987654321',
      rekeningBank: 'BCA - 1234567890',
      namaRekening: 'Budi Santoso, S.Pd',
    },
    state.units,
  )
  sample[EMPLOYEE_COLUMNS.findIndex((c) => c.key === 'unitId')] =
    state.units[0]?.nama || 'TKIT Attin Sumbar'

  return [PANDUAN, [], headers, sample]
}

export function buildTemplateWorkbook(state) {
  const sheet = XLSX.utils.aoa_to_sheet(buildTemplateSheet(state))
  // Paksa format teks pada kolom identitas supaya nol di depan tidak hilang.
  const range = XLSX.utils.decode_range(sheet['!ref'])
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })]
      if (!cell) continue
      if (r >= 2 && TEXT_FORMAT_KEYS.has(EMPLOYEE_COLUMNS[c]?.key)) {
        cell.t = 's'
        cell.z = '@'
        cell.w = String(cell.v ?? '')
      }
    }
  }
  sheet['!cols'] = EMPLOYEE_COLUMNS.map((c) => ({ wch: c.width || 16 }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Data Pegawai')
  return book
}

export function downloadTemplate(state) {
  const book = buildTemplateWorkbook(state)
  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'template_import_pegawai.xlsx'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
