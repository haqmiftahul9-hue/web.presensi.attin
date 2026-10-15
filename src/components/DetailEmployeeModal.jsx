import { useSimPres, selectUnitName } from '../store/simPresStore.jsx'
import { calculateAttendanceStatus } from '../data/jamKerja.js'
import { EMPLOYEE_COLUMNS, EMPLOYEE_GROUPS } from '../data/employeeSchema.js'

const FIELD_CLASS = 'text-xs font-semibold text-slate-800 mt-0.5 block break-words'
const LABEL_CLASS = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider block'

function Row({ label, value, mono = false }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className={LABEL_CLASS}>{label}</span>
      <span className={`${FIELD_CLASS} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function PresenceRow({ label, value }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className={LABEL_CLASS}>{label}</span>
      <span className={FIELD_CLASS}>{value}</span>
    </div>
  )
}

function DetailEmployeeModal({ staff, onClose }) {
  const { state } = useSimPres()
  if (!staff) return null

  const unitName = selectUnitName(state, staff.unitId)
  const isAktif = staff.status === 'Aktif'
  // Status kehadiran dihitung fungsi yang sama dengan seluruh halaman lain.
  const presensiHariIni = calculateAttendanceStatus(new Date(), staff.masuk || null)
  const presence = staff.masuk
    ? `${staff.masuk} WIB — ${presensiHariIni.label} (batas ${presensiHariIni.jamMasuk})`
    : 'Belum presensi hari ini'

  const valueOf = (key) => {
    if (key === 'unitId') return unitName
    const value = staff[key]
    return value === undefined || value === null || value === '' ? '-' : String(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {(staff.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 leading-snug" id="modalTitle">
                Detail Pegawai
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {staff.name} &middot; {unitName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isAktif ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAktif ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {isAktif ? 'Aktif' : 'Nonaktif'}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tutup dialog"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Row label="NIY" value={valueOf('niy')} mono />
              <Row label="NIP" value={valueOf('nip')} mono />
            </div>
          </div>

          {EMPLOYEE_GROUPS.map((group) => {
            const columns = EMPLOYEE_COLUMNS.filter((c) => c.group === group && c.key !== 'niy' && c.key !== 'nip')
            if (columns.length === 0) return null
            return (
              <div key={group} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 border-b border-slate-200/60 pb-1">
                  Data {group}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {columns.map((col) => (
                    <Row key={col.key} label={col.label} value={valueOf(col.key)} />
                  ))}
                </div>
              </div>
            )
          })}

          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 border-b border-slate-200/60 pb-1">
              Presensi Hari Ini
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <PresenceRow label="Jam Masuk" value={presence} />
              <PresenceRow label="Metode Presensi" value={staff.method || '-'} />
              <PresenceRow label="Hari Kerja" value={presensiHariIni.hari} />
              <PresenceRow label="Jam Kerja" value={`${presensiHariIni.jamMasuk} - ${presensiHariIni.jamPulang ?? 'bebas'}`} />
              <PresenceRow label="Keterlambatan" value={`${presensiHariIni.lateMinutes} menit`} />
              <PresenceRow
                label="Keterangan"
                value={staff.outsideRadius ? 'Di luar radius geofence' : staff.alpha ? 'Tanpa keterangan (alpha)' : '-'}
              />
            </div>
          </div>

          {staff.unitId && (
            <p className="text-[11px] text-slate-400">
              Data bersumber dari store SimPres &middot; Unit: {unitName}.
            </p>
          )}
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
