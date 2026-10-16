// Skema data pegawai: SATU sumber definisi kolom untuk form Tambah/Edit,
// template Excel, dan pembacaan file Import. Form dan template tidak akan
// pernah berbeda karena keduanya memakai EMPLOYEE_COLUMNS yang sama.

export const EMPLOYEE_COLUMNS = [
  { key: 'niy', label: 'NIY', required: true, group: 'Identitas', type: 'text', width: 14 },
  { key: 'name', label: 'Nama Lengkap', required: true, group: 'Identitas', type: 'text', width: 32 },
  { key: 'gelar', label: 'Gelar Akademik', required: false, group: 'Identitas', type: 'text', width: 18 },
  { key: 'pendidikanAsal', label: 'Pendidikan Asal', required: false, group: 'Identitas', type: 'text', width: 26 },
  { key: 'jenisKelamin', label: 'Jenis Kelamin', required: false, group: 'Identitas', type: 'select', options: ['Laki-laki', 'Perempuan'], width: 16 },
  { key: 'tempatLahir', label: 'Tempat Lahir', required: false, group: 'Identitas', type: 'text', width: 16 },
  { key: 'tanggalLahir', label: 'Tanggal Lahir', required: false, group: 'Identitas', type: 'date', width: 16 },
  { key: 'alamat', label: 'Alamat', required: false, group: 'Identitas', type: 'text', width: 34 },
  { key: 'unitId', label: 'Unit Sekolah', required: true, group: 'Kepegawaian', type: 'unit', width: 24 },
  { key: 'role', label: 'Jabatan', required: true, group: 'Kepegawaian', type: 'text', width: 26 },
  { key: 'status', label: 'Status Pegawai', required: true, group: 'Kepegawaian', type: 'select', options: ['Aktif', 'Nonaktif'], width: 16 },
  { key: 'statusPegawai', label: 'Status Kepegawaian', required: false, group: 'Kepegawaian', type: 'select', options: ['Guru Magang', 'Guru Kontrak', 'Guru Tetap Yayasan', 'Pegawai Magang', 'Pegawai Kontrak', 'Pegawai Tetap Yayasan'], width: 24 },
  { key: 'tanggalMasuk', label: 'Tanggal Masuk', required: false, group: 'Kepegawaian', type: 'date', width: 16 },
  { key: 'skPengangkatan', label: 'SK Pengangkatan', required: false, group: 'Kepegawaian', type: 'text', width: 20 },
  { key: 'pendTerakhir', label: 'Pendidikan Terakhir', required: false, group: 'Pendidikan', type: 'text', width: 24 },
  { key: 'jurusan', label: 'Jurusan', required: false, group: 'Pendidikan', type: 'text', width: 28 },
  { key: 'kontak', label: 'Kontak / No. HP', required: false, group: 'Kontak', type: 'tel', width: 18 },
  { key: 'email', label: 'Email', required: false, group: 'Kontak', type: 'email', width: 28 },
]

export const EMPLOYEE_GROUPS = ['Identitas', 'Kepegawaian', 'Pendidikan', 'Kontak']

// Field yang ikut tersimpan di store, dipakai saat add/edit/import.
export const EMPLOYEE_TEXT_KEYS = EMPLOYEE_COLUMNS
  .filter((c) => !['unitId', 'status', 'jenisKelamin', 'statusPegawai', 'tanggalLahir', 'tanggalMasuk'].includes(c.key))
  .map((c) => c.key)

export const EMPTY_EMPLOYEE = {
  niy: '',
  name: '',
  gelar: '',
  pendidikanAsal: '',
  jenisKelamin: '',
  tempatLahir: '',
  tanggalLahir: '',
  alamat: '',
  unitId: '',
  role: '',
  status: 'Aktif',
  statusPegawai: 'Guru Tetap Yayasan',
  tanggalMasuk: '',
  skPengangkatan: '',
  pendTerakhir: '',
  jurusan: '',
  kontak: '',
  email: '',
}

export function toEmptyEmployee(state) {
  return { ...EMPTY_EMPLOYEE, unitId: state.units.length > 0 ? state.units[0].id : '' }
}

export function toEmployeeForm(staff, state) {
  if (!staff) return toEmptyEmployee(state)
  const form = { ...EMPTY_EMPLOYEE }
  for (const col of EMPLOYEE_COLUMNS) {
    const value = staff[col.key]
    form[col.key] = value === undefined || value === null ? '' : String(value)
  }
  if (!form.status) form.status = 'Aktif'
  if (!form.unitId && state.units.length > 0) form.unitId = state.units[0].id
  return form
}

const TEXT_KEYS = new Set(EMPLOYEE_COLUMNS.map((c) => c.key))
const LABEL_INDEX = new Map()
for (const col of EMPLOYEE_COLUMNS) {
  LABEL_INDEX.set(col.key, col.key)
  LABEL_INDEX.set(col.key.toLowerCase(), col.key)
  LABEL_INDEX.set(col.label.toLowerCase(), col.key)
}

// Alias label yang lazim dipakai di file Excel milik pengguna.
const HEADER_ALIASES = {
  niy: ['niy', 'nomor induk yayasan'],
  name: ['nama', 'nama lengkap', 'nama lengkap & gelar', 'nama dan gelar'],
  gelar: ['gelar', 'gelar akademik', 'akademik'],
  pendidikanAsal: ['pendidikan asal', 'asal pendidikan', 'asal sekolah', 'asal kampus', 'universitas asal', 'sekolah asal', 'institusi asal', 'almamater', 'nomor identitas', 'ktp', 'nik', 'no ktp', 'nomor ktp'],
  jenisKelamin: ['jenis kelamin', 'jk', 'gender'],
  tempatLahir: ['tempat lahir', 'tempat'],
  tanggalLahir: ['tanggal lahir', 'tgl lahir', 'tanggal lahir (ttl)'],
  alamat: ['alamat', 'alamat domisili'],
  unitId: ['unit', 'unit sekolah', 'unit kerja', 'satuan pendidikan'],
  role: ['jabatan', 'penugasan', 'jabatan / penugasan'],
  status: ['status', 'status pegawai', 'status aktif'],
  statusPegawai: ['status kepegawaian', 'jenis kepegawaian', 'status pegawai', 'kepegawaian'],
  tanggalMasuk: ['tanggal masuk', 'tgl masuk', 'mulai tugas'],
  skPengangkatan: ['sk pengangkatan', 'sk', 'nomor sk'],
  pendTerakhir: ['pendidikan terakhir', 'pendidikan', 'jenjang pendidikan'],
  jurusan: ['jurusan', 'prodi', 'program studi', 'fakultas'],
  kontak: ['kontak', 'no hp', 'nomor hp', 'kontak / no. hp', 'telepon', 'wa'],
  email: ['email', 'e-mail', 'surel'],
}

const squashHeader = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function normalizeHeader(raw) {
  // Tanda wajib " *" dibuang agar kolom template tetap dikenali.
  const cleaned = String(raw || '').replace(/\*/g, ' ')
  const key = cleaned.toLowerCase().replace(/[._/\\]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!key) return null
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key)) return field
  }
  // Coba lagi tanpa tanda baca, mis. "Kontak / No. HP" vs "Kontak No HP".
  const squashed = squashHeader(cleaned)
  if (!squashed) return null
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => squashHeader(a) === squashed)) return field
  }
  return LABEL_INDEX.get(cleaned.trim()) || LABEL_INDEX.get(key) || null
}

export function isEmployeeKey(key) {
  return TEXT_KEYS.has(key)
}

export function toExcelRow(employee, units) {
  return EMPLOYEE_COLUMNS.map((col) => {
    if (col.key === 'unitId') {
      const unit = units.find((u) => u.id === employee.unitId)
      return unit ? unit.nama : ''
    }
    return employee[col.key] ?? ''
  })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Validasi satu baris form/import. Mengembalikan { errors, staff }.
export function validateEmployee(draft, { staff = [], excludeId = null, units = [] } = {}) {
  const errors = {}
  const value = (k) => String(draft[k] ?? '').trim()

  for (const col of EMPLOYEE_COLUMNS) {
    if (col.required && !value(col.key)) {
      errors[col.key] = `${col.label} wajib diisi`
    }
  }

  if (value('email') && !EMAIL_RE.test(value('email'))) {
    errors.email = 'Format email tidak valid'
  }
  for (const key of ['tanggalLahir', 'tanggalMasuk']) {
    if (value(key) && !DATE_RE.test(value(key))) {
      errors[key] = 'Format tanggal harus YYYY-MM-DD'
    }
  }
  if (value('unitId') && !units.some((u) => u.id === value('unitId'))) {
    errors.unitId = 'Unit sekolah tidak terdaftar'
  }
  const dup = staff.find(
    (s) => String(s.niy).trim() === value('niy') && s.id !== excludeId,
  )
  if (value('niy') && dup) {
    errors.niy = `NIY ${value('niy')} sudah dipakai ${dup.name}`
  }
  return errors
}
