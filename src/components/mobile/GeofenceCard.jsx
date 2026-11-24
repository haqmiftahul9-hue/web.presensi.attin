import Icon from '../Icon.jsx'

// Sudut penempatan titik pengguna pada radar. 135° (kiri bawah) supaya titik
// lokasi di tengah dan titik pengguna tidak pernah bertumpuk.
const SUDUT_RADAR = (135 * Math.PI) / 180

/**
 * Kartu status geofencing presisi & anti-fake GPS.
 * Jarak dihitung useGeofence() dari koordinat GPS riil perangkat terhadap
 * titik koordinat unit sekolah yang ditentukan superadmin, lalu dibandingkan dengan
 * radius yang berlaku.
 */
function GeofenceCard({ geofence, namaTitik, koordinatTeks }) {
  const {
    dalamRadius, formatJarak, radius, sumber, akurasi, accuracyQuality,
    isFakeGps, fakeReason, errorGps, membaca, lokasiAktif, bebasRadius, refresh,
  } = geofence

  const aktif = bebasRadius || (lokasiAktif && dalamRadius && !isFakeGps)
  const jarak = geofence.jarak || 0
  const persen = Math.min(100, Math.round((jarak / Math.max(1, radius)) * 100))
  const warna = isFakeGps ? '#ba1a1a' : aktif ? '#059669' : '#ba1a1a'

  // Skala radar: 46 = jari-jari lingkaran luar pada viewBox 100x100.
  const skala = Math.min(1, jarak / Math.max(1, radius))
  const dx = Math.cos(SUDUT_RADAR) * 46 * skala
  const dy = Math.sin(SUDUT_RADAR) * 46 * skala

  return (
    <section className="sp-card p-4 flex flex-col gap-3.5 border border-primary-border shadow-2xs">
      {/* 1. Baris Badge Status & Indikator Sinyal */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border min-w-0 ${
            isFakeGps
              ? 'bg-error-container text-on-error-container border-error/40 font-bold'
              : aktif
                ? 'bg-status-success-soft text-status-success-text border-status-success-border/70 font-semibold'
                : 'bg-error-container text-on-error-container border-error/30 font-semibold'
          }`}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {aktif && !isFakeGps && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isFakeGps ? 'bg-error' : aktif ? 'bg-status-success' : 'bg-error'}`} />
          </span>
          <span className="font-label-sm text-label-sm leading-snug">
            {isFakeGps
              ? 'Fake GPS Terdeteksi!'
              : bebasRadius
                ? 'Geofence dinonaktifkan (Bebas radius)'
                : aktif
                  ? 'Anda berada dalam radius'
                  : 'Anda berada di luar radius'}
          </span>
        </div>

        <button
          type="button"
          onClick={refresh}
          title="Perbarui koordinat GPS sekarang"
          className="font-label-sm text-label-sm text-on-surface-variant hover:text-foreground flex items-center gap-1 shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Icon
            name={membaca ? 'sync' : isFakeGps ? 'gpp_bad' : sumber === 'gps' ? 'verified_user' : 'gps_off'}
            className={`text-[14px] ${membaca ? 'animate-spin' : isFakeGps ? 'text-error' : aktif ? 'text-status-success-text' : 'text-error'}`}
          />
          <span>
            {isFakeGps
              ? 'Sinyal Ditolak'
              : sumber === 'gps'
                ? `GPS ±${akurasi ?? '-'}m (${accuracyQuality === 'sangat_baik' ? 'Presisi' : accuracyQuality === 'baik' ? 'Bagus' : 'Sedang'})`
                : 'GPS Nonaktif'}
          </span>
        </button>
      </div>

      {/* 2. Radar Visual & Jarak */}
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="w-[92px] h-[92px] shrink-0" role="img" aria-label="Radar lokasi">
          <circle cx="50" cy="50" r="46" fill="var(--primary-soft)" />
          <circle cx="50" cy="50" r="30" fill="none" stroke={warna} strokeOpacity="0.18" strokeWidth="1" />
          <circle cx="50" cy="50" r="46" fill="none" stroke={warna} strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="50" y1="50" x2={50 + dx} y2={50 + dy} stroke={warna} strokeOpacity="0.6" strokeWidth="1" strokeDasharray="2 2" />
          {/* Titik lokasi sekolah (pusat radar). */}
          <circle cx="50" cy="50" r="4" fill={warna} />
          <circle cx="50" cy="50" r="8" fill={warna} fillOpacity="0.18" className={aktif ? 'animate-pulse' : ''} />
          {/* Titik perangkat pengguna. */}
          <circle cx={50 + dx} cy={50 + dy} r="5" fill="#ffffff" stroke={warna} strokeWidth="2.5" />
        </svg>

        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <p className="font-display-lg-mobile text-[26px] leading-none font-bold text-on-surface tabular-nums">
            {formatJarak !== '-' ? formatJarak : 'Belum terbaca'}
            <span className="font-body-md text-body-md font-normal text-on-surface-variant ml-1.5">dari lokasi</span>
          </p>
          <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFakeGps ? 'bg-error' : aktif ? 'bg-status-success' : 'bg-error'}`}
              style={{ width: `${persen}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Icon name="location_on" className="text-[16px] text-secondary" />
            <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{namaTitik}</span>
          </div>
        </div>
      </div>

      {/* 3. Batas radius + koordinat */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-container">
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Batas radius: <span className="font-semibold text-on-surface">{radius} meter</span>
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant truncate font-mono text-[11px]" title={koordinatTeks}>
          {koordinatTeks}
        </span>
      </div>

      {/* 4. Peringatan Keamanan Fake GPS */}
      {isFakeGps && (
        <div className="p-2.5 rounded-xl bg-error/10 border border-error/30 text-error flex items-start gap-2 text-xs leading-snug">
          <Icon name="shield" className="text-[16px] shrink-0 mt-0.5" />
          <div className="flex flex-col min-w-0">
            <span className="font-bold">Keamanan Lokasi Aktif:</span>
            <span>{fakeReason || 'Aplikasi pemalsu lokasi / Mock GPS terdeteksi. Matikan Fake GPS untuk melakukan presensi.'}</span>
          </div>
        </div>
      )}

      {/* 5. Informasi GPS Mati / Error */}
      {errorGps && !isFakeGps && (
        <p className="font-label-sm text-label-sm text-status-warning-text flex items-start gap-2 leading-snug">
          <Icon name="gps_off" className="text-[14px] shrink-0 mt-px" />
          <span>{errorGps}. Pastikan GPS dan izin lokasi browser aktif.</span>
        </p>
      )}
    </section>
  )
}

export default GeofenceCard
