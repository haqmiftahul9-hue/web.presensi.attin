import Icon from '../Icon.jsx'
/**
 * Bottom sheet konfirmasi setelah presensi tersimpan. Muncul sebagai hasil akhir
 * alur tombol presensi: lokasi -> waktu -> biometrik -> simpan. Angka waktu dan
 * metode di sheet ini dibaca dari state yang sama dengan ringkasan hari ini,
 * jadi tidak mungkin berbeda dari yang tercatat di store.
 */
function SuccessSheet({ terbuka, judul, detail, baris = [], onTutup, onRiwayat }) {
  if (!terbuka) return null

  return (
    // `absolute`, bukan `fixed`: sheet ini harus menutupi shell 430px saja.
    // Dengan `fixed inset-0` di desktop, tiranya memenuhi layar laptop dan
    // membuat pratinjau perangkat kehilangan kesan aplikasi mobile.
    <div className="absolute inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        onClick={onTutup}
        aria-label="Tutup konfirmasi"
        className="absolute inset-0 bg-[#181d48]/60 backdrop-blur-[2px]"
      />

      <div className="relative w-full bg-white rounded-t-[28px] px-5 pt-6 pb-7 shadow-2xl animate-sp-rise border-t border-slate-200/80">
        <span className="absolute left-1/2 -translate-x-1/2 top-2.5 w-10 h-1 rounded-full bg-slate-300" />

        <div className="flex flex-col items-center text-center gap-2">
          <span className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/30 flex items-center justify-center animate-sp-rise shadow-xs">
            <Icon name="task_alt" className="text-emerald-600 text-[34px]" />
          </span>
          <span className="font-headline-sm text-headline-sm text-slate-900 font-bold">{judul}</span>
          {detail && <span className="font-body-sm text-body-sm text-slate-500 leading-snug">{detail}</span>}
        </div>

        {baris.length > 0 && (
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200/80 py-1 divide-y divide-slate-100">
            {baris.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 px-3.5 py-3">
                <span className="font-body-sm text-body-sm text-slate-500 shrink-0">{item.label}</span>
                <span className="font-body-md-medium text-body-md-medium text-slate-900 font-semibold text-right min-w-0">{item.nilai}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onRiwayat}
            className="sp-btn flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-label-md text-label-md font-semibold rounded-xl border border-slate-200/80 active:scale-[0.98] transition-all"
          >
            Lihat Riwayat
          </button>
          <button
            type="button"
            onClick={onTutup}
            className="sp-btn flex-1 px-4 py-3 bg-[#323d8f] hover:bg-[#252e6d] text-white font-label-md text-label-md font-semibold rounded-xl shadow-md active:scale-[0.98] transition-all"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuccessSheet