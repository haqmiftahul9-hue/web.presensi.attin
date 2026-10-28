import { useState, useRef } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import EmployeeFormFields from './EmployeeFormFields.jsx'
import { toEmployeeForm, validateEmployee } from '../data/employeeSchema.js'
import { bacaFoto, MAKS_FOTO_BYTES } from '../data/profilGuru.js'
import { uploadStaffPhoto, deleteStaffPhoto } from '../services/photoStorageService.js'

function EditEmployeeModal({ staff, onClose, onSave }) {
  const { state } = useSimPres()
  const [form, setForm] = useState(() => toEmployeeForm(staff, state))
  const [errors, setErrors] = useState({})
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [foto, setFoto] = useState(staff?.foto || '')
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoGalat, setFotoGalat] = useState('')
  const inputFotoRef = useRef(null)

  const handleSave = () => {
    const found = validateEmployee(form, {
      staff: state.staff,
      units: state.units,
      excludeId: staff?.id,
    })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0]
      document.getElementById(`emp-${firstKey}`)?.focus()
      return
    }

    const trimmed = {}
    for (const [key, value] of Object.entries(form)) {
      trimmed[key] = typeof value === 'string' ? value.trim() : value
    }

    onSave({
      ...trimmed,
      id: staff.id,
      foto,
      ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
      // Field presensi bukan milik form ini dan harus tetap terjaga.
      masuk: staff.masuk,
      method: staff.method,
      lateMinutes: staff.lateMinutes,
      alpha: staff.alpha,
      outsideRadius: staff.outsideRadius,
    })
    onClose()
  }

  async function pilihFoto(event) {
    const berkas = event.target.files?.[0]
    if (!berkas) return
    if (berkas.size > MAKS_FOTO_BYTES) {
      setFotoGalat(`Ukuran foto maksimal ${Math.round(MAKS_FOTO_BYTES / (1024 * 1024))} MB.`)
      if (event.target) event.target.value = ''
      return
    }
    setUploadingFoto(true)
    setFotoGalat('')
    try {
      const dataUrl = await bacaFoto(berkas)
      const fotoUrl = await uploadStaffPhoto(staff, dataUrl)
      setFoto(fotoUrl || dataUrl)
    } catch (error) {
      console.warn('Gagal membaca/mengunggah foto:', error)
      setFotoGalat(error?.message || 'Foto gagal dibaca.')
    } finally {
      setUploadingFoto(false)
      if (event.target) event.target.value = ''
    }
  }

  async function hapusFoto() {
    if (!window.confirm('Apakah Anda yakin ingin menghapus foto profil ini?')) return
    setUploadingFoto(true)
    setFotoGalat('')
    try {
      if (foto) await deleteStaffPhoto(staff, foto)
      setFoto('')
    } catch (error) {
      console.warn('Gagal menghapus foto profil:', error)
      setFotoGalat(error?.message || 'Gagal menghapus foto.')
    } finally {
      setUploadingFoto(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-muted/30">
          <div>
            <h2 className="text-base font-bold text-foreground leading-snug" id="modalTitle">
              Edit Pegawai
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Perbarui data {staff?.name} (NIY: {staff?.niy}).
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

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Foto profil */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border/60">
            <div className="w-20 h-20 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {foto ? (
                <img src={foto} alt={`Foto ${staff?.name || ''}`} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-[32px] text-muted-foreground">person</span>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <span className="text-xs font-bold text-foreground">Foto Profil Pegawai</span>
              <p className="text-[11px] text-muted-foreground">
                Superadmin/Admin dapat mengunggah atau mengganti foto profil. JPG/PNG/WebP, maksimal {Math.round(MAKS_FOTO_BYTES / (1024 * 1024))} MB.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => inputFotoRef.current?.click()}
                  disabled={uploadingFoto}
                  className="h-8 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[15px] leading-none">
                    {uploadingFoto ? 'hourglass_top' : 'photo_camera'}
                  </span>
                  <span>{uploadingFoto ? 'Menyimpan...' : (foto ? 'Ganti foto' : 'Unggah foto')}</span>
                </button>
                {foto && (
                  <button
                    type="button"
                    onClick={hapusFoto}
                    disabled={uploadingFoto}
                    className="h-8 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[15px] leading-none">delete</span>
                    <span>Hapus foto</span>
                  </button>
                )}
              </div>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={pilihFoto}
                className="sr-only"
              />
              {fotoGalat && <span className="text-[11px] text-destructive">{fotoGalat}</span>}
            </div>
          </div>

          <EmployeeFormFields form={form} setForm={setForm} errors={errors} />

          {/* Opsi Kata Sandi Login Mobile */}
          <div className="pt-4 border-t border-border flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">lock</span>
              <span className="text-xs font-bold text-foreground">Kredensial Login Aplikasi Mobile</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Guru/pegawai login menggunakan NIY ({staff?.niy}). Isi kolom di bawah jika ingin mengganti kata sandi login pengguna ini.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
              <div className="relative w-full sm:w-2/3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full h-9 px-3 pr-10 rounded-lg bg-card border border-input focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/20 text-xs text-foreground placeholder:text-muted-foreground font-mono"
                  placeholder="Kosongkan jika tidak ingin mengubah kata sandi"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNewPassword('Attin123!')}
                className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium whitespace-nowrap cursor-pointer shadow-xs"
              >
                Reset ke Attin123!
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {Object.keys(errors).length > 0
              ? `${Object.keys(errors).length} kolom perlu diperbaiki`
              : 'Perubahan langsung tersimpan ke sistem.'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              type="button"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              id="btnSaveEmployee"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditEmployeeModal
