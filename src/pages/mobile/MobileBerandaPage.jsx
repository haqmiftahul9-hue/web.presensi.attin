import Icon from '../../components/Icon.jsx'
﻿import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useSimPresOptional, selectSelfStaff, selectSelfPresensi, selectUnitById, selectSelfLeaves,
} from '../../store/simPresStore.jsx'
import {
  tanggalPanjang, jamDetik, jamPendek,
  jamMenitDariDate, cekJendelaPresensi,
} from '../../data/presensiMobile.js'
import { getEmployeeSalutation } from '../../data/sapaanPegawai.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { SectionTitle, ShortcutGrid } from '../../components/mobile/AppShell.jsx'
import { ErrorState, LoadingState } from '../../components/mobile/Feedback.jsx'

const QUICK_MENU = [
  {
    to: '/mobile/presensi',
    judul: 'Presensi Sekarang',
    sub: 'Wajah / barcode',
    ikon: 'face_retouch_natural',
    kartu: 'bg-[#323d8f] text-white shadow-sm',
    utama: true,
  },
  {
    to: '/mobile/riwayat',
    judul: 'Riwayat Presensi',
    sub: 'Rekap harian & bulanan',
    ikon: 'calendar_month',
    kartu: 'bg-[#323d8f]/10 text-[#323d8f]',
  },
  {
    to: '/mobile/izin-cuti',
    judul: 'Pengajuan Izin/Cuti',
    sub: 'Ajukan & pantau status',
    ikon: 'event_available',
    kartu: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  },
  {
    to: '/mobile/slip',
    judul: 'Slip Kehadiran',
    sub: 'Cetak bukti hadir',
    ikon: 'receipt_long',
    kartu: 'bg-indigo-50 text-[#323d8f] border border-indigo-100',
  },
  {
    to: '/mobile/kartu-id',
    judul: 'Kartu ID',
    sub: 'Pratinjau & unduh kartu PVC',
    ikon: 'contact_page',
    kartu: 'bg-sky-50 text-sky-700 border border-sky-100',
  },
  {
    to: '/mobile/qr',
    judul: 'QR Presensi',
    sub: 'Kode untuk scan & identifikasi',
    ikon: 'qr_code_scanner',
    kartu: 'bg-amber-50 text-amber-700 border border-amber-100',
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

  // Satu sumber kebenaran untuk badge waktu: dipakai kartu hari ini maupun
  // ringkasan, supaya kedua kartu tidak pernah menampilkan status berbeda.
  const badgeMasuk = !presensi.sudahMasuk
    ? { kelas: 'bg-surface-container text-on-surface-variant', ikon: 'hourglass_empty', label: jendela.dalamJendela ? 'Menunggu Presensi' : 'Belum Masuk' }
    : presensi.lateMinutes > 0
      ? { kelas: 'bg-amber-50 text-amber-800', ikon: 'schedule', label: `Terlambat ${presensi.lateMinutes} Menit` }
      : { kelas: 'bg-emerald-50 text-emerald-700', ikon: 'task_alt', label: 'Tepat Waktu' }
  const badgePulang = presensi.sudahPulang
    ? { kelas: 'bg-emerald-50 text-emerald-700', ikon: 'task_alt', label: 'Sudah Absen' }
    : { kelas: 'bg-surface-container text-on-surface-variant', ikon: 'hourglass_empty', label: 'Belum Presensi' }

  return (
    <div className="sp-page pb-2">
      {/* 1. PROFILE HEADER — satu-satunya tempat identitas pegawai ditampilkan.
          Foto, sapaan dinamis, nama lengkap beserta gelar, unit, jabatan, dan
          status online. Sengaja TIDAK ada kartu identitas kedua: dulu ada
          ProfileCard tepat di bawah hero ini, sehingga foto, sapaan, dan nama
          pegawai tampil dua kali.
          Nama pegawai sendiri hanya muncul sekali, di baris `staff.name`.
          Sapaannya dipisah supaya kata "Ustadz" tidak mengulang nama. */}
      <section className="sp-hero sp-page-container pt-4 pb-8">
        <span className="sp-pattern-dots" aria-hidden="true" />
        <span className="sp-blob sp-blob-a" aria-hidden="true" />
        <span className="sp-blob sp-blob-b" aria-hidden="true" />

        <div className="relative z-[1]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <StaffAvatar
                staff={staff}
                size="w-16 h-16"
                textClass="font-display-lg-mobile text-display-lg-mobile font-bold text-white"
                ring="ring-[3px] ring-white/30"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-[3px] ring-[#1c2254] ${
                  online ? 'bg-emerald-400' : 'bg-slate-400'
                }`}
                title={online ? 'Online' : 'Offline'}
              />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              {/* Sapaan diambil dari gender + unit lewat fungsi terpusat. */}
              <span className="font-label-sm text-label-sm text-white/80 font-medium">Halo, {getEmployeeSalutation(staff, { unit })}</span>
              {/* Nama lengkap — sudah memuat gelar, jadi gelar tidak ditulis
                  lagi sebagai baris sendiri (menghindari duplikasi).
                  Tidak memakai `title`: teksnya sudah terlihat penuh di layar,
                  jadi tooltip hanya mengulang isi yang sama. */}
              <span className="font-headline-sm text-headline-sm text-white font-bold tracking-tight leading-tight truncate">
                {staff.name}
              </span>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-white/12 border border-white/20 px-2.5 py-2 backdrop-blur-md min-w-0">
              <Icon name="badge" className="text-[15px] text-white/90 shrink-0" />
              <span className="font-label-sm text-label-sm text-white font-medium truncate">NIY {staff.niy}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/12 border border-white/20 px-2.5 py-2 backdrop-blur-md min-w-0">
              <Icon name="domain" className="text-[15px] text-white/90 shrink-0" />
              <span className="font-label-sm text-label-sm text-white font-medium truncate">{unit?.nama || '-'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/12 border border-white/20 px-2.5 py-2 backdrop-blur-md min-w-0">
              <Icon name="work" className="text-[15px] text-white/90 shrink-0" />
              <span className="font-label-sm text-label-sm text-white font-medium truncate">{staff.role}</span>
            </div>
            <div
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 backdrop-blur-md min-w-0 ${
                online ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100' : 'bg-white/10 border-white/15 text-white/80'
              }`}
            >
              <Icon name={online ? 'wifi_tethering' : 'wifi_off'} className="text-[15px] shrink-0" />
              <span className="font-label-sm text-label-sm font-semibold truncate">{online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4">
        {/* 2. KARTU UTAMA PRESENSI — langsung setelah profile header.
            Jam realtime, tanggal, status, batas masuk, dan lokasi. Padding
            kartu dimiliki `.sp-hero-card` (16-20px), jadi `p-4` tidak
            diperlukan di sini. */}
        <section className="sp-hero-card sp-rise">
          <div className="relative z-[1] flex flex-col gap-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-sm backdrop-blur-md">
                  <Icon name="how_to_reg" className="text-white text-[22px]" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-white font-bold leading-tight tracking-tight">Presensi Hari Ini</span>
                  <span className="font-label-sm text-label-sm text-white/80 truncate mt-0.5">{tanggalPanjang(jam)}</span>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 font-label-sm text-label-sm text-white font-medium flex items-center gap-1 backdrop-blur-md">
                <Icon name="schedule" className="text-[14px]" />
                Jam Kerja {rules.jamKerja}
              </span>
            </div>

            {/* Jam berjalan: angka besar, tabular, tidak bergeser tiap detik. */}
            <div className="flex items-end justify-between gap-3 pt-1">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-white/70 uppercase tracking-wider text-[11px] font-semibold">Waktu sekarang</span>
                <span className="font-display-lg text-[44px] sm:text-[48px] leading-none text-white font-extrabold tracking-tight tabular-nums drop-shadow-sm">
                  {jamDetik(jam)}
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm font-semibold text-white/90 pb-1.5">{zonaWaktu}</span>
            </div>

            {/* Status kehadiran. */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md shadow-inner">
              <span className="flex items-center gap-2 font-label-md text-label-md text-white font-medium min-w-0">
                <Icon name="task_alt" className="text-[16px] shrink-0 text-white/90" />
                <span className="truncate">
                  {presensi.sudahMasuk ? presensi.statusMasuk : belumMasukLabel(jendela)}
                </span>
              </span>
              <span className="shrink-0 px-3 py-1 rounded-full bg-white text-[#323d8f] font-label-md text-label-md font-bold shadow-md flex items-center gap-1">
                <Icon name={badgeMasuk.ikon} className="text-[14px]" />
                {badgeMasuk.label}
              </span>
            </div>

            {/* Batas jam masuk hari ini + lokasi GPS. */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/12 border border-white/18 px-3.5 py-3 flex flex-col gap-1 backdrop-blur-md">
                <span className="font-label-sm text-label-sm text-white/70 text-[11px] font-medium">Batas masuk</span>
                <span className="font-headline-sm text-headline-sm text-white font-bold tabular-nums">{presensi.batasMasuk}</span>
              </div>
              <div className="rounded-2xl bg-white/12 border border-white/18 px-3.5 py-3 flex flex-col gap-1 backdrop-blur-md">
                <span className="font-label-sm text-label-sm text-white/70 text-[11px] font-medium">Lokasi</span>
                <span className="font-headline-sm text-headline-sm text-white font-bold flex items-center gap-1 truncate">
                  <Icon name="my_location" className="text-[15px] shrink-0 text-white/80" />
                  <span className="truncate">{titikLokasi}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. RINGKASAN: jam masuk & jam pulang tercatat hari ini. */}
        <section className="sp-card p-4 flex flex-col gap-3.5 sp-rise sp-rise-2">
          <div className="sp-card-head">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#323d8f]/10 border border-[#323d8f]/15 flex items-center justify-center shrink-0">
                <Icon name="summarize" className="text-[18px] text-[#323d8f]" />
              </span>
              <span className="font-headline-sm text-headline-sm text-slate-900 font-bold tracking-tight truncate">Ringkasan Presensi</span>
            </div>
            <Link to="/mobile/riwayat" className="font-label-sm text-label-sm text-[#323d8f] hover:text-[#252e6d] font-semibold flex items-center gap-0.5 shrink-0 py-1">
              Riwayat
              <Icon name="chevron_right" className="text-[14px]" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 flex flex-col gap-1.5 min-w-0">
              <span className="font-label-sm text-label-sm text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Icon name="login" className="text-[13px] shrink-0" />
                </span>
                Jam Masuk
              </span>
              <span className="font-display-lg-mobile text-[22px] leading-none font-bold text-slate-900 tabular-nums">
                {jamMasukTerpakai}
              </span>
              <span className="font-label-sm text-label-sm text-slate-500 leading-snug">
                {presensi.sudahMasuk ? `${statusMasukRingkas(presensi)} ${zonaWaktu}` : `Batas ${presensi.batasMasuk} ${zonaWaktu}`}
              </span>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 flex flex-col gap-1.5 min-w-0">
              <span className="font-label-sm text-label-sm text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-[#323d8f]/10 text-[#323d8f] flex items-center justify-center">
                  <Icon name="logout" className="text-[13px] shrink-0" />
                </span>
                Jam Pulang
              </span>
              <span className="font-display-lg-mobile text-[22px] leading-none font-bold text-slate-900 tabular-nums">
                {jamPulangTerpakai}
              </span>
              <span className="font-label-sm text-label-sm text-slate-500 leading-snug">
                {presensi.sudahPulang
                  ? `Absen ${zonaWaktu}`
                  : rules.pulangBebas
                    ? `Jumat bebas ${zonaWaktu}`
                    : `Batas ${rules.jamPulang} ${zonaWaktu}`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-slate-600 min-w-0 font-medium">
              <Icon name={badgePulang.ikon} className="text-[14px] shrink-0 text-slate-400" />
              <span className="truncate">
                {presensi.sudahPulang
                  ? 'Absen pulang tercatat'
                  : rules.pulangBebas
                    ? `Jumat tanpa batas jam pulang (${zonaWaktu})`
                    : `Pulang dibuka ${rules.jamPulang} ${zonaWaktu}`}
              </span>
            </span>
            <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold shrink-0 ${badgePulang.kelas}`}>
              {badgePulang.label}
            </span>
          </div>
        </section>

        {/* 5. MENU CEPAT — grid 2x2 dengan ikon lingkaran, bukan list. */}
        <section className="flex flex-col gap-2.5 sp-rise sp-rise-3">
          <SectionTitle
            ikon="apps"
            judul="Menu Cepat"
            aksi={<span className="font-label-sm text-label-sm text-slate-400 font-medium shrink-0">SIMPEG Portal</span>}
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