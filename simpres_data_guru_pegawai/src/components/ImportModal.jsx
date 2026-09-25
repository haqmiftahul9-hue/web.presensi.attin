import { useState, useRef } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'

function ImportModal({ show, onClose }) {
  const { state, dispatch } = useSimPres()
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewRows, setPreviewRows] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      rows.push(row)
    }
    return rows
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const parsed = parseCSV(text)
      setPreviewRows(parsed.slice(0, 5))
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!selectedFile) return
    setIsProcessing(true)
    setResult(null)
    try {
      const text = await selectedFile.text()
      const rows = parseCSV(text)
      let success = 0
      let errors = []
      const existingNIYs = new Set(state.staff.map(s => s.niy))
      const unitMap = new Map(state.units.map(u => [u.nama.toLowerCase(), u.id]))
      
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const rowNum = i + 2
        const niy = r.NIY || r.niy
        const name = r.Nama || r.nama
        const unitName = r.Unit || r.unit
        const role = r.Jabatan || r.jabatan
        const status = r.Status || r.status || 'Aktif'
        
        if (!niy) { errors.push(`Baris ${rowNum}: NIY kosong`); continue }
        if (!name) { errors.push(`Baris ${rowNum}: Nama kosong`); continue }
        if (existingNIYs.has(niy)) { errors.push(`Baris ${rowNum}: NIY ${niy} sudah ada`); continue }
        
        const unitId = unitMap.get(unitName?.toLowerCase())
        if (!unitId) { errors.push(`Baris ${rowNum}: Unit "${unitName}" tidak ditemukan`); continue }
        
const newStaff = {
           id: Date.now() + i,
           niy,
           name,
           role: role || 'Guru',
           unitId,
           status,
           masuk: null,
           method: null,
           late: 0,
           alpha: false,
           outsideRadius: false,
         }
        dispatch({ type: 'ADD_STAFF', payload: newStaff })
        existingNIYs.add(niy)
        success++
      }
      setResult({ success, errors })
    } catch (err) {
      setResult({ success: 0, errors: ['Gagal memproses file: ' + err.message] })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTriggerFile = () => {
    document.getElementById('import-file-input')?.click()
  }

  return (
    <div className={`fixed inset-0 z-50 bg-[#0b1f3d]/50 backdrop-blur-sm p-4 ${show ? 'flex' : 'hidden'} items-center justify-center transition-all`}>
      <div className="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-[560px] overflow-hidden flex flex-col">
        <div className="p-space-lg flex items-start justify-between bg-surface-container-low">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-[24px]">upload_file</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Import Data Pegawai</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Unggah file CSV untuk penambahan data massal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-space-lg flex flex-col gap-space-md">
          <div className="w-full rounded-xl bg-surface-container-low p-space-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container transition-colors group"
               onClick={handleTriggerFile}>
            <div className="w-14 h-14 rounded-full bg-surface-container group-hover:bg-secondary-fixed group-hover:text-secondary text-on-surface-variant flex items-center justify-center mb-space-sm transition-colors">
              <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
            </div>
            <p className="font-body-md-medium text-body-md-medium text-on-surface">
              Tarik file CSV ke sini atau <span className="text-secondary hover:underline font-body-md-medium">klik untuk memilih file</span>
            </p>
<span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
               Format file yang didukung: .CSV, .XLSX (Maks. 10 MB)
             </span>
             <input
               id="import-file-input"
               accept=".csv,.xlsx"
               className="hidden"
               type="file"
               onChange={handleFileSelect}
             />
          </div>
          
          {selectedFile && (
            <div className="p-space-md rounded-lg bg-green-50 text-on-surface flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-green-700 font-headline-sm">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span className="text-body-sm-medium">File dipilih: {selectedFile.name}</span>
              </div>
              {previewRows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        {Object.keys(previewRows[0]).map(h => <th key={h} className="p-2 font-medium">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b">
                          {Object.values(row).map((v, j) => <td key={j} className="p-2">{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          <div className="p-space-md rounded-lg bg-blue-50 text-on-surface flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-secondary font-headline-sm">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span className="text-body-sm-medium">Ketentuan Kolom Wajib:</span>
            </div>
            <ul className="font-body-sm text-on-surface-variant list-disc pl-5 space-y-1">
              <li>Kolom <strong className="text-on-surface">NIY (Nomor Induk Yayasan)</strong> harus unik dan tidak boleh kosong.</li>
              <li>Nama lengkap beserta gelar akademik dicantumkan pada kolom Nama.</li>
              <li>Unit kerja harus sesuai dengan penamaan unit terdaftar di sistem.</li>
              <li>Jabatan opsional, default "Guru".</li>
              <li>Status opsional, default "Aktif".</li>
            </ul>
            <div className="mt-1 pt-2 flex items-center justify-between text-body-sm">
              <button
                onClick={() => {
                  const csv = generateTemplateCSV(state.units)
                  downloadCSV(csv, 'template_import_pegawai.csv')
                }}
                className="font-body-sm-medium text-body-sm-medium text-secondary hover:underline flex items-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Unduh Template CSV</span>
              </button>
            </div>
          </div>
          
          {result && (
            <div className={`p-space-md rounded-lg flex flex-col gap-2 ${result.success > 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  {result.success > 0 ? 'check_circle' : 'error'}
                </span>
                <span className="font-body-md-medium">
                  {result.success > 0 ? 'Import Selesai' : 'Import Gagal'}
                </span>
              </div>
              <p className="font-body-sm">
                Berhasil: <strong>{result.success}</strong> pegawai ditambahkan.
                {result.errors.length > 0 && (
                  <span className="ml-2 text-rose-600">Error: {result.errors.length}</span>
                )}
              </p>
              {result.errors.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer font-body-sm text-rose-700">Lihat detail error</summary>
                  <ul className="font-body-xs text-rose-600 list-disc pl-5 mt-1 space-y-0.5 max-h-32 overflow-auto">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 10 && <li>...dan {result.errors.length - 10} error lainnya</li>}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
        <div className="p-space-md bg-surface-container-low flex items-center justify-end gap-space-xs">
          <button
            onClick={onClose}
            className="h-10 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium transition-colors cursor-pointer"
            type="button"
          >
            {result ? 'Tutup' : 'Batal'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!selectedFile || isProcessing}
              className="h-10 px-space-lg rounded-lg bg-primary-container hover:bg-[#132c54] text-on-primary font-body-md-medium flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">{isProcessing ? 'hourglass_empty' : 'sync'}</span>
              <span>{isProcessing ? 'Memproses...' : 'Upload & Proses Data'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function generateTemplateCSV(units) {
    const headers = ['NIY', 'Nama', 'Gelar', 'Unit', 'Jabatan', 'Status']
    const unitNames = units.map(u => u.nama).join(' | ')
    const exampleRows = [
      ['049001234', 'Budi Santoso, S.Pd', '', units[0]?.nama || 'TK IT RJ', 'Guru Kelas', 'Aktif'],
      ['049001235', 'Siti Rahayu, S.Ag', '', units[1]?.nama || 'SD Islam RJ', 'Guru PAI', 'Aktif'],
    ]
    const lines = [
      headers.join(','),
      ...exampleRows.map(r => r.join(',')),
    ]
    return lines.join('\n')
  }

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export default ImportModal