function NoticeBar() {
  return (
    <div className="px-space-xl pt-space-lg pb-space-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-variant/70">
        <div>
          <div className="flex items-center gap-space-xs mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-label-sm text-label-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Unit SD Islam RJ
            </span>
            <span className="text-outline-variant">•</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Tahun Ajaran 2026/2027 — Semester Ganjil</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Dashboard Unit SD Islam RJ</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">Pemantauan presensi harian guru & staf unit SD Islam RJ secara real-time</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
            <span className="material-symbols-outlined text-[16px] text-secondary">home</span>
            <span>Home</span>
            <span className="text-outline-variant">/</span>
            <span>Admin SD</span>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-body-md-medium text-body-md-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <a className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md shadow-sm hover:bg-secondary/90 transition-colors" href="#">
              <span className="material-symbols-outlined text-[18px]">co_present</span>
              <span>Buka Mode Kiosk</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoticeBar