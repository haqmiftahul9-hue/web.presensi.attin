import { useSimPres, selectUnitName } from '../store/simPresStore.jsx'
import { EMPLOYEE_COLUMNS, EMPLOYEE_GROUPS } from '../data/employeeSchema.js'

const FIELD_CLASS = 'font-body-md-medium text-body-md-medium text-on-surface block break-words'
const VALUE_CLASS = 'text-[11px] text-on-surface-variant'

function Row({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">{label}</span>
      <span className={`${FIELD_CLASS} ${mono ? 'font-mono text-body-md' : ''}`}>{value}</span>
    </div>
  )
}

function PresenceRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">{label}</span>
      <span className={FIELD_CLASS}>{value}</span>
    </div>
  )
}

function DetailEmployeeModal({ staff, onClose }) {
  const { state } = useSimPres()
  if (!staff) return null

  const unitName = selectUnitName(state, staff.unitId)
  const isAktif = staff.status === 'Aktif'
  const presence = staff.masuk
    ? `${staff.masuk} WIB${staff.late > 0 ? ` (terlambat ${staff.late} menit)` : ' (tepat waktu)'}`
    : 'Belum presensi hari ini'

  const valueOf = (key) => {
    if (key === 'unitId') return unitName
    const value = staff[key]
    return value === undefined || value === null || value === '' ? '-' : String(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div className="flex items-start gap-space-sm min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-body-md-medium flex-shrink-0">
              {(staff.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-md text-headline-md text-primary leading-tight" id="modalTitle">
                Detail Pegawai
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 truncate">
                {staff.name} &middot; {unitName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-sm flex-shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-body-sm-medium text-body-sm-medium ${
                isAktif ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAktif ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
              {isAktif ? 'Aktif' : 'Nonaktif'}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              title="Tutup dialog"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="p-space-lg overflow-y-auto flex flex-col gap-space-lg">
          <section className="flex flex-col gap-space-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-space-md">
              <Row label="NIY" value={valueOf('niy')} mono />
              <Row label="NIP" value={valueOf('nip')} mono />
            </div>
          </section>

          {EMPLOYEE_GROUPS.map((group) => {
            const columns = EMPLOYEE_COLUMNS.filter((c) => c.group === group && c.key !== 'niy' && c.key !== 'nip')
            if (columns.length === 0) return null
            return (
              <section key={group} className="flex flex-col gap-space-sm">
                <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-secondary border-b border-outline/20 pb-1">
                  Data {group}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-space-md">
                  {columns.map((col) => (
                    <Row key={col.key} label={col.label} value={valueOf(col.key)} />
                  ))}
                </div>
              </section>
            )
          })}

          <section className="flex flex-col gap-space-sm">
            <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-secondary border-b border-outline/20 pb-1">
              Presensi Hari Ini
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-space-md">
              <PresenceRow label="Jam Masuk" value={presence} />
              <PresenceRow label="Metode Presensi" value={staff.method || '-'} />
              <PresenceRow label="Total Terlambat" value={`${staff.late || 0} menit`} />
              <PresenceRow
                label="Keterangan"
                value={staff.outsideRadius ? 'Di luar radius geofence' : staff.alpha ? 'Tanpa keterangan (alpha)' : '-'}
              />
            </div>
          </section>

          {staff.unitId && (
            <p className={VALUE_CLASS}>
              Data bersumber dari store SimPres. Unit: {unitName}. Terakhir diubah pada data sesi ini.
            </p>
          )}
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
