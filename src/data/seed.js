// Single source of truth SimPres — angka kanonis hasil audit.
// Total: 209 pegawai (22+65+48+54+20), hadir 187, terlambat 14, belum 22, alpha 8.

export const UNITS = [
  { id: 'tk', kode: 'UNT-TK-01', nama: 'TK IT RJ', alamat: 'Jl. Cendekia No. 41', radius: 50, masuk: '07:00', pulang: '14:30', total: 22, hadir: 21, icon: 'child_care' },
  { id: 'sd', kode: 'UNT-SD-02', nama: 'SD Islam RJ', alamat: 'Jl. Cendekia No. 43, Cilandak', radius: 75, masuk: '07:00', pulang: '15:00', total: 65, hadir: 61, icon: 'school' },
  { id: 'smp', kode: 'UNT-SMP-03', nama: 'SMP Islam RJ', alamat: 'Jl. Cendekia No. 45', radius: 50, masuk: '07:00', pulang: '15:30', total: 48, hadir: 44, icon: 'school' },
  { id: 'sma', kode: 'UNT-SMA-04', nama: 'SMA Islam RJ', alamat: 'Jl. Cendekia No. 47', radius: 80, masuk: '06:45', pulang: '15:30', total: 54, hadir: 48, icon: 'school' },
  { id: 'pst', kode: 'UNT-PST-00', nama: 'Sekretariat Yayasan', alamat: 'Grha RJ Lt. 2', radius: 40, masuk: '07:30', pulang: '16:00', total: 20, hadir: 13, icon: 'domain' },
]

export const STAFF = [
  { id: 1, niy: '049005069', name: 'Erianto, S.Ag, M.Pd.I', role: 'Guru PAI', unitId: 'smp', status: 'Aktif', masuk: '06:45:12', method: 'Face Recognition', late: 0 },
  { id: 2, niy: '049097021', name: 'Bustanul Abidin, S.Pd', role: 'Guru Kelas 6 & Kurikulum', unitId: 'sd', status: 'Aktif', masuk: '06:52:04', method: 'QR Code', late: 0 },
  { id: 3, niy: '049098034', name: 'Sulasmi, S.Pd', role: 'Guru Kelas 3 • Tahfidz', unitId: 'sd', status: 'Aktif', masuk: '06:50:33', method: 'Face Recognition', late: 0 },
  { id: 4, niy: '049001054', name: 'Wisna Yunita, S.Pd', role: 'Guru Kelas 1 • Tematik', unitId: 'sd', status: 'Aktif', masuk: '06:58:33', method: 'Face Recognition', late: 0 },
  { id: 5, niy: '029011052', name: 'Irmawati, S.Pd', role: 'Guru Sentra', unitId: 'tk', status: 'Aktif', masuk: '07:20:10', method: 'QR Code', late: 20 },
  { id: 6, niy: '029012056', name: 'Risa Fadillah, S.Pd', role: 'Guru Biologi & Laboran', unitId: 'sma', status: 'Nonaktif', masuk: null, method: null, late: 0 },
  { id: 7, niy: '049033108', name: 'Hendra Kurniawan, S.Pd.I', role: 'Guru Agama', unitId: 'sd', status: 'Aktif', masuk: null, method: null, late: 0, alpha: true },
  { id: 8, niy: '049023183', name: 'Silvana Monica, S.Ak', role: 'Staf Administrasi', unitId: 'pst', status: 'Aktif', masuk: '07:08:45', method: 'QR Code', late: 0, outsideRadius: true },
]

export const LEAVES = [
  { id: 1, staffId: 4, jenis: 'Sakit', periode: '16-18 Sep 2026', durasi: '3 Hari', lampiran: 'Surat_Dokter.pdf', status: 'Menunggu' },
  { id: 2, staffId: 7, jenis: 'Izin Pribadi', periode: '15 Sep 2026', durasi: '1 Hari', lampiran: 'Undangan.pdf', status: 'Menunggu' },
  { id: 3, staffId: 6, jenis: 'Cuti Penting', periode: '18-25 Sep 2026', durasi: '6 Hari', lampiran: 'Berkas_Cuti.pdf', status: 'Menunggu' },
  { id: 4, staffId: 3, jenis: 'Sakit', periode: '08-09 Sep 2026', durasi: '2 Hari', lampiran: 'Surat_Sakit.pdf', status: 'Disetujui' },
  { id: 5, staffId: 8, jenis: 'Sakit', periode: '08-09 Sep 2026', durasi: '2 Hari', lampiran: 'Surat_Sakit_RS.pdf', status: 'Disetujui' },
  { id: 6, staffId: 2, jenis: 'Izin Pribadi', periode: '02 Sep 2026', durasi: '1 Hari', lampiran: 'Dispensasi.pdf', status: 'Ditolak' },
]

export const ADMIN_USERS = [
  { id: 1, name: 'Bambang Hidayat, S.Kom', niy: '019001001', email: 'bambang.h@simpres.sch.id', role: 'Superadmin', unitId: 'pst', status: 'Aktif' },
  { id: 2, name: 'Bustanul Abidin, S.Pd', niy: '049097021', email: 'bustanul.a@sd.rj.sch.id', role: 'Admin Unit', unitId: 'sd', status: 'Aktif' },
  { id: 3, name: 'Reki Gusman, S.E.', niy: '029010036', email: 'reki.g@smp.rj.sch.id', role: 'Admin Unit', unitId: 'smp', status: 'Aktif' },
  { id: 4, name: 'Silvana Monica, S.Ak', niy: '049023183', email: 'silvana.m@simpres.sch.id', role: 'Superadmin', unitId: 'pst', status: 'Aktif' },
]

export const INITIAL_LOGS = [
  { id: 1, time: '15 Sep 2026, 11:42', actor: 'Bambang Hidayat', role: 'Superadmin', action: 'Ubah', target: 'Unit • SD Islam RJ', desc: 'Radius geofence 50m → 75m' },
  { id: 2, time: '15 Sep 2026, 09:15', actor: 'Bustanul Abidin', role: 'Admin SD', action: 'Tambah', target: 'Pegawai • Erianto', desc: 'Tambah NIY 049005069 Guru PAI' },
  { id: 3, time: '14 Sep 2026, 14:05', actor: 'Superadmin Pusat', role: 'Superadmin', action: 'Reset Password', target: 'Akun • Hendra Kurniawan', desc: 'Reset & kirim kredensial via WA' },
  { id: 4, time: '14 Sep 2026, 08:22', actor: 'Reki Gusman', role: 'Admin SMP', action: 'Ubah', target: 'Cuti • Wisna Yunita', desc: 'Setujui izin sakit 3 hari' },
  { id: 5, time: '13 Sep 2026, 17:10', actor: 'Bambang Hidayat', role: 'Superadmin', action: 'Login', target: 'Sesi • Console', desc: 'Login 103.144.12.8 (Chrome)' },
]

export const INITIAL_SETTINGS = {
  namaAplikasi: 'SimPres',
  tagline: 'Sistem Presensi Kepegawaian Terpadu',
  namaYayasan: 'Yayasan Pendidikan Islam Raudhatul Jannah',
  emailSekretariat: 'sekretariat@raudhatuljannah.sch.id',
  alamatYayasan: 'Jl. Raya Cendekia No. 45, Jakarta Selatan',
  noWhatsapp: '+62 811-9876-5432',
  zonaWaktu: 'WIB',
}

export const WEEKLY_TREND = [
  { day: 'Sen', hadir: 182, terlambat: 12 },
  { day: 'Sel', hadir: 187, terlambat: 14 },
  { day: 'Rab', hadir: 190, terlambat: 9 },
  { day: 'Kam', hadir: 178, terlambat: 16 },
  { day: 'Jum', hadir: 184, terlambat: 11 },
  { day: 'Sab', hadir: 96, terlambat: 5 },
]

const WEEKDAY_INIT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const WEEKLY_MAP = {
  Min: { hadir: 95, terlambat: 4 },
  Sen: { hadir: 182, terlambat: 12 },
  Sel: { hadir: 187, terlambat: 14 },
  Rab: { hadir: 190, terlambat: 9 },
  Kam: { hadir: 178, terlambat: 16 },
  Jum: { hadir: 184, terlambat: 11 },
  Sab: { hadir: 96, terlambat: 5 },
}
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function buildTrend30() {
  const out = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 7, 17 + i)
    const wd = WEEKDAY_INIT[d.getDay()]
    const base = WEEKLY_MAP[wd] || WEEKLY_MAP.Sab
    const jitterH = ((d.getDate() * 7) % 5) - 2
    const jitterL = ((d.getDate() * 3) % 4) - 1
    out.push({
      day: `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`,
      wd,
      hadir: Math.max(80, Math.min(195, base.hadir + jitterH)),
      terlambat: Math.max(0, base.terlambat + jitterL),
    })
  }
  return out
}

export const TREND_30 = buildTrend30()

export const HOLIDAYS = [
  { date: '17 Agu 2026', name: 'Hari Kemerdekaan RI' },
  { date: '05 Sep 2026', name: 'Maulid Nabi Muhammad SAW' },
  { date: '25 Des 2026', name: 'Hari Raya Natal' },
]

export function initialsOf(name) {
  if (!name) return '?'
  const parts = String(name).split(/[\s,]+/).filter(Boolean)
  return (parts.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase()
}

const FIRST = ['Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gilang', 'Hesti', 'Indra', 'Joko', 'Kartika', 'Lina', 'Made', 'Nadia', 'Oscar', 'Putri', 'Rian', 'Sari', 'Tono', 'Utami', 'Vina', 'Wahyu', 'Yoga', 'Zahra', 'Andi', 'Bima', 'Dian', 'Farah', 'Hendra', 'Irma']
const LAST = ['Saputra', 'Wijaya', 'Kusuma', 'Pratama', 'Nugroho', 'Santoso', 'Rahmawati', 'Setiawan', 'Hidayat', 'Anggraini', 'Puspita', 'Firmansyah', 'Lestari', 'Ramadhan', 'Maharani', 'Gunawan', 'Permata', 'Utama', 'Wulandari', 'Hartono']
const TITLES = ['S.Pd', 'S.Ag', 'S.Kom', 'S.E.', 'S.Si', 'M.Pd', 'S.Pd.I', 'S.Ak', 'S.Sos', 'M.Si']
const ROLES_BY_UNIT = {
  tk: ['Guru Sentra', 'Guru Kelompok Bermain', 'Asisten Guru TK', 'Staf Administrasi TK'],
  sd: ['Guru Kelas', 'Guru Mapel', 'Guru Tahfidz', 'Staf TU SD', 'Guru PAI'],
  smp: ['Guru Mapel', 'Wali Kelas', 'Guru BK', 'Staf TU SMP', 'Guru PAI'],
  sma: ['Guru Mapel', 'Wali Kelas', 'Guru BK', 'Laboran', 'Staf TU SMA'],
  pst: ['Staf Administrasi', 'Staf Keuangan', 'Staf IT', 'Staf Umum'],
}

function hashN(n) {
  let x = n * 2654435761
  x = (x ^ (x >> 13)) * 1274126177
  return (x ^ (x >> 16)) >>> 0
}

export function buildFullStaff() {
  const out = [...STAFF]
  const plan = [
    { unitId: 'tk', need: 22 }, { unitId: 'sd', need: 65 }, { unitId: 'smp', need: 48 },
    { unitId: 'sma', need: 54 }, { unitId: 'pst', need: 20 },
  ]
  let id = 100
  plan.forEach(({ unitId, need }) => {
    const have = out.filter((s) => s.unitId === unitId).length
    const unit = UNITS.find((u) => u.id === unitId)
    const targetHadir = unit ? unit.hadir : need
    const haveHadir = out.filter((s) => s.unitId === unitId && s.masuk).length
    let hadirCount = haveHadir
    for (let i = have; i < need; i++) {
      const h = hashN(id * 7 + unitId.length)
      const name = `${FIRST[h % FIRST.length]} ${LAST[(h >> 3) % LAST.length]}, ${TITLES[(h >> 6) % TITLES.length]}`
      const roles = ROLES_BY_UNIT[unitId]
      const role = roles[h % roles.length]
      const isHadir = hadirCount < targetHadir
      if (isHadir) hadirCount++
      const late = isHadir && h % 13 === 0 ? 5 + (h % 15) : 0
      const hh = unitId === 'pst' ? '07' : '06'
      const mm = String(30 + (h % 28)).padStart(2, '0')
      out.push({
        id: id++,
        niy: `049${String(100000 + (h % 899999))}`,
        name, role, unitId, status: 'Aktif',
        masuk: isHadir ? `${hh}:${mm}:${String(10 + (h % 49))}` : null,
        method: isHadir ? (h % 2 ? 'Face Recognition' : 'QR Code') : null,
        late,
      })
    }
  })
  return out
}

export function buildAttendance(staff) {
  return staff.map((s) => {
    const unit = UNITS.find((u) => u.id === s.unitId)
    const isHadir = s.masuk !== null
    let status = 'Belum Presensi'
    if (isHadir) {
      status = s.late > 0 ? 'Terlambat' : 'Tepat Waktu'
    } else if (s.status !== 'Aktif') {
      status = 'Tidak Aktif'
    }
    return {
      id: s.id,
      staffId: s.id,
      name: s.name,
      niy: s.niy,
      role: s.role,
      unitId: s.unitId,
      unitName: unit ? unit.nama : s.unitId,
      masuk: s.masuk,
      pulang: isHadir ? '15:00 WIB' : null,
      method: s.method,
      late: s.late,
      status,
      alpha: s.alpha || false,
      outsideRadius: s.outsideRadius || false,
    }
  })
}

// Catatan arsitektur: seed.js adalah SATU-SATUNYA sumber data kanonis SimPres.
// Pegawai (STAFF), Unit (UNITS), Izin/Cuti (LEAVES), Log (INITIAL_LOGS), dan
// Libur (HOLIDAYS) hanya hidup di sini. Tidak ada alias ekspor lain.
