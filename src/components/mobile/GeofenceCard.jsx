import Icon from '../Icon.jsx'
// Sudut penempatan titik pengguna pada radar. 135° (kiri bawah) supaya titik
// lokasi di tengah dan titik pengguna tidak pernah bertumpuk.
const SUDUT_RADAR = (135 * Math.PI) / 180

/**
 * Kartu status geofencing. Jarak dihitung useGeofence() dari koordinat GPS
 * perangkat terhadap koordinat unit sekolah, lalu dibandingkan dengan radius
 * yang berlaku (override per unit di Pengaturan Global, atau radius unit kalau
 * override-nya belum diatur).
 *
 * Visual radar memakai jarak yang sama persis dengan angka di bawahnya —
 * skala posisinya saturasi di radius, jadi titik pengguna tidak pernah keluar
 * dari lingkaran aunque jarak sebenarnya jauh lebih besar.
 */
function GeofenceCard({ geofence, namaTitik, koordinatTeks }) {
  const { dalamRadius, formatJarak, radius, sumber, akurasi, errorGps, membaca, lokasiAktif, bebasRadius, refresh } = geofence
  const aktif = bebasRadius || (lokasiAktif && dalamRadius)
  const jarak = geofence.jarak || 0
  const persen = Math.min(100, Math.round((jarak / Math.max(1, radius)) * 100))
  const warna = aktif ? '#059669' : '#ba1a1a'

  // Skala radar: 46 = jari-jari lingkaran luar pada viewBox 100x100.
  const skala = Math.min(1, jarak / Math.max(1, radius))
  const dx = Math.cos(SUDUT_RADAR) * 46 * skala
  const dy = Math.sin(SUDUT_RADAR) * 46 * skala

  return (
    // `gap-3.5` (14px) adalah jarak antar blok: badge status → radar →
    // baris koordinat. Baris koordinat memakai `border-t` + `pt-3`, jadi
    // jaraknya ke divider (12px) sama dengan jarak teks di bawahnya.
    <section className="sp-card p-4 flex flex-col gap-3.5 border border-[#e0e6f2]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border min-w-0 ${
            aktif
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
              : 'bg-error-container text-on-error-container border-error/30'
          }`}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {aktif && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${aktif ? 'bg-emerald-600' : 'bg-error'}`} />
          </span>
          <span className="font-label-sm text-label-sm font-semibold leading-snug">
            {bebasRadius
              ? 'Geofence dinonaktifkan (Bebas radius)'
              : aktif
                ? 'Anda berada dalam radius'
                : 'Anda berada di luar radius'}
          </span>
        </div>
        <button
          type="button"
          onClick={refresh}
          title="Perbarui koordinat GPS"
          className="font-label-sm text-label-sm text-on-surface-variant hover:text-foreground flex items-center gap-1 shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
        >
          <Icon name={membaca ? 'sync' : 'gps_fixed'} className={`text-[14px] ${membaca ? 'animate-spin' : aktif ? 'text-emerald-600' : 'text-error'}`} />
          <span>{sumber === 'gps' ? `GPS ±${akurasi ?? '-'} m` : 'GPS nonaktif'}</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="w-[92px] h-[92px] shrink-0" role="img" aria-label="Radar lokasi">
          <circle cx="50" cy="50" r="46" fill="#eef2f8" />
          <circle cx="50" cy="50" r="30" fill="none" stroke={warna} strokeOpacity="0.18" strokeWidth="1" />
          <circle cx="50" cy="50" r="46" fill="none" stroke={warna} strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="50" y1="50" x2={50 + dx} y2={50 + dy} stroke={warna} strokeOpacity="0.6" strokeWidth="1" strokeDasharray="2 2" />
          {/* Titik lokasi sekolah (pusat radar). */}
          <circle cx="50" cy="50" r="4" fill={warna} />
          <circle cx="50" cy="50" r="8" fill={warna} fillOpacity="0.18" className={aktif ? 'animate-pulse' : ''} />
          {/* Titik perangkat pengguna. */}
          <circle cx={50 + dx} cy={50 + dy} r="5" fill="#ffffff" stroke="#323d8f" strokeWidth="2.5" />
        </svg>

        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <p className="font-display-lg-mobile text-[26px] leading-none font-bold text-on-surface tabular-nums">
            {formatJarak}
            <span className="font-body-md text-body-md font-normal text-on-surface-variant ml-1.5">dari lokasi</span>
          </p>
          <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${aktif ? 'bg-emerald-500' : 'bg-error'}`}
              style={{ width: `${persen}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Icon name="location_on" className="text-[16px] text-secondary" />
            <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{namaTitik}</span>
          </div>
        </div>
      </div>

      {/* Batas radius + koordinat. `border-t` dengan `pt-3` membuat divider
          berjarak 12px dari teks di atas (lewat `gap-3.5` kartu) dan 12px dari
          teks di bawahnya, dan lebarnya tetap mengikuti area konten kartu. */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-container">
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Batas radius {radius} m
          {sumber === 'simulasi' ? ' • jarak simulasi' : ''}
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant truncate" title={koordinatTeks}>
          {koordinatTeks}
        </span>
      </div>

      {errorGps && sumber === 'simulasi' && (
        <p className="font-label-sm text-label-sm text-amber-700 flex items-start gap-2 leading-snug">
          <Icon name="gps_off" className="text-[14px] shrink-0 mt-px" />
          <span>{errorGps} — jarak dihitung dari simulasi.</span>
        </p>
      )}
    </section>
  )
}

export default GeofenceCard