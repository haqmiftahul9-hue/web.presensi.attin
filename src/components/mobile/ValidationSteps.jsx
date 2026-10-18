import Icon from '../Icon.jsx'
const STATUS_STYLE = {
  menunggu: { icon: 'radio_button_unchecked', badge: 'bg-slate-100 text-slate-500 border border-slate-200/60', label: 'Menunggu' },
  berjalan: { icon: 'progress_activity', badge: 'bg-[#323d8f]/10 text-[#323d8f] border border-[#323d8f]/20', label: 'Memeriksa' },
  berhasil: { icon: 'check_circle', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', label: 'Lolos' },
  gagal: { icon: 'cancel', badge: 'bg-rose-50 text-rose-700 border border-rose-200/60', label: 'Gagal' },
}

/**
 * Daftar langkah validasi yang dijalankan tombol presensi: lokasi -> waktu ->
 * biometrik (wajah atau barcode) -> simpan. Setiap langkah menampilkan statusnya
 * sendiri supaya pengguna tahu persis bagian mana yang belum terpenuhi.
 */
function ValidationSteps({ langkah, statusPenutup, pesanPenutup }) {
  return (
    <section className="sp-card p-4 flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-headline-sm text-headline-sm text-on-surface">Validasi Presensi</span>
        <span
          className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm shrink-0 ${
            statusPenutup === 'berhasil'
              ? 'bg-emerald-50 text-emerald-700'
              : statusPenutup === 'gagal'
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          {statusPenutup === 'berhasil' ? 'Tersimpan' : statusPenutup === 'gagal' ? 'Ditolak' : 'Belum Jalan'}
        </span>
      </div>

      <ol className="flex flex-col gap-3">
        {langkah.map((item, index) => {
          const gaya = STATUS_STYLE[item.status] || STATUS_STYLE.menunggu
          return (
            <li key={item.key} className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${gaya.badge}`}
              >
                <Icon name={gaya.icon} className={`text-[16px] ${item.status === 'berjalan' ? 'animate-spin' : ''}`} />
              </span>
              <div className="flex flex-col min-w-0 flex-1 gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body-md-medium text-body-md-medium text-on-surface">
                    {index + 1}. {item.judul}
                  </span>
                  <span className={`font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0 ${gaya.badge}`}>
                    {gaya.label}
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant leading-snug">{item.detail}</span>
              </div>
            </li>
          )
        })}
      </ol>

      {pesanPenutup && (
        <p
          className={`p-3 rounded-xl font-body-sm text-body-sm flex items-start gap-2 leading-snug ${
            statusPenutup === 'gagal'
              ? 'bg-error-container text-on-error-container'
              : statusPenutup === 'berhasil'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <Icon name={statusPenutup === 'gagal' ? 'error' : statusPenutup === 'berhasil' ? 'task_alt' : 'info'} className="text-[16px] shrink-0 mt-0.5" />
          <span>{pesanPenutup}</span>
        </p>
      )}
    </section>
  )
}

export default ValidationSteps
