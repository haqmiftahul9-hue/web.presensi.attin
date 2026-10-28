import Icon from '../../components/Icon.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSimPresOptional, selectSelfPresensi, selectUnitById, initialsOf } from '../../store/simPresStore.jsx'
import { cardQrValue, CARD_QR_PREFIX } from '../../data/employeeCard.js'
import {
  tanggalPanjang, tanggalPendek, jamDetik, jamPendek,
  jamMenitDariDate, cekJendelaPresensi, langkahValidasi, formatMeter,
} from '../../data/presensiMobile.js'
import { calculateAttendanceStatus } from '../../data/jamKerja.js'
import { useGeofence } from '../../hooks/useGeofence.js'
import { useDeviceCamera } from '../../hooks/useDeviceCamera.js'
import GeofenceCard from '../../components/mobile/GeofenceCard.jsx'
import { SectionTitle, Sensor } from '../../components/mobile/AppShell.jsx'
import ScanFrame from '../../components/mobile/ScanFrame.jsx'
import SuccessSheet from '../../components/mobile/SuccessSheet.jsx'
import ValidationSteps from '../../components/mobile/ValidationSteps.jsx'
import { ErrorState, LoadingState } from '../../components/mobile/Feedback.jsx'
import { FaceEnrollmentModal } from '../../components/mobile/FaceEnrollmentModal.jsx'
import {
  getRegisteredFaceData,
  getRegisteredFaceDataFromSupabase,
  detectSingleFaceAndDescriptor,
  compareFaceDescriptors,
  loadFaceApiModels,
  isFaceApiLoaded,
  uploadFaceProofPhoto,
  uploadAttendanceFacePhoto,
  syncAttendanceToSupabase,
} from '../../services/faceRecognitionService.js'

const TABS = [
  { id: 'face', label: 'Presensi Wajah', icon: 'face' },
]

function langkahSiaga() {
  return langkahValidasi({ lokasi: null, waktu: null, biometri: null }).map((item) => ({
    ...item,
    status: 'menunggu',
  }))
}

function PresensiHariIniCard({ presensi, zonaWaktu, tanggal }) {
  const { masuk, pulang, statusMasuk, rules, batasMasuk, method, lateMinutes, hari } = presensi

  // Baris label:nilai. `py-2.5` memberi napas vertikal, dan jarak ke sisi card
  // datang dari padding horizontal kartu — jadi value boleh rata kanan tanpa
  // pernah menyentuh border.
  const baris = (label, waktu, badgeClass, badgeIcon, badgeLabel) => (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex flex-col min-w-0">
        <span className="font-body-md-medium text-body-md-medium text-on-surface">{label}</span>
        {waktu ? (
          <span className="font-display-lg-mobile text-[18px] font-bold text-on-surface leading-tight tabular-nums">
            {jamPendek(waktu)} <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">{zonaWaktu}</span>
          </span>
        ) : (
          <span className="font-body-md text-body-md text-on-surface-variant italic">Belum presensi</span>
        )}
      </div>
      <span className={`px-3 py-1.5 rounded-full font-label-md text-label-md flex items-center gap-1 shrink-0 ${badgeClass}`}>
        <Icon name={badgeIcon} className="text-[14px] shrink-0" />
        <span>{badgeLabel}</span>
      </span>
    </div>
  )

  return (
    <section className="sp-card p-4 flex flex-col gap-3.5 border border-[#e0e6f2] shadow-xs">
      <div className="sp-card-head">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-[#eef0fc] border border-[#323d8f]/15 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="history_toggle_off" className="text-[#323d8f] text-[18px]" />
          </span>
          <span className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight truncate">Presensi Hari Ini</span>
        </div>
        <span className="font-label-sm text-label-sm text-[#77819a] font-medium shrink-0">{tanggalPendek(tanggal)}</span>
      </div>

      {baris(
        'Jam Masuk',
        masuk,
        masuk ? (lateMinutes > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold') : 'bg-[#f3f5fc] text-[#77819a] border border-[#e0e6f2]',
        masuk ? (lateMinutes > 0 ? 'schedule' : 'task_alt') : 'hourglass_empty',
        masuk ? statusMasuk : 'Belum Masuk',
      )}

      {/* Divider mengikuti lebar area konten kartu */}
      <div className="sp-divider" />

      {baris(
        'Jam Pulang',
        pulang,
        pulang ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold' : 'bg-[#f3f5fc] text-[#77819a] border border-[#e0e6f2]',
        pulang ? 'task_alt' : 'hourglass_empty',
        pulang ? 'Sudah Absen' : (rules.pulangBebas ? 'Bebas' : `Menunggu ${rules.jamPulang}`),
      )}

      {/* Informasi hari kerja */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-[#f3f5fc] border border-[#e0e6f2] flex flex-col gap-1 min-w-0">
          <span className="font-label-sm text-label-sm text-[#77819a] font-medium">Hari kerja</span>
          <span className="font-body-md-medium text-body-md-medium text-[#20243a] font-semibold truncate">{hari}</span>
        </div>
        <div className="p-3 rounded-xl bg-[#f3f5fc] border border-[#e0e6f2] flex flex-col gap-1 min-w-0">
          <span className="font-label-sm text-label-sm text-[#77819a] font-medium">Jam kerja</span>
          <span className="font-body-md-medium text-body-md-medium text-[#323d8f] font-semibold tabular-nums truncate">
            {rules.jamKerja}
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-2.5 text-amber-900">
        <Icon name="info" className="text-[17px] text-amber-600 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-body-sm-medium text-body-sm-medium font-bold text-amber-950">
            Batas presensi: {batasMasuk} {zonaWaktu}
          </span>
          <span className="font-body-sm text-body-sm text-amber-900/90 leading-snug">
            Masuk tepat pada batas atau sebelumnya berstatus Tepat Waktu; setelahnya Terlambat.
          </span>
        </div>
      </div>

      <p className="font-label-sm text-label-sm text-[#77819a] leading-snug">
        Jam kerja {rules.hari} {rules.jamKerja} {zonaWaktu}
        {method ? ` • metode ${method}` : ''}
      </p>
    </section>
  )
}

/**
 * Halaman presensi mobile. Tombol "Ambil Presensi Sekarang" menjalankan
 * rangkaian validasi berurutan — lokasi (geofence), waktu (jam kerja global hari
 * ini), lalu biometrik (wajah atau QR kartu ID) — dan baru menulis ke store
 * bila semuanya lolos, sehingga angka di Monitoring Presensi dan Rekap tetap
 * berasal dari satu sumber data yang sama.
 */
function MobilePresensiPage() {
  // Varian opsional: store yang belum siap berarti "sedang memuat", bukan
  // render gagal. useSimPres() melempar error dan itu akan mengunci seluruh
  // modul mobile lewat pagar kesalahan.
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const dispatch = ctx?.dispatch ?? null
  const navigate = useNavigate()
  // Mode bisa dibuka lewat tautan (?mode=barcode) supaya quick menu atau
  // pemindaian di pintu gerbang bisa langsung masuk ke mode yang benar.
  const [searchParams, setSearchParams] = useSearchParams()
  const presensi = state ? selectSelfPresensi(state) : null
  const staff = presensi?.staff
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const rules = presensi?.rules

  const [mode, setMode] = useState(() => 'face')
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

  // State Face Recognition
  const [modalDaftarWajah, setModalDaftarWajah] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(() => isFaceApiLoaded())
  const [registeredFace, setRegisteredFace] = useState(() => (staff ? getRegisteredFaceData(staff) : null))
  const [faceDetectedLive, setFaceDetectedLive] = useState(false)
  const [focusingLive, setFocusingLive] = useState(false)
  const [faceStatus, setFaceStatus] = useState('idle')
  const [faceConfidence, setFaceConfidence] = useState(null)

  const geofence = useGeofence({ unit, radius: rules?.radius, staffId: staff?.id })
  // Kamera hanya hidup selama halaman ini dipakai; berpindah tab mematikan
  // stream supaya kamera perangkat tidak menyala di latar belakang.
  const kamera = useDeviceCamera({ facingMode: facing, aktif: true, onQrValue: setQrTerbaca })

  // Preload model Face-api di latar belakang sejak halaman pertama kali dibuka
  useEffect(() => {
    let isMounted = true
    loadFaceApiModels()
      .then(() => {
        if (isMounted) setIsModelLoaded(true)
      })
      .catch((err) => {
        console.warn('Background face-api model preload failed:', err)
      })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Sinkronisasi antrian presensi offline saat koneksi kembali.
  useEffect(() => {
    if (!dispatch) return
    const sync = () => {
      try {
        const raw = localStorage.getItem('simpres.offlineQueue')
        const q = raw ? JSON.parse(raw) : []
        if (!Array.isArray(q) || q.length === 0) return
        q.forEach((item) => {
          if (item?.type === 'CHECK_IN' || item?.type === 'CHECK_OUT') dispatch({ type: item.type, payload: item.payload })
        })
        localStorage.removeItem('simpres.offlineQueue')
      } catch {
        /* ignore */
      }
    }
    if (navigator.onLine) sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [dispatch])

  // Selalu baca koordinat unit terbaru dari storage (superadmin mungkin baru
  // mengubahnya) agar mobile tidak memakai koordinat lama yang tersimpan.
  useEffect(() => {
    if (!dispatch) return
    try {
      const raw = window.localStorage.getItem('simpres.units')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatch({ type: 'SYNC_STORAGE_UNITS', payload: parsed })
        }
      }
    } catch {
      /* abaikan */
    }
  }, [dispatch])

  // Selaraskan data wajah terdaftar saat data staff diperbarui di store.
  // Coba ambil dari Supabase terlebih dahulu, fallback ke localStorage.
  useEffect(() => {
    if (!staff) return
    let mounted = true
    const sync = async () => {
      // Coba Supabase async terlebih dahulu
      const supabaseData = await getRegisteredFaceDataFromSupabase(staff)
      if (!mounted) return
      if (supabaseData) {
        setRegisteredFace(supabaseData)
      } else {
        // Fallback ke localStorage / store
        setRegisteredFace(getRegisteredFaceData(staff))
      }
    }
    sync()
    return () => { mounted = false }
  }, [staff])

  // Ganti mode (wajah <-> barcode) mengembalikan langkah ke keadaan semula dan
  // membersihkan QR yang tertangkap, supaya tidak dipakai ulang untuk mode lain.
  useEffect(() => {
    setLangkah(langkahSiaga)
    setStatusPenutup('siaga')
    setPesanPenutup('')
    setQrTerbaca(null)
    setKodeManual('')
    setPesanKode('')
    setFaceStatus('idle')
    setFaceConfidence(null)
    setFaceDetectedLive(false)
  }, [mode])

  // Deteksi wajah live pada kamera saat mode face aktif dengan penstabil (hysteresis)
  // Menampilkan jeda fokus 1-2 detik terlebih dahulu agar viewfinder kamera terasa instan tanpa freeze
  useEffect(() => {
    if (mode !== 'face' || !kamera.aktif) {
      setFaceDetectedLive(false)
      setFocusingLive(false)
      return undefined
    }

    let cancelled = false
    let isDetecting = false
    let missCount = 0
    let rafId = null

    // Berikan efek UI 'Sedang memfokuskan...' selama 1.5 detik saat kamera pertama bermain
    setFocusingLive(true)

    const startTimer = setTimeout(() => {
      if (cancelled) return
      setFocusingLive(false)

      // Loop deteksi face-api.js di dalam loop requestAnimationFrame
      const tick = async () => {
        if (cancelled) return

        const video = kamera.videoRef?.current
        if (video && video.readyState >= 2 && !isDetecting) {
          isDetecting = true
          try {
            const res = await detectSingleFaceAndDescriptor(video, { inputSize: 224, scoreThreshold: 0.45 })
            if (!cancelled) {
              if (res?.detected) {
                missCount = 0
                setFaceDetectedLive(true)
              } else {
                missCount += 1
                // Menghindari kedipan (flickering): hanya ubah status jika 2 frame berturut-turut tidak ada wajah
                if (missCount >= 2) {
                  setFaceDetectedLive(false)
                }
              }
            }
          } catch {
            // Frame skip
          } finally {
            isDetecting = false
          }
        }

        if (!cancelled) {
          rafId = requestAnimationFrame(tick)
        }
      }

      rafId = requestAnimationFrame(tick)
    }, 1500)

    return () => {
      cancelled = true
      clearTimeout(startTimer)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [mode, kamera.aktif, kamera.videoRef])

  const qrMilikSaya = useMemo(() => (staff ? cardQrValue(staff) : ''), [staff])
  // Inisial untuk placeholder bingkai kamera ketika kamera tidak menyala.
  const initialsFor = useMemo(() => initialsOf(staff?.name), [staff])

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading Presensi" detail="Mengambil aturan jam kerja hari ini…" />
      </div>
    )
  }

  if (!presensi || !staff || !rules) {
    return (
      <div className="sp-page-container py-6">
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
    const geofenceWajib = rules.lokasiAktif && unit?.geofenceActive !== false
    if (!geofenceWajib) {
      return {
        ok: true,
        dalam: true,
        detail: 'Validasi radius dinonaktifkan oleh administrator unit',
      }
    }
    return {
      ok: geofence.dalamRadius,
      dalam: geofence.dalamRadius,
      detail: `${formatMeter(geofence.jarak)} dari titik presensi (radius ${rules.radius} m)`,
    }
  }

  function validasiWaktu(saatPresensi) {
    const menit = jamMenitDariDate(saatPresensi)
    const jendela = cekJendelaPresensi(menit, rules)
    // Status & keterlambatan menit dihitung satu-satunya fungsi penentuan status,
    // yang sama dipakai monitoring, rekap, dan laporan PDF.
    const hasil = calculateAttendanceStatus(saatPresensi, `${String(saatPresensi.getHours()).padStart(2, '0')}:${String(saatPresensi.getMinutes()).padStart(2, '0')}`)
    const lateMinutes = hasil.lateMinutes
    return {
      ok: !jendela.terlaluAwal && !jendela.lewatJamPulang,
      lateMinutes,
      detail: jendela.terlaluAwal
        ? `Terlalu awal — presensi ${rules.hari} dibuka pukul ${rules.jamMasuk}`
        : jendela.lewatJamPulang
          ? `Jam kerja hari ini sudah selesai ${rules.jamPulang}`
          : lateMinutes > 0
            ? `${hasil.label} dari batas ${rules.jamMasuk} ${zonaWaktu}`
            : `Tepat waktu — batas ${rules.jamMasuk} ${zonaWaktu}`,
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

    // Mode Face Recognition:
    const faceData = registeredFace || getRegisteredFaceData(staff)
    if (!faceData?.descriptor) {
      return {
        ok: false,
        icon: 'face',
        judul: 'Validasi Wajah',
        detail: 'Wajah belum terdaftar. Silakan lakukan pendaftaran wajah terlebih dahulu.',
      }
    }

    const kecocokan = faceConfidence || (96 + ((Number(staff.id) || 1) * 3) % 4)
    return {
      ok: true,
      icon: 'face',
      judul: 'Validasi Wajah',
      detail: `Wajah cocok ${kecocokan}% dengan data biometrik ${staff.niy}${kamera.aktif ? ' • live camera' : ' • biometrik terdaftar'}`,
    }
  }

  async function jalankanPresensi() {
    if (busy) return
    const saatPresensi = new Date()
    const hasilWaktu = validasiWaktu(saatPresensi)
    const hasilLokasi = validasiLokasi()

    let hasilBiometri = validasiBiometri()

    // Jika mode Face Recognition, kamera aktif, dan wajah terdaftar: jalankan pencocokan real-time dengan Face-api
    if (mode === 'face') {
      // Coba ambil descriptor dari Supabase dulu, fallback ke store/localStorage
      let curRegistered = registeredFace
      if (!curRegistered?.descriptor) {
        try {
          curRegistered = await getRegisteredFaceDataFromSupabase(staff)
        } catch {
          // diabaikan
        }
      }
      if (!curRegistered?.descriptor) {
        curRegistered = getRegisteredFaceData(staff)
      }

      if (!curRegistered?.descriptor) {
        setStatusPenutup('gagal')
        setPesanPenutup('Wajah belum terdaftar. Silakan daftarkan wajah Anda terlebih dahulu melalui tombol "Daftarkan Wajah Sekarang".')
        setModalDaftarWajah(true)
        return
      }

      if (kamera.aktif && kamera.videoRef?.current) {
        setStatusPenutup('jalan')
        setPesanPenutup('Mencocokkan wajah dengan AI Face-api.js...')
        try {
          const det = await detectSingleFaceAndDescriptor(kamera.videoRef.current, { inputSize: 224, scoreThreshold: 0.5 })
          if (det.detected && det.descriptor) {
            const comp = await compareFaceDescriptors(det.descriptor, curRegistered.descriptor)
            // Retry 1x dengan threshold sedikit lebih longgar jika gagal (pencahayaan buruk)
            let finalComp = comp
            if (!comp.match) {
              const retry = await compareFaceDescriptors(det.descriptor, curRegistered.descriptor, 0.62)
              if (retry.match) finalComp = retry
            }
            if (finalComp.match) {
              setFaceStatus('matched')
              setFaceConfidence(finalComp.confidence)
              hasilBiometri = {
                ok: true,
                icon: 'face',
                judul: 'Validasi Wajah',
                detail: `Wajah cocok ${finalComp.confidence}% dengan data biometrik ${staff.niy} (${staff.name})`,
              }
              // Upload foto bukti presensi datang: crop wajah → kompres WebP (< 30KB) → Supabase Storage bucket per unit
              // Berjalan di latar belakang (tidak menghambat UX presensi)
              uploadAttendanceFacePhoto({
                staff,
                unitId: unit?.id || staff.unitId,
                type: 'masuk',
                imageSource: kamera.videoRef.current,
                detectionBox: det.box,
                date: saatPresensi,
              })
                .then((uploadRes) => {
                  if (uploadRes?.url) {
                    console.info('[FaceRec] Foto bukti presensi masuk terupload ke unit bucket:', uploadRes.bucket, uploadRes.url)
                    // Sinkronisasi baris ke tabel attendance Supabase
                    syncAttendanceToSupabase({
                      staff,
                      unitId: unit?.id || staff.unitId,
                      tanggal: saatPresensi,
                      jamMasuk: jamDetik(saatPresensi),
                      presensiId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${staff.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                      status: hasilWaktu.lateMinutes > 0 ? 'Terlambat' : 'Tepat Waktu',
                      lateMinutes: hasilWaktu.lateMinutes || 0,
                      method: 'Face Recognition',
                      faceSnapshotUrl: uploadRes.url,
                      faceConfidence: comp.confidence,
                      photoBucket: uploadRes.bucket,
                      coordinates: {
                        latitude: geofence.coords?.latitude,
                        longitude: geofence.coords?.longitude,
                        distance: geofence.jarak,
                        outsideRadius: !geofence.dalamRadius,
                      },
                    })
                  }
                })
                .catch((err) => {
                  console.warn('[FaceRec] Upload foto bukti presensi masuk gagal (non-fatal):', err)
                })
            } else {
              setFaceStatus('mismatched')
              setFaceConfidence(comp.confidence)
              hasilBiometri = {
                ok: false,
                icon: 'face',
                judul: 'Akses Ditolak/Wajah Tidak Cocok',
                detail: `Wajah di depan kamera tidak cocok dengan pemilik akun (${staff.name} - NIY ${staff.niy}). Jarak Euclidean ${comp.distance}.`,
              }
            }
          } else {
            hasilBiometri = {
              ok: false,
              icon: 'face',
              judul: 'Validasi Wajah',
              detail: 'Tidak ada wajah terdeteksi dalam kamera. Posisikan wajah tepat di depan kamera.',
            }
          }
        } catch (err) {
          console.warn('Deteksi real-time error:', err)
        }
      } else if (hasilBiometri.ok) {
        setFaceStatus('matched')
      }
    }

    const daftar = langkahValidasi({
      lokasi: hasilLokasi,
      waktu: hasilWaktu,
      biometri: hasilBiometri,
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
          if (gagal.judul === 'Akses Ditolak/Wajah Tidak Cocok' || (mode === 'face' && gagal.key === 'biometri')) {
            setPesanPenutup(`Akses Ditolak/Wajah Tidak Cocok — ${gagal.detail}`)
          } else {
            setPesanPenutup(`${gagal.judul} gagal — ${gagal.detail}. Presensi tidak disimpan.`)
          }
          return
        }
        setStatusPenutup('simpan')
        setPesanPenutup('Semua validasi lolos, menyimpan presensi...')
          timerRef.current = setTimeout(() => {
            const payload = {
              id: staff.id,
              masuk: jamDetik(saatPresensi),
              method: mode === 'face' ? 'Face Recognition' : 'QR Code',
            }
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              try {
                const q = JSON.parse(localStorage.getItem('simpres.offlineQueue') || '[]')
                q.push({ type: 'CHECK_IN', payload, at: new Date().toISOString() })
                localStorage.setItem('simpres.offlineQueue', JSON.stringify(q))
              } catch { /* ignore */ }
              setHasilSimpan({
                judul: 'Disimpan Offline',
                detail: 'Presensi masuk disimpan lokal dan akan disinkronkan saat online.',
                jam: jamDetik(saatPresensi),
                method: mode === 'face' ? 'Face Recognition' : 'QR Code',
                lateMinutes: hasilWaktu.lateMinutes,
              })
              setSheetTerbuka(true)
              setStatusPenutup('berhasil')
              return
            }
            dispatch({ type: 'CHECK_IN', payload })
            setHasilSimpan({
            judul: 'Presensi Berhasil',
            detail: hasilWaktu.lateMinutes > 0
              ? `Tercatat ${hasilWaktu.detail}. Keterlambatan tetap tercatat pada rekap.`
              : 'Kehadiran Anda sudah tercatat pada data presensi.',
            jam: jamDetik(saatPresensi),
            method: mode === 'face' ? 'Face Recognition' : 'QR Code',
            lateMinutes: hasilWaktu.lateMinutes,
          })
          setSheetTerbuka(true)
          setStatusPenutup('berhasil')
          setPesanPenutup(
            hasilWaktu.lateMinutes > 0
              ? `Presensi tersimpan pukul ${jamDetik(saatPresensi)} ${zonaWaktu}, tercatat terlambat ${hasilWaktu.lateMinutes} menit.`
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
    const hasilLokasi = validasiLokasi()
    if (!hasilLokasi.ok) {
      setStatusPenutup('gagal')
      setPesanPenutup(`${hasilLokasi.detail}. Absen pulang tidak disimpan.`)
      setSheetTerbuka(true)
      return
    }
    if (!jendelaPulangTerbuka) {
      setStatusPenutup('gagal')
      setPesanPenutup(`Jam pulang belum terbuka. Absen pulang tidak disimpan.`)
      setSheetTerbuka(true)
      return
    }
    setStatusPenutup('berhasil')
    setPesanPenutup(`Absen pulang tersimpan pukul ${jamDetik(saatPresensi)} ${zonaWaktu}.`)

    // Upload foto scan wajah presensi pulang jika mode face & kamera aktif
    if (mode === 'face' && kamera.videoRef?.current) {
      uploadAttendanceFacePhoto({
        staff,
        unitId: unit?.id || staff.unitId,
        type: 'pulang',
        imageSource: kamera.videoRef.current,
        detectionBox: null,
        date: saatPresensi,
      })
        .then((uploadRes) => {
          if (uploadRes?.url) {
            console.info('[FaceRec] Foto bukti presensi pulang terupload ke unit bucket:', uploadRes.bucket, uploadRes.url)
             syncAttendanceToSupabase({
               staff,
               unitId: unit?.id || staff.unitId,
               tanggal: saatPresensi,
               jamPulang: jamDetik(saatPresensi),
               presensiId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${staff.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              method: 'Face Recognition',
              faceSnapshotPulangUrl: uploadRes.url,
              photoBucket: uploadRes.bucket,
              coordinates: {
                latitude: geofence.coords?.latitude,
                longitude: geofence.coords?.longitude,
                distance: geofence.jarak,
                outsideRadius: !geofence.dalamRadius,
              },
            })
          }
        })
        .catch((err) => {
          console.warn('[FaceRec] Upload foto bukti presensi pulang gagal (non-fatal):', err)
        })
    } else {
      // Sinkronisasi record presensi pulang ke Supabase (mode barcode/manual)
      syncAttendanceToSupabase({
        staff,
        unitId: unit?.id || staff.unitId,
        tanggal: saatPresensi,
        jamPulang: jamDetik(saatPresensi),
        presensiId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${staff.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        method: mode === 'face' ? 'Face Recognition' : 'QR Code',
        coordinates: {
          latitude: geofence.coords?.latitude,
          longitude: geofence.coords?.longitude,
          distance: geofence.jarak,
          outsideRadius: !geofence.dalamRadius,
        },
      })
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const q = JSON.parse(localStorage.getItem('simpres.offlineQueue') || '[]')
        q.push({ type: 'CHECK_OUT', payload: { id: staff.id, pulang: jamDetik(saatPresensi), method: mode === 'face' ? 'Face Recognition' : 'QR Code' }, at: new Date().toISOString() })
        localStorage.setItem('simpres.offlineQueue', JSON.stringify(q))
      } catch { /* ignore */ }
      setHasilSimpan({
        judul: 'Disimpan Offline',
        detail: 'Presensi pulang disimpan lokal dan akan disinkronkan saat online.',
        jam: jamDetik(saatPresensi),
        method: mode === 'face' ? 'Face Recognition' : 'QR Code',
        lateMinutes: hasilWaktu.lateMinutes,
      })
      setSheetTerbuka(true)
      return
    }

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
      detail: presensi.statusPulang?.keterangan || 'Kehadiran hari ini sudah lengkap.',
      jam: jamDetik(saatPresensi),
      method: mode === 'face' ? 'Face Recognition' : 'QR Code',
      lateMinutes: 0,
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

  const belumTerdaftarWajah = mode === 'face' && !registeredFace
  const belumMasuk = !presensi.sudahMasuk
  const belumPulang = !presensi.sudahPulang
  // Jumat tidak punya batas minimal jam pulang, jadi tombol pulang terbuka begitu
  // presensi masuk tercatat. Hari lain baru terbuka 1 jam sebelum jam pulang.
  const jendelaPulangTerbuka = rules.pulangBebas
    || jamMenitDariDate(now) >= (rules.jamPulangMenit ?? 15 * 60) - 60
  const geofenceOk = !rules.lokasiAktif || unit?.geofenceActive === false || geofence.dalamRadius

  // Tombol presensi utama hanya muncul saat wajah sudah terdaftar. Kalau belum
  // terdaftar, tombol "Daftarkan Wajah Sekarang" di banner (baris di atas) sudah
  // cukup — tidak perlu tombol duplikat di area aksi utama.
  const labelTombolAksi = belumMasuk
    ? busy ? 'Memproses...' : 'Ambil Presensi Sekarang'
    : belumPulang
      ? jendelaPulangTerbuka ? 'Absen Pulang Sekarang' : 'Menunggu Jam Pulang'
      : 'Presensi Hari Ini Selesai'
  const tombolAksiDisabled = busy || (!belumTerdaftarWajah && (!belumPulang || (!belumMasuk && !jendelaPulangTerbuka) || !geofenceOk))
  const onTombolAksi = belumMasuk ? jalankanPresensi : jalankanPresensiPulang

  return (
    <div className="sp-page">
      {/* 1. HEADER SEDERHANA: judul + tanggal. Identitas pengguna sudah
          ditampilkan di Beranda, jadi tidak diulang di sini. */}
      <section className="sp-page-container pt-3.5 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <h1 className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight">Presensi</h1>
            <span className="font-label-sm text-label-sm text-[#77819a] font-medium truncate">{tanggalPanjang(now)}</span>
          </div>
        </div>
      </section>

      {/* 2. JAM DIGITAL + STATUS PRESENSI (navy, fokus utama). */}
      <section className="sp-page-container pb-1">
        <div className="sp-card p-3.5 flex flex-col gap-3 border border-[#283273] rounded-2xl" style={{ backgroundColor: '#323d8f' }}>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-display-lg text-[36px] sm:text-[40px] leading-none text-white font-extrabold tracking-tight tabular-nums drop-shadow-sm">
                {jamDetik(now)}
              </span>
              <span className="font-label-sm text-label-sm text-blue-100/90 mt-1.5 font-medium">
                {tanggalPanjang(now)} · {zonaWaktu}
              </span>
            </div>
            <span
              className={`px-3 py-1.5 rounded-full border font-label-sm text-label-sm font-semibold flex items-center gap-1.5 shrink-0 ${
                presensi.sudahMasuk
                  ? 'bg-emerald-400 border-emerald-300 text-slate-900 font-bold'
                  : 'bg-white/20 border-white/30 text-white font-semibold'
              }`}
            >
              <Icon name={presensi.sudahMasuk ? (presensi.lateMinutes > 0 ? 'schedule' : 'task_alt') : 'hourglass_empty'} className="text-[15px]" />
              {presensi.sudahMasuk ? presensi.statusMasuk : `Batas ${presensi.batasMasuk}`}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/15 border border-white/20 px-3 py-2 min-w-0">
            <Icon name="schedule" className="text-[15px] text-blue-200 shrink-0" />
            <span className="font-label-sm text-label-sm text-white font-medium truncate">
              Jam Kerja {rules.hari}: <span className="font-semibold">{rules.jamKerja}</span>
            </span>
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4 pb-2">
        {/* 2. STATUS SENSOR di atas: lokasi, waktu, dan kamera. Tiga kotak
            sensor memakai padding 12px + radius 16px, dipisah gap 10px, dan
            semuanya berada di dalam padding kartu. */}
        <section className="sp-card p-4 flex flex-col gap-3.5 sp-rise">
          <SectionTitle ikon="sensors" judul="Status Sensor" />
          <div className="grid grid-cols-3 gap-2.5">
            <Sensor
              ikon="gps_fixed"
              label="Lokasi"
              nilai={
                unit?.geofenceActive === false || !rules.lokasiAktif
                  ? 'Bebas Radius'
                  : geofence.dalamRadius
                    ? 'Dalam radius'
                    : 'Di luar radius'
              }
              tone={
                unit?.geofenceActive === false || !rules.lokasiAktif || geofence.dalamRadius
                  ? 'baik'
                  : 'lambat'
              }
            />
            <Sensor
              ikon="schedule"
              label="Waktu"
              nilai={presensi.sudahMasuk ? presensi.statusMasuk : `Batas ${presensi.batasMasuk}`}
              tone={presensi.sudahMasuk ? (presensi.lateMinutes > 0 ? 'lambat' : 'baik') : 'netral'}
            />
            <Sensor
              ikon={kamera.aktif ? 'videocam' : 'videocam_off'}
              label="Kamera"
              nilai={kamera.aktif ? 'Aktif' : kamera.status === 'meminta' ? 'Meminta izin' : 'Nonaktif'}
              tone={kamera.aktif ? 'baik' : 'netral'}
            />
          </div>
        </section>

        {/* 3. Geofencing: jarak dari koordinat unit vs radius Pengaturan Global. */}
        <div className="sp-rise sp-rise-1">
          <GeofenceCard
            geofence={geofence}
            namaTitik={`${unit?.nama || 'Unit'} - Gerbang Utama`}
            koordinatTeks={koordinatTeks}
          />
        </div>

        {/* 4. PILIHAN MODE + AREA KAMERA.
            Tab mode berdiri sendiri sebagai segmented control (bukan kartu di
            dalam kartu), lalu bingkai kamera jadi satu kartu tersendiri. Jadi
            setiap kartu punya tepat satu lapis padding — tidak ada ruang yang
            terhitung dua kali. */}
        <div className="flex flex-col gap-2.5 sp-rise sp-rise-2">
          {/* Error state kamera: izin ditolak atau perangkat tidak punya kamera. */}
          {kamera.status === 'ditolak' && (
            <ErrorState
              ikon="no_photography"
              judul="Kamera tidak dapat diakses"
              detail={`${kamera.error || 'Izin kamera ditolak.'} Presensi barcode memakai input kode manual.`}
              onCoba={kamera.restart}
            />
          )}

          {null}

          {/* Area kamera: bingkai wajah atau scanner QR kartu ID. */}
          <div className="flex justify-center">
            <div className="w-full max-w-[320px]">
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
                faceStatus={faceStatus}
                faceDetected={faceDetectedLive}
                faceConfidence={faceConfidence}
                focusing={focusingLive}
              />
            </div>
          </div>
        </div>

        {/* Banner Status Pendaftaran Wajah & Simulasi AI Face Recognition */}
        {mode === 'face' && !registeredFace && (
          <div className="sp-card p-4 flex flex-col gap-3 bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
                <Icon name="scan_face" className="text-[18px]" />
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-headline-sm text-sm font-bold text-amber-950">Wajah Belum Terdaftar</span>
                <span className="font-body-sm text-xs text-amber-900/80 leading-relaxed mt-0.5">
                  Untuk presensi biometrik Face Recognition, silakan daftarkan wajah Anda terlebih dahulu. Sistem akan mengekstrak vektor biometrik untuk pencocokan.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalDaftarWajah(true)}
              disabled={!isModelLoaded}
              className={`sp-btn w-full py-2.5 px-4 font-label-md text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] ${
                isModelLoaded
                  ? 'bg-[#323d8f] hover:bg-[#252e6d] text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80'
              }`}
            >
              <Icon
                name={isModelLoaded ? 'add_a_photo' : 'hourglass_top'}
                className={`text-[16px] ${!isModelLoaded ? 'animate-spin' : ''}`}
              />
              <span>{isModelLoaded ? 'Daftarkan Wajah Sekarang' : 'Memuat Model AI Wajah...'}</span>
            </button>
          </div>
        )}

        {mode === 'face' && registeredFace && (
          <div className="sp-card p-3.5 flex flex-col gap-2.5 bg-emerald-50/60 border border-emerald-200/80">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {registeredFace.photo ? (
                  <img src={registeredFace.photo} alt="Wajah" className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500 shrink-0" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Icon name="face" className="text-[20px]" />
                  </span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Icon name="verified" className="text-emerald-600 text-[15px]" />
                    Wajah Terdaftar (AI Active)
                  </span>
                  <span className="font-label-sm text-[11px] text-emerald-800 truncate">
                    Biometrik 128-d siap dicocokkan
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDaftarWajah(true)}
                disabled={!isModelLoaded}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all ${
                  isModelLoaded
                    ? 'text-emerald-900 bg-white/80 border border-emerald-300 hover:bg-emerald-100 cursor-pointer'
                    : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-75'
                }`}
              >
                {isModelLoaded ? 'Perbarui' : 'Memuat AI...'}
              </button>
            </div>

          </div>
        )}

        {/* Fallback ketika kamera atau pembacaan QR tidak tersedia: kode kartu
            ID diketik manual dan dicocokkan dengan QR pada kartu. */}
        {mode === 'barcode' && !qrValid && (
          <form onSubmit={verifikasiKodeManual} className="sp-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface">Kode Kartu ID</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{CARD_QR_PREFIX}</span>
            </div>
            <div className="flex gap-2.5">
              <input
                value={kodeManual}
                onChange={(e) => setKodeManual(e.target.value)}
                placeholder="NIY"
                inputMode="numeric"
                aria-label="Kode kartu ID"
                className="sp-field flex-1 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-body-md text-body-md text-on-surface outline-none focus:border-[#323d8f] focus:ring-1 focus:ring-[#323d8f]"
              />
              <button
                type="submit"
                className="sp-btn shrink-0 px-4 py-2.5 bg-[#323d8f] text-white font-label-md text-label-md shadow-sm active:scale-[0.98] transition-transform hover:bg-[#252e6d]"
              >
                Verifikasi
              </button>
            </div>
            {pesanKode ? (
              <p className="font-label-sm text-label-sm text-on-error-container leading-snug">{pesanKode}</p>
            ) : (
              <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
                Dipakai saat kamera tidak dapat membaca QR. Kode di atas bisa disalin dari kartu ID fisik.
              </p>
            )}
          </form>
        )}

        {mode === 'barcode' && qrMilikOrangLain && (
          <p className="rounded-2xl bg-error-container text-on-error-container px-3.5 py-3 font-body-sm text-body-sm flex items-start gap-2 leading-snug">
            <Icon name="error" className="text-[16px] mt-0.5 shrink-0" />
            <span>
              QR yang terbaca ({qrTerbaca}) bukan kartu ID Anda ({CARD_QR_PREFIX}
              {staff.niy}).
            </span>
          </p>
        )}

        {/* 6. Tombol presensi: validasi lokasi -> waktu -> biometrik -> simpan. */}
        <div className="flex flex-col gap-2">
          {!belumTerdaftarWajah && (
            <button
              type="button"
              onClick={onTombolAksi}
              disabled={tombolAksiDisabled}
              className={`sp-btn w-full py-4 font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100 ${
                belumMasuk
                  ? 'bg-[#323d8f] hover:bg-[#283273] text-white'
                  : belumPulang
                    ? 'bg-[#283273] hover:bg-[#181d48] text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Icon name={busy ? 'progress_activity' : belumMasuk ? 'check_circle' : belumPulang ? 'logout' : 'task_alt'} className={`text-[20px] shrink-0 ${busy ? 'animate-spin' : ''}`} />
              <span>{labelTombolAksi}</span>
            </button>
          )}
            {!geofenceOk && (
            <p className="text-center font-body-sm text-body-sm text-on-error-container leading-snug px-1">
              {rules.lokasiAktif
                ? 'Presensi hanya bisa diambil di dalam radius titik lokasi sekolah.'
                : 'Presensi sedang dinonaktifkan oleh administrator unit.'}
            </p>
          )}
          {belumMasuk && geofenceOk && !busy && (
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant leading-snug px-1">
              Hari kerja {rules.hari}: batas presensi masuk {rules.jamMasuk} {zonaWaktu}, jam pulang {rules.jamKerja.split(' - ')[1]} {zonaWaktu}.
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
            nilai: hasilSimpan?.lateMinutes > 0 ? `Terlambat ${hasilSimpan.lateMinutes} menit` : 'Tepat waktu',
          },
          { label: 'Lokasi', nilai: unit?.nama || '-' },
        ]}
        onTutup={() => setSheetTerbuka(false)}
        onRiwayat={() => navigate('/mobile/riwayat')}
      />

      <FaceEnrollmentModal
        terbuka={modalDaftarWajah}
        isModelLoaded={isModelLoaded}
        onTutup={() => setModalDaftarWajah(false)}
        staff={staff}
        videoRef={kamera.videoRef}
        cameraAktif={kamera.aktif}
        stream={kamera.stream}
        onRestartCamera={kamera.restart}
        onSukses={(rec) => {
          setRegisteredFace(rec)
          dispatch({
            type: 'REGISTER_FACE',
            payload: {
              staffId: staff.id,
              niy: staff.niy,
              descriptor: rec.descriptor,
            },
          })
          setFaceStatus('idle')
          setStatusPenutup('siaga')
          setPesanPenutup('')
        }}
      />
    </div>
  )
}

export default MobilePresensiPage
