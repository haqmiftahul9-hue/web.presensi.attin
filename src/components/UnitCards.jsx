const unitData = [
  {
    icon: 'child_care',
    label: 'TK & PAUD IT RJ',
    count: '24 Pendidik/Staf',
    subtitle: '100% Terverifikasi Presensi',
  },
  {
    icon: 'menu_book',
    label: 'SD Islam RJ',
    count: '68 Pendidik/Staf',
    subtitle: 'Unit Terbesar (Paralel 4)',
  },
  {
    icon: 'history_edu',
    label: 'SMP Islam RJ',
    count: '54 Pendidik/Staf',
    subtitle: 'Guru Mapel & Wali Kelas',
  },
  {
    icon: 'account_balance',
    label: 'SMA & Sekretariat',
    count: '63 Pendidik/Staf',
    subtitle: 'Termasuk Biro Pusat',
  },
]

function UnitCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
      {unitData.map((unit) => (
        <div key={unit.label} className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-secondary flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">{unit.icon}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">{unit.label}</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">{unit.count}</span>
            <span className="font-body-sm text-body-sm text-secondary truncate">{unit.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default UnitCards