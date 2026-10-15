import { useState, useEffect } from 'react'
import { JENIS_FORM, buildPengajuan, aturanLampiran } from '../data/jenisIzinCuti.js'

// Pilihan jenis reading from the centralized list — the same list as the
// mobile teacher form. Previously the options here were different names again
// ("Cuti Bersalin/Melahirkan"), and that inconsistency split the filter on
// the admin page.
const JENIS_OPTIONS = JENIS_FORM

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
        // Aturan sama dengan form mobile: wajib hanya untuk jenis yang
        // memang butuh bukti (mis. Cuti Melahirkan). Untuk yang lain lampiran
        // tetap opsional, supaya form tidak terlalu Berat untuk izin pribadi.
        if (!value && aturanLampiran(jenis) === 'wajib') return 'Lampiran wajib diunggah untuk jenis ini'
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
      // Bentuk baris pengajuan memakai pembentuk yang sama dengan form mobile,
      // supaya jenis, tanggal ISO, durasi, dan keterangan tidak pernah hilang.
      // (Versi lama memakai jenis.split(' ')[0] — "Cuti Bersalin/Melahirkan"
      // tersimpan jadi "Cuti", dan keterangan ikut hilang.)
      onSave(
        buildPengajuan({
          staffId: Number(selectedStaffId),
          jenis,
          mulai: tanggalMulai,
          selesai: tanggalSelesai,
          alasan: keterangan,
          lampiran: lampiran?.name || '',
          lampiranUkuran: lampiran?.size ?? null,
        }),
      )
      onClose()
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleChange('lampiran', file)
    }
  }

  const getInputClass = (field) => {
    const base = 'w-full h-9 text-xs text-slate-800 bg-white border rounded-lg px-3 focus:outline-none transition-all'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'}`
  }

  const getTextareaClass = (field) => {
    const base = 'w-full p-3 text-xs text-slate-800 bg-white border rounded-lg focus:outline-none transition-all resize-none leading-relaxed'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Ajukan Izin Staf (Manual TU)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Isi formulir pengajuan izin/cuti untuk pegawai.
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="selectPegawai">
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
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
            </div>
            {errors.selectedStaffId && touched.selectedStaffId && (
              <span className="text-xs text-rose-500 mt-0.5">{errors.selectedStaffId}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="inputNIY">
                NIY/NIP
              </label>
              <input
                className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 focus:outline-none"
                id="inputNIY"
                type="text"
                value={selectedStaff?.niy || ''}
                readOnly
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="inputUnit">
                Unit
              </label>
              <input
                className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 focus:outline-none"
                id="inputUnit"
                type="text"
                value={selectedUnit?.nama || ''}
                readOnly
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="selectJenis">
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
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
            </div>
            {errors.jenis && touched.jenis && <span className="text-xs text-rose-500 mt-0.5">{errors.jenis}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="inputTanggalMulai">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-[18px] pointer-events-none">calendar_month</span>
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
                <span className="text-xs text-rose-500 mt-0.5">{errors.tanggalMulai}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="inputTanggalSelesai">
                Tanggal Selesai <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-slate-400 text-[18px] pointer-events-none">calendar_month</span>
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
                <span className="text-xs text-rose-500 mt-0.5">{errors.tanggalSelesai}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="inputDurasi">
              Durasi (Otomatis)
            </label>
            <input
              className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-blue-700 focus:outline-none"
              id="inputDurasi"
              type="text"
              value={durasi}
              readOnly
            />
            <span className="text-[11px] text-slate-400">Dihitung otomatis dari tanggal mulai dan selesai</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="inputKeterangan">
              Keterangan / Alasan <span className="text-rose-500">*</span>
            </label>
            <textarea
              className={getTextareaClass('keterangan')}
              id="inputKeterangan"
              placeholder="Tuliskan alasan pengajuan izin atau cuti..."
              rows={3}
              value={keterangan}
              onChange={e => handleChange('keterangan', e.target.value)}
              onBlur={e => handleBlur('keterangan', e.target.value)}
            />
            {errors.keterangan && touched.keterangan && (
              <span className="text-xs text-rose-500 mt-0.5">{errors.keterangan}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Upload Lampiran {aturanLampiran(jenis) === 'wajib' && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <input
                type="file"
                id="inputLampiran"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className={`w-full py-4 px-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  lampiran ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/40'
                }`}
              >
                {lampiran ? (
                  <>
                    <span className="material-symbols-outlined text-emerald-600 text-[26px]">check_circle</span>
                    <span className="text-xs font-medium text-emerald-800">{lampiran.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {(lampiran.size / 1024).toFixed(1)} KB
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-0.5">
                      <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                    </div>
                    <span className="text-xs font-medium text-slate-700">
                      Pilih berkas atau seret ke sini
                    </span>
                    <span className="text-[11px] text-slate-400">
                      PDF, DOC, DOCX, JPG, PNG (Maks 5MB)
                    </span>
                  </>
                )}
              </div>
            </div>
            {errors.lampiran && touched.lampiran && (
              <span className="text-xs text-rose-500 mt-0.5">{errors.lampiran}</span>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Simpan Pengajuan</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeaveRequestModal