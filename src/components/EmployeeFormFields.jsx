import { useMemo } from 'react'
import { useSimPres, selectJabatanOptions } from '../store/simPresStore.jsx'
import { EMPLOYEE_COLUMNS, EMPLOYEE_GROUPS } from '../data/employeeSchema.js'

const INPUT_CLASS =
  'w-full h-9 px-3 rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs text-slate-800 placeholder:text-slate-400 transition-all'
const ERROR_INPUT_CLASS = 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
const LABEL_CLASS = 'text-xs font-semibold text-slate-700'
const HELP_CLASS = 'text-[11px] text-slate-400'

// Form bersama untuk Tambah & Edit: satu definisi kolom, satu tampilan.
function EmployeeFormFields({ form, setForm, errors }) {
  const { state } = useSimPres()
  const jabatanOptions = useMemo(() => selectJabatanOptions(state), [state])

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const errorOf = (key) => errors?.[key]
  const listed = useMemo(() => new Set(jabatanOptions.map((r) => r.toLowerCase())), [jabatanOptions])
  const isCustomJabatan = form.role ? !listed.has(form.role.toLowerCase()) : false

  return (
    <div className="flex flex-col gap-5">
      {EMPLOYEE_GROUPS.map((group) => {
        const columns = EMPLOYEE_COLUMNS.filter((c) => c.group === group)
        if (columns.length === 0) return null
        return (
          <fieldset key={group} className="flex flex-col gap-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-1.5 block w-full">
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
                    ) : col.type === 'jabatan' ? (
                      <>
                        <input
                          className={`${INPUT_CLASS} ${err ? ERROR_INPUT_CLASS : ''}`}
                          id={`emp-${col.key}`}
                          list="emp-jabatan-options"
                          placeholder="Pilih atau ketik jabatan"
                          type="text"
                          value={form.role || ''}
                          onChange={(e) => setValue('role', e.target.value)}
                        />
                        <datalist id="emp-jabatan-options">
                          {jabatanOptions.map((r) => <option key={r} value={r} />)}
                        </datalist>
                        {isCustomJabatan && (
                          <span className={HELP_CLASS}>Jabatan baru: &quot;{form.role}&quot; akan disimpan apa adanya.</span>
                        )}
                      </>
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
                        placeholder={col.type === 'date' ? 'YYYY-MM-DD' : col.label}
                        value={form[col.key] || ''}
                        onChange={(e) => setValue(col.key, e.target.value)}
                      />
                    )}

                    {err ? (
                      <span className="text-[11px] text-rose-600">{err}</span>
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
