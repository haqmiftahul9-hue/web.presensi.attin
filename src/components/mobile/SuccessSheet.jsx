/**
 * Bottom sheet konfirmasi setelah presensi tersimpan. Muncul sebagai hasil akhir
 * alur tombol presensi: lokasi -> waktu -> biometrik -> simpan. Angka waktu dan
 * metode di sheet ini dibaca dari state yang sama dengan ringkasan hari ini,
 * jadi tidak mungkin berbeda dari yang tercatat di store.
 */
function SuccessSheet({ terbuka, judul, detail, baris = [], onTutup, onRiwayat }) {
  if (!terbuka) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        onClick={onTutup}
        aria-label="Tutup konfirmasi"
        className="absolute inset-0 bg-primary/50 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-[390px] bg-surface rounded-t-[28px] px-5 pt-6 pb-7 shadow-2xl animate-sp-rise">
        <span className="absolute left-1/2 -translate-x-1/2 top-2.5 w-10 h-1 rounded-full bg-outline-variant/50" />

        <div className="flex flex-col items-center text-center gap-2">
          <span className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/30 flex items-center justify-center animate-sp-rise">
            <span className="material-symbols-outlined text-emerald-600 text-[34px]">task_alt</span>
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface">{judul}</span>
          {detail && <span className="font-body-sm text-body-sm text-on-surface-variant">{detail}</span>}
        </div>

        {baris.length > 0 && (
          <div className="mt-4 rounded-2xl bg-surface-container-low divide-y divide-surface-container">
            {baris.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="font-body-sm text-body-sm text-on-surface-variant">{item.label}</span>
                <span className="font-body-md-medium text-body-md-medium text-on-surface text-right">{item.nilai}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onRiwayat}
            className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface font-label-md text-label-md active:scale-[0.99] transition-transform"
          >
            Lihat Riwayat
          </button>
          <button
            type="button"
            onClick={onTutup}
            className="flex-1 py-3 rounded-2xl bg-primary-container text-on-primary font-label-md text-label-md active:scale-[0.99] transition-transform"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuccessSheet