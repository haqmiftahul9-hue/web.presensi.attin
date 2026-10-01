const STATUS_STYLE = {
  menunggu: { icon: 'radio_button_unchecked', badge: 'bg-surface-container text-on-surface-variant', label: 'Menunggu' },
  berjalan: { icon: 'progress_activity', badge: 'bg-secondary-container/15 text-secondary', label: 'Memeriksa' },
  berhasil: { icon: 'check_circle', badge: 'bg-emerald-50 text-emerald-700', label: 'Lolos' },
  gagal: { icon: 'cancel', badge: 'bg-error-container text-on-error-container', label: 'Gagal' },
}

/**
 * Daftar langkah validasi yang dijalankan tombol presensi: lokasi -> waktu ->
 * biometrik (wajah atau barcode) -> simpan. Setiap langkah menampilkan statusnya
 * sendiri supaya pengguna tahu persis bagian mana yang belum terpenuhi.
 */
function ValidationSteps({ langkah, statusPenutup, pesanPenutup }) {
  return (
    <section className="sp-card p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="font-headline-sm text-headline-sm text-on-surface">Validasi Presensi</span>
        <span
          className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${
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

      <ol className="flex flex-col gap-2">
        {langkah.map((item, index) => {
          const gaya = STATUS_STYLE[item.status] || STATUS_STYLE.menunggu
          return (
            <li key={item.key} className="flex items-start gap-2.5">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${gaya.badge}`}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${item.status === 'berjalan' ? 'animate-spin' : ''}`}
                >
                  {gaya.icon}
                </span>
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body-md-medium text-body-md-medium text-on-surface">
                    {index + 1}. {item.judul}
                  </span>
                  <span className={`font-label-sm text-label-sm ${gaya.badge} px-2 py-0.5 rounded-full`}>
                    {gaya.label}
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{item.detail}</span>
              </div>
            </li>
          )
        })}
      </ol>

      {pesanPenutup && (
        <p
          className={`mt-1 p-2.5 rounded-lg font-body-sm text-body-sm flex items-start gap-2 ${
            statusPenutup === 'gagal'
              ? 'bg-error-container text-on-error-container'
              : statusPenutup === 'berhasil'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
            {statusPenutup === 'gagal' ? 'error' : statusPenutup === 'berhasil' ? 'task_alt' : 'info'}
          </span>
          <span>{pesanPenutup}</span>
        </p>
      )}
    </section>
  )
}

export default ValidationSteps
