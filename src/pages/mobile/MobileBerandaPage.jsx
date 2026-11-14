import Icon from '../../components/Icon.jsx'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useSimPresOptional, selectSelfStaff, selectSelfPresensi, selectUnitById, selectSelfLeaves,
  selectCurrentUserRole, hasPermission, normalisasiRole, selectLeavesEnriched,
  ROLE_SUPERADMIN, ROLE_ADMIN_UNIT, ROLE_KEPALA_SEKOLAH, ROLE_PETUGAS_PRESENSI,
} from '../../store/simPresStore.jsx'
import {
  tanggalPanjang, jamDetik, jamPendek,
  jamMenitDariDate, cekJendelaPresensi,
} from '../../data/presensiMobile.js'
import { getEmployeeSalutation } from '../../data/sapaanPegawai.js'
import { loadAnnouncements, subscribeAnnouncements } from '../../services/announcementService.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { SectionTitle, ShortcutGrid } from '../../components/mobile/AppShell.jsx'
import { ErrorState, LoadingState } from '../../components/mobile/Feedback.jsx'

const QUICK_MENU = [
  {
    to: '/mobile/presensi',
    judul: 'Presensi Sekarang',
    sub: 'Wajah / barcode',
    ikon: 'scan_face',
    kartu: 'bg-[#eef0fc] text-[#323d8f]',
    utama: true,
  },
  {
    to: '/mobile/riwayat',
    judul: 'Riwayat Presensi',
    sub: 'Rekap harian & bulanan',
    ikon: 'calendar_month',
    kartu: 'bg-[#eef0fc] text-[#323d8f]',
  },
  {
    to: '/mobile/izin-cuti',
    judul: 'Pengajuan Izin/Cuti',
    sub: 'Ajukan & pantau status',
    ikon: 'event_available',
    kartu: 'bg-[#eef0fc] text-[#323d8f]',
  },
  {
    to: '/mobile/slip',
    judul: 'Slip Kehadiran',
    sub: 'Cetak bukti hadir',
    ikon: 'receipt_long',
    kartu: 'bg-[#eef0fc] text-[#323d8f]',
  },
  {
    to: '/mobile/kartu-id',
    judul: 'Kartu ID',
    sub: 'Pratinjau & unduh kartu PVC',
    ikon: 'contact_page',
    kartu: 'bg-[#eef0fc] text-[#323d8f]',
  },
  {
    to: '/mobile/qr',
    judul: 'QR Presensi',
    sub: 'Kode untuk scan & identifikasi',
    ikon: 'qr_code_scanner',
    kartu: 'bg-[#eef0fc] text-[#323d8f]',
  },
]

/**
 * Beranda mobile role Guru/Pegawai.
 *
 * Empat blok sesuai kebutuhan pegawai setiap hari: hero sapaan beridentitas,
 * kartu utama presensi (jam berjalan, tanggal, status, lokasi), ringkasan jam
 * masuk/pulang, dan grid menu cepat. Seluruh angka dibaca dari baris pegawai di
 * store (sumber tunggal presensi) — tidak ada nilai dummy di halaman ini.
 */
function MobileBerandaPage() {
  // useSimPres() melempar error bila Provider belum siap, dan halaman ini tidak
  // boleh karena itu tampil blank. Varian opsional memberi status "memuat".
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const staff = state ? selectSelfStaff(state) : null
  const presensi = state ? selectSelfPresensi(state) : null
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const [announcements, setAnnouncements] = useState([])
  useEffect(() => {
    let mounted = true
    const reload = () => {
      loadAnnouncements({ unitId: staff?.unitId, niy: staff?.niy }).then((list) => {
        if (mounted) setAnnouncements(list)
      })
    }
    reload()
    const unsub = subscribeAnnouncements(reload)
    return () => { mounted = false; unsub() }
  }, [staff?.unitId, staff?.niy])
  const [jam, setJam] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setJam(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const izin = useMemo(() => (state ? selectSelfLeaves(state) : []), [state])
  const menungguIzin = izin.filter((l) => l.status === 'Menunggu').length

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading Beranda" detail="Mengambil data pegawai Anda…" />
      </div>
    )
  }

  if (!staff || !presensi) {
    return (
      <div className="sp-page-container py-6">
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
  // Nama singkat lokasi untuk kartu utama: unit + titik geofence.
  const titikLokasi = unit?.nama ? unit.nama.replace(/\s+/g, ' ').split(' ').slice(0, 2).join(' ') : 'Unit'

  // Peran akun & evaluasi hak administratif/pimpinan
  const currentRole = state ? normalisasiRole(selectCurrentUserRole(state)) : ''
  const isSuperadmin = currentRole === ROLE_SUPERADMIN
  const isAdminUnit = currentRole === ROLE_ADMIN_UNIT
  const isKepsek = currentRole === ROLE_KEPALA_SEKOLAH
  const isPetugas = currentRole === ROLE_PETUGAS_PRESENSI
  const isLeaderOrAdmin = isSuperadmin || isAdminUnit || isKepsek || isPetugas

  const canApproveLeaves = state
    ? hasPermission(state, currentRole, 'pengajuanIzinCuti', 'edit')
    : false

  // Pengajuan izin staf yang menunggu persetujuan
  const pendingLeavesUnit = useMemo(() => {
    if (!state || !canApproveLeaves) return []
    let list = selectLeavesEnriched(state).filter((l) => l.status === 'Menunggu')
    if (!isSuperadmin && staff?.unitId) {
      list = list.filter((l) => l.unitId === staff.unitId)
    }
    return list
  }, [state, canApproveLeaves, isSuperadmin, staff?.unitId])

  const pendingLeavesCount = pendingLeavesUnit.length

  const roleBadgeStyle = useMemo(() => {
    if (isSuperadmin) return { label: 'Superadmin', ikon: 'shield_person', kelas: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
    if (isKepsek) return { label: 'Kepala Sekolah', ikon: 'workspace_premium', kelas: 'bg-purple-100 text-purple-800 border-purple-200' }
    if (isAdminUnit) return { label: 'Admin Unit', ikon: 'admin_panel_settings', kelas: 'bg-blue-100 text-blue-800 border-blue-200' }
    if (isPetugas) return { label: 'Petugas Presensi', ikon: 'qr_code_scanner', kelas: 'bg-teal-100 text-teal-800 border-teal-200' }
    return { label: staff?.role || 'Guru / Pegawai', ikon: 'school', kelas: 'bg-slate-100 text-slate-700 border-slate-200' }
  }, [isSuperadmin, isKepsek, isAdminUnit, isPetugas, staff?.role])

  const adminQuickMenuItems = useMemo(() => {
    if (!isLeaderOrAdmin) return []
    const items = []

    if (canApproveLeaves) {
      items.push({
        to: '/mobile/persetujuan-izin',
        judul: 'Persetujuan Izin',
        sub: pendingLeavesCount > 0 ? `${pendingLeavesCount} pengajuan baru` : 'Verifikasi izin staf',
        ikon: 'task_alt',
        warna: pendingLeavesCount > 0 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'bg-emerald-100 text-emerald-700',
      })
    }

    items.push({
      to: '/mobile/admin-monitoring',
      judul: 'Monitoring Presensi',
      sub: 'Kehadiran staf hari ini',
      ikon: 'query_stats',
      warna: 'bg-indigo-100 text-indigo-700',
    })

    if (isAdminUnit || isSuperadmin || isPetugas) {
      items.push({
        to: '/mobile/admin-scan',
        judul: 'Scan QR Pegawai',
        sub: 'Kamera pemindai ID Card',
        ikon: 'qr_code_scanner',
        warna: 'bg-purple-100 text-purple-700',
      })
      items.push({
        to: '/mobile/admin-presensi-manual',
        judul: 'Presensi Manual',
        sub: 'Input kehadiran staf',
        ikon: 'edit_calendar',
        warna: 'bg-teal-100 text-teal-700',
      })
    }

    items.push({
      to: '/dashboard',
      judul: 'Portal Web Desktop',
      sub: 'Buka dashboard lengkap',
      ikon: 'desktop_windows',
      warna: 'bg-slate-100 text-slate-700',
    })

    return items
  }, [isLeaderOrAdmin, canApproveLeaves, pendingLeavesCount, isAdminUnit, isSuperadmin, isPetugas])

  // Satu sumber kebenaran untuk badge waktu: dipakai kartu hari ini maupun
  // ringkasan, supaya kedua kartu tidak pernah menampilkan status berbeda.
  const badgeMasuk = !presensi.sudahMasuk
    ? { kelas: 'bg-white/20 text-white border border-white/30', ikon: 'hourglass_empty', label: jendela.dalamJendela ? 'Menunggu Presensi' : 'Belum Masuk' }
    : presensi.lateMinutes > 0
      ? { kelas: 'bg-amber-400 text-amber-950 border border-amber-300 font-bold', ikon: 'schedule', label: `Terlambat ${presensi.lateMinutes} Menit` }
      : { kelas: 'bg-emerald-400 text-emerald-950 border border-emerald-300 font-bold', ikon: 'task_alt', label: 'Tepat Waktu' }
  const badgePulang = presensi.sudahPulang
    ? { kelas: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80', ikon: 'task_alt', label: 'Sudah Absen' }
    : { kelas: 'bg-[#f3f5fc] text-[#77819a] border border-[#e0e6f2]', ikon: 'hourglass_empty', label: 'Belum Presensi' }

  return (
    <div className="sp-page pb-2">
      {/* 1. PROFILE HEADER — satu-satunya tempat identitas pegawai ditampilkan.
          Foto, sapaan dinamis, nama lengkap beserta gelar, unit, jabatan, dan
          status online. Sengaja TIDAK ada kartu identitas kedua.
          Nama pegawai sendiri hanya muncul sekali, di baris `staff.name`.
          Sapaannya dipisah supaya kata "Ustadz" tidak mengulang nama. */}
      <section className="sp-page-container pt-3.5 pb-1">
        <div className="sp-card bg-[#eef0fc] p-4 flex flex-col gap-3.5 border border-[#d9dff5] shadow-sm rounded-2xl">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <StaffAvatar
                staff={staff}
                size="w-14 h-14"
                textClass="font-headline-sm text-headline-sm font-bold text-white"
                ring="ring-2 ring-[#eef0fc]"
                className="shadow-xs"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                  online ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
                title={online ? 'Online' : 'Offline'}
              />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              {/* Sapaan diambil dari gender + unit lewat fungsi terpusat. */}
              <span className="font-label-sm text-label-sm text-[#77819a] font-medium">Halo, {getEmployeeSalutation(staff, { unit })}</span>
              {/* Nama lengkap — sudah memuat gelar, jadi gelar tidak ditulis
                  lagi sebagai baris sendiri (menghindari duplikasi). */}
              <span className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight leading-tight truncate">
                {staff.name}
              </span>
              {/* Badge Peran / Penugasan Khusus */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadgeStyle.kelas}`}>
                  <Icon name={roleBadgeStyle.ikon} className="text-[12px]" />
                  <span>{roleBadgeStyle.label}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#e0e6f2]/80">
            <div className="flex items-center gap-2 rounded-xl bg-[#ffffff] border border-[#d9dff5] px-2.5 py-2 min-w-0">
              <Icon name="badge" className="text-[15px] text-[#323d8f] shrink-0" />
              <span className="font-label-sm text-label-sm text-[#20243a] font-medium truncate">NIY {staff.niy}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[#ffffff] border border-[#d9dff5] px-2.5 py-2 min-w-0">
              <Icon name="domain" className="text-[15px] text-[#323d8f] shrink-0" />
              <span className="font-label-sm text-label-sm text-[#20243a] font-medium truncate">{unit?.nama || '-'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4">
        {/* 2. KARTU UTAMA PRESENSI — focal card dengan background solid #323D8F. */}
        <section className="sp-hero-card sp-rise">
          <div className="relative z-[1] flex flex-col gap-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-2xs backdrop-blur-sm">
                  <Icon name="how_to_reg" className="text-white text-[22px]" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-white font-bold leading-tight tracking-tight">Presensi Hari Ini</span>
                  <span className="font-label-sm text-label-sm text-blue-100/90 truncate mt-0.5">{tanggalPanjang(jam)}</span>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 font-label-sm text-label-sm text-white font-semibold flex items-center gap-1 backdrop-blur-sm">
                <Icon name="schedule" className="text-[14px]" />
                Jam Kerja {rules.jamKerja}
              </span>
            </div>

            {/* Jam berjalan: angka besar putih, tabular */}
            <div className="flex items-end justify-between gap-3 pt-1">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-blue-200/90 uppercase tracking-wider text-[11px] font-semibold">Waktu sekarang</span>
                <span className="font-display-lg text-[40px] sm:text-[44px] leading-none text-white font-extrabold tracking-tight tabular-nums drop-shadow-sm">
                  {jamDetik(jam)}
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm font-semibold text-blue-200/90 pb-1">{zonaWaktu}</span>
            </div>

            {/* Status kehadiran: subcard dengan warna biru sedikit lebih terang (#4652A1) */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[#4652A1] border border-white/15 shadow-2xs">
              <span className="flex items-center gap-2 font-label-md text-label-md text-white font-medium min-w-0">
                <Icon name="task_alt" className="text-[16px] shrink-0 text-emerald-300" />
                <span className="truncate">
                  {presensi.sudahMasuk ? presensi.statusMasuk : belumMasukLabel(jendela)}
                </span>
              </span>
              <span className={`shrink-0 px-3 py-1 rounded-full font-label-md text-label-md font-semibold flex items-center gap-1 shadow-2xs ${badgeMasuk.kelas}`}>
                <Icon name={badgeMasuk.ikon} className="text-[14px]" />
                {badgeMasuk.label}
              </span>
            </div>

            {/* Batas jam masuk hari ini + lokasi GPS: subcard #4652A1 */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#4652A1] border border-white/15 px-3.5 py-3 flex flex-col gap-1 shadow-2xs">
                <span className="font-label-sm text-label-sm text-blue-200/90 text-[11px] font-medium">Batas masuk</span>
                <span className="font-headline-sm text-headline-sm text-white font-bold tabular-nums">{presensi.batasMasuk}</span>
              </div>
              <div className="rounded-2xl bg-[#4652A1] border border-white/15 px-3.5 py-3 flex flex-col gap-1 shadow-2xs">
                <span className="font-label-sm text-label-sm text-blue-200/90 text-[11px] font-medium">Lokasi</span>
                <span className="font-headline-sm text-headline-sm text-white font-bold flex items-center gap-1 truncate">
                  <Icon name="my_location" className="text-[15px] shrink-0 text-blue-200" />
                  <span className="truncate">{titikLokasi}</span>
                </span>
              </div>
            </div>

            {/* Tombol aksi utama berwarna putih dengan teks #323D8F */}
            <Link
              to="/mobile/presensi"
              className="sp-btn w-full mt-1 py-3 bg-white hover:bg-blue-50 text-[#323d8f] font-headline-sm text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-md shadow-black/10 transition-all active:scale-[0.98]"
            >
              <Icon name="face_retouch_natural" className="text-[18px] text-[#323d8f]" />
              <span>{presensi.sudahMasuk ? (presensi.sudahPulang ? 'Lihat Presensi Hari Ini' : 'Ambil Presensi Pulang') : 'Ambil Presensi Sekarang'}</span>
            </Link>
          </div>
        </section>

        {/* 4. RINGKASAN: jam masuk & jam pulang tercatat hari ini. */}
        <section className="sp-card p-4 flex flex-col gap-3.5 sp-rise sp-rise-2 border border-[#e0e6f2]">
          <div className="sp-card-head">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#eef0fc] border border-[#323d8f]/15 flex items-center justify-center shrink-0 shadow-2xs">
                <Icon name="summarize" className="text-[18px] text-[#323d8f]" />
              </span>
              <span className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight truncate">Ringkasan Presensi</span>
            </div>
            <Link to="/mobile/riwayat" className="font-label-sm text-label-sm text-[#323d8f] hover:text-[#283273] font-semibold flex items-center gap-0.5 shrink-0 py-1">
              Riwayat
              <Icon name="chevron_right" className="text-[14px]" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-[#f3f5fc] border border-[#e0e6f2] p-3.5 flex flex-col gap-1.5 min-w-0">
              <span className="font-label-sm text-label-sm text-[#77819a] font-medium flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Icon name="login" className="text-[13px] shrink-0" />
                </span>
                Jam Masuk
              </span>
              <span className="font-display-lg-mobile text-[22px] leading-none font-bold text-[#20243a] tabular-nums">
                {jamMasukTerpakai}
              </span>
              <span className="font-label-sm text-label-sm text-[#77819a] leading-snug">
                {presensi.sudahMasuk ? `${statusMasukRingkas(presensi)} ${zonaWaktu}` : `Batas ${presensi.batasMasuk} ${zonaWaktu}`}
              </span>
            </div>
            <div className="rounded-2xl bg-[#f3f5fc] border border-[#e0e6f2] p-3.5 flex flex-col gap-1.5 min-w-0">
              <span className="font-label-sm text-label-sm text-[#77819a] font-medium flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-[#eef0fc] text-[#323d8f] flex items-center justify-center">
                  <Icon name="logout" className="text-[13px] shrink-0" />
                </span>
                Jam Pulang
              </span>
              <span className="font-display-lg-mobile text-[22px] leading-none font-bold text-[#20243a] tabular-nums">
                {jamPulangTerpakai}
              </span>
              <span className="font-label-sm text-label-sm text-[#77819a] leading-snug">
                {presensi.sudahPulang
                  ? `Absen ${zonaWaktu}`
                  : rules.pulangBebas
                    ? `Jumat bebas ${zonaWaktu}`
                    : `Batas ${rules.jamPulang} ${zonaWaktu}`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-2xl bg-[#f3f5fc] border border-[#e0e6f2]">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-[#77819a] min-w-0 font-medium">
              <Icon name={badgePulang.ikon} className="text-[14px] shrink-0 text-[#77819a]" />
              <span className="truncate">
                {presensi.sudahPulang
                  ? 'Absen pulang tercatat'
                  : rules.pulangBebas
                    ? `Jumat tanpa batas jam pulang (${zonaWaktu})`
                    : `Pulang dibuka ${rules.jamPulang} ${zonaWaktu}`}
              </span>
            </span>
            <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold shrink-0 shadow-2xs ${badgePulang.kelas}`}>
              {badgePulang.label}
            </span>
          </div>
        </section>

        {/* 4b. PENGUMUMAN dari superadmin */}
        {announcements.length > 0 && (
          <section className="flex flex-col gap-2.5 sp-rise sp-rise-2">
            <SectionTitle ikon="campaign" judul="Pengumuman" />
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="sp-card p-3.5">
                <p className="font-label-md text-label-md text-foreground">{a.title}</p>
                <p className="text-xs text-on-surface-variant mt-1 whitespace-pre-wrap">{a.body}</p>
                <p className="text-[10px] text-on-surface-variant mt-1.5">{new Date(a.createdAt).toLocaleDateString('id-ID')} • {a.author}</p>
              </div>
            ))}
          </section>
        )}

        {/* 4c. ALERT PENGAJUAN BUTUH TINDAKAN (Kepsek & Admin) */}
        {pendingLeavesCount > 0 && (
          <section className="sp-rise sp-rise-2">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon name="pending_actions" className="text-[18px]" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-xs font-bold text-amber-950">
                    {pendingLeavesCount} Izin/Cuti Menunggu
                  </span>
                  <span className="text-[11px] text-amber-800 truncate">
                    Perlu persetujuan Anda segera
                  </span>
                </div>
              </div>
              <Link
                to="/mobile/persetujuan-izin"
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-label-sm text-xs font-bold shrink-0 shadow-2xs active:scale-95 transition-all"
              >
                Tinjau
              </Link>
            </div>
          </section>
        )}

        {/* 5. FITUR KHUSUS PIMPINAN & ADMIN (Muncul jika akun memiliki role Admin/Kepala Sekolah/Superadmin) */}
        {isLeaderOrAdmin && adminQuickMenuItems.length > 0 && (
          <section className="flex flex-col gap-2.5 sp-rise sp-rise-2">
            <SectionTitle
              ikon="admin_panel_settings"
              judul="Fitur Khusus Pimpinan & Admin"
              aksi={
                <span className={`font-label-sm text-[11px] px-2 py-0.5 rounded-full font-bold border ${roleBadgeStyle.kelas}`}>
                  {roleBadgeStyle.label}
                </span>
              }
            />
            <ShortcutGrid
              items={adminQuickMenuItems}
              columns={2}
            />
          </section>
        )}

        {/* 6. MENU CEPAT PEGAWAI (Mandiri) — grid 2x2 dengan ikon lingkaran */}
        <section className="flex flex-col gap-2.5 sp-rise sp-rise-3">
          <SectionTitle
            ikon="apps"
            judul="Menu Cepat Pegawai"
            aksi={<span className="font-label-sm text-label-sm text-slate-400 font-medium shrink-0">Layanan Mandiri</span>}
          />
          <ShortcutGrid
            items={QUICK_MENU.map((item) => ({
              to: item.to,
              ikon: item.ikon,
              judul: item.judul,
              warna: item.kartu,
              sub: item.to === '/mobile/izin-cuti' && menungguIzin > 0
                ? `${menungguIzin} menunggu`
                : item.sub,
            }))}
          />
        </section>
      </div>
    </div>
  )
}

function belumMasukLabel(jendela) {
  if (jendela.terlaluAwal) return 'Belum masuk — presensi hari ini belum dibuka'
  if (jendela.lewatJamPulang) return 'Belum masuk — jam kerja sudah selesai'
  return 'Belum masuk — menunggu presensi'
}

function statusMasukRingkas(presensi) {
  return presensi.lateMinutes > 0 ? `Terlambat ${presensi.lateMinutes} mnt` : 'Tepat waktu'
}

export default MobileBerandaPage