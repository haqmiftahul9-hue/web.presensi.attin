function WelcomeBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
      <div className="flex items-start md:items-center gap-space-md z-10">
        <div className="w-11 h-11 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[24px]">verified_user</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm text-on-surface">Selamat bertugas, Pak Bustanul</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">Admin Unit</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Jam operasional presensi hari ini: <strong className="text-on-surface font-body-md-medium">Masuk 06.30 - 07.15 WIB</strong> • <strong className="text-on-surface font-body-md-medium">Pulang 15.00 WIB</strong>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-space-xs rounded-lg self-start md:self-auto z-10">
        <div className="flex flex-col text-right">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Waktu Sistem (WIB)</span>
          <span className="font-headline-sm text-headline-sm text-on-surface tabular-nums" id="live-clock">07:28:40 WIB</span>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
      </div>
    </div>
  )
}

export default WelcomeBanner