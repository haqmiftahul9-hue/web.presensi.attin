import { useState } from 'react'
import {
  SEMUA_JENIS, WARNA_STATUS_PORTAL, WARNA_TITIK_STATUS, LABEL_STATUS_PANJANG,
} from '../data/jenisIzinCuti.js'

function LeaveDetailModal({ isOpen, onClose, leave }) {
  const [activeTab, setActiveTab] = useState('detail')

  if (!isOpen || !leave) return null

  // Warna status & jenis dibaca dari daftar terpusat, supaya jenis baru dari
  // form mobile (mis. "Cuti Melahirkan") tampil dengan warna yang benar.
  const statusClassMap = WARNA_STATUS_PORTAL
  const statusDotMap = WARNA_TITIK_STATUS
  const avatarClassMap = Object.fromEntries(SEMUA_JENIS.map((j) => [j.nama, j.warnaAvatar]))
  const jenisClassMap = Object.fromEntries(SEMUA_JENIS.map((j) => [j.nama, j.warna]))

  const initials = leave.name ? leave.name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Detail Pengajuan Izin/Cuti
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi lengkap dan berkas pengajuan izin atau cuti pegawai.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status Badge & Header */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarClassMap[leave.jenis] || 'bg-slate-200 text-slate-700'}`}>
                {initials}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900">{leave.name}</span>
                <div className="text-[11px] text-slate-500 font-medium">NIY: {leave.niy} • {leave.role}</div>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusClassMap[leave.status] || 'bg-slate-100 text-slate-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotMap[leave.status] || 'bg-slate-400'}`}></span>
              {LABEL_STATUS_PANJANG[leave.status] || leave.status}
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-slate-100/80 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'detail' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}>
              Detail
            </button>
            <button
              onClick={() => setActiveTab('lampiran')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'lampiran' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}>
              Lampiran
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'detail' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Jenis Izin/Cuti</span>
                  <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-semibold ${jenisClassMap[leave.jenis] || 'bg-slate-100 text-slate-700'}`}>
                    {leave.jenis}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unit</span>
                  <span className="text-xs font-semibold text-slate-800">{leave.unitName || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Periode</span>
                  <span className="text-xs font-medium text-slate-800">{leave.periode}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Durasi</span>
                  <span className="text-xs font-bold text-blue-700">{leave.durasi}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Alasan / Keterangan</span>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {leave.keterangan || leave.alasan || '-'}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Diajukan Pada</span>
                <span className="text-xs font-medium text-slate-600">{leave.createdAt || '-'}</span>
              </div>
            </div>
          )}

          {activeTab === 'lampiran' && (
            <div className="space-y-4 pt-1">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                    <span className="material-symbols-outlined text-[24px]">description</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate block">{leave.lampiran || 'Berkas Lampiran'}</span>
                    <span className="text-[11px] text-slate-400">Dokumen PDF / Berkas Pendukung</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button className="flex-1 h-9 px-4 rounded-lg bg-blue-600 text-white font-semibold text-xs shadow-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Lihat Lampiran</span>
                </button>
                <button className="flex-1 h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Unduh</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Lampiran akan dibuka di tab baru / diunduh ke perangkat.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>Tutup</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeaveDetailModal