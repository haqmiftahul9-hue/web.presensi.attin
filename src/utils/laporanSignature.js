/**
 * Helper blok tanda tangan laporan "Rekap & Laporan".
 *
 * Satu definisi untuk susunan tanda tangan 2 kolom (kiri & kanan) yang dipakai
 * oleh Cetak Langsung (window.print), PDF (jsPDF) dan Excel (SheetJS) supaya
 * tata letaknya selalu identik:
 *
 *   Baris 1 : (kiri kosong)                         | Pariaman, [Tanggal Cetak]
 *   Baris 2 : Mengetahui,                          | Dikerjakan oleh,
 *   Baris 3 : ruang kosong untuk tanda tangan       | ruang kosong
 *   Baris 4 : Kepala SDIT Attin Sumbar             | Petugas Presensi SDIT
 *             (Drs. H. Ahmad Fauzi, M.Pd)           | (_______________________)
 */

export const GARIS_ISIAN = '(_______________________)'

export const DEFAULT_IDENTITAS_PRESENSI = {
  jabatan: 'Kepala SDIT Attin Sumbar',
  nama: 'Drs. H. Ahmad Fauzi, M.Pd',
}

export const DEFAULT_IDENTITAS_PETUGAS = {
  jabatan: 'Petugas Presensi SDIT',
  nama: '',
}

/**
 * Ambil identitas penandatangan dari pengaturan global, dengan fallback
 * bawaan aplikasi.
 *
 * @param {'presensi'|'cuti'} reportType
 * @param {object} signatory hasil getSignatory()/getSignatoryAllUnits()
 */
export function getIdentitasTandaTangan(reportType, signatory) {
  if (reportType === 'cuti') {
    const ketuaYayasan = signatory?.ketuaYayasan || {}
    const adminTU = signatory?.adminTU?.kepalaTU || signatory?.adminTU?.operatorSistem || {}
    return {
      kiri: {
        jabatan: ketuaYayasan.jabatan || 'Ketua Yayasan',
        nama: ketuaYayasan.nama || '',
      },
      kanan: {
        jabatan: adminTU.jabatan || 'Admin Tata Usaha',
        nama: adminTU.nama || '',
      },
    }
  }

  const kepalaSekolah = signatory?.kepalaSekolah || {}
  const petugasPresensi = signatory?.petugasPresensi || {}
  return {
    kiri: {
      jabatan: kepalaSekolah.jabatan || DEFAULT_IDENTITAS_PRESENSI.jabatan,
      nama: kepalaSekolah.nama || DEFAULT_IDENTITAS_PRESENSI.nama,
    },
    kanan: {
      jabatan: petugasPresensi.jabatan || DEFAULT_IDENTITAS_PETUGAS.jabatan,
      nama: petugasPresensi.nama || '',
    },
  }
}

/**
 * Susun isi baris tanda tangan (tanpa tanggal cetak) supaya konsisten
 * antara Print, PDF dan Excel.
 */
export function getBarisTandaTangan(reportType, signatory) {
  const identitas = getIdentitasTandaTangan(reportType, signatory)
  return {
    identitas,
    baris1: { kiri: '', kanan: '' },
    baris2: { kiri: 'Mengetahui,', kanan: 'Dikerjakan oleh,' },
    jabatan: { kiri: identitas.kiri.jabatan, kanan: identitas.kanan.jabatan },
    nama: {
      kiri: identitas.kiri.nama ? `(${identitas.kiri.nama})` : GARIS_ISIAN,
      kanan: identitas.kanan.nama ? `(${identitas.kanan.nama})` : GARIS_ISIAN,
    },
  }
}
