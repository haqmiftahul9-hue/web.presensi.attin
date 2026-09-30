import { initialsForCard, shortUnitCode } from '../../data/employeeCard.js'

/**
 * Logo yayasan pada kartu.
 *
 * Sumbernya adalah data asli: `settings.logo` (diunggah lewat Pengaturan
 * Global). Bila belum ada logo, kartu menampilkan monogram inisial yayasan —
 * bukan gambar contoh — sehingga tampilan tetap terbaca dan tidak pernah
 * menampilkan aset dummy.
 */
export function YayasanLogo({ settings, className = '' }) {
  const logo = String(settings?.logo || '').trim()
  const name = settings?.namaYayasan || 'Yayasan'
  if (logo) {
    return (
      <img
        src={logo}
        alt={`Logo ${name}`}
        className={`object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center bg-white text-primary ${className}`}
      title={name}
      aria-label={`Logo ${name}`}
    >
      <span className="font-headline-sm font-bold leading-none text-[0.9em]">{initialsForCard(name)}</span>
    </div>
  )
}

/**
 * Logo unit sekolah pada kartu: memakai `unit.logo` bila tersedia, kalau tidak
 * memakai kode singkat unit (mis. "SD" dari UNT-SD-02) supaya tiap unit tetap
 * bedakan secara visual.
 */
export function UnitLogo({ unit, className = '' }) {
  const nama = unit?.nama || 'Unit'
  const logo = String(unit?.logo || '').trim()
  if (logo) {
    return <img src={logo} alt={`Logo ${nama}`} className={`object-cover ${className}`} />
  }
  const short = shortUnitCode(unit)
  return (
    <div
      className={`flex items-center justify-center bg-secondary text-on-secondary ${className}`}
      title={nama}
      aria-label={`Logo unit ${nama}`}
    >
      <span className="font-label-sm font-semibold leading-none text-[0.85em]">{short || 'U'}</span>
    </div>
  )
}
