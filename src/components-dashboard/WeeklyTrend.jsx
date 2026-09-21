function WeeklyTrend() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Tren Kehadiran Mingguan</h2>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Rata-rata kehadiran mingguan: <strong className="text-on-surface font-body-sm-medium">92.8%</strong></span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Hadir</span>
            <span className="w-2.5 h-2.5 rounded-full bg-outline-variant ml-2"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Terlambat</span>
          </div>
          <div className="inline-flex bg-surface-container-low p-1 rounded-lg">
            <button className="px-2.5 py-1 rounded bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm">7 Hari</button>
            <button className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors">30 Hari</button>
          </div>
        </div>
      </div>

      <div className="w-full pt-4">
        <svg aria-label="Grafik Kehadiran Mingguan" className="w-full h-48 overflow-visible font-label-sm" viewBox="0 0 540 210">
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="20" y2="20"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="65" y2="65"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1" x1="30" x2="520" y1="110" y2="110"></line>
          <line className="text-surface-variant" stroke="currentColor" strokeWidth="1" x1="30" x2="520" y1="155" y2="155"></line>
          <text fill="#75777e" fontSize="10" x="5" y="24">100%</text>
          <text fill="#75777e" fontSize="10" x="10" y="69">75%</text>
          <text fill="#75777e" fontSize="10" x="10" y="114">50%</text>
          <text fill="#75777e" fontSize="10" x="16" y="159">0%</text>
          <rect fill="#0051d5" height="117" rx="3" width="14" x="58" y="38"></rect>
          <rect fill="#c5c6ce" height="17" rx="3" width="14" x="74" y="138"></rect>
          <text fill="#44474e" fontSize="11" textAnchor="middle" x="68" y="176">Sen</text>
          <rect fill="#0051d5" height="123" rx="3" width="14" x="126" y="32"></rect>
          <rect fill="#c5c6ce" height="14" rx="3" width="14" x="142" y="141"></rect>
          <text fill="#44474e" fontSize="11" textAnchor="middle" x="136" y="176">Sel</text>
          <rect fill="#0051d5" height="127" rx="3" width="14" x="194" y="28"></rect>
          <rect fill="#c5c6ce" height="12" rx="3" width="14" x="210" y="143"></rect>
          <text fill="#44474e" fontSize="11" textAnchor="middle" x="204" y="176">Rab</text>
          <rect fill="#0051d5" height="111" rx="3" width="14" x="262" y="44"></rect>
          <rect fill="#c5c6ce" height="23" rx="3" width="14" x="278" y="132"></rect>
          <text fill="#44474e" fontSize="11" textAnchor="middle" x="272" y="176">Kam</text>
          <rect fill="#0051d5" height="115" rx="3" width="14" x="330" y="40"></rect>
          <rect fill="#c5c6ce" height="16" rx="3" width="14" x="346" y="139"></rect>
          <text fill="#44474e" fontSize="11" textAnchor="middle" x="340" y="176">Jum</text>
          <rect fill="#0051d5" height="103" rx="3" width="14" x="398" y="52"></rect>
          <rect fill="#c5c6ce" height="11" rx="3" width="14" x="414" y="144"></rect>
          <text fill="#44474e" fontSize="11" textAnchor="middle" x="408" y="176">Sab</text>
          <rect fill="#0051d5" height="25" opacity="0.3" rx="3" width="14" x="466" y="130"></rect>
          <rect fill="#c5c6ce" height="5" opacity="0.3" rx="3" width="14" x="482" y="150"></rect>
          <text fill="#75777e" fontSize="11" textAnchor="middle" x="476" y="176">Min (Piket)</text>
        </svg>
      </div>

      <div className="flex items-center justify-between pt-space-xs bg-surface-container-low px-space-md py-space-xs rounded-lg mt-2">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Tingkat kepatuhan waktu masuk sebelum pukul 07.00:</span>
        <span className="font-body-sm-medium text-body-sm-medium text-secondary">89.4% (Tinggi)</span>
      </div>
    </div>
  )
}

export default WeeklyTrend