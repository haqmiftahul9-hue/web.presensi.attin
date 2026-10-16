import { useState, useRef, useEffect } from 'react'
import { useSimPres, addActivityLog, selectCurrentUser, nextStaffId } from '../store/simPresStore.jsx'
import { readSpreadsheet, validateImport, draftToStaff } from '../data/employeeImport.js'
import { downloadTemplate } from '../data/employeeTemplate.js'
import { EMPLOYEE_COLUMNS } from '../data/employeeSchema.js'

function ImportModal({ show, onClose, onImported }) {
  const { state, dispatch } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (show) {
      setSelectedFile(null)
      setPreview(null)
      setResult(null)
      setIsProcessing(false)
    }
  }, [show])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setPreview(null)
    setIsProcessing(true)
    try {
      const parsed = await readSpreadsheet(file)
      const validated = validateImport(parsed, state)
      setSelectedFile(file)
      setPreview({
        mapped: validated.mapped,
        rows: validated.valid,
        errors: validated.errors,
        headerRow: parsed.detectedHeaderRow,
        sample: validated.valid.slice(0, 3),
      })
    } catch (err) {
      setSelectedFile(null)
      setResult({ success: 0, imported: 0, errors: [err.message] })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    if (!preview || preview.rows.length === 0) return
    setIsProcessing(true)
    const errors = [...preview.errors]
    let success = 0
    let firstAddedId = null
    let id = nextStaffId(state)
    for (const { rowNum, draft } of preview.rows) {
      const newId = id++
      dispatch({ type: 'ADD_STAFF', payload: { ...draftToStaff(draft), id: newId } })
      if (firstAddedId === null) firstAddedId = newId
      success++
      void rowNum
    }
    if (success > 0) {
      addActivityLog(
        dispatch, state, 'Import', `Pegawai • ${success} Data`,
        `Import ${success} pegawai dari file ${selectedFile?.name || 'template'} (${preview.rows.length} baris valid)`,
        null, null, currentUser?.unitId,
      )
    }
    setResult({ success, imported: success, errors })
    setPreview(null)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setIsProcessing(false)
    if (onImported) onImported(firstAddedId)
  }

  const handleClose = () => {
    setSelectedFile(null)
    setPreview(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const sampleColumns = preview ? preview.mapped.map((c) => c.key) : []

  return (
    <div className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 ${show ? 'flex' : 'hidden'} items-center justify-center transition-all`}>
      <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-[620px] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">upload_file</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-foreground leading-snug">Import Data Pegawai</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Unggah berkas .xlsx, .xls, atau .csv sesuai format template.</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-y-auto text-xs">
          <div
            className="w-full rounded-xl bg-muted/20 border-2 border-dashed border-border hover:border-primary p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/40 transition-colors group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-xl bg-card border border-border group-hover:border-primary/40 group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary flex items-center justify-center mb-2.5 transition-colors shadow-xs">
              <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
            </div>
            <p className="text-xs font-semibold text-foreground">
              Klik untuk memilih berkas dari komputer
            </p>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Format: .XLSX, .XLS, .CSV (Maksimal 10 MB)
            </span>
            <input
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              type="file"
              onChange={handleFileSelect}
            />
          </div>

          {isProcessing && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-foreground flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-primary animate-spin">progress_activity</span>
              <span className="text-xs font-medium">Memvalidasi dan memproses berkas...</span>
            </div>
          )}

          {preview && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-foreground flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">check_circle</span>
                <span>Berkas Valid: {selectedFile?.name}</span>
              </div>
              <p className="text-xs text-foreground/80">
                {preview.rows.length} baris siap diimpor &middot; header terdeteksi pada baris {preview.headerRow} &middot;{' '}
                {preview.mapped.length} kolom dikenali.
              </p>
              {preview.rows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border bg-card mt-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted text-left border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        {sampleColumns.map((key) => (
                          <th key={key} className="py-2 px-3 whitespace-nowrap">
                            {EMPLOYEE_COLUMNS.find((c) => c.key === key)?.label || key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {preview.sample.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/40">
                          {sampleColumns.map((key) => (
                            <td key={key} className="py-1.5 px-3 whitespace-nowrap text-foreground">{row.draft[key] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {preview.errors.length > 0 && (
                <details className="mt-1" open>
                  <summary className="cursor-pointer text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {preview.errors.length} baris dilewati (tidak valid)
                  </summary>
                  <ul className="text-[11px] text-amber-600 dark:text-amber-400/90 list-disc pl-5 mt-1 space-y-0.5 max-h-32 overflow-auto">
                    {preview.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {preview.errors.length > 10 && <li>...dan {preview.errors.length - 10} baris lagi</li>}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="p-4 rounded-xl bg-muted/40 border border-border text-muted-foreground flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">info</span>
              <span>Ketentuan Berkas Template:</span>
            </div>
            <ul className="text-[11px] text-muted-foreground list-disc pl-5 space-y-1">
              <li>Kolom <strong className="text-foreground">NIY</strong> dan <strong className="text-foreground">Nama Lengkap</strong> wajib terisi dan NIY bersifat unik.</li>
              <li>Kolom <strong className="text-foreground">Unit Sekolah</strong> harus persis sesuai daftar unit terdaftar di sistem.</li>
              <li>Jabatan default &quot;Guru&quot; jika kosong, Status default &quot;Aktif&quot;.</li>
            </ul>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <button
                onClick={() => downloadTemplate(state)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">file_download</span>
                <span>Unduh Template Format Excel</span>
              </button>
            </div>
          </div>

          {result && (
            <div className={`p-4 rounded-xl flex flex-col gap-2 border ${result.imported > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  {result.imported > 0 ? 'check_circle' : 'error'}
                </span>
                <span className="text-xs font-semibold">
                  {result.imported > 0 ? 'Import Selesai' : 'Import Gagal'}
                </span>
              </div>
              <p className="text-xs">
                Berhasil: <strong className="font-bold">{result.success}</strong> pegawai ditambahkan ke tabel.
                {result.errors.length > 0 && (
                  <span className="ml-2 text-destructive">Gagal: {result.errors.length}</span>
                )}
              </p>
              {result.errors.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[11px] font-semibold text-destructive">Lihat rincian kesalahan</summary>
                  <ul className="text-[11px] text-destructive list-disc pl-5 mt-1 space-y-0.5 max-h-32 overflow-auto">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 10 && <li>...dan {result.errors.length - 10} baris lagi</li>}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between gap-2.5">
          <button
            onClick={handleClose}
            className="h-9 px-4 rounded-lg bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            type="button"
          >
            {result ? 'Tutup' : 'Batal'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!preview || preview.rows.length === 0 || isProcessing}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">{isProcessing ? 'hourglass_empty' : 'sync'}</span>
              <span>
                {isProcessing
                  ? 'Memproses...'
                  : preview
                    ? `Impor ${preview.rows.length} Data`
                    : 'Upload & Proses Data'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportModal
