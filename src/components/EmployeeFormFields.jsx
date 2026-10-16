import { useSimPres } from '../store/simPresStore.jsx'
import { EMPLOYEE_COLUMNS, EMPLOYEE_GROUPS } from '../data/employeeSchema.js'

const INPUT_CLASS =
  'w-full h-9 px-3 rounded-lg bg-card border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs text-foreground placeholder:text-muted-foreground shadow-xs transition-all'
const ERROR_INPUT_CLASS = '!border-destructive focus:!border-destructive focus:!ring-destructive/20'
const LABEL_CLASS = 'text-xs font-semibold text-foreground/90'
const HELP_CLASS = 'text-[11px] text-muted-foreground'

// Form bersama untuk Tambah & Edit: satu definisi kolom, satu tampilan.
function EmployeeFormFields({ form, setForm, errors }) {
  const { state } = useSimPres()

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const errorOf = (key) => errors?.[key]

  return (
    <div className="flex flex-col gap-5">
      {EMPLOYEE_GROUPS.map((group) => {
        const columns = EMPLOYEE_COLUMNS.filter((c) => c.group === group)
        if (columns.length === 0) return null
        return (
          <fieldset key={group} className="flex flex-col gap-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-primary border-b border-border pb-1.5 block w-full">
              Data {group}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {columns.map((col) => {
                const err = errorOf(col.key)
                const wide = col.type === 'text' && col.key === 'alamat'
                return (
                  <div key={col.key} className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
                    <label className={LABEL_CLASS} htmlFor={`emp-${col.key}`}>
                      {col.label} {col.required ? <span className="text-rose-500">*</span> : null}
                    </label>

                    {col.type === 'unit' ? (
                      <select
                        className={`${INPUT_CLASS} ${err ? ERROR_INPUT_CLASS : ''}`}
                        id={`emp-${col.key}`}
                        value={form.unitId || ''}
                        onChange={(e) => setValue('unitId', e.target.value)}
                      >
                        <option value="">Pilih Unit Sekolah</option>
                        {state.units.map((u) => (
                          <option key={u.id} value={u.id}>{u.nama}</option>
                        ))}
                      </select>
                    ) : col.type === 'select' ? (
                      <select
                        className={`${INPUT_CLASS} ${err ? ERROR_INPUT_CLASS : ''}`}
                        id={`emp-${col.key}`}
                        value={form[col.key] || ''}
                        onChange={(e) => setValue(col.key, e.target.value)}
                      >
                        <option value="">{col.required ? `Pilih ${col.label}` : `Tidak diisi`}</option>
                        {col.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        className={`${INPUT_CLASS} ${err ? ERROR_INPUT_CLASS : ''}`}
                        id={`emp-${col.key}`}
                        type={col.type === 'date' ? 'text' : col.type}
                        placeholder={
                          col.type === 'date'
                            ? 'YYYY-MM-DD'
                            : col.key === 'role'
                            ? 'Ketik nama jabatan'
                            : col.label
                        }
                        value={form[col.key] || ''}
                        onChange={(e) => setValue(col.key, e.target.value)}
                      />
                    )}

                    {err ? (
                      <span className="text-[11px] text-destructive">{err}</span>
                    ) : col.key === 'unitId' && form.unitId ? (
                      <span className={HELP_CLASS}>
                        {state.units.find((u) => u.id === form.unitId)?.nama}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}

export default EmployeeFormFields
