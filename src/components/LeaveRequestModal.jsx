import { useState, useEffect } from 'react'

const JENIS_OPTIONS = [
  'Sakit (Surat Dokter)',
  'Cuti Alasan Penting',
  'Cuti Bersalin/Melahirkan',
  'Cuti Besar',
  'Izin Keperluan Pribadi',
]

function LeaveRequestModal({ isOpen, onClose, onSave, staffList, units }) {
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [jenis, setJenis] = useState('')
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')
  const [durasi, setDurasi] = useState('0 Hari')
  const [keterangan, setKeterangan] = useState('')
  const [lampiran, setLampiran] = useState(null)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const selectedStaff = staffList.find(s => s.id === Number(selectedStaffId))
  const selectedUnit = units.find(u => u.id === selectedStaff?.unitId)

  useEffect(() => {
    if (tanggalMulai && tanggalSelesai) {
      const start = new Date(tanggalMulai)
      const end = new Date(tanggalSelesai)
      const diffTime = Math.abs(end - start)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      setDurasi(`${diffDays} Hari`)
    } else if (tanggalMulai) {
      setDurasi('1 Hari')
    } else {
      setDurasi('0 Hari')
    }
  }, [tanggalMulai, tanggalSelesai])

  useEffect(() => {
    if (isOpen) {
      setSelectedStaffId('')
      setJenis('')
      setTanggalMulai('')
      setTanggalSelesai('')
      setDurasi('0 Hari')
      setKeterangan('')
      setLampiran(null)
      setErrors({})
      setTouched({})
    }
  }, [isOpen])

  const validateField = (field, value) => {
    switch (field) {
      case 'selectedStaffId':
        if (!value) return 'Pegawai wajib dipilih'
        return ''
      case 'jenis':
        if (!value) return 'Jenis izin/cuti wajib dipilih'
        return ''
      case 'tanggalMulai':
        if (!value) return 'Tanggal mulai wajib diisi'
        return ''
      case 'tanggalSelesai':
        if (!value) return 'Tanggal selesai wajib diisi'
        if (tanggalMulai && new Date(value) < new Date(tanggalMulai)) return 'Tanggal selesai tidak boleh sebelum tanggal mulai'
        return ''
      case 'keterangan':
        if (!value.trim()) return 'Keterangan/alasan wajib diisi'
        if (value.trim().length < 5) return 'Keterangan minimal 5 karakter'
        return ''
      case 'lampiran':
        if (!value) return 'Lampiran wajib diunggah'
        return ''
      default:
        return ''
    }
  }

  const handleBlur = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleChange = (field, value) => {
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
    switch (field) {
      case 'selectedStaffId':
        setSelectedStaffId(value)
        break
      case 'jenis':
        setJenis(value)
        break
      case 'tanggalMulai':
        setTanggalMulai(value)
        break
      case 'tanggalSelesai':
        setTanggalSelesai(value)
        break
      case 'keterangan':
        setKeterangan(value)
        break
      case 'lampiran':
        setLampiran(value)
        break
    }
  }

  const validateAll = () => {
    const newErrors = {
      selectedStaffId: validateField('selectedStaffId', selectedStaffId),
      jenis: validateField('jenis', jenis),
      tanggalMulai: validateField('tanggalMulai', tanggalMulai),
      tanggalSelesai: validateField('tanggalSelesai', tanggalSelesai),
      keterangan: validateField('keterangan', keterangan),
      lampiran: validateField('lampiran', lampiran),
    }
    setErrors(newErrors)
    setTouched({
      selectedStaffId: true,
      jenis: true,
      tanggalMulai: true,
      tanggalSelesai: true,
      keterangan: true,
      lampiran: true,
    })
    return !Object.values(newErrors).some(e => e)
  }

  const handleSubmit = () => {
    if (validateAll()) {
      const newLeave = {
        staffId: Number(selectedStaffId),
        jenis: jenis.split(' ')[0],
        periode: `${formatDate(tanggalMulai)} - ${formatDate(tanggalSelesai)}`,
        durasi,
        lampiran: lampiran?.name || 'Dokumen.pdf',
        status: 'Menunggu',
      }
      onSave(newLeave)
      onClose()
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const options = { day: '2-digit', month: 'short', year: 'numeric' }
    return date.toLocaleDateString('id-ID', options).replace('.', '')
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleChange('lampiran', file)
    }
  }

  const getInputClass = (field) => {
    const base = 'w-full h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-rose-500 focus:border-rose-500' : 'border-outline focus:border-secondary/50'}`
  }

  const getTextareaClass = (field) => {
    const base = 'px-3.5 py-2.5 rounded-lg bg-surface-container-low border focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface transition-all resize-none leading-relaxed'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-rose-500 focus:border-rose-500' : 'border-outline focus:border-secondary/50'}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-space-lg py-space-md border-b border-outline/20 flex items-start justify-between bg-surface-container/50">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-primary leading-snug">
              Ajukan Izin Staf (Manual TU)
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Isi formulir pengajuan izin/cuti untuk pegawai.
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
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="selectPegawai">
              Nama Pegawai <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                className={getInputClass('selectedStaffId') + ' pr-10 appearance-none cursor-pointer'}
                id="selectPegawai"
                value={selectedStaffId}
                onChange={e => handleChange('selectedStaffId', e.target.value)}
                onBlur={e => handleBlur('selectedStaffId', e.target.value)}
              >
                <option value="">Pilih Pegawai</option>
                {staffList.filter(s => s.status === 'Aktif').map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} (NIY: {staff.niy})
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">person</span>
            </div>
            {errors.selectedStaffId && touched.selectedStaffId && (
              <span className="font-body-sm text-body-sm text-rose-500">{errors.selectedStaffId}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputNIY">
                NIY/NIP
              </label>
              <input
                className="w-full h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface-variant transition-all"
                id="inputNIY"
                type="text"
                value={selectedStaff?.niy || ''}
                readOnly
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputUnit">
                Unit
              </label>
              <input
                className="w-full h-10 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/20 font-body-md text-body-md text-on-surface-variant transition-all"
                id="inputUnit"
                type="text"
                value={selectedUnit?.nama || ''}
                readOnly
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="selectJenis">
              Jenis Izin/Cuti <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                className={getInputClass('jenis') + ' pr-10 appearance-none cursor-pointer'}
                id="selectJenis"
                value={jenis}
                onChange={e => handleChange('jenis', e.target.value)}
                onBlur={e => handleBlur('jenis', e.target.value)}
              >
                <option value="">Pilih Jenis Izin/Cuti</option>
                {JENIS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">event_note</span>
            </div>
            {errors.jenis && touched.jenis && <span className="font-body-sm text-body-sm text-rose-500">{errors.jenis}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputTanggalMulai">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">calendar_month</span>
                <input
                  className={getInputClass('tanggalMulai') + ' pl-9'}
                  id="inputTanggalMulai"
                  type="date"
                  value={tanggalMulai}
                  onChange={e => handleChange('tanggalMulai', e.target.value)}
                  onBlur={e => handleBlur('tanggalMulai', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              {errors.tanggalMulai && touched.tanggalMulai && (
                <span className="font-body-sm text-body-sm text-rose-500">{errors.tanggalMulai}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputTanggalSelesai">
                Tanggal Selesai <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">calendar_month</span>
                <input
                  className={getInputClass('tanggalSelesai') + ' pl-9'}
                  id="inputTanggalSelesai"
                  type="date"
                  value={tanggalSelesai}
                  onChange={e => handleChange('tanggalSelesai', e.target.value)}
                  onBlur={e => handleBlur('tanggalSelesai', e.target.value)}
                  min={tanggalMulai || new Date().toISOString().split('T')[0]}
                />
              </div>
              {errors.tanggalSelesai && touched.tanggalSelesai && (
                <span className="font-body-sm text-body-sm text-rose-500">{errors.tanggalSelesai}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputDurasi">
              Durasi (Otomatis)
            </label>
            <input
              className="w-full h-10 px-3.5 py-2 rounded-lg bg-surface-container-high border border-outline focus:outline-none font-body-md text-body-md text-primary font-medium text-center transition-all"
              id="inputDurasi"
              type="text"
              value={durasi}
              readOnly
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">Dihitung otomatis dari tanggal mulai dan selesai</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface" htmlFor="inputKeterangan">
              Keterangan/Alasan <span className="text-rose-500">*</span>
            </label>
            <textarea
              className={getTextareaClass('keterangan')}
              id="inputKeterangan"
              placeholder="Tuliskan alasan izin/cuti..."
              rows={3}
              value={keterangan}
              onChange={e => handleChange('keterangan', e.target.value)}
              onBlur={e => handleBlur('keterangan', e.target.value)}
            />
            {errors.keterangan && touched.keterangan && (
              <span className="font-body-sm text-body-sm text-rose-500">{errors.keterangan}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
              Upload Lampiran <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="file"
                id="inputLampiran"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className={`w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  lampiran ? 'border-emerald-500 bg-emerald-50' : 'border-outline/50 hover:border-secondary/50 hover:bg-surface-container-low'
                }`}
              >
                {lampiran ? (
                  <>
                    <span className="material-symbols-outlined text-emerald-600 text-[32px]">check_circle</span>
                    <span className="font-body-sm text-body-sm text-emerald-700">{lampiran.name}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {(lampiran.size / 1024).toFixed(1)} KB
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-outline text-[32px]">cloud_upload</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Seret & lepas file di sini atau klik untuk pilih
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">
                      PDF, DOC, JPG, PNG (Max 5MB)
                    </span>
                  </>
                )}
              </div>
            </div>
            {errors.lampiran && touched.lampiran && (
              <span className="font-body-sm text-body-sm text-rose-500">{errors.lampiran}</span>
            )}
          </div>
        </div>

        <div className="px-space-lg py-space-md bg-surface-container/50 border-t border-outline/20 flex items-center justify-end gap-space-md">
          <button
            onClick={onClose}
            className="px-space-md py-2 rounded-lg border border-outline bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-body-md-medium text-body-md-medium transition-colors cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Simpan Pengajuan</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeaveRequestModal