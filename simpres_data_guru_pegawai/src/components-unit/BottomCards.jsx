const quickActions = [
  { icon: 'qr_code_scanner', label: 'Input Presensi Manual Pengganti' },
  { icon: 'badge', label: 'Cetak Lembar Kartu ID Unit' },
  { icon: 'event_busy', label: 'Verifikasi Izin Guru', badge: '3' },
]

function BottomCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg mb-space-lg">
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">bolt</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Aksi Cepat Unit SD</h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Operasional cepat untuk absensi dan pengumuman tingkat unit.</p>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button key={action.label} className="w-full h-10 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium flex items-center justify-between transition-colors">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">{action.icon}</span>
                  {action.label}
                </span>
                <div className="flex items-center gap-1">
                  {action.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-label-sm text-label-sm">{action.badge}</span>
                  )}
                  <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">tablet_mac</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Perangkat Kiosk Unit</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm">Online</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Terminal check-in mandiri di Lobby Gedung SD RJ.</p>
          <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2">
            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <span className="text-on-surface-variant">Device ID:</span>
              <span className="text-on-surface font-body-md-medium">KIOSK-SD-01 (Android POS)</span>
            </div>
            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <span className="text-on-surface-variant">Kamera Barcode:</span>
              <span className="text-emerald-600 font-body-sm-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Aktif & Siaga
              </span>
            </div>
            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <span className="text-on-surface-variant">Sinkronisasi Terakhir:</span>
              <span className="text-on-surface font-body-md-medium tabular-nums">07:28:12 WIB</span>
            </div>
          </div>
        </div>
        <div className="pt-space-sm">
          <button className="w-full h-9 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors">
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            Restart Layanan Kiosk
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">domain</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Informasi Unit SD</h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">Ringkasan profil dan kontak operasional sekolah.</p>
          <div className="space-y-2 text-body-sm font-body-sm">
            <div className="flex items-center justify-between py-1 border-b border-surface-variant/30">
              <span className="text-on-surface-variant">Kepala Sekolah:</span>
              <span className="text-on-surface font-body-md-medium">H. Ahmad Fauzi, M.Pd</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-surface-variant/30">
              <span className="text-on-surface-variant">Operator SimPres:</span>
              <span className="text-on-surface font-body-md-medium">Bustanul Abidin, S.Pd</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-on-surface-variant">Pusat Bantuan:</span>
              <span className="text-secondary font-body-md-medium">Ext. 102 (Gedung SD)</span>
            </div>
          </div>
        </div>
        <div className="pt-space-sm">
          <a className="w-full h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors" href="#">
            <span className="material-symbols-outlined text-[16px]">settings</span>
            Buka Pengaturan Unit SD
          </a>
        </div>
      </div>
    </div>
  )
}

export default BottomCards