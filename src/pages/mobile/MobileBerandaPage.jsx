import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useSimPres, selectSelfStaff, selectSelfPresensi, selectUnitById, selectSelfLeaves,
} from '../../store/simPresStore.jsx'
import {
  tanggalPanjang, tanggalPendek, jamDetik, jamPendek, namaDepan, sapaan, namaShift,
  jamMenitDariDate, cekJendelaPresensi, hariPendekISO, isoHariIni,
} from '../../data/presensiMobile.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { ErrorState } from '../../components/mobile/Feedback.jsx'

const QUICK_MENU = [
  {
    to: '/mobile/presensi',
    judul: 'Presensi Sekarang',
    sub: 'Wajah / barcode',
    ikon: 'face_retouch_natural',
    kartu: 'bg-primary-container text-on-primary',
    utama: true,
  },
  {
    to: '/mobile/riwayat',
    judul: 'Riwayat Presensi',
    sub: 'Rekap harian & bulanan',
    ikon: 'calendar_month',
    kartu: 'bg-secondary-container/15 text-secondary',
  },
  {
    to: '/mobile/izin-cuti',
    judul: 'Pengajuan Izin/Cuti',
    sub: 'Ajukan & pantau status',
    ikon: 'event_available',
    kartu: 'bg-emerald-50 text-emerald-600',
  },
  {
    to: '/mobile/slip',
    judul: 'Slip Kehadiran',
    sub: 'Cetak bukti hadir',
    ikon: 'receipt_long',
    kartu: 'bg-surface-container text-on-surface-variant',
  },
]

function Tile({ ikon, label, children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-surface-container-low p-3 flex flex-col gap-1 ${className}`}>
      <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[14px]">{ikon}</span>
        {label}
      </span>
      <span className="font-body-md-medium text-body-md-medium text-on-surface leading-tight">{children}</span>
    </div>
  )
}

/**
 * Beranda mobile role Guru/Pegawai.
 *
 * Empat blok sesuai kebutuhan pegawai setiap hari: sapaan beridentitas, informasi
 * hari ini, ringkasan presensi, dan pintasan aksi. Seluruh angka dibaca dari baris
 * pegawai di store (sumber tunggal presensi) — tidak ada nilai dummy di halaman ini.
 */
function MobileBerandaPage() {
  const { state } = useSimPres()
  const staff = selectSelfStaff(state)
  const presensi = selectSelfPresensi(state)
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const [jam, setJam] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setJam(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const izin = useMemo(() => selectSelfLeaves(state), [state])
  const menungguIzin = izin.filter((l) => l.status === 'Menunggu').length

  if (!staff || !presensi) {
    return (
      <div className="px-4 py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="Akun ini belum terhubung ke data pegawai. Perbarui data di portal HRD, lalu muat ulang."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }

  const rules = presensi.rules
  const zonaWaktu = rules.zonaWaktu
  const jamMasukTerpakai = jamPendek(presensi.masuk) || '--:--'
  const jamPulangTerpakai = jamPendek(presensi.pulang) || '--:--'
  const jendela = cekJendelaPresensi(jamMenitDariDate(jam), rules)
  const online = state.currentUser?.status === 'Aktif'

  // Satu sumber kebenaran untuk badge waktu: dipakai kartu hari ini maupun
  // ringkasan, supaya kedua kartu tidak pernah menampilkan status berbeda.
  const badgeMasuk = !presensi.sudahMasuk
    ? { kelas: 'bg-surface-container text-on-surface-variant', ikon: 'hourglass_empty', label: jendela.dalamJendela ? 'Menunggu Presensi' : 'Belum Masuk' }
    : presensi.late > 0
      ? { kelas: 'bg-amber-50 text-amber-800', ikon: 'schedule', label: `Terlambat ${presensi.late} Menit` }
      : { kelas: 'bg-emerald-50 text-emerald-700', ikon: 'task_alt', label: 'Tepat Waktu' }
  const badgePulang = presensi.sudahPulang
    ? { kelas: 'bg-emerald-50 text-emerald-700', ikon: 'task_alt', label: 'Sudah Absen' }
    : { kelas: 'bg-surface-container text-on-surface-variant', ikon: 'hourglass_empty', label: 'Belum Presensi' }

  return (
    <div className="sp-page">
      {/* 1. Header sapaan: foto, nama, unit, jabatan, status online. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-container via-[#12325f] to-[#08182f] text-on-primary px-4 pt-5 pb-16 rounded-b-[32px] shadow-lg">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-52 h-52 rounded-full bg-tertiary-container/60 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="relative">
            <span className="absolute -inset-1 rounded-full bg-white/10" />
            <StaffAvatar
              staff={staff}
              size="w-[68px] h-[68px]"
              textClass="font-display-lg-mobile text-display-lg-mobile"
              ring="ring-2 ring-white/15"
              className="shadow-lg"
            />
            <span
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ring-[3px] ring-[#0d2342] ${
                online ? 'bg-emerald-400' : 'bg-outline'
              }`}
              title={online ? 'Online' : 'Offline'}
            />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-label-sm text-label-sm text-blue-200/90">
              {['Halo,', sapaan(staff)].filter(Boolean).join(' ')}
            </span>
            <span className="font-display-lg-mobile text-display-lg-mobile text-white leading-tight truncate">
              {namaDepan(staff.name)}
            </span>
            <span className="font-label-sm text-label-sm text-on-primary-container truncate">{staff.name}</span>
          </div>

          <span className="shrink-0 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 font-label-sm text-label-sm text-white/90 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">badge</span>
            {staff.niy}
          </span>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90 flex items-center gap-1 max-w-full">
            <span className="material-symbols-outlined text-[14px]">domain</span>
            <span className="truncate">{unit?.nama || '-'}</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">work</span>
            {staff.role}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full border font-label-sm text-label-sm flex items-center gap-1 ${
              online ? 'bg-emerald-400/15 border-emerald-300/30 text-emerald-200' : 'bg-white/10 border-white/10 text-white/80'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{online ? 'wifi_tethering' : 'wifi_off'}</span>
            {online ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="relative z-10 mt-5 flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-display-lg text-[34px] leading-none text-white font-bold tabular-nums">
              {jamDetik(jam)}
              <span className="font-headline-sm text-headline-sm font-medium text-blue-200 ml-1">{zonaWaktu}</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-primary-container mt-1.5">
              {tanggalPanjang(jam)}
            </span>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-blue-300">schedule</span>
            {namaShift(rules.jamMasuk)} Â· {rules.jamMasuk} - {rules.jamPulang}
          </span>
        </div>
      </section>

      <div className="px-4 -mt-10 relative z-20 flex flex-col gap-4 pb-6">
        {/* 2. Informasi hari ini: tanggal, shift kerja, jam masuk, status kehadiran. */}
        <section className="sp-card p-4 animate-sp-rise">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-secondary-container/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[18px]">today</span>
              </span>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">Informasi Hari Ini</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {hariPendekISO(isoHariIni(jam))} Â· {tanggalPendek(jam)}
                </span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 ${badgeMasuk.kelas}`}>
              <span className="material-symbols-outlined text-[14px]">{badgeMasuk.ikon}</span>
              {badgeMasuk.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <Tile ikon="event" label="Tanggal">{tanggalPendek(jam).split(' ').slice(0, 2).join(' ')}</Tile>
            <Tile ikon="schedule" label="Shift Kerja">
              {namaShift(rules.jamMasuk)}
              <span className="block font-label-sm text-label-sm text-on-surface-variant">
                {rules.jamMasuk} - {rules.jamPulang}
              </span>
            </Tile>
            <Tile ikon="login" label="Jam Masuk">
              {presensi.sudahMasuk ? jamMasukTerpakai : presensi.batasMasuk}
              <span className="block font-label-sm text-label-sm text-on-surface-variant">
                {presensi.sudahMasuk ? `Tercatat ${zonaWaktu}` : 'Batas toleransi'}
              </span>
            </Tile>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 p-3 rounded-2xl bg-surface-container-low border-l-[3px] border-l-secondary">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Status Kehadiran</span>
              <span className="font-body-md-medium text-body-md-medium text-on-surface">
                {presensi.sudahMasuk ? presensi.statusMasuk : belumMasukLabel(jendela)}
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
              {presensi.method ? `Metode ${presensi.method}` : 'Belum ada metode'}
            </span>
          </div>
        </section>

        {/* 3. Ringkasan presensi hari ini. */}
        <section className="sp-card p-4 animate-sp-rise" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center justify-between pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">summarize</span>
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Ringkasan Presensi</span>
            </div>
            <Link to="/mobile/riwayat" className="font-label-sm text-label-sm text-secondary flex items-center gap-0.5">
              Riwayat
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </Link>
          </div>

          <div className="flex items-center justify-between gap-2 py-3">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Presensi Hari Ini</span>
              <span className="font-body-md-medium text-body-md-medium text-on-surface">
                {presensi.sudahMasuk ? 'Sudah tercatat' : 'Belum tercatat'}
              </span>
            </div>
            <span className={`px-3 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 ${badgeMasuk.kelas}`}>
              <span className="material-symbols-outlined text-[14px]">
                {presensi.sudahMasuk ? (presensi.late > 0 ? 'schedule' : 'task_alt') : 'hourglass_empty'}
              </span>
              {presensi.sudahMasuk ? (presensi.late > 0 ? 'Terlambat' : 'Tepat Waktu') : badgeMasuk.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface-container-low p-3 flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">login</span>
                Jam Masuk
              </span>
              <span className="font-display-lg-mobile text-[22px] leading-none font-bold text-on-surface tabular-nums">
                {jamMasukTerpakai}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {presensi.sudahMasuk ? `${statusMasukRingkas(presensi)} ${zonaWaktu}` : `Batas ${presensi.batasMasuk} ${zonaWaktu}`}
              </span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3 flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">logout</span>
                Jam Pulang
              </span>
              <span className="font-display-lg-mobile text-[22px] leading-none font-bold text-on-surface tabular-nums">
                {jamPulangTerpakai}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {presensi.sudahPulang ? `Absen ${zonaWaktu}` : `Shift berakhir ${rules.jamPulang} ${zonaWaktu}`}
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-surface-container-low">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">{badgePulang.ikon}</span>
              {presensi.sudahPulang ? 'Absen pulang tercatat' : `Pulang dibuka ${rules.jamPulang} ${zonaWaktu}`}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${badgePulang.kelas}`}>
              {badgePulang.label}
            </span>
          </div>
        </section>

        {/* 4. Quick menu. */}
        <section className="flex flex-col gap-2.5 animate-sp-rise" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between px-0.5">
            <span className="font-headline-sm text-headline-sm text-on-surface">Menu Cepat</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">SimPres Kepegawaian</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_MENU.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`sp-card p-4 flex flex-col gap-2 transition-transform active:scale-[0.98] ${
                  item.utama ? 'bg-primary-container border-transparent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.kartu}`}>
                    <span className="material-symbols-outlined text-[20px]">{item.ikon}</span>
                  </span>
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      item.utama ? 'text-white/60' : 'text-outline'
                    }`}
                  >
                    chevron_right
                  </span>
                </div>
                <span
                  className={`font-body-md-medium text-body-md-medium leading-tight ${
                    item.utama ? 'text-on-primary' : 'text-on-surface'
                  }`}
                >
                  {item.judul}
                </span>
                <span
                  className={`font-label-sm text-label-sm ${
                    item.utama ? 'text-on-primary-container' : 'text-on-surface-variant'
                  }`}
                >
                  {item.to === '/mobile/izin-cuti' && menungguIzin > 0
                    ? `${menungguIzin} menunggu disetujui`
                    : item.sub}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function belumMasukLabel(jendela) {
  if (jendela.sebelumShift) return 'Belum masuk — di luar shift'
  if (jendela.lewatJamPulang) return 'Belum masuk — shift sudah selesai'
  return 'Belum masuk — menunggu presensi'
}

function statusMasukRingkas(presensi) {
  return presensi.late > 0 ? `Terlambat ${presensi.late} mnt` : 'Tepat waktu'
}

export default MobileBerandaPage