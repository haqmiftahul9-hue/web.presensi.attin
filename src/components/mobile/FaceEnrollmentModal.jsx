import { useEffect, useRef, useState, useCallback } from 'react'
import Icon from '../Icon.jsx'
import {
  loadFaceApiModels,
  isFaceApiLoaded,
  detectSingleFaceAndDescriptor,
  captureVideoFrame,
  saveRegisteredFaceData,
} from '../../services/faceRecognitionService.js'

/**
 * Modal Pendaftaran Wajah (Face Enrollment).
 * Menggunakan Face-api.js untuk mendeteksi wajah pengguna dan mengekstrak
 * vektor embedding 128 dimensi, lalu menyimpannya ke profil pegawai.
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
  const [modelLoading, setModelLoading] = useState(() => !isFaceApiLoaded() && !isModelLoaded)
  const [modelError, setModelError] = useState(null)
  const [loadingText, setLoadingText] = useState('')
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceScore, setFaceScore] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [successData, setSuccessData] = useState(null)
  const loopRef = useRef(null)
  const processingTimeoutRef = useRef(null)

  // =================== Liveness Detection (Bank-Style) ===================
  const EAR_OPEN_THRESHOLD = 0.27
  const EAR_CLOSED_THRESHOLD = 0.22
  const EAR_HISTORY_SIZE = 10
  const FRONTAL_SYMMETRY_THRESHOLD = 0.18

  function dist(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
  }

  function avg(nums) {
    return nums.reduce((a, b) => a + b, 0) / nums.length
  }

  function computeEyeEAR(eye) {
    const A = dist(eye[1], eye[5])
    const B = dist(eye[2], eye[4])
    const C = dist(eye[0], eye[3])
    return C > 0 ? (A + B) / (2.0 * C) : 1.0
  }

  function calculateEAR(landmarks) {
    const leftEye = [36, 37, 38, 39, 40, 41].map((i) => landmarks[i])
    const rightEye = [42, 43, 44, 45, 46, 47].map((i) => landmarks[i])
    return (computeEyeEAR(leftEye) + computeEyeEAR(rightEye)) / 2
  }

  function checkFrontal(landmarks) {
    const leftEyePts = [36, 37, 38, 39, 40, 41].map((i) => landmarks[i])
    const rightEyePts = [42, 43, 44, 45, 46, 47].map((i) => landmarks[i])
    const noseTip = landmarks[30]

    const leftCenter = {
      x: avg(leftEyePts.map((p) => p.x)),
      y: avg(leftEyePts.map((p) => p.y)),
    }
    const rightCenter = {
      x: avg(rightEyePts.map((p) => p.x)),
      y: avg(rightEyePts.map((p) => p.y)),
    }
    const eyeMidX = (leftCenter.x + rightCenter.x) / 2
    const eyeDist = dist(leftCenter, rightCenter)
    const noseOffset = Math.abs(noseTip.x - eyeMidX)

    return eyeDist > 0 && noseOffset / eyeDist < FRONTAL_SYMMETRY_THRESHOLD
  }

  const [livenessStep, setLivenessStep] = useState(1)
  const [livenessPassed, setLivenessPassed] = useState(false)
  const [livenessInstruction, setLivenessInstruction] = useState(
    'Silakan hadap wajah ke depan.'
  )
  const [earHistory, setEarHistory] = useState([])
  const [blinkState, setBlinkState] = useState('open')
  const [frontalVerified, setFrontalVerified] = useState(false)

  // Inisialisasi dan pemuatan model face-api
  useEffect(() => {
    if (!terbuka) return undefined

    let isMounted = true
    setSuccessData(null)
    setStatusMessage('')
    setFaceDetected(false)
    setLivenessStep(1)
    setLivenessPassed(false)
    setLivenessInstruction('Silakan hadap wajah ke depan.')
    setEarHistory([])
    setBlinkState('open')
    setFrontalVerified(false)

    if (isFaceApiLoaded() || isModelLoaded) {
      setModelLoading(false)
      setModelError(null)
      setLoadingText('')
    } else {
      setModelLoading(true)
      setModelError(null)
      loadFaceApiModels((msg) => {
        if (isMounted) setLoadingText(msg)
      })
        .then(() => {
          if (isMounted) {
            setModelLoading(false)
            setLoadingText('')
          }
        })
        .catch((err) => {
          if (isMounted) {
            setModelLoading(false)
            setModelError(err?.message || 'Gagal memuat model deteksi wajah')
          }
        })
    }

    return () => {
      isMounted = false
      if (loopRef.current) {
        clearInterval(loopRef.current)
        loopRef.current = null
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
        processingTimeoutRef.current = null
      }
    }
  }, [terbuka])

  // Hubungkan stream kamera
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

  // Callback ref untuk memastikan begitu elemen video ada di DOM, stream langsung dipasang
  const setVideoNode = useCallback(
    (node) => {
      modalVideoRef.current = node
      if (node) {
        const activeStream = stream || localStream
        if (activeStream) {
          attachStreamToVideo(node, activeStream)
          setCameraStarting(false)
        }
      }
    },
    [stream, localStream, attachStreamToVideo],
  )

  // Hubungkan stream kamera dari prop parent ke elemen video modal.
  // Jika belum ada stream (kamera masih meminta izin), panggil onRestartCamera
  // dari parent dan siapkan fallback mandiri jika stream parent belum siap.
  useEffect(() => {
    if (!terbuka) {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
        setLocalStream(null)
      }
      setCameraStarting(false)
      return undefined
    }

    const activeStream = stream || localStream

    if (activeStream && modalVideoRef.current) {
      attachStreamToVideo(modalVideoRef.current, activeStream)
      setCameraStarting(false)
      return undefined
    }

    if (!activeStream) {
      setCameraStarting(true)
      if (onRestartCamera) {
        onRestartCamera()
      }

      // Fallback mandiri jika parent belum menyediakan stream dalam 350ms
      let timer = null
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        timer = setTimeout(async () => {
          if (!stream && !localStream && terbuka) {
            try {
              const ls = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
                audio: false,
              })
              setLocalStream(ls)
              setCameraStarting(false)
              if (modalVideoRef.current) {
                attachStreamToVideo(modalVideoRef.current, ls)
              }
            } catch {
              setCameraStarting(false)
            }
          }
        }, 350)
      }
      return () => {
        if (timer) clearTimeout(timer)
      }
    }

    return undefined
  }, [terbuka, stream, localStream, onRestartCamera, attachStreamToVideo])

  // Pasang ulang stream ke video saat stream atau modelLoading diperbarui (reactive)
  useEffect(() => {
    if (!terbuka) return
    const activeStream = stream || localStream
    if (activeStream && modalVideoRef.current) {
      attachStreamToVideo(modalVideoRef.current, activeStream)
      setCameraStarting(false)
    }
  }, [terbuka, stream, localStream, modelLoading, attachStreamToVideo])

  // Loop deteksi wajah real-time saat kamera aktif dan model siap
  useEffect(() => {
    const activeStream = stream || localStream
    if (!terbuka || modelLoading || (!cameraAktif && !activeStream) || successData) {
      if (loopRef.current) clearInterval(loopRef.current)
      return undefined
    }

    const interval = setInterval(async () => {
      const video = modalVideoRef.current
      if (!video || video.readyState < 2 || processing) return

      try {
        const result = await detectSingleFaceAndDescriptor(video, { inputSize: 224, scoreThreshold: 0.45 })
        if (result.detected) {
          setFaceDetected(true)
          setFaceScore(Math.round(result.score * 100))

          // ===== Liveness Detection: sequential frontal -> blink =====
          const landmarks = result.landmarks
          if (landmarks && landmarks.length >= 68) {
            if (livenessStep === 1 && !frontalVerified) {
              const isFrontal = checkFrontal(landmarks)
              if (isFrontal) {
                setFrontalVerified(true)
                setLivenessStep(2)
                setLivenessInstruction('Silakan berkedip sekali.')
                setEarHistory([])
                setBlinkState('open')
              } else {
                setLivenessInstruction('Silakan hadap wajah ke depan, tegak lurus ke kamera.')
              }
            } else if (livenessStep === 2 && frontalVerified && !livenessPassed) {
              const ear = calculateEAR(landmarks)
              const updated = [...earHistory, ear].slice(-EAR_HISTORY_SIZE)
              setEarHistory(updated)

              if (blinkState === 'open' && ear < EAR_CLOSED_THRESHOLD) {
                setBlinkState('closed')
              } else if (blinkState === 'closed' && ear > EAR_OPEN_THRESHOLD) {
                setBlinkState('open')
                setLivenessPassed(true)
                setLivenessStep(3)
                setLivenessInstruction('Verifikasi liveness selesai. Siap daftarkan wajah.')
              }
            }
          }
          // ===== end liveness =====

        } else {
          setFaceDetected(false)
          setFaceScore(0)
        }
      } catch {
        // Lewati frame jika gagal
      }
    }, 350)

    loopRef.current = interval
    return () => clearInterval(interval)
  }, [terbuka, modelLoading, cameraAktif, stream, localStream, processing, successData, livenessStep, frontalVerified, blinkState, earHistory, livenessPassed])

  // Proses pendaftaran dari video kamera
  const ambilDanDaftarkan = useCallback(async () => {
    const video = modalVideoRef.current
    if (!video || processing || !staff) return

    // Pastikan video sedang memutar
    if (video.readyState < 2) {
      setStatusMessage('Kamera sedang menginisialisasi. Mohon tunggu hingga pratinjau muncul.')
      return
    }

    // Wajib lulus verifikasi liveness (hadap depan + berkedip) sebelum mendaftar
    if (!livenessPassed) {
      setStatusMessage('Selesaikan verifikasi liveness terlebih dahulu (hadap depan dan berkedip).')
      return
    }

    setProcessing(true)
    setStatusMessage('Mendeteksi dan mengekstrak biometrik wajah...')

    // Jaring pengaman: paksa reset processing setelah 15 detik jika terjebak
    processingTimeoutRef.current = setTimeout(() => {
      setProcessing(false)
      setStatusMessage('Proses terlalu lama. Coba lagi atau periksa kamera.')
    }, 15000)

    try {
      // Ambil snapshot foto
      const photo = captureVideoFrame(video)

      // Deteksi wajah dengan TinyFaceDetector (inputSize 224 ringan & cepat)
      const detection = await detectSingleFaceAndDescriptor(video, { inputSize: 224, scoreThreshold: 0.5 })

      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
        processingTimeoutRef.current = null
      }

      if (!detection.detected || !detection.descriptor) {
        setStatusMessage('Wajah tidak terdeteksi jelas. Posisikan wajah Anda tepat di dalam bingkai oval.')
        setProcessing(false)
        return
      }

      // Simpan data pendaftaran ke LocalStorage & return ke caller
      const record = saveRegisteredFaceData({
        staff,
        descriptor: detection.descriptor,
        photo,
      })

      setSuccessData(record)
      setStatusMessage('Wajah berhasil didaftarkan!')
      onSukses?.(record)
    } catch (err) {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
        processingTimeoutRef.current = null
      }
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
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 transition-colors"
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
                className="sp-btn px-4 py-2 bg-[#323d8f] text-white font-label-md text-sm rounded-xl mt-2"
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
                className="sp-btn w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-headline-sm text-sm rounded-xl mt-3 shadow-md"
              >
                Selesai & Siap Presensi
              </button>
            </div>
          ) : (
            <>
              {/* Bingkai Kamera Wajah: Selalu ter-render langsung saat modal dibuka */}
              <div className="relative w-52 h-52 rounded-full p-2 bg-gradient-to-b from-[#181d48] to-[#323d8f] shadow-inner flex items-center justify-center">
                <div className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-900 ring-2 transition-all duration-300 ${
                  faceDetected ? 'ring-emerald-400' : 'ring-amber-400/80'
                }`}>
                  <video
                    ref={setVideoNode}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  {(!stream && !localStream) && (
                    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white/70 gap-1.5 p-4 text-center z-10">
                      <Icon name={cameraStarting ? 'progress_activity' : 'videocam'} className={`text-[28px] ${cameraStarting ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-medium">{cameraStarting ? 'Menunggu kamera siap…' : 'Menghubungkan kamera…'}</span>
                      <span className="text-[10px] text-white/50 mt-1">Izinkan akses kamera jika muncul perizinan.</span>
                    </div>
                  )}

                  {/* Overlay Pemuatan Model AI — kamera tetap menyala di latar belakang */}
                  {modelLoading && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-2 p-4 text-center z-15 animate-sp-fade">
                      <Icon name="progress_activity" className="text-[26px] text-white animate-spin" />
                      <span className="text-xs font-semibold">{loadingText || 'Menyiapkan AI Wajah...'}</span>
                      <span className="text-[10px] text-white/70">Memuat modul deteksi biometrik</span>
                    </div>
                  )}

                  {/* Panduan Oval Wajah */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <svg
                      className={`w-28 h-36 drop-shadow-md transition-colors duration-300 ${
                        faceDetected ? 'text-emerald-400' : 'text-white/60'
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
                </div>

                {/* Status Pill Live */}
                <span className={`absolute -bottom-2.5 inset-x-0 mx-auto w-fit px-3 py-1 rounded-full text-white font-label-sm text-[11px] font-bold shadow-md flex items-center gap-1 z-20 transition-colors ${
                  modelLoading ? 'bg-slate-700/90' : livenessPassed ? 'bg-emerald-600' : faceDetected ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  <Icon name={modelLoading ? 'sync' : livenessPassed ? 'check_circle' : faceDetected ? livenessStep === 2 ? 'remove_red_eye' : 'face' : 'search'} className={`text-[13px] ${modelLoading ? 'animate-spin' : ''}`} />
                  {modelLoading ? 'Memuat Model AI...' : livenessPassed ? 'Liveness Terverifikasi' : faceDetected ? `Langkah ${livenessStep} — ${livenessInstruction}` : 'Posisikan Wajah di Oval'}
                </span>
              </div>

              {/* Status & Petunjuk */}
              <div className="mt-2 text-center flex flex-col gap-1 w-full">
                <span className={`font-body-sm-medium text-xs font-semibold leading-snug ${
                  livenessPassed ? 'text-emerald-700' : 'text-slate-800'
                }`}>
                  {modelLoading ? 'Menyiapkan modul AI pengenalan wajah...' : livenessInstruction}
                </span>
                {!livenessPassed && (
                  <span className="font-label-sm text-[11px] text-slate-500 leading-snug">
                    Ikuti instruksi langkah demi langkah untuk verifikasi keaslian wajah.
                  </span>
                )}
                {livenessPassed && (
                  <span className="font-label-sm text-[11px] text-emerald-600 leading-snug">
                    Wajah terverifikasi asli. Silakan tekan tombol daftar di bawah.
                  </span>
                )}
              </div>
              {/* Tombol Aksi */}
              <div className="w-full flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={ambilDanDaftarkan}
                  disabled={
                    processing ||
                    modelLoading ||
                    (!stream && !localStream && !cameraAktif) ||
                    !livenessPassed
                  }
                  className={`sp-btn w-full py-3 bg-gradient-to-r from-[#252e6d] to-[#323d8f] hover:from-[#181d48] hover:to-[#252e6d] text-white font-headline-sm text-sm rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 active:scale-[0.99] transition-all cursor-pointer ${
                    !livenessPassed ? 'bg-slate-300 text-slate-500 cursor-not-allowed hover:from-[#252e6d] hover:to-[#323d8f]' : ''
                  }`}
                >
                  <Icon name={processing ? 'progress_activity' : 'camera_alt'} className={`text-[18px] ${processing ? 'animate-spin' : ''}`} />
                  <span>
                    {!livenessPassed
                      ? `Selesaikan Langkah ${livenessStep} Terlebih Dahulu`
                      : processing
                        ? 'Memproses Biometrik...'
                        : modelLoading
                          ? 'Menyiapkan AI...'
                          : 'Ambil & Daftarkan Wajah'}
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
