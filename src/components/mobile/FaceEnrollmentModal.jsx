import { useEffect, useRef, useState, useCallback } from 'react'
import Icon from '../Icon.jsx'
import {
  loadFaceApiModels,
  isFaceApiLoaded,
  detectSingleFaceAndDescriptor,
  captureVideoFrame,
  saveRegisteredFaceDataToSupabase,
  saveRegisteredFaceData,
} from '../../services/faceRecognitionService.js'

// --- Helper Geometri Biometrik Wajah 68 Landmark ---
function dist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y)
}

function avg(nums) {
  return nums.reduce((a, b) => a + b, 0) / Math.max(1, nums.length)
}

function computeEyeEAR(eye) {
  const A = dist(eye[1], eye[5])
  const B = dist(eye[2], eye[4])
  const C = dist(eye[0], eye[3])
  return C > 0 ? (A + B) / (2.0 * C) : 0.3
}

function calculateEAR(landmarks) {
  const leftEye = [36, 37, 38, 39, 40, 41].map((i) => landmarks[i])
  const rightEye = [42, 43, 44, 45, 46, 47].map((i) => landmarks[i])
  return (computeEyeEAR(leftEye) + computeEyeEAR(rightEye)) / 2
}

/**
 * Langkah 1/3: Deteksi Wajah Menghadap Depan (Frontal).
 * Hidung berada tepat di tengah-tengah kedua mata dan simetris terhadap pipi kiri & kanan.
 */
function checkFrontal(landmarks) {
  if (!landmarks || landmarks.length < 68) return false
  const leftEyePts = [36, 37, 38, 39, 40, 41].map((i) => landmarks[i])
  const rightEyePts = [42, 43, 44, 45, 46, 47].map((i) => landmarks[i])
  const noseTip = landmarks[30]
  const jawLeft = landmarks[0]
  const jawRight = landmarks[16]

  const leftCenterX = avg(leftEyePts.map((p) => p.x))
  const rightCenterX = avg(rightEyePts.map((p) => p.x))
  const eyeDist = Math.abs(rightCenterX - leftCenterX)
  if (eyeDist <= 10) return false

  const eyeMidX = (leftCenterX + rightCenterX) / 2
  const noseOffset = Math.abs(noseTip.x - eyeMidX) / eyeDist

  const distLeftJaw = Math.abs(noseTip.x - jawLeft.x)
  const distRightJaw = Math.abs(jawRight.x - noseTip.x)
  const jawRatio = distLeftJaw / Math.max(1, distRightJaw)

  // Wajah tegak menghadap ke depan: deviasi hidung < 0.16 dan jaw seimbang
  return noseOffset < 0.16 && jawRatio >= 0.65 && jawRatio <= 1.55
}

/**
 * Langkah 2/3: Deteksi Wajah Menghadap Samping (Head Yaw / Turn).
 * Pengguna menolehkan wajah ke samping kiri atau kanan (rasio hidung bergeser signifikan).
 */
function checkSideTurn(landmarks) {
  if (!landmarks || landmarks.length < 68) return false
  const leftEyePts = [36, 37, 38, 39, 40, 41].map((i) => landmarks[i])
  const rightEyePts = [42, 43, 44, 45, 46, 47].map((i) => landmarks[i])
  const noseTip = landmarks[30]
  const jawLeft = landmarks[0]
  const jawRight = landmarks[16]

  const leftCenterX = avg(leftEyePts.map((p) => p.x))
  const rightCenterX = avg(rightEyePts.map((p) => p.x))
  const eyeDist = Math.abs(rightCenterX - leftCenterX)
  if (eyeDist <= 10) return false

  const eyeMidX = (leftCenterX + rightCenterX) / 2
  const noseOffset = (noseTip.x - eyeMidX) / eyeDist

  const distLeftJaw = Math.abs(noseTip.x - jawLeft.x)
  const distRightJaw = Math.abs(jawRight.x - noseTip.x)
  const jawRatio = distLeftJaw / Math.max(1, distRightJaw)

  // Menoleh samping kiri atau samping kanan
  const turnedLeft = noseOffset < -0.15 || jawRatio < 0.55
  const turnedRight = noseOffset > 0.15 || jawRatio > 1.80

  return turnedLeft || turnedRight
}

/**
 * Modal Pendaftaran Wajah (Face Enrollment).
 * Menggunakan alur kamera instan, jeda fokus 1-2 detik, loop requestAnimationFrame,
 * dan verifikasi liveness 3 tahap: Hadap Depan (1/3) -> Hadap Samping (2/3) -> Berkedip (3/3).
 */
export function FaceEnrollmentModal({
  terbuka,
  isModelLoaded = false,
  onTutup,
  staff,
  videoRef,
  cameraAktif,
  stream,
  onRestartCamera,
  onSukses,
}) {
  const modalVideoRef = useRef(null)
  const [localStream, setLocalStream] = useState(null)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraStage, setCameraStage] = useState('starting') // 'starting' | 'focusing' | 'ready'
  const [modelLoading, setModelLoading] = useState(() => !isFaceApiLoaded() && !isModelLoaded)
  const [modelError, setModelError] = useState(null)
  const [loadingText, setLoadingText] = useState('')
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceScore, setFaceScore] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [successData, setSuccessData] = useState(null)

  // Tahap Verifikasi 3 Langkah
  const [livenessStep, setLivenessStep] = useState(1) // 1: Depan, 2: Samping, 3: Berkedip, 4: Selesai
  const [livenessPassed, setLivenessPassed] = useState(false)
  const [livenessInstruction, setLivenessInstruction] = useState('Langkah 1/3: Silakan hadap wajah tegak ke depan.')

  // Refs untuk loop dan timeout
  const rafRef = useRef(null)
  const focusTimeoutRef = useRef(null)
  const frontalCountRef = useRef(0)
  const sideCountRef = useRef(0)
  const blinkPhaseRef = useRef('open') // 'open' -> 'closed' -> 'opened'
  const lastFrontalSnapshotRef = useRef(null)

  // Ambang batas EAR kedipan mata
  const EAR_OPEN_THRESHOLD = 0.26
  const EAR_CLOSED_THRESHOLD = 0.21

  // Hubungkan stream kamera ke elemen video
  const attachStreamToVideo = useCallback((videoEl, streamToAttach) => {
    if (!videoEl || !streamToAttach) return
    try {
      if (videoEl.srcObject !== streamToAttach) {
        videoEl.srcObject = streamToAttach
      }
      const playPromise = videoEl.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {})
      }
    } catch {
      // Abaikan error assignment
    }
  }, [])

  // Callback ref elemen video di DOM
  const setVideoNode = useCallback(
    (node) => {
      modalVideoRef.current = node
      if (node) {
        const activeStream = stream || localStream
        if (activeStream) {
          attachStreamToVideo(node, activeStream)
        }
      }
    },
    [stream, localStream, attachStreamToVideo],
  )

  // 1. Panggil getUserMedia LANGSUNG saat modal dibuka agar kamera terbuka instan
  useEffect(() => {
    if (!terbuka) {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
        setLocalStream(null)
      }
      setCameraStarting(false)
      setCameraStage('starting')
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return undefined
    }

    let isCancelled = false
    setCameraStarting(true)
    setCameraStage('starting')
    setSuccessData(null)
    setStatusMessage('')
    setFaceDetected(false)
    setLivenessStep(1)
    setLivenessPassed(false)
    setLivenessInstruction('Langkah 1/3: Silakan hadap wajah tegak ke depan.')
    frontalCountRef.current = 0
    sideCountRef.current = 0
    blinkPhaseRef.current = 'open'
    lastFrontalSnapshotRef.current = null

    // Panggil getUserMedia langsung seketika
    const startCameraImmediately = async () => {
      let activeStream = stream
      if (!activeStream) {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          try {
            activeStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
              audio: false,
            })
            if (isCancelled) {
              activeStream.getTracks().forEach((t) => t.stop())
              return
            }
            setLocalStream(activeStream)
          } catch (err) {
            if (!isCancelled) {
              setCameraStarting(false)
              setModelError(err?.message || 'Kamera tidak dapat diakses. Mohon berikan izin kamera.')
            }
            return
          }
        }
      }

      if (isCancelled) return
      setCameraStarting(false)

      const video = modalVideoRef.current
      if (video && activeStream) {
        attachStreamToVideo(video, activeStream)
      }
    }

    startCameraImmediately()

    // Siapkan model jika belum dimuat
    if (isFaceApiLoaded() || isModelLoaded) {
      setModelLoading(false)
      setModelError(null)
    } else {
      setModelLoading(true)
      loadFaceApiModels((msg) => {
        if (!isCancelled) setLoadingText(msg)
      })
        .then(() => {
          if (!isCancelled) setModelLoading(false)
        })
        .catch((err) => {
          if (!isCancelled) {
            setModelLoading(false)
            setModelError(err?.message || 'Gagal memuat model deteksi wajah')
          }
        })
    }

    return () => {
      isCancelled = true
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [terbuka, stream, isModelLoaded, attachStreamToVideo])

  // 2. Saat video mulai bermain: beri jeda 1.5 detik (efek UI 'Sedang memfokuskan...') sebelum menjalankan face-api
  const handleVideoPlaying = useCallback(() => {
    setCameraStarting(false)
    setCameraStage('focusing')

    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)

    // Jeda 1.5 detik (rentang 1-2 detik) setelah video bermain
    focusTimeoutRef.current = setTimeout(() => {
      setCameraStage('ready')
    }, 1500)
  }, [])

  // Cadangan: jika video sudah readyState >= 2 tetapi event onPlaying terlewat
  useEffect(() => {
    if (!terbuka || cameraStage !== 'starting') return
    const video = modalVideoRef.current
    if (video && video.readyState >= 2 && !video.paused) {
      handleVideoPlaying()
    }
  }, [terbuka, cameraStage, localStream, stream, handleVideoPlaying])

  // 3. Loop deteksi face-api.js di dalam loop requestAnimationFrame (hanya setelah fase fokus 'ready')
  useEffect(() => {
    const activeStream = stream || localStream
    if (!terbuka || cameraStage !== 'ready' || modelLoading || (!cameraAktif && !activeStream) || successData || livenessPassed) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return undefined
    }

    let isCancelled = false
    let isDetecting = false

    const detectTick = async () => {
      if (isCancelled) return

      const video = modalVideoRef.current
      if (video && video.readyState >= 2 && !processing && !isDetecting && cameraStage === 'ready') {
        isDetecting = true
        try {
          const result = await detectSingleFaceAndDescriptor(video, { inputSize: 224, scoreThreshold: 0.45 })
          if (!isCancelled) {
            if (result.detected) {
              setFaceDetected(true)
              setFaceScore(Math.round(result.score * 100))

              const landmarks = result.landmarks
              if (landmarks && landmarks.length >= 68) {
                // ---- TAHAP 1: Wajah Menghadap Depan ----
                if (livenessStep === 1) {
                  const isFrontal = checkFrontal(landmarks)
                  if (isFrontal) {
                    frontalCountRef.current += 1
                    // Simpan descriptor dan snapshot terbaik saat posisi depan
                    if (result.descriptor) {
                      lastFrontalSnapshotRef.current = {
                        descriptor: result.descriptor,
                        photo: captureVideoFrame(video),
                      }
                    }
                    if (frontalCountRef.current >= 3) {
                      setLivenessStep(2)
                      frontalCountRef.current = 0
                      setLivenessInstruction('Langkah 2/3: Silakan tolehkan wajah ke samping (kiri/kanan).')
                    }
                  } else {
                    frontalCountRef.current = 0
                    setLivenessInstruction('Langkah 1/3: Silakan hadap wajah tegak ke depan.')
                  }
                }

                // ---- TAHAP 2: Wajah Menghadap Samping ----
                else if (livenessStep === 2) {
                  const isSide = checkSideTurn(landmarks)
                  if (isSide) {
                    sideCountRef.current += 1
                    if (sideCountRef.current >= 2) {
                      setLivenessStep(3)
                      sideCountRef.current = 0
                      blinkPhaseRef.current = 'open'
                      setLivenessInstruction('Langkah 3/3: Hadap depan kembali dan silakan berkedip sekali.')
                    }
                  } else {
                    setLivenessInstruction('Langkah 2/3: Silakan tolehkan wajah ke samping (kiri atau kanan).')
                  }
                }

                // ---- TAHAP 3: Berkedip ----
                else if (livenessStep === 3) {
                  const ear = calculateEAR(landmarks)
                  if (blinkPhaseRef.current === 'open') {
                    if (ear < EAR_CLOSED_THRESHOLD) {
                      blinkPhaseRef.current = 'closed'
                    }
                  } else if (blinkPhaseRef.current === 'closed') {
                    if (ear > EAR_OPEN_THRESHOLD) {
                      blinkPhaseRef.current = 'opened'
                      setLivenessPassed(true)
                      setLivenessStep(4)
                      setLivenessInstruction('Verifikasi 3/3 selesai! Wajah terverifikasi asli.')
                    }
                  }
                }
              }
            } else {
              setFaceDetected(false)
              setFaceScore(0)
            }
          }
        } catch {
          // Frame skip jika terjadi beban inferensi sementara
        } finally {
          isDetecting = false
        }
      }

      if (!isCancelled) {
        rafRef.current = requestAnimationFrame(detectTick)
      }
    }

    rafRef.current = requestAnimationFrame(detectTick)

    return () => {
      isCancelled = true
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [terbuka, cameraStage, modelLoading, cameraAktif, stream, localStream, processing, successData, livenessStep, livenessPassed])

  // Proses pendaftaran dari video kamera setelah verifikasi 3 tahap lulus
  const ambilDanDaftarkan = useCallback(async () => {
    const video = modalVideoRef.current
    if (!video || processing || !staff) return

    if (video.readyState < 2) {
      setStatusMessage('Kamera sedang memuat. Mohon tunggu pratinjau video.')
      return
    }

    if (!livenessPassed) {
      setStatusMessage('Selesaikan seluruh 3 tahapan verifikasi terlebih dahulu.')
      return
    }

    setProcessing(true)
    setStatusMessage('Mengekstrak vektor biometrik wajah...')

    try {
      // Ambil snapshot foto saat ini atau gunakan snapshot frontal yang optimal
      const photo = captureVideoFrame(video) || lastFrontalSnapshotRef.current?.photo
      let descriptor = lastFrontalSnapshotRef.current?.descriptor

      // Jika belum ada descriptor tersimpan dari tahap 1, ekstrak dari video saat ini
      if (!descriptor) {
        const detection = await detectSingleFaceAndDescriptor(video, { inputSize: 224, scoreThreshold: 0.45 })
        if (detection?.detected && detection?.descriptor) {
          descriptor = detection.descriptor
        }
      }

      if (!descriptor) {
        setStatusMessage('Gagal mengekstrak fitur wajah. Posisikan wajah di dalam bingkai dan ulangi.')
        setProcessing(false)
        return
      }

      // Simpan data pendaftaran ke Supabase DB (utama) dan localStorage (cache)
      let record
      try {
        record = await saveRegisteredFaceDataToSupabase({ staff, descriptor, photo })
      } catch (supabaseErr) {
        console.warn('[FaceEnrollment] Supabase save gagal, fallback ke localStorage:', supabaseErr)
        // Fallback ke localStorage jika Supabase gagal atau tidak dikonfigurasi
        record = saveRegisteredFaceData({ staff, descriptor, photo })
      }

      setSuccessData(record)
      setStatusMessage('Wajah berhasil didaftarkan!')
      onSukses?.(record)
    } catch (err) {
      setStatusMessage(`Gagal mendaftarkan wajah: ${err.message || 'Terjadi kesalahan sistem'}`)
    } finally {
      setProcessing(false)
    }
  }, [processing, staff, onSukses, livenessPassed])

  if (!terbuka) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-sp-fade">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-100">
        {/* Header Modal */}
        <div className="p-4 bg-gradient-to-r from-[#181d48] to-[#323d8f] text-white flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Icon name="face_retouching_natural" className="text-white text-[18px]" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-sm font-bold truncate">Pendaftaran Scan Wajah</span>
              <span className="font-label-sm text-xs text-white/70 truncate">{staff?.name} ({staff?.niy})</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onTutup}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {/* Konten Modal */}
        <div className="p-4 flex flex-col items-center gap-3 overflow-y-auto">
          {modelError ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
              <Icon name="error" className="text-[36px] text-rose-500" />
              <span className="font-body-md text-rose-700 font-semibold">{modelError}</span>
              <button
                type="button"
                onClick={() => setModelLoading(true)}
                className="sp-btn px-4 py-2 bg-[#323d8f] text-white font-label-md text-sm rounded-xl mt-2 cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : successData ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3 text-center animate-sp-rise">
              <div className="relative">
                {successData.photo ? (
                  <img
                    src={successData.photo}
                    alt="Wajah Terdaftar"
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center ring-4 ring-emerald-500">
                    <Icon name="check" className="text-[40px]" />
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white shadow">
                  <Icon name="task_alt" className="text-[16px]" />
                </span>
              </div>
              <span className="font-headline-sm text-lg font-bold text-slate-900 mt-2">Pendaftaran Berhasil!</span>
              <p className="font-body-sm text-slate-600 text-xs max-w-xs leading-relaxed">
                Descriptor biometrik wajah 128-dimensi milik <strong>{staff?.name}</strong> telah tersimpan aman. Kamera presensi akan mencocokkan wajah Anda saat absensi.
              </p>
              <button
                type="button"
                onClick={onTutup}
                className="sp-btn w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-headline-sm text-sm rounded-xl mt-3 shadow-md cursor-pointer"
              >
                Selesai & Siap Presensi
              </button>
            </div>
          ) : (
            <>
              {/* Indikator Langkah 1/3, 2/3, 3/3 */}
              <div className="grid grid-cols-3 gap-1.5 w-full max-w-[280px]">
                <div className={`py-1.5 px-2 rounded-xl text-center text-[10px] font-bold border transition-all ${
                  livenessStep > 1
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : livenessStep === 1
                      ? 'bg-[#323d8f] text-white border-[#323d8f] shadow-xs'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  1. Hadap Depan {livenessStep > 1 && '✓'}
                </div>
                <div className={`py-1.5 px-2 rounded-xl text-center text-[10px] font-bold border transition-all ${
                  livenessStep > 2
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : livenessStep === 2
                      ? 'bg-[#323d8f] text-white border-[#323d8f] shadow-xs'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  2. Hadap Samping {livenessStep > 2 && '✓'}
                </div>
                <div className={`py-1.5 px-2 rounded-xl text-center text-[10px] font-bold border transition-all ${
                  livenessPassed
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : livenessStep === 3
                      ? 'bg-[#323d8f] text-white border-[#323d8f] shadow-xs'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  3. Berkedip {livenessPassed && '✓'}
                </div>
              </div>

              {/* Bingkai Kamera Wajah Instan */}
              <div className="relative w-52 h-52 rounded-full p-2 bg-gradient-to-b from-[#181d48] to-[#323d8f] shadow-inner flex items-center justify-center">
                <div className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-900 ring-2 transition-all duration-300 ${
                  cameraStage === 'focusing'
                    ? 'ring-amber-400 shadow-amber-400/40'
                    : livenessPassed
                      ? 'ring-emerald-400 shadow-emerald-400/40'
                      : faceDetected
                        ? 'ring-emerald-400'
                        : 'ring-amber-400/80'
                }`}>
                  <video
                    ref={setVideoNode}
                    autoPlay
                    playsInline
                    muted
                    onPlaying={handleVideoPlaying}
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  {(!stream && !localStream) && (
                    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white/70 gap-1.5 p-4 text-center z-10">
                      <Icon name={cameraStarting ? 'progress_activity' : 'videocam'} className={`text-[28px] ${cameraStarting ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-medium">{cameraStarting ? 'Membuka kamera instan…' : 'Menghubungkan kamera…'}</span>
                      <span className="text-[10px] text-white/50 mt-1">Izinkan akses kamera jika muncul permintaan.</span>
                    </div>
                  )}

                  {/* Efek UI Sedang Memfokuskan Kamera (1-2 detik pertama setelah video jalan) */}
                  {cameraStage === 'focusing' && (
                    <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center pointer-events-none z-15 animate-sp-fade">
                      {/* Reticle / Kotak Fokus Kamera */}
                      <div className="relative w-28 h-28 border-2 border-amber-300/80 rounded-2xl flex items-center justify-center animate-pulse">
                        <div className="w-3 h-3 border-t-2 border-l-2 border-amber-300 absolute -top-1 -left-1" />
                        <div className="w-3 h-3 border-t-2 border-r-2 border-amber-300 absolute -top-1 -right-1" />
                        <div className="w-3 h-3 border-b-2 border-l-2 border-amber-300 absolute -bottom-1 -left-1" />
                        <div className="w-3 h-3 border-b-2 border-r-2 border-amber-300 absolute -bottom-1 -right-1" />
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      </div>
                    </div>
                  )}

                  {/* Overlay Pemuatan Model AI jika ada */}
                  {modelLoading && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-2 p-4 text-center z-15 animate-sp-fade">
                      <Icon name="progress_activity" className="text-[26px] text-white animate-spin" />
                      <span className="text-xs font-semibold">{loadingText || 'Menyiapkan AI Wajah...'}</span>
                      <span className="text-[10px] text-white/70">Memuat modul deteksi biometrik</span>
                    </div>
                  )}

                  {/* Panduan Oval Wajah */}
                  {cameraStage === 'ready' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <svg
                        className={`w-28 h-36 drop-shadow-md transition-colors duration-300 ${
                          livenessPassed ? 'text-emerald-400' : faceDetected ? 'text-emerald-400' : 'text-white/60'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 100 130"
                      >
                        <ellipse
                          cx="50"
                          cy="54"
                          opacity="0.85"
                          rx="30"
                          ry="38"
                          strokeDasharray={faceDetected ? 'none' : '3 3'}
                          strokeWidth="1.8"
                        />
                        <path d="M14 125 C14 96 32 88 50 88 C68 88 86 96 86 125" opacity="0.6" strokeWidth="1.8" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Status Pill Live */}
                <span className={`absolute -bottom-2.5 inset-x-0 mx-auto w-fit px-3 py-1 rounded-full text-white font-label-sm text-[11px] font-bold shadow-md flex items-center gap-1.5 z-20 transition-all ${
                  cameraStage === 'focusing'
                    ? 'bg-amber-600 ring-2 ring-amber-300/60 animate-pulse'
                    : modelLoading
                      ? 'bg-slate-700/90'
                      : livenessPassed
                        ? 'bg-emerald-600 ring-2 ring-emerald-300/60'
                        : faceDetected
                          ? 'bg-[#323d8f] ring-2 ring-[#323d8f]/40'
                          : 'bg-amber-600'
                }`}>
                  <Icon
                    name={
                      cameraStage === 'focusing'
                        ? 'center_focus_strong'
                        : modelLoading
                          ? 'sync'
                          : livenessPassed
                            ? 'verified'
                            : livenessStep === 2
                              ? 'swap_horiz'
                              : livenessStep === 3
                                ? 'visibility'
                                : faceDetected
                                  ? 'face'
                                  : 'search'
                    }
                    className={`text-[14px] ${cameraStage === 'focusing' || modelLoading ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {cameraStage === 'focusing'
                      ? 'Sedang memfokuskan...'
                      : modelLoading
                        ? 'Memuat Model AI...'
                        : livenessPassed
                          ? 'Langkah 3/3 Selesai (Terverifikasi)'
                          : livenessStep === 1
                            ? 'Langkah 1/3: Hadap Depan'
                            : livenessStep === 2
                              ? 'Langkah 2/3: Hadap Samping'
                              : 'Langkah 3/3: Silakan Berkedip'}
                  </span>
                </span>
              </div>

              {/* Status & Petunjuk Interaktif */}
              <div className="mt-2 text-center flex flex-col gap-1 w-full">
                <span className={`font-body-sm-medium text-xs font-semibold leading-snug ${
                  cameraStage === 'focusing'
                    ? 'text-amber-700'
                    : livenessPassed
                      ? 'text-emerald-700 font-bold'
                      : 'text-slate-800'
                }`}>
                  {cameraStage === 'focusing'
                    ? 'Menyesuaikan fokus kamera & pencahayaan...'
                    : modelLoading
                      ? 'Menyiapkan modul AI pengenalan wajah...'
                      : livenessInstruction}
                </span>

                <span className="font-label-sm text-[11px] text-slate-500 leading-snug">
                  {cameraStage === 'focusing'
                    ? 'Pertahankan posisi ponsel Anda agar kamera fokus.'
                    : livenessPassed
                      ? 'Wajah terverifikasi asli. Silakan tekan tombol daftar di bawah.'
                      : livenessStep === 1
                        ? 'Posisikan wajah tepat di tengah oval menghadap lurus ke kamera.'
                        : livenessStep === 2
                          ? 'Tolehkan wajah Anda sedikit ke arah samping (kiri atau kanan).'
                          : 'Tatap kamera dan berkedipkan mata Anda sekali.'}
                </span>
              </div>

              {/* Tombol Aksi */}
              <div className="w-full flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={ambilDanDaftarkan}
                  disabled={
                    processing ||
                    cameraStage !== 'ready' ||
                    modelLoading ||
                    (!stream && !localStream && !cameraAktif) ||
                    !livenessPassed
                  }
                  className={`sp-btn w-full py-3 bg-gradient-to-r from-[#252e6d] to-[#323d8f] hover:from-[#181d48] hover:to-[#252e6d] text-white font-headline-sm text-sm rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 active:scale-[0.99] transition-all cursor-pointer ${
                    livenessPassed ? 'from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-emerald-500/30' : ''
                  }`}
                >
                  <Icon name={processing ? 'progress_activity' : livenessPassed ? 'task_alt' : 'camera_alt'} className={`text-[18px] ${processing ? 'animate-spin' : ''}`} />
                  <span>
                    {!livenessPassed
                      ? cameraStage === 'focusing'
                        ? 'Sedang Memfokuskan...'
                        : `Selesaikan Langkah ${livenessStep}/3 Terlebih Dahulu`
                      : processing
                        ? 'Mendaftarkan Wajah...'
                        : 'Ambil & Daftarkan Wajah (3/3 Selesai)'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

