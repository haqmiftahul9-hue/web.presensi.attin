import Icon from '../Icon.jsx'
import QRCodeSvg from '../cards/QRCodeSvg.jsx'

// Bingkai empat sudut + garis sapuan dipakai kedua mode supaya kesan
// "sensor aktif" konsisten di halaman yang sama.
function CornerBrackets({ tone = 'border-emerald-400' }) {
  const corner = `w-4 h-4 ${tone}`
  return (
    <div className="absolute w-36 h-44 pointer-events-none flex flex-col justify-between">
      <div className="flex justify-between w-full">
        <div className={`${corner} border-t-2 border-l-2 rounded-tl-sm`} />
        <div className={`${corner} border-t-2 border-r-2 rounded-tr-sm`} />
      </div>
      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80 animate-pulse" />
      <div className="flex justify-between w-full">
        <div className={`${corner} border-b-2 border-l-2 rounded-bl-sm`} />
        <div className={`${corner} border-b-2 border-r-2 rounded-br-sm`} />
      </div>
    </div>
  )
}

function ScanLine({ vertical = false }) {
  return (
    <div
      className={`absolute bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-sp-sweep ${
        vertical ? 'inset-y-0 left-0 w-0.5 h-full' : 'inset-x-0 top-0 h-0.5 w-full'
      }`}
      style={{ animationDuration: '2.6s' }}
    />
  )
}

/** Latar kamera: pratinjau video bila izin kamera diberikan, jika tidak
 *  tampil placeholder yang tetap informatif (bukan layar hitam). */
function CameraLayer({ videoRef, cameraAktif, children, rounded = 'rounded-full' }) {
  return (
    <div className={`relative w-full h-full overflow-hidden bg-primary ${rounded} flex items-center justify-center`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#181d48] via-[#252e6d] to-[#323d8f]" />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          cameraAktif ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      {children}
    </div>
  )
}

function FaceFrame({ videoRef, cameraAktif, initials, captured, faceStatus = 'idle', faceDetected = false, faceConfidence, focusing = false }) {
  const isMismatch = faceStatus === 'mismatched'
  const isMatch = faceStatus === 'matched' || captured

  return (
    <div
      className={`relative w-56 h-56 rounded-full p-2 bg-gradient-to-b from-[#181d48] via-[#252e6d] to-[#323d8f]/40 shadow-inner flex items-center justify-center transition-all duration-300 ${
        focusing
          ? 'ring-2 ring-amber-400 shadow-amber-400/30'
          : isMismatch
            ? 'ring-4 ring-rose-500 shadow-rose-500/40'
            : isMatch
              ? 'ring-4 ring-emerald-500 shadow-emerald-500/40'
              : faceDetected
                ? 'ring-2 ring-emerald-400/80'
                : ''
      }`}
    >
      {cameraAktif && (
        <span
          className={`absolute -inset-3 rounded-full blur-xl pointer-events-none transition-colors duration-300 ${
            focusing
              ? 'bg-amber-400/20 animate-pulse'
              : isMismatch
                ? 'bg-rose-500/30 animate-pulse'
                : isMatch
                  ? 'bg-emerald-400/25 animate-sp-glow'
                  : faceDetected
                    ? 'bg-emerald-400/20 animate-pulse'
                    : 'bg-emerald-400/15 animate-sp-glow'
          }`}
        />
      )}
      <CameraLayer videoRef={videoRef} cameraAktif={cameraAktif} rounded="rounded-full">
        <span className="relative font-display-lg text-display-lg text-white/25 tracking-widest">{initials}</span>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            className={`w-32 h-40 drop-shadow-md transition-colors duration-300 ${
              isMismatch
                ? 'text-rose-400'
                : isMatch
                  ? 'text-emerald-300'
                  : faceDetected
                    ? 'text-emerald-400'
                    : 'text-white/75'
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
            <line opacity="0.5" strokeDasharray="2 2" strokeWidth="1.2" x1="32" x2="68" y1="46" y2="46" />
            <line opacity="0.7" strokeWidth="1.5" x1="50" x2="50" y1="20" y2="28" />
          </svg>
        </div>

        <CornerBrackets tone={focusing ? 'border-amber-300' : isMismatch ? 'border-rose-400' : isMatch ? 'border-emerald-400' : 'border-emerald-400'} />
        <ScanLine />
        {isMatch && <div className="absolute inset-0 bg-emerald-500/25 animate-sp-fade" />}
        {isMismatch && <div className="absolute inset-0 bg-rose-500/35 animate-pulse" />}
      </CameraLayer>

      {/* Floating Status Pill */}
      {focusing && !isMatch && !isMismatch && (
        <span className="absolute -bottom-2.5 inset-x-0 mx-auto w-fit px-3 py-1 rounded-full bg-amber-600 text-white font-label-sm text-[11px] font-bold shadow-md animate-pulse flex items-center gap-1.5 z-10">
          <Icon name="center_focus_strong" className="text-[14px] animate-spin" />
          Sedang memfokuskan...
        </span>
      )}
      {!focusing && isMismatch && (
        <span className="absolute -bottom-2.5 inset-x-0 mx-auto w-fit px-3 py-1 rounded-full bg-rose-600 text-white font-label-sm text-xs font-bold shadow-md animate-bounce flex items-center gap-1 z-10">
          <Icon name="block" className="text-[14px]" />
          Akses Ditolak
        </span>
      )}
      {!focusing && isMatch && !isMismatch && (
        <span className="absolute -bottom-2.5 inset-x-0 mx-auto w-fit px-3 py-1 rounded-full bg-emerald-600 text-white font-label-sm text-xs font-bold shadow-md flex items-center gap-1 z-10">
          <Icon name="verified" className="text-[14px]" />
          Wajah Cocok {faceConfidence ? `(${faceConfidence}%)` : ''}
        </span>
      )}
      {!focusing && !isMatch && !isMismatch && faceDetected && (
        <span className="absolute -bottom-2 inset-x-0 mx-auto w-fit px-2.5 py-0.5 rounded-full bg-[#323d8f] text-white font-label-sm text-[11px] font-medium shadow-sm flex items-center gap-1 z-10">
          <Icon name="face" className="text-[13px]" />
          Wajah Terdeteksi
        </span>
      )}

      <div className="absolute -inset-1 rounded-full border border-primary-container/20 pointer-events-none" />
    </div>
  )
}

function BarcodeFrame({ videoRef, cameraAktif, qrValue, qrTerbaca, captured }) {
  return (
    <div className="relative w-56 h-56 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
      {cameraAktif && (
        <span className="absolute -inset-3 rounded-[24px] bg-emerald-400/15 blur-xl animate-sp-glow pointer-events-none" />
      )}
      <CameraLayer videoRef={videoRef} cameraAktif={cameraAktif} rounded="rounded-2xl">
        {/* Placeholder kartu ID hanya muncul saat kamera tidak aktif: begitu
            kamera menyala, yang dicari adalah QR kartu milik orang yang
            memindai, bukan QR miliknya sendiri. */}
        {!cameraAktif && (
          <div className="relative w-32 h-32 rounded-xl bg-white p-2 flex items-center justify-center">
            <QRCodeSvg value={qrValue} className="h-full w-full text-primary" title="QR Code kartu ID" />
          </div>
        )}
        <CornerBrackets />
        <ScanLine vertical />
        {captured && <div className="absolute inset-0 bg-emerald-500/25 animate-sp-fade" />}
      </CameraLayer>
      {qrTerbaca && (
        <span className="absolute bottom-2 inset-x-0 mx-auto w-fit px-2 py-0.5 rounded-full bg-emerald-500/90 text-white font-label-sm text-label-sm">
          QR terbaca
        </span>
      )}
    </div>
  )
}

/**
 * Area pemindaian: bingkai wajah untuk Face Recognition dan bingkai QR untuk
 * barcode kartu ID. `videoRef` diisi hook useDeviceCamera, sehingga halaman
 * yang sama otomatis memakai kamera sungguhan saat izinnya diberikan dan
 * tetap bisa dipakai (dengan penanda sumber) saat tidak.
 */
function ScanFrame({
  mode,
  facing,
  onGantiKamera,
  videoRef,
  cameraAktif,
  cameraStatus,
  cameraError,
  supportsDetector,
  initials,
  qrValue,
  qrTerbaca,
  captured,
  verifying = false,
  faceStatus = 'idle',
  faceDetected = false,
  faceConfidence,
  focusing = false,
}) {
  const labelKamera = facing === 'user' ? 'kamera depan' : 'kamera belakang'
  const hint =
    mode === 'barcode'
      ? `Arahkan QR Code kartu ID ke bingkai (${labelKamera})`
      : `Posisikan wajah Anda di dalam bingkai (${labelKamera})`

  return (
    <section className="sp-card p-4 flex flex-col items-center text-center gap-3.5 relative overflow-hidden">
      <div className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-emerald-700 font-label-sm text-label-sm">
          <span className={`w-2 h-2 rounded-full ${cameraAktif ? 'bg-emerald-500' : 'bg-amber-400'}`} />
          <span>{cameraAktif ? (focusing ? 'Memfokuskan Kamera' : 'Sensor Siap') : cameraStatus === 'meminta' ? 'Menyiapkan Kamera' : 'Mode Tampilan'}</span>
        </div>
        <button
          type="button"
          onClick={onGantiKamera}
          aria-label="Ganti kamera"
          aria-pressed={facing !== 'user'}
          className="sp-press w-11 h-11 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <Icon name="cameraswitch" className="text-[20px]" />
        </button>
      </div>

      {mode === 'barcode' ? (
        <BarcodeFrame
          videoRef={videoRef}
          cameraAktif={cameraAktif}
          qrValue={qrValue}
          qrTerbaca={qrTerbaca}
          captured={captured}
        />
      ) : (
        <FaceFrame
          videoRef={videoRef}
          cameraAktif={cameraAktif}
          initials={initials}
          captured={captured}
          faceStatus={faceStatus}
          faceDetected={faceDetected}
          faceConfidence={faceConfidence}
          focusing={focusing}
        />
      )}

      {/* Saat validasi berjalan, bingkai menampilkan proses pencocokan agar
          pengguna tahu kamera/reader sedang dipakai, bukan menggantung. */}
      {verifying && (
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
              <Icon name="progress_activity" className="text-[14px] animate-spin" />
              {mode === 'barcode' ? 'Membaca QR kartu ID' : 'Mencocokkan biometrik'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant"> jangan geser halaman</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
            <div className="h-full w-0 rounded-full bg-secondary animate-sp-fill" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm leading-snug">
        <Icon name={mode === 'barcode' ? 'qr_code_scanner' : 'visibility'} className="text-[16px] text-secondary shrink-0" />
        <span>{hint}</span>
      </div>

      {/* Status perangkat: kamera yang dipakai dan kemampuan pembacaan QR. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${cameraAktif ? 'bg-emerald-500' : 'bg-amber-400'}`} />
          {labelKamera}
        </span>
        {mode === 'barcode' && (
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
            <Icon name="qr_code_scanner" className="text-[13px]" />
            {supportsDetector ? 'Pembaca QR aktif' : 'Pembaca QR simulasi'}
          </span>
        )}
        {mode === 'face' && (
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
            <Icon name="face" className="text-[13px]" />
            Face Recognition
          </span>
        )}
      </div>

      {mode === 'barcode' && (
        <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
          {supportsDetector
            ? 'Pembacaan QR otomatis dari kamera perangkat.'
            : 'Peramban ini belum mendukung pembacaan QR otomatis — pindai dilakukan lewat simulator kartu.'}
        </p>
      )}

      {!cameraAktif && cameraError && (
        <p className="font-label-sm text-label-sm text-amber-700 leading-snug">Kamera: {cameraError}</p>
      )}
    </section>
  )
}

export default ScanFrame
