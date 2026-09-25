import { useState } from 'react'
import { useSimPres, selectUnitName } from '../store/simPresStore.jsx'

function DetailEmployeeModal({ staff, onClose }) {
  const { state } = useSimPres()
  const unitName = selectUnitName(state, staff.unitId)

  const roleDisplayMap = {
    'Guru PAI': 'Pendidik Tetap Yayasan',
    'Guru Kelas 6 & Kurikulum': 'Tim Pengembang Akademik',
    'Guru Kelas 3 • Tahfidz': 'Koordinator Keagamaan',
    'Guru Kelas 1 • Tematik': 'Pendidik Kelas Bawah',
    'Guru Sentra': 'Sentra Kreativitas Anak',
    'Guru Biologi & Laboran': 'Cuti Studi Lanjut',
    'Staf Administrasi': 'Staf Administrasi',
  }

  const roleDisplay = roleDisplayMap[staff.role] || staff.role

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary leading-tight" id="modalTitle">
              Detail Pegawai
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5" id="modalSubtitle">
              Lihat informasi lengkap pegawai yang dipilih.
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
          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">NIY/NIP</label>
            <span className="font-body-md-medium text-body-md-medium text-on-surface block">{staff.niy}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Nama Lengkap</label>
            <span className="font-body-md-medium text-body-md-medium text-on-surface block">{staff.name}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Unit Sekolah</label>
            <span className="font-body-md-medium text-body-md-medium text-on-surface block">{unitName}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Jabatan</label>
            <span className="font-body-md-medium text-body-md-medium text-on-surface block">{roleDisplay}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Status</label>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body-sm-medium text-body-sm-medium ${
                staff.status === 'Aktif'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {staff.status === 'Aktif' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Aktif
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                  Nonaktif
                </>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Jam Masuk</label>
            <span className="font-body-md-medium text-body-md-medium text-on-surface block">
              {staff.masuk ? `${staff.masuk} WIB` : '-'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Metode Presensi</label>
            <span className="font-body-md-medium text-body-md-medium text-on-surface block">
              {staff.method || '-'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Terlambat</label>
            <span className="font-body-md-medium text-body-md-medium text-on-surface block">
              {staff.late} menit
            </span>
          </div>
        </div>

        <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-end gap-space-md">
          <button
            onClick={onClose}
            className="px-space-md py-2 rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium transition-colors cursor-pointer"
            type="button"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

export default DetailEmployeeModal