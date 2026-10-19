import { useEffect, useRef, useState, useCallback } from 'react'
import Icon from '../Icon.jsx'
import {
  loadFaceApiModels,
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
  const [modelLoading, setModelLoading] = useState(true)
  const [modelError, setModelError] = useState(null)
  const [loadingText, setLoadingText] = useState('Memuat model AI Face Recognition...')
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceScore, setFaceScore] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [successData, setSuccessData] = useState(null)
  const loopRef = useRef(null)
  const processingTimeoutRef = useRef(null)

  // Inisialisasi dan pemuatan model face-api
  useEffect(() => {
    if (!terbuka) return undefined

    let isMounted = true
    setModelLoading(true)
    setModelError(null)
    setSuccessData(null)
    setStatusMessage('')
    setFaceDetected(false)

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

  // Hubungkan stream kamera dari prop parent ke elemen video modal.
  // Jika belum ada stream (kamera masih meminta izin), panggil onRestartCamera
  // dari parent untuk memulai/mulai ulang kamera, lalu tunggu stream tersedia.
  // Tidak memanggil getUserMedia sendiri di sini untuk menghindari dialog
  // izin kamera muncul dua kali (sekaligus parent dan modal).
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
    const video = modalVideoRef.current

    if (!activeStream) {
      setCameraStarting(true)
      if (onRestartCamera) {
        onRestartCamera()
      }
      return undefined
    }

    setCameraStarting(false)
    if (video) {
      if (video.srcObject !== activeStream) {
        video.srcObject = activeStream
      }
      video.play().catch(() => {})
    }
    return undefined
  }, [terbuka, stream, localStream, onRestartCamera])

  // Pasang ulang stream ke video saat stream diperbarui (reactive)
  useEffect(() => {
    if (!terbuka) return
    const activeStream = stream || localStream
    const video = modalVideoRef.current
    if (activeStream && video) {
      if (video.srcObject !== activeStream) {
        video.srcObject = activeStream
      }
      video.play().catch(() => {})
      setCameraStarting(false)
    }
  }, [terbuka, stream, localStream])

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
  }, [terbuka, modelLoading, cameraAktif, stream, localStream, processing, successData])

  // Proses pendaftaran dari video kamera
  const ambilDanDaftarkan = useCallback(async () => {
    const video = modalVideoRef.current
    if (!video || processing || !staff) return

    // Pastikan video sedang memutar
    if (video.readyState < 2) {
      setStatusMessage('Kamera sedang menginisialisasi. Mohon tunggu hingga pratinjau muncul.')
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

      // Deteksi wajah dengan resolusi penuh untuk descriptor yang akurat
      const detection = await detectSingleFaceAndDescriptor(video, { inputSize: 320, scoreThreshold: 0.5 })

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
  }, [processing, staff, onSukses])

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
          {modelLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <Icon name="progress_activity" className="text-[32px] text-[#323d8f] animate-spin" />
              <span className="font-body-md text-slate-700 font-medium">{loadingText}</span>
              <span className="font-label-sm text-slate-500 text-xs">Menyiapkan neural network TensorFlow & Face-api...</span>
            </div>
          ) : modelError ? (
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
              {/* Bingkai Kamera Wajah */}
              <div className="relative w-52 h-52 rounded-full p-2 bg-gradient-to-b from-[#181d48] to-[#323d8f] shadow-inner flex items-center justify-center">
                <div className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-900 ring-2 transition-all duration-300 ${
                  faceDetected ? 'ring-emerald-400' : 'ring-amber-400/80'
                }`}>
                  <video
                    ref={modalVideoRef}
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
                  faceDetected ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  <Icon name={faceDetected ? 'check_circle' : 'search'} className="text-[13px]" />
                  {faceDetected ? `Wajah Terdeteksi (${faceScore}%)` : 'Posisikan Wajah di Oval'}
                </span>
              </div>

              {/* Status & Petunjuk */}
              <div className="mt-2 text-center flex flex-col gap-1 w-full">
                <span className="font-body-sm-medium text-xs font-semibold text-slate-800">
                  {statusMessage || (faceDetected ? 'Posisi wajah siap. Tekan tombol daftarkan.' : 'Arahkan wajah tegak lurus ke kamera.')}
                </span>
                <span className="font-label-sm text-[11px] text-slate-500 leading-snug">
                  Pastikan pencahayaan cukup dan wajah tidak tertutup masker.
                </span>
              </div>

              {/* Tombol Aksi */}
              <div className="w-full flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={ambilDanDaftarkan}
                  disabled={processing || (!stream && !localStream && !cameraAktif)}
                  className="sp-btn w-full py-3 bg-gradient-to-r from-[#252e6d] to-[#323d8f] hover:from-[#181d48] hover:to-[#252e6d] text-white font-headline-sm text-sm rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Icon name={processing ? 'progress_activity' : 'camera_alt'} className={`text-[18px] ${processing ? 'animate-spin' : ''}`} />
                  <span>{processing ? 'Memproses Biometrik...' : 'Ambil & Daftarkan Wajah'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
