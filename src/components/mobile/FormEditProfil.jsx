import { useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import {
  FIELD_PROFIL, FIELD_TERKUNCI, FIELD_FOTO,
  isianAwalProfil, ambilPerubahanProfil, ringkasPerubahanProfil,
  validasiProfil, bacaFoto, MAKS_FOTO_BYTES,
} from '../../data/profilGuru.js'
import { getEmployeeGreeting } from '../../data/sapaanPegawai.js'
import { Spinner } from '../../components/mobile/Feedback.jsx'

const FIELD =
  'sp-field px-3.5 py-2.5 bg-white border border-slate-200/80 rounded-xl text-body-md text-slate-900 outline-none focus:border-[#323d8f] focus:ring-2 focus:ring-[#323d8f]/20 transition-all'
const LABEL = 'font-label-sm text-label-sm text-on-surface-variant mb-2 block'

/**
 * Form ubah data pribadi Guru/Pegawai.
 *
 * Yang bisa diubah: foto, nama lengkap, nomor HP, email, alamat, tempat lahir,
 * dan tanggal lahir. Sisanya (NIY, jabatan, unit, status kepegawaian)
 * ditampilkan terkunci — hanya Superadmin yang boleh mengubahnya.
 *
 * Pengiriman memakai aksi `UPDATE_STAFF_PROFILE`, yang kembali membuang field
 * terkunci di lapis store. Jadi menyembunyikan field di form ini bukan satu-
 * satunya pagar: aksi yang dikirim langsung tetap tidak bisa mengubah NIY.
 *
 * Perubahan ditulis ke data master `state.staff` yang sama dengan yang dibaca
 * Superadmin, jadi tidak ada salinan profil terpisah.
 */
export function FormEditProfil({ staff, unit, onSimpan, onBatal }) {
  const [isian, setIsian] = useState(() => isianAwalProfil(staff))
  const [foto, setFoto] = useState(staff?.[FIELD_FOTO.key] || '')
  const [galat, setGalat] = useState({})
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const inputFoto = useRef(null)

  /** Pratinjau perubahan sebelum disimpan, supaya jelas apa yang akan berubah. */
  const ringkasan = ringkasPerubahanProfil(
    ambilPerubahanProfil(staff, { ...isian, foto }).perubahan,
  )

  function ubah(key, nilai) {
    setIsian((v) => ({ ...v, [key]: nilai }))
    setGalat((g) => (g[key] ? { ...g, [key]: '' } : g))
    setPesan('')
  }

  async function pilihFoto(event) {
    const berkas = event.target.files?.[0]
    if (!berkas) return
    try {
      const dataUrl = await bacaFoto(berkas)
      setFoto(dataUrl)
      setPesan('')
      setGalat((g) => ({ ...g, foto: '' }))
    } catch (error) {
      setGalat((g) => ({ ...g, foto: error?.message || 'Foto gagal dimuat.' }))
    }
  }

  async function simpan(event) {
    event.preventDefault()
    const hasilValidasi = validasiProfil(isian)
    const galatFinal = { ...hasilValidasi, ...(galat.foto ? { foto: galat.foto } : {}) }
    if (Object.values(galatFinal).some(Boolean)) {
      setGalat(galatFinal)
      setPesan('Periksa kembali isian yang ditandai.')
      return
    }

    setSibuk(true)
    setPesan('')
    try {
      // Foto disimpan terpisah karena isinya berupa data URL, bukan teks.
      if (foto && foto !== staff?.[FIELD_FOTO.key]) {
        await onSimpan({ ...isian, foto }, { foto })
      } else {
        await onSimpan(isian, {})
      }
      setPesan('Data pribadi berhasil diperbarui dan langsung masuk ke Data Guru/Pegawai.')
    } catch (error) {
      setPesan(error?.message || 'Data gagal disimpan.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    // Padding horizontal 16px dipegang oleh pembungkus menu di halaman Profil,
    // supaya form ini sejajar dengan baris menu lain dan tidak menambah lapis
    // padding kedua.
    <form onSubmit={simpan} className="pb-4 -mt-1 animate-sp-rise" noValidate>
      <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col gap-4">
        {/* Foto */}
        <div className="flex flex-col items-center gap-3">
          {foto ? (
            <img
              src={foto}
              alt={`Foto ${staff?.name || ''}`}
              className="w-28 h-28 rounded-2xl object-cover border border-outline-variant/40"
            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-surface-container flex items-center justify-center">
              <Icon name="person" className="text-[40px] text-outline" />
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <label
              htmlFor="profil-foto"
              className="sp-press sp-btn px-4 py-2.5 bg-[#323d8f] hover:bg-[#252e6d] text-white rounded-xl shadow-xs font-label-md text-label-md flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Icon name="photo_camera" className="text-[18px] shrink-0" />
              {foto ? 'Ganti foto' : 'Unggah foto'}
            </label>
            <input
              ref={inputFoto}
              id="profil-foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pilihFoto}
              className="sr-only"
            />
            <span className="font-label-sm text-label-sm text-on-surface-variant text-center">
              JPG/PNG/WebP, maksimal {Math.round(MAKS_FOTO_BYTES / (1024 * 1024))} MB
            </span>
            {galat.foto && <span className="font-label-sm text-label-sm text-rose-700">{galat.foto}</span>}
          </div>
        </div>

        {/* Field yang boleh diubah */}
        {FIELD_PROFIL.map((field) => (
          <div key={field.key}>
            <label className={LABEL} htmlFor={`profil-${field.key}`}>
              {field.label}
              {field.key === 'nama' && <span className="text-rose-700"> *</span>}
            </label>
            {field.tipe === 'textarea' ? (
              <textarea
                id={`profil-${field.key}`}
                rows={2}
                maxLength={field.maks || undefined}
                value={isian[field.key] || ''}
                onChange={(e) => ubah(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={`${FIELD} resize-none`}
              />
            ) : (
              <input
                id={`profil-${field.key}`}
                type={field.tipe}
                maxLength={field.maks || undefined}
                value={isian[field.key] || ''}
                onChange={(e) => ubah(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={FIELD}
              />
            )}
            {galat[field.key] && (
              <span className="font-label-sm text-label-sm text-rose-700 mt-1 block">{galat[field.key]}</span>
            )}
          </div>
        ))}

        {/* Field terkunci: hanya Superadmin. */}
        <div className="flex flex-col gap-2.5 rounded-2xl bg-surface-container p-4">
          <span className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
            <Icon name="lock" className="text-[16px] shrink-0" />
            Hanya Superadmin yang dapat mengubah
          </span>
          {FIELD_TERKUNCI.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{f.label}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant text-right min-w-0 truncate">
                {nilaiTerkunci(staff, unit, f.key)}
              </span>
            </div>
          ))}
        </div>

        {/* Pratinjau perubahan */}
        <div className="rounded-2xl bg-surface-container p-4 flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Yang akan berubah</span>
          <p className="font-body-sm text-body-sm text-on-surface leading-snug">{ringkasan}</p>
        </div>

        {pesan && (
          <p
            role="status"
            className="rounded-2xl bg-surface-container-lowest border border-outline-variant/40 px-3.5 py-3 font-body-sm text-body-sm text-on-surface flex items-start gap-2 leading-snug"
          >
            <Icon name="info" className="text-[16px] mt-0.5 shrink-0 text-secondary" />
            <span>{pesan}</span>
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onBatal}
            className="sp-btn flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-label-md text-label-md font-semibold rounded-xl border border-slate-200/80 active:scale-[0.98] transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={sibuk}
            className="sp-btn flex-1 py-3 bg-[#323d8f] hover:bg-[#252e6d] text-white font-label-md text-label-md font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {sibuk ? <Spinner /> : <Icon name="save" className="text-[18px] shrink-0" />}
            {sibuk ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>

        <p className="text-center font-label-sm text-label-sm text-on-surface-variant leading-snug">
          Perubahan untuk {getEmployeeGreeting(staff, { unit })} langsung terlihat di portal Superadmin.
        </p>
      </div>
    </form>
  )
}

function nilaiTerkunci(staff, unit, key) {
  if (key === 'unitId') return unit?.nama || staff?.unitId || '-'
  return staff?.[key] || '-'
}
