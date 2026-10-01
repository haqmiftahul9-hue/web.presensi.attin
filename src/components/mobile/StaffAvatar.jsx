import { useState } from 'react'
import { cardPhotoOf } from '../../data/employeeCard.js'
import { initialsOf } from '../../store/simPresStore.jsx'

/**
 * Avatar pegawai: foto dari data pegawai (field `foto`, sama dengan yang dipakai
 * Cetak Kartu ID) dan otomatis jatuh ke inisial bila foto kosong atau gagal
 * dimuat — supaya halaman tidak pernah menampilkan gambar rusak.
 */
function StaffAvatar({
  staff,
  size = 'w-12 h-12',
  textClass = 'font-headline-sm text-headline-sm',
  ring = 'ring-2 ring-white/25',
  className = '',
}) {
  const [gagalMuat, setGagalMuat] = useState(false)
  const foto = cardPhotoOf(staff)
  const nama = staff?.name || 'Pegawai'

  if (foto && !gagalMuat) {
    return (
      <img
        src={foto}
        alt={nama}
        onError={() => setGagalMuat(true)}
        className={`${size} ${ring} rounded-full object-cover bg-surface-container shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${size} ${ring} rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 ${textClass} ${className}`}
      title={nama}
    >
      {initialsOf(nama)}
    </div>
  )
}

export default StaffAvatar
