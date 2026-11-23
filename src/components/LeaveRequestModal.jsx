import { useState, useEffect } from 'react'
import {
  JENIS_FORM, buildPengajuan, aturanLampiran, hitungDurasiHari, formatDurasi,
  isFormCutiEligible, isSakit, hitungTanggalMasukKembali, JENIS_CUTI_DISPENSASI,
} from '../data/jenisIzinCuti.js'
import { uploadLeaveAttachment } from '../services/leaveAttachmentService.js'

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
  const [tanggalMasukKembali, setTanggalMasukKembali] = useState('')
  const [alamatCuti, setAlamatCuti] = useState('')
  const [telpCuti, setTelpCuti] = useState('')
  const [subJenisDispensasi, setSubJenisDispensasi] = useState('Pernikahan Karyawan')
  const [anakKe, setAnakKe] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const selectedStaff = staffList.find(s => s.id === Number(selectedStaffId))
  const selectedUnit = units.find(u => u.id === selectedStaff?.unitId)

  useEffect(() => {
    if (selectedStaff) {
      if (selectedStaff.alamat) setAlamatCuti(selectedStaff.alamat)
      if (selectedStaff.kontak) setTelpCuti(selectedStaff.kontak)
    }
  }, [selectedStaff])

  useEffect(() => {
    if (tanggalMulai) {
      const h = hitungDurasiHari(tanggalMulai, tanggalSelesai || tanggalMulai)
      setDurasi(`${h} Hari`)
      setTanggalMasukKembali(hitungTanggalMasukKembali(tanggalSelesai || tanggalMulai))
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
      setTanggalMasukKembali('')
      setAlamatCuti('')
      setTelpCuti('')
      setSubJenisDispensasi('Pernikahan Karyawan')
      setAnakKe('')
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
        if (tanggalSelesai && value > tanggalSelesai) return 'Tanggal mulai tidak boleh sebelum tanggal selesai'
        if (tanggalSelesai ? hitungDurasiHari(value, tanggalSelesai) === 0 : hitungDurasiHari(value, value) === 0) {
          return 'Tanggal pengajuan jatuh pada hari Minggu (hari libur sekolah). Silakan pilih hari kerja.'
        }
        return ''
      case 'tanggalSelesai':
        if (!value) return 'Tanggal selesai wajib diisi'
        if (tanggalMulai && value < tanggalMulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai'
        if (tanggalMulai && hitungDurasiHari(tanggalMulai, value) === 0) {
          return 'Tanggal pengajuan jatuh pada hari Minggu (hari libur sekolah). Silakan pilih hari kerja.'
        }
        return ''
      case 'keterangan':
        if (!value.trim()) return 'Keterangan/alasan wajib diisi'
        if (value.trim().length < 5) return 'Keterangan minimal 5 karakter'
        return ''
      case 'lampiran':
        // Cuti resmi menghasilkan PDF formulir cuti otomatis, jadi tidak memerlukan upload berkas.
        if (isFormCutiEligible(jenis)) return ''
        if (!value && aturanLampiran(jenis) === 'wajib') {
          return isSakit(jenis) ? 'Surat Keterangan Dokter wajib diunggah' : 'Lampiran wajib diunggah untuk jenis ini'
        }
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
      lampiran: isFormCutiEligible(jenis) ? '' : validateField('lampiran', lampiran),
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

  const handleSubmit = async () => {
    if (validateAll()) {
      let fileMeta = {
        lampiran: lampiran?.name || '',
        lampiranUrl: '',
        lampiranNama: lampiran?.name || '',
        lampiranUkuran: lampiran?.size ?? null,
        lampiranTipe: lampiran?.type || '',
      }

      if (lampiran) {
        const uploadRes = await uploadLeaveAttachment(lampiran, {
          staffId: Number(selectedStaffId),
          unitId: selectedStaff?.unitId,
        })
        if (uploadRes.success) {
          fileMeta = {
            lampiran: uploadRes.fileName || lampiran.name,
            lampiranUrl: uploadRes.url || '',
            lampiranNama: uploadRes.fileName || lampiran.name,
            lampiranUkuran: uploadRes.fileSize || lampiran.size,
            lampiranTipe: uploadRes.fileType || lampiran.type,
          }
        }
      }

      const basePengajuan = buildPengajuan({
        staffId: Number(selectedStaffId),
        jenis,
        mulai: tanggalMulai,
        selesai: tanggalSelesai,
        alasan: keterangan,
        lampiran: fileMeta.lampiranNama || fileMeta.lampiran,
        lampiranUkuran: fileMeta.lampiranUkuran,
        tanggalMasukKembali,
        alamatCuti,
        telpCuti,
        subJenisDispensasi: isFormCutiEligible(jenis) && String(jenis).toLowerCase().includes('dispensasi') ? subJenisDispensasi : null,
        anakKe: anakKe || null,
      })

      onSave({
        ...basePengajuan,
        ...fileMeta,
        lampiran_url: fileMeta.lampiranUrl,
        lampiran_nama: fileMeta.lampiranNama,
        lampiran_tipe: fileMeta.lampiranTipe,
        lampiran_ukuran: fileMeta.lampiranUkuran,
      })
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
    const base = 'w-full h-9 text-xs text-foreground bg-card border rounded-lg px-3 focus:outline-none transition-all'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20' : 'border-input focus:border-ring focus:ring-1 focus:ring-ring/20'}`
  }

  const getTextareaClass = (field) => {
    const base = 'w-full p-3 text-xs text-foreground bg-card border rounded-lg focus:outline-none transition-all resize-none leading-relaxed'
    const error = errors[field] && touched[field]
    return `${base} ${error ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20' : 'border-input focus:border-ring focus:ring-1 focus:ring-ring/20'}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="relative w-full max-w-xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/30">
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Ajukan Izin Staf (Manual TU)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Isi formulir pengajuan izin/cuti untuk pegawai.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Tutup dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/90" htmlFor="selectPegawai">
              Nama Pegawai <span className="text-destructive">*</span>
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
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">expand_more</span>
            </div>
            {errors.selectedStaffId && touched.selectedStaffId && (
              <span className="text-xs text-destructive mt-0.5">{errors.selectedStaffId}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/90" htmlFor="inputNIY">
                NIY
              </label>
              <input
                className="w-full h-9 px-3 rounded-lg bg-muted/50 border border-input text-xs text-muted-foreground focus:outline-none"
                id="inputNIY"
                type="text"
                value={selectedStaff?.niy || ''}
                readOnly
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/90" htmlFor="inputUnit">
                Unit
              </label>
              <input
                className="w-full h-9 px-3 rounded-lg bg-muted/50 border border-input text-xs text-muted-foreground focus:outline-none"
                id="inputUnit"
                type="text"
                value={selectedUnit?.nama || ''}
                readOnly
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/90" htmlFor="selectJenis">
              Jenis Izin/Cuti <span className="text-destructive">*</span>
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
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none">expand_more</span>
            </div>
            {errors.jenis && touched.jenis && <span className="text-xs text-destructive mt-0.5">{errors.jenis}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/90" htmlFor="inputTanggalMulai">
                Tanggal Mulai <span className="text-destructive">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-muted-foreground text-[18px] pointer-events-none">calendar_month</span>
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
                <span className="text-xs text-destructive mt-0.5">{errors.tanggalMulai}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/90" htmlFor="inputTanggalSelesai">
                Tanggal Selesai <span className="text-destructive">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-muted-foreground text-[18px] pointer-events-none">calendar_month</span>
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
                <span className="text-xs text-destructive mt-0.5">{errors.tanggalSelesai}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/90" htmlFor="inputDurasi">
              Durasi (Otomatis)
            </label>
            <input
              className="w-full h-9 px-3 rounded-lg bg-muted/50 border border-input text-xs font-semibold text-primary focus:outline-none"
              id="inputDurasi"
              type="text"
              value={durasi}
              readOnly
            />
            <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
              <span>Dihitung otomatis: hari kerja sekolah (hari Minggu tidak dihitung).</span>
              {String(jenis || '').toLowerCase().includes('sakit') && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  • Izin sakit tidak memotong kuota cuti tahunan pegawai.
                </span>
              )}
            </div>
          </div>

          {/* Rincian Tambahan Khusus Cuti (Sesuai Form Cuti Resmi) */}
          {isFormCutiEligible(jenis) && (
            <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/80">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                <span>Data Isian Formulir Permohonan Cuti Resmi</span>
              </div>

              {String(jenis || '').toLowerCase().includes('dispensasi') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground/90" htmlFor="selectDispensasi">
                    Sub-Jenis Cuti Dispensasi
                  </label>
                  <select
                    className={getInputClass('subJenisDispensasi') + ' pr-8 cursor-pointer'}
                    id="selectDispensasi"
                    value={subJenisDispensasi}
                    onChange={(e) => setSubJenisDispensasi(e.target.value)}
                  >
                    {JENIS_CUTI_DISPENSASI.map((disp) => (
                      <option key={disp.id} value={disp.label}>
                        {disp.label} ({disp.hari} hari)
                      </option>
                    ))}
                  </select>
                  {String(subJenisDispensasi || '').toLowerCase().includes('melahirkan') && (
                    <div className="mt-1">
                      <label className="text-[11px] font-semibold text-foreground/90 block mb-1">
                        Melahirkan Anak ke-
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="15"
                        placeholder="Contoh: 1, 2, dst"
                        value={anakKe}
                        onChange={(e) => setAnakKe(e.target.value)}
                        className={getInputClass('anakKe')}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground/90" htmlFor="inputMasukKembali">
                    Tanggal Masuk Kerja Kembali
                  </label>
                  <input
                    className={getInputClass('tanggalMasukKembali')}
                    id="inputMasukKembali"
                    type="date"
                    value={tanggalMasukKembali}
                    min={tanggalSelesai || tanggalMulai}
                    onChange={(e) => setTanggalMasukKembali(e.target.value)}
                  />
                  <span className="text-[10.5px] text-muted-foreground">Hari kerja setelah cuti selesai (Minggu dilewati)</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground/90" htmlFor="inputTelpCuti">
                    No. Telp/HP Selama Cuti
                  </label>
                  <input
                    className={getInputClass('telpCuti')}
                    id="inputTelpCuti"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={telpCuti}
                    onChange={(e) => setTelpCuti(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/90" htmlFor="inputAlamatCuti">
                  Alamat Lengkap Selama Cuti
                </label>
                <textarea
                  className={getTextareaClass('alamatCuti')}
                  id="inputAlamatCuti"
                  rows={2}
                  placeholder="Alamat domisili atau tujuan selama menjalankan cuti..."
                  value={alamatCuti}
                  onChange={(e) => setAlamatCuti(e.target.value)}
                />
              </div>

              <p className="text-[11px] text-muted-foreground bg-primary/5 p-2.5 rounded-lg border border-primary/20 leading-relaxed">
                ℹ️ Sistem akan otomatis menghasilkan file PDF formulir permohonan cuti resmi Yayasan At-Tin Indonesia lengkap dengan 4 penandatangan (Yayasan, Bagian Presensi, Kepala Sekolah, Karyawan).
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/90" htmlFor="inputKeterangan">
              Keterangan / Alasan <span className="text-destructive">*</span>
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
              <span className="text-xs text-destructive mt-0.5">{errors.keterangan}</span>
            )}
          </div>

          {!isFormCutiEligible(jenis) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/90">
                {isSakit(jenis) ? 'Upload Surat Keterangan Dokter' : 'Upload Lampiran'} {aturanLampiran(jenis) === 'wajib' && <span className="text-destructive">*</span>}
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
                    lampiran ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border hover:border-primary hover:bg-muted/40 bg-muted/20'
                  }`}
                >
                  {lampiran ? (
                    <>
                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[26px]">check_circle</span>
                      <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{lampiran.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {(lampiran.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-0.5">
                        <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {isSakit(jenis) ? 'Pilih berkas Surat Dokter atau seret ke sini' : 'Pilih berkas atau seret ke sini'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        PDF, DOC, DOCX, JPG, PNG (Maks 5MB)
                      </span>
                    </>
                  )}
                </div>
              </div>
              {errors.lampiran && touched.lampiran && (
                <span className="text-xs text-destructive mt-0.5">{errors.lampiran}</span>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs transition-colors cursor-pointer"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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