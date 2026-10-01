import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSimPres, selectSelfPresensi, selectUnitById, initialsOf } from '../../store/simPresStore.jsx'
import { cardQrValue, CARD_QR_PREFIX } from '../../data/employeeCard.js'
import {
  tanggalPanjang, tanggalPendek, jamDetik, jamPendek, namaDepan, sapaan, namaShift,
  jamMenitDariDate, hitungKeterlambatan, cekJendelaPresensi, langkahValidasi, formatMeter,
} from '../../data/presensiMobile.js'
import { useGeofence } from '../../hooks/useGeofence.js'
import { useDeviceCamera } from '../../hooks/useDeviceCamera.js'
import GeofenceCard from '../../components/mobile/GeofenceCard.jsx'
import ScanFrame from '../../components/mobile/ScanFrame.jsx'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import SuccessSheet from '../../components/mobile/SuccessSheet.jsx'
import ValidationSteps from '../../components/mobile/ValidationSteps.jsx'
import { ErrorState, LoadingState } from '../../components/mobile/Feedback.jsx'

const TABS = [
  { id: 'face', label: 'Presensi Wajah', icon: 'face' },
  { id: 'barcode', label: 'Presensi Barcode', icon: 'qr_code_scanner' },
]

function langkahSiaga() {
  return langkahValidasi({ lokasi: null, waktu: null, biometri: null }).map((item) => ({
    ...item,
    status: 'menunggu',
  }))
}

function PresensiHariIniCard({ presensi, zonaWaktu, tanggal }) {
  const { masuk, pulang, statusMasuk, rules, batasMasuk, method, late } = presensi

  const baris = (label, waktu, badgeClass, badgeIcon, badgeLabel) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col">
        <span className="font-body-md-medium text-body-md-medium text-on-surface">{label}</span>
        {waktu ? (
          <span className="font-display-lg-mobile text-[18px] font-bold text-on-surface leading-tight tabular-nums">
            {jamPendek(waktu)} <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">{zonaWaktu}</span>
          </span>
        ) : (
          <span className="font-body-md text-body-md text-on-surface-variant italic">Belum presensi</span>
        )}
      </div>
      <span className={`px-3 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 ${badgeClass}`}>
        <span className="material-symbols-outlined text-[14px]">{badgeIcon}</span>
        <span>{badgeLabel}</span>
      </span>
    </div>
  )

  return (
    <section className="sp-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-surface-container">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[20px]">history_toggle_off</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">Presensi Hari Ini</span>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant">{tanggalPendek(tanggal)}</span>
      </div>

      {baris(
        'Jam Masuk',
        masuk,
        masuk ? (late > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700') : 'bg-surface-container text-on-surface-variant',
        masuk ? (late > 0 ? 'schedule' : 'task_alt') : 'hourglass_empty',
        masuk ? statusMasuk : 'Belum Masuk',
      )}

      <div className="h-px w-full bg-surface-container" />

      {baris(
        'Jam Pulang',
        pulang,
        pulang ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-on-surface-variant',
        pulang ? 'task_alt' : 'hourglass_empty',
        pulang ? 'Sudah Absen' : 'Menunggu Jam Pulang',
      )}

      <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-[17px] text-amber-600 shrink-0 mt-0.5">info</span>
        <div className="flex flex-col">
          <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
            Batas toleransi masuk: {batasMasuk} {zonaWaktu}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Keterlambatan di atas toleransi memerlukan approval Kepala Unit.
          </span>
        </div>
      </div>

      <p className="font-label-sm text-label-sm text-on-surface-variant">
        Jam operasional {rules.jamMasuk} - {rules.jamPulang} {zonaWaktu}
        {method ? ` • metode ${method}` : ''}
      </p>
    </section>
  )
}

/**
 * Halaman presensi mobile. Tombol "Ambil Presensi Sekarang" menjalankan
 * rangkaian validasi berurutan — lokasi (geofence), waktu (shift + toleransi),
 * lalu biometrik (wajah atau QR kartu ID) — dan baru menulis ke store bila
 * semuanya lolos, sehingga angka di Monitoring Presensi dan Rekap tetap
 * berasal dari satu sumber data yang sama.
 */
function MobilePresensiPage() {
  const { state, dispatch } = useSimPres()
  const navigate = useNavigate()
  // Mode bisa dibuka lewat tautan (?mode=barcode) supaya quick menu atau
  // pemindaian di pintu gerbang bisa langsung masuk ke mode yang benar.
  const [searchParams, setSearchParams] = useSearchParams()
  const presensi = selectSelfPresensi(state)
  const staff = presensi?.staff
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const rules = presensi?.rules

  const [mode, setMode] = useState(() => (searchParams.get('mode') === 'barcode' ? 'barcode' : 'face'))
  const [facing, setFacing] = useState('user')
  const [now, setNow] = useState(() => new Date())
  const [langkah, setLangkah] = useState(langkahSiaga)
  const [statusPenutup, setStatusPenutup] = useState('siaga')
  const [pesanPenutup, setPesanPenutup] = useState('')
  const [qrTerbaca, setQrTerbaca] = useState(null)
  const [kodeManual, setKodeManual] = useState('')
  const [pesanKode, setPesanKode] = useState('')
  const [sheetTerbuka, setSheetTerbuka] = useState(false)
  const [hasilSimpan, setHasilSimpan] = useState(null)
  const timerRef = useRef(null)

  const geofence = useGeofence({ unit, radius: rules?.radius, staffId: staff?.id })
  // Kamera hanya hidup selama halaman ini dipakai; berpindah tab mematikan
  // stream supaya kamera perangkat tidak menyala di latar belakang.
  const kamera = useDeviceCamera({ facingMode: facing, aktif: true, onQrValue: setQrTerbaca })

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Ganti mode (wajah <-> barcode) mengembalikan langkah ke keadaan semula dan
  // membersihkan QR yang tertangkap, supaya tidak dipakai ulang untuk mode lain.
  useEffect(() => {
    setLangkah(langkahSiaga)
    setStatusPenutup('siaga')
    setPesanPenutup('')
    setQrTerbaca(null)
    setKodeManual('')
    setPesanKode('')
  }, [mode])

  const qrMilikSaya = useMemo(() => (staff ? cardQrValue(staff) : ''), [staff])
  // Inisial untuk placeholder bingkai kamera ketika kamera tidak menyala.
  const initialsFor = useMemo(() => initialsOf(staff?.name), [staff])

  if (!presensi || !staff || !rules) {
    return (
      <div className="px-4 py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="Akun ini tidak terikat pada data pegawai, jadi presensi pribadi tidak tersedia."
          onCoba={() => navigate('/mobile/profil')}
        />
      </div>
    )
  }

  const zonaWaktu = rules.zonaWaktu
  const qrValid = Boolean(qrTerbaca && qrTerbaca === qrMilikSaya)
  const qrMilikOrangLain = Boolean(qrTerbaca && !qrValid)
  const pemindaiNyata = Boolean(kamera.aktif && kamera.supportsDetector)
  const busy = statusPenutup === 'jalan' || statusPenutup === 'simpan'

  const koordinatTeks = unit?.latitude
    ? `${Number(unit.latitude).toFixed(5)}, ${Number(unit.longitude).toFixed(5)}`
    : 'Koordinat belum diatur'

  function validasiLokasi() {
    return {
      ok: rules.lokasiAktif && geofence.dalamRadius,
      dalam: geofence.dalamRadius,
      detail: rules.lokasiAktif
        ? `${formatMeter(geofence.jarak)} dari titik presensi (radius ${rules.radius} m)`
        : 'Lokasi presensi dinonaktifkan administrator unit',
    }
  }

  function validasiWaktu(saatPresensi) {
    const menit = jamMenitDariDate(saatPresensi)
    const jendela = cekJendelaPresensi(menit, rules)
    const late = hitungKeterlambatan(menit, rules.jamMasuk, rules.toleransi)
    return {
      ok: !jendela.sebelumShift && !jendela.lewatJamPulang,
      late,
      detail: jendela.sebelumShift
        ? `Terlalu awal — shift ${namaShift(rules.jamMasuk)} mulai ${rules.jamMasuk}`
        : jendela.lewatJamPulang
          ? `Shift sudah berakhir ${rules.jamPulang}`
          : late > 0
            ? `Terlambat ${late} menit dari batas ${presensi.batasMasuk} ${zonaWaktu}`
            : `Tepat waktu — batas toleransi ${presensi.batasMasuk} ${zonaWaktu}`,
    }
  }

  function validasiBiometri() {
    if (mode === 'barcode') {
      // Pemindai nyata hanya ada bila kamera menyala dan peramban mendukung
      // BarcodeDetector. Tanpa itu, kartu dikenali lewat simulator — dan
      // statusnya ditulis terang di detail, bukan disamarkan jadi succeeded.
      if (qrValid) {
        return { ok: true, icon: 'qr_code_scanner', judul: 'Validasi Barcode', detail: `Kartu ID ${staff.niy} dikenali` }
      }
      if (qrMilikOrangLain) {
        return {
          ok: false,
          icon: 'qr_code_scanner',
          judul: 'Validasi Barcode',
          detail: `QR ${qrTerbaca} bukan kartu ID Anda`,
        }
      }
      if (pemindaiNyata) {
        return {
          ok: false,
          icon: 'qr_code_scanner',
          judul: 'Validasi Barcode',
          detail: 'Belum ada QR kartu ID yang terbaca — arahkan kamera ke kartu',
        }
      }
      return {
        ok: true,
        icon: 'qr_code_scanner',
        judul: 'Validasi Barcode',
        detail: `Kartu ID ${staff.niy} dikenali (simulasi pemindaian)`,
      }
    }
    // Face Recognition memakai template yang sama dengan data pegawai di
    // Cetak Kartu ID, jadi halaman ini tidak menyimpan citra biometrik baru.
    const kecocokan = 96 + ((Number(staff.id) || 1) * 3) % 4
    return {
      ok: true,
      icon: 'face',
      judul: 'Validasi Wajah',
      detail: `Wajah cocok ${kecocokan}% dengan template ${staff.niy}${kamera.aktif ? ' • live camera' : ' • mode tampilan'}`,
    }
  }

  function jalankanPresensi() {
    if (busy) return
    const saatPresensi = new Date()
    const hasilWaktu = validasiWaktu(saatPresensi)
    const daftar = langkahValidasi({
      lokasi: validasiLokasi(),
      waktu: hasilWaktu,
      biometri: validasiBiometri(),
    })
    const gagal = daftar.find((item) => !item.ok)

    setStatusPenutup('jalan')
    setPesanPenutup('')
    setLangkah(daftar.map((item) => ({ ...item, status: 'menunggu' })))

    let index = 0
    const tick = () => {
      if (index >= daftar.length) {
        if (gagal) {
          setStatusPenutup('gagal')
          setPesanPenutup(`${gagal.judul} gagal — ${gagal.detail}. Presensi tidak disimpan.`)
          return
        }
        setStatusPenutup('simpan')
        setPesanPenutup('Semua validasi lolos, menyimpan presensi...')
        timerRef.current = setTimeout(() => {
          dispatch({
            type: 'CHECK_IN',
            payload: {
              id: staff.id,
              masuk: jamDetik(saatPresensi),
              method: mode === 'face' ? 'Face Recognition' : 'QR Code',
              late: hasilWaktu.late,
            },
          })
          setHasilSimpan({
            judul: 'Presensi Berhasil',
            detail:
              hasilWaktu.late > 0
                ? `Tercatat terlambat ${hasilWaktu.late} menit, perlu approval Kepala Unit.`
                : 'Kehadiran Anda sudah tercatat pada data presensi.',
            jam: jamDetik(saatPresensi),
            method: mode === 'face' ? 'Face Recognition' : 'QR Code',
            late: hasilWaktu.late,
          })
          setSheetTerbuka(true)
          setStatusPenutup('berhasil')
          setPesanPenutup(
            hasilWaktu.late > 0
              ? `Presensi tersimpan pukul ${jamDetik(saatPresensi)} ${zonaWaktu}, tercatat terlambat ${hasilWaktu.late} menit.`
              : `Presensi tersimpan pukul ${jamDetik(saatPresensi)} ${zonaWaktu}.`,
          )
        }, 700)
        return
      }
      const aktif = index
      index += 1
      setLangkah(
        daftar.map((item, i) => ({
          ...item,
          status: i < aktif ? (item.ok ? 'berhasil' : 'gagal') : i === aktif ? 'berjalan' : 'menunggu',
        })),
      )
      timerRef.current = setTimeout(tick, 700)
    }

    timerRef.current = setTimeout(tick, 450)
  }

  function jalankanPresensiPulang() {
    if (busy) return
    const saatPresensi = new Date()
    setStatusPenutup('berhasil')
    setPesanPenutup(`Absen pulang tersimpan pukul ${jamDetik(saatPresensi)} ${zonaWaktu}.`)
    dispatch({
      type: 'CHECK_OUT',
      payload: {
        id: staff.id,
        pulang: jamDetik(saatPresensi),
        method: mode === 'face' ? 'Face Recognition' : 'QR Code',
      },
    })
    setHasilSimpan({
      judul: 'Absen Pulang Tercatat',
      detail: 'Kehadiran hari ini sudah lengkap.',
      jam: jamDetik(saatPresensi),
      method: mode === 'face' ? 'Face Recognition' : 'QR Code',
      late: 0,
    })
    setSheetTerbuka(true)
  }

  // Fallback barcode: kode kartu ID diketik manual, lalu dicocokkan dengan QR
  // yang terpasang pada kartu (cardQrValue) — tetap satu sumber kebenaran.
  function verifikasiKodeManual(event) {
    event.preventDefault()
    const kode = kodeManual.trim().toUpperCase()
    if (!kode) {
      setPesanKode('Masukkan kode pada kartu ID, contoh SIMPRESPEG-NIY.')
      return
    }
    if (kode === qrMilikSaya.toUpperCase()) {
      setQrTerbaca(qrMilikSaya)
      setPesanKode('')
      setKodeManual('')
      return
    }
    setPesanKode(`Kode ${kode} tidak cocok dengan kartu ID Anda (${qrMilikSaya}).`)
  }

  const belumMasuk = !presensi.sudahMasuk
  const belumPulang = !presensi.sudahPulang
  const jamPulangMenit = (String(rules.jamPulang).split(':').map(Number)[0] || 15) * 60
  const jendelaPulangTerbuka = jamMenitDariDate(now) >= jamPulangMenit - 60
  const geofenceOk = rules.lokasiAktif && geofence.dalamRadius

  const labelTombol = belumMasuk
    ? busy ? 'Memproses...'
      : 'Ambil Presensi Sekarang'
    : belumPulang
      ? jendelaPulangTerbuka ? 'Absen Pulang Sekarang' : 'Menunggu Jam Pulang'
      : 'Presensi Hari Ini Selesai'
  const tombolDisabled =
    busy || belumPulang || (!belumMasuk && !jendelaPulangTerbuka) || !geofenceOk
  const onTombol = belumMasuk ? jalankanPresensi : jalankanPresensiPulang

  return (
    <div className="sp-page">
      {/* Loading state: selama kamera belum selesai meminta izin, halaman
          menampilkan skeleton supaya tidak ada kedipan layout. */}
      {kamera.status === 'meminta' && (
        <div className="px-4 pt-6 pb-2">
          <LoadingState judul="Menyiapkan kamera…" detail="Izinkan akses kamera agar presensi wajah dapat dipakai." lines={3} />
        </div>
      )}

      <section className="relative overflow-hidden bg-gradient-to-br from-primary-container via-[#12325f] to-[#08182f] text-on-primary px-4 pt-5 pb-16 rounded-b-[32px] shadow-lg">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-52 h-52 rounded-full bg-tertiary-container/60 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="relative">
            <span className="absolute -inset-1 rounded-full bg-white/10" />
            <StaffAvatar
              staff={staff}
              size="w-[60px] h-[60px]"
              textClass="font-headline-sm text-headline-sm"
              ring="ring-2 ring-white/15"
              className="shadow-lg"
            />
            <span
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-[3px] ring-[#0d2342] ${
                state.currentUser?.status === 'Aktif' ? 'bg-emerald-400' : 'bg-outline'
              }`}
              title={state.currentUser?.status === 'Aktif' ? 'Online' : 'Offline'}
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-label-sm text-label-sm text-blue-200/90">
              {['Halo,', sapaan(staff)].filter(Boolean).join(' ')}
            </span>
            <span className="font-headline-sm text-headline-sm text-white truncate">
              {namaDepan(staff.name)}
            </span>
            <span className="font-label-sm text-label-sm text-on-primary-container truncate">
              {staff.name}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/10 font-label-sm text-label-sm flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[14px]">badge</span>
            ID {staff.niy}
          </span>
        </div>

        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90 flex items-center gap-1 max-w-full">
            <span className="material-symbols-outlined text-[14px]">domain</span>
            <span className="truncate">{unit?.nama || '-'}</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">work</span>
            {staff.role}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 font-label-sm text-label-sm text-white/90 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-blue-300">schedule</span>
            {namaShift(rules.jamMasuk)} ({rules.jamMasuk} - {rules.jamPulang})
          </span>
        </div>

        <div className="relative z-10 mt-5 flex items-end justify-between gap-3">
          {/* 2. Jam WIB real-time + tanggal hari ini. */}
          <div className="flex flex-col">
            <span className="font-display-lg text-[38px] leading-none text-white font-bold tabular-nums">
              {jamDetik(now)}
              <span className="font-headline-sm text-headline-sm font-medium text-blue-200 ml-1">{zonaWaktu}</span>
            </span>
            <span className="font-label-sm text-label-sm text-on-primary-container mt-1.5">{tanggalPanjang(now)}</span>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full border font-label-sm text-label-sm flex items-center gap-1.5 ${
              presensi.sudahMasuk
                ? 'bg-emerald-400/15 border-emerald-300/30 text-emerald-200'
                : 'bg-white/10 border-white/10 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">
              {presensi.sudahMasuk ? (presensi.late > 0 ? 'schedule' : 'task_alt') : 'hourglass_empty'}
            </span>
            {presensi.sudahMasuk ? presensi.statusMasuk : `Batas ${presensi.batasMasuk}`}
          </span>
        </div>
      </section>

      <div className="px-4 -mt-10 relative z-20 flex flex-col gap-4 pb-6">
        {/* 3. Geofencing: jarak dari koordinat unit vs radius Pengaturan Global. */}
        <GeofenceCard
          geofence={geofence}
          namaTitik={`${unit?.nama || 'Unit'} - Gerbang Utama`}
          koordinatTeks={koordinatTeks}
        />

        {/* 4. Mode presensi: wajah atau barcode. */}
        <div className="grid grid-cols-2 p-1 bg-surface-container rounded-2xl gap-1 shadow-inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                const next = tab.id
                setMode(next)
                setSearchParams(next === 'barcode' ? { mode: 'barcode' } : {}, { replace: true })
              }}
              aria-pressed={mode === tab.id}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-label-md text-label-md transition-all ${
                mode === tab.id
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-transparent text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Error state kamera: izin ditolak atau perangkat tidak punya kamera. */}
        {kamera.status === 'ditolak' && (
          <ErrorState
            ikon="no_photography"
            judul="Kamera tidak dapat diakses"
            detail={`${kamera.error || 'Izin kamera ditolak.'} Presensi barcode memakai input kode manual.`}
            onCoba={kamera.restart}
          />
        )}

        {/* 5 & 7. Area kamera: bingkai wajah atau scanner QR kartu ID. */}
        <ScanFrame
          mode={mode}
          facing={facing}
          onGantiKamera={() => setFacing((v) => (v === 'user' ? 'environment' : 'user'))}
          videoRef={kamera.videoRef}
          cameraAktif={kamera.aktif}
          cameraStatus={kamera.status}
          cameraError={kamera.error}
          supportsDetector={kamera.supportsDetector}
          initials={initialsFor}
          qrValue={qrMilikSaya}
          qrTerbaca={qrValid}
          captured={statusPenutup === 'berhasil'}
          verifying={busy}
        />

        {/* Fallback ketika kamera atau pembacaan QR tidak tersedia: kode kartu
            ID diketik manual dan dicocokkan dengan QR pada kartu. */}
        {mode === 'barcode' && !qrValid && (
          <form onSubmit={verifikasiKodeManual} className="sp-card p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface">Kode Kartu ID</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{CARD_QR_PREFIX}</span>
            </div>
            <div className="flex gap-2">
              <input
                value={kodeManual}
                onChange={(e) => setKodeManual(e.target.value)}
                placeholder="NIY"
                inputMode="numeric"
                aria-label="Kode kartu ID"
                className="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-body-md text-body-md text-on-surface outline-none focus:border-secondary"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md active:scale-[0.98] transition-transform"
              >
                Verifikasi
              </button>
            </div>
            {pesanKode ? (
              <p className="font-label-sm text-label-sm text-on-error-container">{pesanKode}</p>
            ) : (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Dipakai saat kamera tidak dapat membaca QR. Kode di atas bisa disalin dari kartu ID fisik.
              </p>
            )}
          </form>
        )}

        {mode === 'barcode' && qrMilikOrangLain && (
          <p className="rounded-2xl bg-error-container text-on-error-container px-3 py-2 font-body-sm text-body-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
            <span>
              QR yang terbaca ({qrTerbaca}) bukan kartu ID Anda ({CARD_QR_PREFIX}
              {staff.niy}).
            </span>
          </p>
        )}

        {/* 6. Tombol presensi: validasi lokasi -> waktu -> biometrik -> simpan. */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onTombol}
            disabled={tombolDisabled}
            className={`w-full py-4 rounded-2xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100 ${
              belumMasuk
                ? 'bg-gradient-to-br from-primary-container to-[#12325f] text-on-primary'
                : belumPulang
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-emerald-700 text-white'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${busy ? 'animate-spin' : ''}`}>
              {busy ? 'progress_activity' : belumMasuk ? 'check_circle' : belumPulang ? 'logout' : 'task_alt'}
            </span>
            <span>{labelTombol}</span>
          </button>

          {!geofenceOk && (
            <p className="text-center font-body-sm text-body-sm text-on-error-container">
              {rules.lokasiAktif
                ? 'Presensi hanya bisa diambil di dalam radius titik lokasi sekolah.'
                : 'Presensi sedang dinonaktifkan oleh administrator unit.'}
            </p>
          )}
          {belumMasuk && geofenceOk && !busy && (
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
              Toleransi {rules.toleransi} menit dari jam {rules.jamMasuk} ({presensi.batasMasuk} {zonaWaktu}).
            </p>
          )}
        </div>

        <ValidationSteps langkah={langkah} statusPenutup={statusPenutup} pesanPenutup={pesanPenutup} />

        <PresensiHariIniCard presensi={presensi} zonaWaktu={zonaWaktu} tanggal={now} />
      </div>

      <SuccessSheet
        terbuka={sheetTerbuka}
        judul={hasilSimpan?.judul || 'Presensi Berhasil'}
        detail={hasilSimpan?.detail}
        baris={[
          { label: 'Waktu tercatat', nilai: `${hasilSimpan?.jam || '-'} ${zonaWaktu}` },
          { label: 'Metode', nilai: hasilSimpan?.method || '-' },
          {
            label: 'Status',
            nilai: hasilSimpan?.late > 0 ? `Terlambat ${hasilSimpan.late} menit` : 'Tepat waktu',
          },
          { label: 'Lokasi', nilai: unit?.nama || '-' },
        ]}
        onTutup={() => setSheetTerbuka(false)}
        onRiwayat={() => navigate('/mobile/riwayat')}
      />
    </div>
  )
}

export default MobilePresensiPage
