import { jsPDF } from 'jspdf'
import { downloadBlob } from './download.js'
import {
  formatPeriode, hitungDurasiHari, hitungTanggalMasukKembali,
  JENIS_CUTI_DISPENSASI, isFormCutiEligible,
} from '../data/jenisIzinCuti.js'

/**
 * Format tanggal Indonesia: "12 Januari 2026".
 */
export function formatTanggalIndo(tglStr) {
  if (!tglStr) return '-'
  const d = new Date(tglStr)
  if (Number.isNaN(d.getTime())) {
    // Coba potong YYYY-MM-DD
    const parts = String(tglStr).slice(0, 10).split('-')
    if (parts.length === 3) {
      const [yyyy, mm, dd] = parts.map(Number)
      const namaBulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ]
      return `${dd} ${namaBulan[mm - 1] || mm} ${yyyy}`
    }
    return String(tglStr)
  }
  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  return `${d.getDate()} ${namaBulan[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Helper memuat gambar as Data URL bila di browser.
 */
function loadImageAsDataUrl(url) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined' || !url) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * Menentukan nama penandatangan Kepala Sekolah berdasarkan unit sekolah.
 */
export function getNamaKepalaSekolah(unitId, settings = {}, allStaff = []) {
  const id = String(unitId || '').toLowerCase()
  // 1. Cek dari settings.penandatangan.kepalaSekolah
  const dariSettings = settings?.penandatangan?.kepalaSekolah?.[id]?.nama
  if (dariSettings && dariSettings.trim()) return dariSettings.trim()

  // 2. Cek dari allStaff
  if (Array.isArray(allStaff)) {
    const kepsek = allStaff.find(
      (s) => String(s.unitId || '').toLowerCase() === id && String(s.role || '').toLowerCase().includes('kepala')
    )
    if (kepsek?.name) return kepsek.name
  }

  // 3. Fallback bawaan Attin Sumbar
  if (id === 'sd' || id.includes('sd')) return 'Drs. H. Ahmad Fauzi, M.Pd'
  if (id === 'smp' || id.includes('smp')) return 'Dra. Hj. Nurhasanah, M.Pd'
  if (id === 'sma' || id.includes('sma')) return 'Dr. Hendri Saputra, M.Pd'
  if (id === 'tk' || id.includes('tk')) return 'Hj. Irmawati Rahayu, S.Pd'
  return 'Drs. H. Ahmad Fauzi, M.Pd'
}

/**
 * Menentukan nama Petugas Bagian Presensi.
 */
export function getNamaPetugasPresensi(unitId, settings = {}, allStaff = []) {
  const id = String(unitId || '').toLowerCase()
  const dariSettings = settings?.penandatangan?.petugasPresensi?.[id]?.nama
  if (dariSettings && dariSettings.trim()) return dariSettings.trim()

  if (Array.isArray(allStaff)) {
    const petugas = allStaff.find(
      (s) => String(s.unitId || '').toLowerCase() === id &&
        (String(s.role || '').toLowerCase().includes('presensi') || String(s.role || '').toLowerCase().includes('admin unit'))
    )
    if (petugas?.name) return petugas.name
  }

  return 'Petugas Presensi Unit'
}

/**
 * Gambar kotak checkbox dengan tanda silang [X] bila aktif.
 */
function drawCheckbox(doc, x, y, size, checked = false) {
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.rect(x, y, size, size)
  if (checked) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size * 2.3)
    doc.setTextColor(0, 0, 0)
    doc.text('X', x + size / 2, y + size * 0.82, { align: 'center' })
  }
}

/**
 * Generate Dokumen jsPDF untuk Formulir Permohonan Cuti.
 * Tata letak dan konten 100% mengikuti simpres_halaman_login/FORM CUTI.pdf.
 */
export async function buildFormCutiDoc({
  leave = {},
  staff = {},
  unit = null,
  settings = {},
  allStaff = [],
  logoDataUrl = null,
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 210
  const marginL = 14
  const marginR = 14
  const contentW = pageWidth - marginL - marginR // 182
  const centerX = pageWidth / 2 // 105

  // 1. Kop Surat
  let logoUrl = logoDataUrl
  if (!logoUrl && typeof window !== 'undefined') {
    logoUrl = await loadImageAsDataUrl('/icons/logo-simpeg.png')
  }

  let y = 10
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', marginL + 2, y, 21, 21)
    } catch {
      // noop fallback
    }
  }

  // Teks Header Kop Surat
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('YAYASAN ISLAM AT-TIN INDONESIA', centerX + 6, y + 6, { align: 'center' })

  doc.setFontSize(15)
  doc.text('ATTIN ISLAMIC SCHOOL', centerX + 6, y + 13, { align: 'center' })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text('"Get The Future With Ridho Allah SWT"', centerX + 6, y + 19, { align: 'center' })

  // Garis Ganda Pembatas Kop Surat
  y = 33
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.8)
  doc.line(marginL, y, marginL + contentW, y)
  y += 1.2
  doc.setLineWidth(0.2)
  doc.line(marginL, y, marginL + contentW, y)

  // 2. Kotak Judul "FORMULIR PERMOHONAN CUTI"
  y += 4
  const titleBoxW = 120
  const titleBoxH = 8
  const titleBoxX = centerX - titleBoxW / 2
  doc.setLineWidth(0.4)
  doc.rect(titleBoxX, y, titleBoxW, titleBoxH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('FORMULIR PERMOHONAN CUTI', centerX, y + 5.5, { align: 'center' })

  // 3. Identitas Karyawan
  y += 11
  const infoBoxH = 22
  doc.setLineWidth(0.3)
  doc.rect(marginL, y, contentW, infoBoxH)
  // Garis pemisah tengah
  const midX = marginL + contentW / 2 + 5
  doc.line(midX, y, midX, y + infoBoxH)

  const staffName = staff.name || leave.staffName || '-'
  const staffBagian = staff.bagian || staff.kurikulum || staff.bidang || 'Tenaga Pendidik / Pegawai'
  const staffJabatan = staff.role || staff.jabatan || 'Guru'
  const staffJoin = staff.tanggalMasuk || staff.joinDate || staff.tglBergabung || '-'
  const staffUnit = unit?.nama || (staff.unitId ? staff.unitId.toUpperCase() : 'SDIT Attin Sumbar')

  doc.setFontSize(8.5)
  // Kolom Kiri
  let rowY = y + 5
  doc.setFont('helvetica', 'bold')
  doc.text('Nama Karyawan', marginL + 3, rowY)
  doc.setFont('helvetica', 'normal')
  doc.text(`:  ${staffName}`, marginL + 32, rowY)

  rowY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Bagian', marginL + 3, rowY)
  doc.setFont('helvetica', 'normal')
  doc.text(`:  ${staffBagian}`, marginL + 32, rowY)

  rowY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Jabatan', marginL + 3, rowY)
  doc.setFont('helvetica', 'normal')
  doc.text(`:  ${staffJabatan}`, marginL + 32, rowY)

  // Kolom Kanan
  rowY = y + 5
  doc.setFont('helvetica', 'bold')
  doc.text('Tanggal Bergabung', midX + 3, rowY)
  doc.setFont('helvetica', 'normal')
  doc.text(`:  ${formatTanggalIndo(staffJoin)}`, midX + 38, rowY)

  rowY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Unit', midX + 3, rowY)
  doc.setFont('helvetica', 'normal')
  doc.text(`:  ${staffUnit}`, midX + 38, rowY)

  // Evaluasi Jenis Cuti
  const jenisNama = String(leave.jenis || '').toLowerCase()
  const isTahunan = jenisNama.includes('tahunan') || leave.kategoriCuti === 'tahunan'
  const isDispensasi = !isTahunan && isFormCutiEligible(leave.jenis)

  const mulaiStr = formatTanggalIndo(leave.mulai || leave.tanggal_mulai)
  const selesaiStr = formatTanggalIndo(leave.selesai || leave.tanggal_selesai || leave.mulai)
  const durasiHari = Number(leave.durasiHari || leave.durasi_hari || hitungDurasiHari(leave.mulai, leave.selesai)) || 1
  const tglMasukKembali = formatTanggalIndo(leave.tanggalMasukKembali || hitungTanggalMasukKembali(leave.selesai || leave.mulai))
  const keperluan = leave.alasan || leave.keterangan || '-'
  const noTelp = leave.telpCuti || staff.kontak || staff.noHp || staff.telepon || '-'
  const alamatCuti = leave.alamatCuti || staff.alamat || '-'

  // 4. Opsi A: PENGAMBILAN CUTI TAHUNAN
  y += infoBoxH + 3
  const boxAH = 47
  doc.rect(marginL, y, contentW, boxAH)

  // Checkbox A
  drawCheckbox(doc, marginL + 3, y + 2.5, 3.8, isTahunan)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PENGAMBILAN CUTI TAHUNAN', marginL + 10, y + 5.5)

  // Summary kuota jatah cuti tahunan
  const hakCuti = leave.hakCuti ?? 7
  const diambil = isTahunan ? durasiHari : 0
  const sisaCuti = leave.sisaCuti ?? Math.max(0, hakCuti - diambil)

  const sumBoxY = y + 8
  const sumBoxH = 7
  doc.setFillColor(248, 250, 252)
  doc.rect(marginL + 2, sumBoxY, contentW - 4, sumBoxH, 'FD')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`Hak Cuti :  ${hakCuti} Hari`, marginL + 6, sumBoxY + 4.8)
  doc.text(`Durasi Cuti Diambil :  ${diambil} Hari`, marginL + 60, sumBoxY + 4.8)
  doc.text(`Sisa Cuti :  ${sisaCuti} Hari`, marginL + 130, sumBoxY + 4.8)

  // Rincian isian cuti tahunan
  rowY = sumBoxY + sumBoxH + 5
  const labelW = 44

  doc.setFont('helvetica', 'normal')
  doc.text('Tanggal Cuti', marginL + 4, rowY)
  doc.text(`:  ${isTahunan ? `${mulaiStr} s.d ${selesaiStr}` : '.................................................................................................'}`, marginL + labelW, rowY)

  rowY += 5.5
  doc.text('Tanggal Masuk Kerja Kembali', marginL + 4, rowY)
  doc.text(`:  ${isTahunan ? tglMasukKembali : '.................................................................................................'}`, marginL + labelW, rowY)

  rowY += 5.5
  doc.text('Keperluan Cuti', marginL + 4, rowY)
  const maxKeperluanW = contentW - labelW - 6
  const potongKeperluan = doc.splitTextToSize(isTahunan ? keperluan : '.................................................................................................', maxKeperluanW)
  doc.text(`:  ${potongKeperluan[0] || '-'}`, marginL + labelW, rowY)

  rowY += 5.5
  doc.text('Telp/HP Selama Cuti', marginL + 4, rowY)
  doc.text(`:  ${isTahunan ? noTelp : '.................................................................................................'}`, marginL + labelW, rowY)

  rowY += 5.5
  doc.text('Alamat Cuti', marginL + 4, rowY)
  const potongAlamat = doc.splitTextToSize(isTahunan ? alamatCuti : '.................................................................................................', maxKeperluanW)
  doc.text(`:  ${potongAlamat[0] || '-'}`, marginL + labelW, rowY)

  // 5. Opsi B: PENGAMBILAN CUTI DISPENSASI
  y += boxAH + 3
  const boxBH = 64
  doc.rect(marginL, y, contentW, boxBH)

  // Checkbox B
  drawCheckbox(doc, marginL + 3, y + 2.5, 3.8, isDispensasi)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PENGAMBILAN CUTI DISPENSASI', marginL + 10, y + 5.5)

  // Checklist 7 Dispensasi (2 Kolom)
  const subDispensasi = String(leave.subJenisDispensasi || leave.jenis || '').toLowerCase()
  const anakKe = leave.anakKe || (subDispensasi.includes('anak ke') ? subDispensasi.match(/\d+/)?.[0] : '') || '....'

  const c1X = marginL + 5
  const c2X = midX + 2
  let dispY = y + 10
  const cbSize = 3.2

  // Baris 1
  const isNikahKaryawan = isDispensasi && (subDispensasi.includes('karyawan') && subDispensasi.includes('nikah')) || subDispensasi === 'cuti menikah'
  drawCheckbox(doc, c1X, dispY - 2.5, cbSize, isNikahKaryawan)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Pernikahan Karyawan (3 hari)', c1X + 5.5, dispY)

  const isKematianInti = isDispensasi && (subDispensasi.includes('suami') || subDispensasi.includes('istri') || (subDispensasi.includes('anak') && subDispensasi.includes('mati')))
  drawCheckbox(doc, c2X, dispY - 2.5, cbSize, isKematianInti)
  doc.text('Kematian Suami/Istri/Anak (3 hari)', c2X + 5.5, dispY)

  // Baris 2
  dispY += 4.8
  const isNikahAnak = isDispensasi && subDispensasi.includes('nikah') && subDispensasi.includes('anak')
  drawCheckbox(doc, c1X, dispY - 2.5, cbSize, isNikahAnak)
  doc.text('Pernikahan Anak Karyawan (2 hari)', c1X + 5.5, dispY)

  const isKematianOrtu = isDispensasi && (subDispensasi.includes('orang tua') || subDispensasi.includes('mertua'))
  drawCheckbox(doc, c2X, dispY - 2.5, cbSize, isKematianOrtu)
  doc.text('Kematian Orang Tua/Mertua (3 hari)', c2X + 5.5, dispY)

  // Baris 3
  dispY += 4.8
  const isMelahirkan = isDispensasi && (subDispensasi.includes('melahirkan') || subDispensasi.includes('bersalin')) && !subDispensasi.includes('istri')
  drawCheckbox(doc, c1X, dispY - 2.5, cbSize, isMelahirkan)
  doc.text(`Melahirkan anak ke ${isMelahirkan && anakKe ? anakKe : '.....'} (90 hari)`, c1X + 5.5, dispY)

  const isKhitanan = isDispensasi && subDispensasi.includes('khitan')
  drawCheckbox(doc, c2X, dispY - 2.5, cbSize, isKhitanan)
  doc.text('Khitanan Anak (2 hari)', c2X + 5.5, dispY)

  // Baris 4
  dispY += 4.8
  const isIstriMelahirkan = isDispensasi && subDispensasi.includes('istri') && subDispensasi.includes('melahirkan')
  drawCheckbox(doc, c1X, dispY - 2.5, cbSize, isIstriMelahirkan)
  doc.text('Istri Karyawan Melahirkan (2 hari)', c1X + 5.5, dispY)

  // Rincian Isian Dispensasi
  rowY = dispY + 6.5
  doc.setFontSize(8.5)
  doc.text('Tanggal Pelaksanaan', marginL + 4, rowY)
  doc.text(`:  ${isDispensasi ? `${mulaiStr} s.d ${selesaiStr}` : '.................................................................................................'}`, marginL + labelW, rowY)

  rowY += 5.2
  doc.text('Durasi', marginL + 4, rowY)
  doc.text(`:  ${isDispensasi ? `${durasiHari} Hari` : '.................................................................................................'}`, marginL + labelW, rowY)

  rowY += 5.2
  doc.text('Alamat Cuti', marginL + 4, rowY)
  const potongAlamatDisp = doc.splitTextToSize(isDispensasi ? alamatCuti : '.................................................................................................', maxKeperluanW)
  doc.text(`:  ${potongAlamatDisp[0] || '-'}`, marginL + labelW, rowY)

  rowY += 5.2
  doc.text('Telp/HP Selama Cuti', marginL + 4, rowY)
  doc.text(`:  ${isDispensasi ? noTelp : '.................................................................................................'}`, marginL + labelW, rowY)

  rowY += 5.2
  doc.text('Tanggal Masuk Kerja Kembali', marginL + 4, rowY)
  doc.text(`:  ${isDispensasi ? tglMasukKembali : '.................................................................................................'}`, marginL + labelW, rowY)

  // 6. Catatan (Bagian Presensi)
  y += boxBH + 3
  const catatanBoxH = 13
  doc.rect(marginL, y, contentW, catatanBoxH)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('Catatan (Bagian Presensi) :', marginL + 3, y + 4.5)
  doc.setTextColor(140, 140, 140)
  doc.text('......................................................................................................................................................................................', marginL + 42, y + 4.5)
  doc.text('.....................................................................................................................................................................................................................................', marginL + 3, y + 9.5)
  doc.setTextColor(0, 0, 0)

  // 7. Titimangsa & 4 Kolom Tanda Tangan
  y += catatanBoxH + 3.5
  const tglPengajuan = formatTanggalIndo(leave.createdAt || new Date())
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(`Pariaman, ${tglPengajuan}`, marginL + contentW, y, { align: 'right' })

  y += 2
  const ttdBoxH = 34
  doc.rect(marginL, y, contentW, ttdBoxH)

  const colW = contentW / 4 // 45.5 mm per kolom
  const colCenters = [
    marginL + colW * 0.5,
    marginL + colW * 1.5,
    marginL + colW * 2.5,
    marginL + colW * 3.5,
  ]

  // Garis vertikal pemisah 4 kolom
  doc.line(marginL + colW, y, marginL + colW, y + ttdBoxH)
  doc.line(marginL + colW * 2, y, marginL + colW * 2, y + ttdBoxH)
  doc.line(marginL + colW * 3, y, marginL + colW * 3, y + ttdBoxH)

  // Header 4 Kolom
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Yayasan', colCenters[0], y + 4.5, { align: 'center' })
  doc.text('Bagian Presensi', colCenters[1], y + 4.5, { align: 'center' })
  doc.text('Kepala Sekolah/Unit', colCenters[2], y + 4.5, { align: 'center' })
  doc.text('Karyawan Bersangkutan', colCenters[3], y + 4.5, { align: 'center' })

  // Tanda Tangan Nama di Bawah
  const namaYayasan = 'Dr. Rian Eka Putra, S. Pd., M.Si.'
  const namaPresensi = getNamaPetugasPresensi(staff.unitId, settings, allStaff)
  const namaKepsek = getNamaKepalaSekolah(staff.unitId, settings, allStaff)
  const namaKaryawan = staffName

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`( ${namaYayasan} )`, colCenters[0], y + ttdBoxH - 3, { align: 'center' })
  doc.text(`( ${namaPresensi} )`, colCenters[1], y + ttdBoxH - 3, { align: 'center' })
  doc.text(`( ${namaKepsek} )`, colCenters[2], y + ttdBoxH - 3, { align: 'center' })
  doc.text(`( ${namaKaryawan} )`, colCenters[3], y + ttdBoxH - 3, { align: 'center' })

  // 8. Catatan Kaki (Footnote)
  y += ttdBoxH + 3
  doc.setLineWidth(0.2)
  doc.setDrawColor(180, 180, 180)
  doc.line(marginL, y, marginL + contentW, y)

  y += 3.5
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(80, 80, 80)
  doc.text('* Catatan :', marginL, y)
  y += 3.2
  doc.text('  1. Cuti dispensasi tidak mengurangi hak cuti tahunan.', marginL, y)
  y += 3.2
  doc.text('  2. Formulir permohonan cuti diajukan minimal 1 (satu) minggu sebelum pelaksanaan cuti.', marginL, y)
  y += 3.2
  doc.text('  3. Formulir cuti dibuat 3 (tiga) rangkap (karyawan, arsip unit, arsip kantor yayasan).', marginL, y)

  return doc
}

/**
 * Download file PDF Formulir Permohonan Cuti langsung ke browser pengguna.
 */
export async function downloadFormCutiPDF({
  leave = {},
  staff = {},
  unit = null,
  settings = {},
  allStaff = [],
  logoDataUrl = null,
}) {
  const doc = await buildFormCutiDoc({
    leave,
    staff,
    unit,
    settings,
    allStaff,
    logoDataUrl,
  })

  const rawName = (staff.name || leave.staffName || 'Pegawai').replace(/[^a-zA-Z0-9]/g, '_')
  const dateStr = (leave.mulai || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
  const fileName = `Form_Cuti_${rawName}_${dateStr}.pdf`

  const blob = doc.output('blob')
  downloadBlob(blob, fileName)
  return fileName
}
