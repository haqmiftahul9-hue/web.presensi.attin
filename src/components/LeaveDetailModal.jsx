import { useState } from 'react'

function LeaveDetailModal({ isOpen, onClose, leave }) {
  const [activeTab, setActiveTab] = useState('detail')

  if (!isOpen || !leave) return null

  const statusClassMap = {
    'Menunggu': 'bg-amber-50 text-amber-700',
    'Disetujui': 'bg-emerald-50 text-emerald-700',
    'Ditolak': 'bg-red-50 text-red-700',
  }
  const statusDotMap = {
    'Menunggu': 'bg-amber-500',
    'Disetujui': 'bg-emerald-500',
    'Ditolak': 'bg-red-500',
  }
  const avatarClassMap = {
    'Sakit': 'bg-emerald-100 text-emerald-900',
    'Izin Pribadi': 'bg-amber-100 text-amber-900',
    'Cuti Penting': 'bg-indigo-100 text-indigo-900',
    'Cuti Bersalin': 'bg-purple-100 text-purple-900',
    'Cuti Besar': 'bg-teal-100 text-teal-900',
  }
  const jenisClassMap = {
    'Sakit': 'bg-blue-50 text-blue-700',
    'Izin Pribadi': 'bg-orange-50 text-orange-700',
    'Cuti Penting': 'bg-indigo-50 text-indigo-700',
    'Cuti Bersalin': 'bg-purple-50 text-purple-700',
    'Cuti Besar': 'bg-teal-50 text-teal-700',
  }

  const initials = leave.name ? leave.name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-primary leading-snug">
              Detail Pengajuan Izin/Cuti
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Informasi lengkap pengajuan
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-space-lg overflow-y-auto space-y-space-md">
          {/* Status Badge & Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-body-md-medium text-body-md-medium flex-shrink-0 ${avatarClassMap[leave.jenis] || 'bg-surface-container text-on-surface'}`}>
                {initials}
              </div>
              <div>
                <span className="font-body-lg text-body-lg text-on-surface">{leave.name}</span>
                <div className="font-body-sm text-body-sm text-on-surface-variant">NIY: {leave.niy} • {leave.role}</div>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body-sm-medium text-body-sm-medium ${statusClassMap[leave.status] || 'bg-surface-container text-on-surface'}`}>
              <span className={`w-2 h-2 rounded-full ${statusDotMap[leave.status] || 'bg-outline'}`}></span>
              {leave.status}
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-surface-container-low p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-4 py-2 rounded-md font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer ${
                activeTab === 'detail' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}>
              Detail
            </button>
            <button
              onClick={() => setActiveTab('lampiran')}
              className={`px-4 py-2 rounded-md font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer ${
                activeTab === 'lampiran' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}>
              Lampiran
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'detail' && (
            <div className="space-y-space-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Jenis Izin/Cuti</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-body-sm-medium text-body-sm-medium ${jenisClassMap[leave.jenis] || 'bg-surface-container text-on-surface'}`}>
                    {leave.jenis}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Unit</span>
                  <span className="font-body-md text-body-md text-on-surface">{leave.unitName || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Periode</span>
                  <span className="font-body-md text-body-md text-on-surface">{leave.periode}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Durasi</span>
                  <span className="font-body-md text-body-md text-primary">{leave.durasi}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Alasan / Keterangan</span>
                <div className="p-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface whitespace-pre-wrap">
                  {leave.keterangan || leave.alasan || '-'}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Diajukan Pada</span>
                <span className="font-body-md text-body-md text-on-surface">{leave.createdAt || '-'}</span>
              </div>
            </div>
          )}

          {activeTab === 'lampiran' && (
            <div className="space-y-space-md">
              <div className="p-4 bg-surface-container-low rounded-lg border border-outline/30">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-primary-container/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-[28px]">description</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-body-md-medium text-body-md-medium text-on-surface truncate block">{leave.lampiran}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">PDF Document</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-space-sm">
                <button className="flex-1 h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-body-md-medium text-body-md-medium shadow-sm hover:bg-primary transition-colors flex items-center justify-center gap-space-xs cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  <span>Lihat Lampiran</span>
                </button>
                <button className="flex-1 h-10 px-space-md rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface font-body-md-medium text-body-md-medium transition-colors flex items-center justify-center gap-space-xs cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Unduh</span>
                </button>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Lampiran akan dibuka di tab baru / diunduh ke perangkat.
              </p>
            </div>
          )}
        </div>

        <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-end gap-space-md">
          <button
            onClick={onClose}
            className="px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            <span>Tutup</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeaveDetailModal