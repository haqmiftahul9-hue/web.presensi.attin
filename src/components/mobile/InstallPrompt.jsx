import Icon from '../Icon.jsx'
import { usePwaInstall } from '../../hooks/usePwaInstall.js'

/**
 * Banner pasang aplikasi.
 *
 * Hanya dirender di dalam MobileLayout, jadi mustahil muncul untuk Superadmin
 * atau Admin Unit: dashboard admin tetap aplikasi web biasa. Banner muncul satu
 * kali, bisa ditutup ("Nanti"), dan otomatis hilang setelah aplikasi terpasang.
 */
function InstallPrompt() {
  const { bisaPasang, pasang, nanti, perluPetunjukIos, tampilkanBanner } = usePwaInstall()
  if (!tampilkanBanner) return null

  return (
    // Letak banner dihitung dari navigasi mengambang: nav occupying 16px dari
    // tepi bawah + 76px tinggi + 16px jarak = 108px, jadi banner diletakkan
    // 112px (4px napas tambahan) di atasnya. Kalau tinggi nav berubah, angka
    // ini harus ikut disesuaikan — kalau tidak banner akan menutupi navigasi.
    // Safe-area bawah (Gesture Bar iOS) menambah ruang lagi lewat
    // `.sp-install-banner`, sehingga banner tidak pernah menempel navigasi.
    //
    // `absolute`, bukan `fixed`: banner harus ikut mengikuti shell 430px di
    // desktop, bukan melebar mengikuti viewport laptop.
    <div className="sp-install-banner absolute inset-x-0 bottom-[112px] z-40 mx-auto w-[calc(100%-32px)] max-w-[398px] animate-sp-rise">
      <div className="flex items-start gap-3 rounded-3xl bg-primary-container p-3.5 text-on-primary shadow-[0_18px_40px_-20px_rgba(11,31,61,0.7)] border border-white/10">
        <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Icon name="download_for_offline" className="text-[20px]" />
        </span>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="font-body-md-medium text-body-md-medium">Pasang SimPres</span>
          {perluPetunjukIos ? (
            <span className="font-body-sm text-body-sm text-on-primary-container">
              Ketuk Bagikan lalu pilih &ldquo;Tambahkan ke Layar Utama&rdquo; agar bisa dibuka seperti
              aplikasi.
            </span>
          ) : (
            <span className="font-body-sm text-body-sm text-on-primary-container">
              Buka presensi lebih cepat dan tetap bisa dipakai saat sinyal hilang.
            </span>
          )}

          <div className="mt-1.5 flex items-center gap-2">
            {bisaPasang && (
              <button
                type="button"
                onClick={pasang}
                className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-label-md text-label-md font-semibold text-primary-container transition-transform active:scale-[0.97]"
              >
                <Icon name="install_mobile" className="text-[16px]" />
                Pasang
              </button>
            )}
            <button
              type="button"
              onClick={nanti}
              className="flex min-h-[40px] items-center rounded-xl px-3 py-2 text-label-md text-label-md text-white/80 transition-transform active:scale-[0.97]"
            >
              Nanti
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={nanti}
          aria-label="Tutup ajakan pasang aplikasi"
          className="w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
        >
          <Icon name="close" className="text-[16px]" />
        </button>
      </div>
    </div>
  )
}

export default InstallPrompt