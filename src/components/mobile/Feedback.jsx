// Status tampilan bersama untuk modul mobile: memuat, kosong, dan gagal.
// Semuanya berupa kartu penuh dengan aksi pemulihan, supaya tidak pernah ada
// halaman yang hanya menampilkan teks kecil atau layar putih kosong.

/** Indikator kerja kecil untuk dipakai di dalam kartu atau tombol. */
function Spinner({ className = 'w-4 h-4' }) {
  return (
    <span
      className={`material-symbols-outlined ${className} animate-spin`}
      role="progressbar"
      aria-label="Sedang memproses"
    >
      progress_activity
    </span>
  )
}

/** Placeholder kartu selagi data arrives — bentuknya mengikuti kartu asli. */
function Skeleton({ className = 'h-4 w-full', lines = 1 }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${className} rounded-lg bg-surface-container animate-sp-pulse`}
          style={i > 0 ? { opacity: 1 - i * 0.18 } : undefined}
        />
      ))}
    </div>
  )
}

/** Layar memuat: judul singkat + skeleton, dipakai selagi izin kamera/GPS. */
function LoadingState({ judul = 'Memuat data…', detail, lines = 3 }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-secondary">
        <Spinner />
        <span className="font-body-md-medium text-body-md-medium text-on-surface">{judul}</span>
      </div>
      {detail && <span className="font-body-sm text-body-sm text-on-surface-variant">{detail}</span>}
      <div className="sp-card p-4">
        <Skeleton lines={lines} />
      </div>
    </div>
  )
}

/** Layar kosong: tidak ada data, tapi sistem sehat. */
function EmptyState({ ikon = 'inbox', judul, detail, aksi }) {
  return (
    <div className="sp-card p-6 flex flex-col items-center text-center gap-1.5">
      <span className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
        <span className="material-symbols-outlined text-[24px] text-on-surface-variant">{ikon}</span>
      </span>
      <span className="font-body-md-medium text-body-md-medium text-on-surface">{judul}</span>
      {detail && <span className="font-body-sm text-body-sm text-on-surface-variant">{detail}</span>}
      {aksi}
    </div>
  )
}

/** Layar gagal: ada yang salah, selalu ada jalan keluar (aksi pemulihan). */
function ErrorState({ ikon = 'error_outline', judul = 'Terjadi kesalahan', detail, onCoba }) {
  return (
    <div className="sp-card p-5 flex flex-col items-center text-center gap-2 border-error/30">
      <span className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
        <span className="material-symbols-outlined text-[24px] text-on-error-container">{ikon}</span>
      </span>
      <span className="font-body-md-medium text-body-md-medium text-on-surface">{judul}</span>
      {detail && <span className="font-body-sm text-body-sm text-on-surface-variant">{detail}</span>}
      {onCoba && (
        <button
          type="button"
          onClick={onCoba}
          className="sp-press mt-1 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Coba lagi
        </button>
      )}
    </div>
  )
}

export { Spinner, Skeleton, LoadingState, EmptyState, ErrorState }