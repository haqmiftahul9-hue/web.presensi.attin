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
    let id = nextStaffId(state)
    for (const { rowNum, draft } of preview.rows) {
      dispatch({ type: 'ADD_STAFF', payload: { ...draftToStaff(draft), id: id++ } })
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
    if (onImported) onImported(success)
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
    <div className={`fixed inset-0 z-50 bg-[#0b1f3d]/50 backdrop-blur-sm p-4 ${show ? 'flex' : 'hidden'} items-center justify-center transition-all`}>
      <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-[640px] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-space-lg flex items-start justify-between bg-surface-container-low">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-[24px]">upload_file</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Import Data Pegawai</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Unggah file .xlsx / .xls / .csv sesuai template</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-space-lg flex flex-col gap-space-md overflow-y-auto">
          <div
            className="w-full rounded-xl bg-surface-container-low p-space-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container transition-colors group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 rounded-full bg-surface-container group-hover:bg-secondary-fixed group-hover:text-secondary text-on-surface-variant flex items-center justify-center mb-space-sm transition-colors">
              <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
            </div>
            <p className="font-body-md-medium text-body-md-medium text-on-surface">
              Klik untuk memilih file
            </p>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              Format didukung: .XLSX, .XLS, .CSV (Maks. 10 MB)
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
            <div className="p-space-md rounded-lg bg-surface-container-low text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              <span className="font-body-sm text-body-sm">Memproses file...</span>
            </div>
          )}

          {preview && (
            <div className="p-space-md rounded-lg bg-green-50 text-on-surface flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-green-700 font-headline-sm">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span className="text-body-sm-medium">File valid: {selectedFile?.name}</span>
              </div>
              <p className="font-body-sm text-body-sm">
                {preview.rows.length} baris siap diimpor &middot; header terdeteksi pada baris {preview.headerRow} &middot;{' '}
                {preview.mapped.length} kolom dikenali.
              </p>
              {preview.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        {sampleColumns.map((key) => (
                          <th key={key} className="p-2 font-medium whitespace-nowrap">
                            {EMPLOYEE_COLUMNS.find((c) => c.key === key)?.label || key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sample.map((row, i) => (
                        <tr key={i} className="border-b">
                          {sampleColumns.map((key) => (
                            <td key={key} className="p-2 whitespace-nowrap">{row.draft[key] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {preview.errors.length > 0 && (
                <details className="mt-1" open>
                  <summary className="cursor-pointer font-body-sm text-amber-700">
                    {preview.errors.length} baris dilewati (tidak diimpor)
                  </summary>
                  <ul className="font-body-sm text-amber-700 list-disc pl-5 mt-1 space-y-0.5 max-h-32 overflow-auto">
                    {preview.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {preview.errors.length > 10 && <li>...dan {preview.errors.length - 10} baris lagi</li>}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="p-space-md rounded-lg bg-blue-50 text-on-surface flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-secondary font-headline-sm">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span className="text-body-sm-medium">Ketentuan File:</span>
            </div>
            <ul className="font-body-sm text-on-surface-variant list-disc pl-5 space-y-1">
              <li>Kolom <strong className="text-on-surface">NIY</strong> dan <strong className="text-on-surface">Nama Lengkap</strong> wajib diisi serta NIY harus unik.</li>
              <li><strong className="text-on-surface">Unit Sekolah</strong> harus persis sama dengan unit terdaftar di sistem.</li>
              <li>Jabatan boleh dikosongkan (default &quot;Guru&quot;), Status default &quot;Aktif&quot;.</li>
              <li>Baris dengan NIY ganda, unit tak dikenal, atau kolom kosong akan dilewati dan ditampilkan sebagai error.</li>
            </ul>
            <div className="mt-1 pt-2 flex items-center justify-between text-body-sm">
              <button
                onClick={() => downloadTemplate(state)}
                className="font-body-sm-medium text-body-sm-medium text-secondary hover:underline flex items-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Unduh Template Excel</span>
              </button>
            </div>
          </div>

          {result && (
            <div className={`p-space-md rounded-lg flex flex-col gap-2 ${result.imported > 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  {result.imported > 0 ? 'check_circle' : 'error'}
                </span>
                <span className="font-body-md-medium">
                  {result.imported > 0 ? 'Import Selesai' : 'Import Gagal'}
                </span>
              </div>
              <p className="font-body-sm">
                Berhasil: <strong>{result.success}</strong> pegawai ditambahkan ke tabel.
                {result.errors.length > 0 && (
                  <span className="ml-2 text-rose-600">Error: {result.errors.length}</span>
                )}
              </p>
              {result.errors.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer font-body-sm text-rose-700">Lihat detail error</summary>
                  <ul className="font-body-xs text-rose-600 list-disc pl-5 mt-1 space-y-0.5 max-h-32 overflow-auto">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 10 && <li>...dan {result.errors.length - 10} baris lagi</li>}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="p-space-md bg-surface-container-low flex items-center justify-between gap-space-xs">
          <button
            onClick={handleClose}
            className="h-10 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium transition-colors cursor-pointer"
            type="button"
          >
            {result ? 'Tutup' : 'Batal'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!preview || preview.rows.length === 0 || isProcessing}
              className="h-10 px-space-lg rounded-lg bg-primary-container hover:bg-[#132c54] text-on-primary font-body-md-medium flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">{isProcessing ? 'hourglass_empty' : 'sync'}</span>
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
