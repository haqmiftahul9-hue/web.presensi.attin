// ============================================================================
// EDIT DATA PRIBADI GURU/PEGAWAI (MOBILE)
//
// TUJUAN: Guru memperbarui data pribasinya sendiri, dan perubahannya langsung
// masuk ke data master yang sama dengan yang dibaca Superadmin. Karena itu
// modul ini tidak punya tabel sendiri — semuanya menulis ke `state.staff`.
//
// PEMBATASAN WAJIB ADA DI LAPIS DATA, BUKAN CUMA DI TOMBOL
// Field terkunci (NIY, jabatan, unit, status kepegawaian) hanya boleh
// diubah Superadmin. Kalau batas itu hanya disembunyikan di form mobile, aksi
// yang dikirim langsung ke store masih bisa mengubahnya. `ambilPerubahanProfil`
// karena itu membuang field apa pun di luar daftar yang diizinkan, dan reducer
// `UPDATE_STAFF_PROFILE` memakainya lagi sebagai pagar kedua.
//
// Istilah "Employee Master" di sini berarti `state.staff`: satu baris per
// pegawai, dipakai bersama oleh portal Superadmin, aplikasi mobile, kartu ID,
// dan rekap. Tidak ada database profil terpisah di mana pun.
// ============================================================================

/**
 * Field yang boleh diubah pegawai sendiri.
 * `tipe` menentukan kontrol pada form mobile.
 */
export const FIELD_PROFIL = [
  // `key` adalah nama field ASLI di data master (state.staff). Bukan "nama" —
  // master memakai `name`. Kalau key tidak cocok dengan master, perubahan
  // diam-diam membuat field baru dan tidak pernah sampai ke portal.
  { key: 'name', label: 'Nama Lengkap', tipe: 'text', maks: 120, placeholder: 'Nama lengkap sesuai ijazah' },
  { key: 'kontak', label: 'Nomor HP', tipe: 'tel', maks: 20, placeholder: '081234567890' },
  { key: 'email', label: 'Email', tipe: 'email', maks: 120, placeholder: 'nama@simpres.sch.id' },
  { key: 'alamat', label: 'Alamat', tipe: 'textarea', maks: 255, placeholder: 'Alamat domisili lengkap' },
  { key: 'tempatLahir', label: 'Tempat Lahir', tipe: 'text', maks: 80, placeholder: 'Kota/kabupaten' },
  { key: 'tanggalLahir', label: 'Tanggal Lahir', tipe: 'date', maks: 0, placeholder: '' },
]

/** Foto ditangani terpisah karena butuh kontrol unggah berkas, bukan isian teks. */
export const FIELD_FOTO = { key: 'foto', label: 'Foto' }

/** Semua kunci yang boleh diubah pegawai (termasuk foto). */
export const KUNCI_BOLEH_EDIT = [...FIELD_PROFIL.map((f) => f.key), FIELD_FOTO.key]

/**
 * Field yang HANYA boleh diubah Superadmin.
 * Didaftarkan eksplisit supaya form mobile bisa menampilkannya sebagai
 * terkunci, dan supaya ada asersi uji yang gagal begitu ada field baru yang
 * bocor ke daftar boleh-edit.
 */
export const FIELD_TERKUNCI = [
  { key: 'niy', label: 'NIY' },
  { key: 'nip', label: 'NIP' },
  { key: 'role', label: 'Jabatan' },
  { key: 'unitId', label: 'Unit Sekolah' },
  { key: 'status', label: 'Status Keaktifan' },
  { key: 'statusPegawai', label: 'Status Kepegawaian' },
  { key: 'jenisKelamin', label: 'Jenis Kelamin' },
]

const PETA_PROFIL = new Map(FIELD_PROFIL.map((f) => [f.key, f]))

/** Label ramah untuk field apa pun (terkunci maupun boleh-edit). */
export function labelField(key) {
  if (key === FIELD_FOTO.key) return FIELD_FOTO.label
  return PETA_PROFIL.get(key)?.label || key
}

function samaNilai(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim()
}

/**
 * Bangun perubahan dari isian form.
 *
 * Mengembalikan `{ patch, perubahan, ditolak }`:
 *   - `patch`      : field boleh-edit yang benar-benar berubah (siap dikirim)
 *   - `perubahan`   : daftar { field, label, sebelum, sesudah } untuk log
 *   - `ditolak`    : kunci terkunci yang ikut terkirim dan DIABAIKAN
 *
 * Penting: `patch` hanya berisi kunci yang ada di FIELD_PROFIL / `foto`.
 * Field lain pada objek form (mis. `niy`) tidak pernah ikut, apa pun yang
 * dikirim pemanggil.
 */
export function ambilPerubahanProfil(staff, isian = {}) {
  const patch = {}
  const perubahan = []
  const ditolak = []

  for (const kunci of KUNCI_BOLEH_EDIT) {
    if (!(kunci in isian)) continue
    const baru = typeof isian[kunci] === 'string' ? isian[kunci].trim() : isian[kunci]
    const lama = staff?.[kunci] ?? ''
    if (samaNilai(lama, baru)) continue
    patch[kunci] = baru
    perubahan.push({ field: kunci, label: labelField(kunci), sebelum: String(lama ?? ''), sesudah: String(baru ?? '') })
  }

  // Apapun kunci lain yang terkirim ikut, catat lalu buang.
  for (const kunci of Object.keys(isian)) {
    if (KUNCI_BOLEH_EDIT.includes(kunci)) continue
    const terlarang = FIELD_TERKUNCI.find((f) => f.key === kunci)
    ditolak.push({ field: kunci, label: terlarang?.label || kunci })
  }

  return { patch, perubahan, ditolak }
}

/**
 * Ringkasan satu kalimat untuk baris log aktivitas, mis.
 * "Kontak: 081234567890 → 081298765432".
 */
export function ringkasPerubahanProfil(perubahan) {
  if (!perubahan || perubahan.length === 0) return 'Tidak ada data yang berubah'
  return perubahan.map((p) => `${p.label}: ${p.sebelum || '(kosong)'} → ${p.sesudah || '(kosong)'}`).join('; ')
}

/** Validasi isian form profil. Mengembalikan objek galat per field. */
export function validasiProfil(isian = {}) {
  const galat = {}

  const nama = String(isian.name ?? isian.nama ?? '').trim()
  if (!nama) {
    galat.name = 'Nama lengkap wajib diisi.'
    galat.nama = 'Nama lengkap wajib diisi.'
  } else if (nama.length > 120) {
    galat.name = 'Nama maksimal 120 karakter.'
    galat.nama = 'Nama maksimal 120 karakter.'
  }

  const kontak = String(isian.kontak ?? '').trim()
  if (kontak && !/^[0-9+\-\s()]{6,20}$/.test(kontak)) {
    galat.kontak = 'Nomor HP hanya boleh berisi angka, spasi, dan tanda + - ( ).'
  }

  const email = String(isian.email ?? '').trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    galat.email = 'Format email tidak valid.'
  }

  const lahir = String(isian.tanggalLahir ?? '').trim()
  if (lahir && !/^\d{4}-\d{2}-\d{2}$/.test(lahir)) {
    galat.tanggalLahir = 'Tanggal lahir tidak valid.'
  } else if (lahir) {
    const tahun = Number(lahir.slice(0, 4))
    if (tahun < 1940 || tahun > new Date().getFullYear() - 15) {
      galat.tanggalLahir = 'Tanggal lahir tidak masuk akal.'
    }
  }

  return galat
}

/**
 * Batas ukuran foto yang bisa diunggah dari ponsel.
 * Foto disimpan sebagai data URL di dalam data master, jadi ukuran besar akan
 * memperlambat seluruh aplikasi (penyimpanan lokal ikut membengkak).
 */
export const MAKS_FOTO_BYTES = 2 * 1024 * 1024 // 2 MB

export const TIPE_FOTO_DITERIMA = ['image/jpeg', 'image/png', 'image/webp']

/** Baca berkas foto menjadi data URL. Menolak tipe & ukuran yang tidak sesuai. */
export function bacaFoto(berkas) {
  return new Promise((resolve, reject) => {
    if (!berkas) {
      reject(new Error('Berkas foto tidak dipilih.'))
      return
    }
    if (!TIPE_FOTO_DITERIMA.includes(berkas.type)) {
      reject(new Error('Format foto harus JPG, PNG, atau WebP.'))
      return
    }
    if (berkas.size > MAKS_FOTO_BYTES) {
      reject(new Error(`Ukuran foto maksimal ${Math.round(MAKS_FOTO_BYTES / (1024 * 1024))} MB.`))
      return
    }
    const pembaca = new FileReader()
    pembaca.onerror = () => reject(new Error('Foto gagal dibaca.'))
    pembaca.onload = () => resolve(String(pembaca.result || ''))
    pembaca.readAsDataURL(berkas)
  })
}

/** Isian form awal dari data master, supaya form dibuka dengan nilai terkini. */
export function isianAwalProfil(staff) {
  const isian = {}
  for (const f of FIELD_PROFIL) isian[f.key] = String(staff?.[f.key] ?? '')
  return isian
}