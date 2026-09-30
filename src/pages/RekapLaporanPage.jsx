import { useState, useMemo, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { selectRekapTableData, selectRekapSummary, selectRekapChartData, selectRekapKepatuhanChart, selectRekapReportData, buildAttendance, initialsOf, selectActiveUnitId, selectCanSwitchUnit, selectUnitOptionsById, ALL_UNITS } from '../store/simPresStore.jsx'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const statusStyles = {
  good: 'bg-[#DCFCE7] text-[#16A34A]',
  late: 'bg-[#FEF3C7] text-[#B45309]',
  early: 'bg-[#FFEDD5] text-[#C2410C]',
  alpha: 'bg-[#ffdad6] text-[#93000a]',
  leave: 'bg-tertiary-fixed text-on-tertiary-fixed',
  error: 'bg-[#FEF2F2] text-[#DC2626]',
}

const avatarStyles = [
  'bg-primary text-on-primary',
  'bg-secondary-container text-on-secondary-container',
  'bg-surface-container-high text-on-surface',
  'bg-error-container text-on-error',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-primary text-on-primary',
  'bg-surface-container-highest text-on-surface',
  'bg-tertiary-fixed text-on-tertiary-fixed',
]

const periods = ['Harian', 'Mingguan', 'Bulanan', 'Tahunan']
const periodLabels = { Harian: 'Hari Ini', Mingguan: 'Minggu Ini', Bulanan: 'Bulan Ini', Tahunan: 'Tahun Ini' }
const unitOptions = ['all', 'tk', 'sd', 'smp', 'sma']
const unitLabels = { all: 'Semua Unit', tk: 'TKIT Attin Sumbar', sd: 'SDIT Attin Sumbar', smp: 'SMPIT Attin Sumbar', sma: 'SMAIT Attin Sumbar' }

function getMonthYearLabel(period, customMonth = null, customYear = null) {
  const now = new Date()
  const month = customMonth ?? now.getMonth()
  const year = customYear ?? now.getFullYear()
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  
  switch (period) {
    case 'Harian':
      return `Harian_${now.getDate()}_${monthNames[month]}_${year}`
    case 'Mingguan':
      return `Mingguan_Minggu_${monthNames[month]}_${year}`
    case 'Bulanan':
      return `Bulanan_${monthNames[month]}_${year}`
    case 'Tahunan':
      return `Tahunan_${year}`
    default:
      return period
  }
}

function exportPresensiToExcel(data, unitLabel, periodLabel, yayasanInfo = null, signatory = null) {
  console.log('[exportPresensiToExcel] Starting export', { dataLength: data?.length, unitLabel, periodLabel })
  if (!data || !data.length) {
    console.error('[exportPresensiToExcel] No data provided')
    return
  }
  try {
    const wb = XLSX.utils.book_new()
    
    const y = yayasanInfo || { nama: 'Yayasan Islam Attin Indonesia', alamat: 'Jl. Raya Cendekia No. 45, Jakarta Selatan', kontak: '+62 811-9876-5432' }
    const s = signatory || {}
    
    // Header info rows
    const infoRows = [
      [y.nama],
      [y.alamat],
      [y.kontak],
      [],
      ['REKAP LAPORAN PRESENSI PEGAWAI'],
      [unitLabel.replace(/_/g, ' ')],
      [periodLabel.replace(/_/g, ' ')],
      [],
    ]
    
    const header = ['No', 'Nama Pegawai', 'NIY/NIP', 'Unit', 'Periode Rekap', 'Total Hari Kerja', 'Hadir', 'Terlambat', 'Izin/Sakit', 'Alpha', 'Persentase Kehadiran']
    
    const rows = data.map((row, i) => [
      i + 1,
      row.name,
      row.niy,
      row.unit,
      row.periode,
      row.totalHariKerja,
      row.hadir,
      row.terlambat,
      row.izinSakit,
      row.alpha,
      row.persentaseKehadiran + '%'
    ])
    
    // Signatory rows
    const signRows = [
      [],
      ['Mengetahui,', '', '', '', '', '', '', '', '', '', 'Diperiksa oleh,'],
      [s.kepalaSekolah?.jabatan || 'Kepala Sekolah', '', '', '', '', '', '', '', '', '', s.petugasPresensi?.jabatan || 'Petugas Presensi'],
      [s.kepalaSekolah?.nama ? `(${s.kepalaSekolah.nama})` : '(________________________)', '', '', '', '', '', '', '', '', '', s.petugasPresensi?.nama ? `(${s.petugasPresensi.nama})` : '(________________________)'],
    ]
    
    const wsData = [...infoRows, header, ...rows, ...signRows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 30 },  // Nama Pegawai
      { wch: 15 },  // NIY/NIP
      { wch: 20 },  // Unit
      { wch: 15 },  // Periode Rekap
      { wch: 15 },  // Total Hari Kerja
      { wch: 8 },   // Hadir
      { wch: 10 },  // Terlambat
      { wch: 10 },  // Izin/Sakit
      { wch: 8 },   // Alpha
      { wch: 18 },  // Persentase Kehadiran
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi')
    
    const fileName = `Rekap_Presensi_${unitLabel}_${periodLabel}.xlsx`
    console.log('[exportPresensiToExcel] Writing file:', fileName)
    XLSX.writeFile(wb, fileName)
    console.log('[exportPresensiToExcel] File write completed')
  } catch (e) {
    console.error('[exportPresensiToExcel] Error:', e)
    throw e
  }
}

function exportCutiToExcel(data, unitLabel, periodLabel, yayasanInfo = null, signatory = null) {
  console.log('[exportCutiToExcel] Starting export', { dataLength: data?.length, unitLabel, periodLabel })
  if (!data || !data.length) {
    console.error('[exportCutiToExcel] No data provided')
    return
  }
  try {
    const wb = XLSX.utils.book_new()
    
    const y = yayasanInfo || { nama: 'Yayasan Islam Attin Indonesia', alamat: 'Jl. Raya Cendekia No. 45, Jakarta Selatan', kontak: '+62 811-9876-5432' }
    const s = signatory || {}
    
    // Header info rows
    const infoRows = [
      [y.nama],
      [y.alamat],
      [y.kontak],
      [],
      ['REKAP LAPORAN CUTI DAN IZIN PEGAWAI'],
      [unitLabel.replace(/_/g, ' ')],
      [periodLabel.replace(/_/g, ' ')],
      [],
    ]
    
    const header = ['No', 'Nama Pegawai', 'NIY/NIP', 'Unit', 'Jenis Izin/Cuti', 'Tanggal Mulai', 'Tanggal Selesai', 'Lama Cuti', 'Status Persetujuan']
    
    const rows = data.map((row, i) => [
      i + 1,
      row.name,
      row.niy,
      row.unit,
      row.jenis,
      row.tanggalMulai,
      row.tanggalSelesai,
      row.durasi,
      row.status
    ])
    
    // Signatory rows
    const ketuaYayasan = s.ketuaYayasan || { nama: '', jabatan: 'Ketua Yayasan' }
    const adminTU = s.adminTU?.kepalaTU || s.adminTU?.operatorSistem || { nama: '', jabatan: 'Admin TU' }
    
    const signRows = [
      [],
      ['Mengetahui,', '', '', '', '', '', '', '', 'Disiapkan oleh,'],
      [ketuaYayasan.jabatan, '', '', '', '', '', '', '', adminTU.jabatan],
      [ketuaYayasan.nama ? `(${ketuaYayasan.nama})` : '(________________________)', '', '', '', '', '', '', '', adminTU.nama ? `(${adminTU.nama})` : '(________________________)'],
    ]
    
    const wsData = [...infoRows, header, ...rows, ...signRows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 30 },  // Nama Pegawai
      { wch: 15 },  // NIY/NIP
      { wch: 20 },  // Unit
      { wch: 25 },  // Jenis Izin/Cuti
      { wch: 15 },  // Tanggal Mulai
      { wch: 15 },  // Tanggal Selesai
      { wch: 12 },  // Lama Cuti
      { wch: 18 },  // Status Persetujuan
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Cuti Izin')
    
    const fileName = `Rekap_Cuti_Izin_${unitLabel}_${periodLabel}.xlsx`
    console.log('[exportCutiToExcel] Writing file:', fileName)
    XLSX.writeFile(wb, fileName)
    console.log('[exportCutiToExcel] File write completed')
  } catch (e) {
    console.error('[exportCutiToExcel] Error:', e)
    throw e
  }
}

function getUnitInfo(unitLabel, yayasanInfo = null) {
  const defaultYayasan = {
    nama: 'Yayasan Islam Attin Indonesia',
    alamat: 'Jl. Raya Cendekia No. 45, Jakarta Selatan',
    kontak: '+62 811-9876-5432',
    email: 'sekretariat@attinsumbar.sch.id',
  }
  const y = yayasanInfo || defaultYayasan
  
  const unitInfo = {
    'Semua Unit': { nama: y.nama, unit: 'Seluruh Unit Sekolah', alamat: y.alamat, kontak: y.kontak },
    'TKIT Attin Sumbar': { nama: y.nama, unit: 'TKIT Attin Sumbar', alamat: y.alamat, kontak: y.kontak },
    'SDIT Attin Sumbar': { nama: y.nama, unit: 'SDIT Attin Sumbar', alamat: y.alamat, kontak: y.kontak },
    'SMPIT Attin Sumbar': { nama: y.nama, unit: 'SMPIT Attin Sumbar', alamat: y.alamat, kontak: y.kontak },
    'SMAIT Attin Sumbar': { nama: y.nama, unit: 'SMAIT Attin Sumbar', alamat: y.alamat, kontak: y.kontak },
  }
  return unitInfo[unitLabel] || unitInfo['Semua Unit']
}

function getPeriodDisplayLabel(period) {
  const labels = { Harian: 'Harian (Hari Ini)', Mingguan: 'Mingguan (Minggu Ini)', Bulanan: 'Bulanan (Bulan Ini)', Tahunan: 'Tahunan (Tahun Ini)' }
  return labels[period] || period
}

function getCurrentDateString() {
  const now = new Date()
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`
}

function drawHeader(doc, unitLabel, title) {
  const info = getUnitInfo(unitLabel)
  let y = 15
  
  // Logo placeholder (kotak)
  doc.setDrawColor(0, 102, 204)
  doc.setLineWidth(0.5)
  doc.rect(14, y, 20, 20)
  doc.setFontSize(8)
  doc.setTextColor(0, 102, 204)
  doc.text('LOGO', 20, y + 11, { align: 'center' })
  
  // Kop surat
  doc.setTextColor(0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(info.nama, 40, y + 6)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(info.unit, 40, y + 12)
  doc.setFontSize(8)
  doc.text(info.alamat, 40, y + 17)
  doc.text(info.kontak, 40, y + 22)
  
  // Garis pemisah
  y += 28
  doc.setDrawColor(0, 102, 204)
  doc.setLineWidth(1)
  doc.line(14, y, 283, y)
  y += 2
  doc.setDrawColor(180)
  doc.setLineWidth(0.3)
  doc.line(14, y, 283, y)
  
  // Judul
  y += 8
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text(title, 148, y, { align: 'center' })
  
  return y + 6
}

function drawFooter(doc, unitLabel) {
  const pageCount = doc.getNumberOfPages()
  const info = getUnitInfo(unitLabel)
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const y = doc.internal.pageSize.height - 50
    
    // Garis pemisah
    doc.setDrawColor(180)
    doc.setLineWidth(0.3)
    doc.line(14, y - 5, 283, y - 5)
    
    // Tempat, tanggal
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Jakarta, ${getCurrentDateString()}`, 200, y)
    
    // Mengetahui / Disiapkan
    doc.setFontSize(9)
    doc.setTextColor(0)
    doc.setFont('helvetica', 'bold')
    doc.text('Mengetahui,', 200, y + 10)
    doc.text('Disiapkan oleh,', 14, y + 10)
    
    // Ruang tanda tangan
    doc.setFont('helvetica', 'normal')
    doc.text('\n\n\n', 200, y + 15)
    doc.text('\n\n\n', 14, y + 15)
    
    // Nama
    doc.setFont('helvetica', 'bold')
    doc.text('Ketua Yayasan', 200, y + 35)
    doc.text('Staff Administrasi', 14, y + 35)
    
    // Halaman
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150)
    doc.text(`Halaman ${i} dari ${pageCount}`, 148, doc.internal.pageSize.height - 10, { align: 'center' })
  }
}

function drawKopSurat(doc, unitLabel, yayasanInfo = null) {
  const info = getUnitInfo(unitLabel, yayasanInfo)
  const pageWidth = doc.internal.pageSize.width
  let y = 10

  // Logo placeholder (lingkaran dengan border)
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(0.8)
  doc.circle(27.5, y + 12.5, 12.5)
  doc.setFontSize(6)
  doc.setTextColor(0, 51, 102)
  doc.setFont('helvetica', 'bold')
  doc.text('LOGO', 27.5, y + 13.5, { align: 'center' })

  // KOP Surat - Teks di sebelah kanan logo
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(info.nama, 45, y + 8)
  doc.setFontSize(11)
  doc.text(info.unit, 45, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(info.alamat, 45, y + 19)
  doc.text(info.kontak, 45, y + 24)

  // Garis pemisah bawah kop
  y += 32
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(1.2)
  doc.line(15, y, pageWidth - 15, y)
  y += 2
  doc.setDrawColor(180)
  doc.setLineWidth(0.4)
  doc.line(15, y, pageWidth - 15, y)

  return y + 10
}

function drawFooterSignature(doc, unitLabel) {
  const pageHeight = doc.internal.pageSize.height
  const pageWidth = doc.internal.pageSize.width
  let y = pageHeight - 60

  // Garis pemisah atas footer
  doc.setDrawColor(180)
  doc.setLineWidth(0.3)
  doc.line(15, y - 5, pageWidth - 15, y - 5)

  // Tempat, tanggal
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  doc.text(`Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 15, y, { align: 'right' })

  // Mengetahui dan Disiapkan
  y += 14
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Mengetahui,', pageWidth - 15, y, { align: 'right' })
  doc.text('Disiapkan oleh,', 15, y)

  // Ruang tanda tangan (kosong)
  y += 25
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('_________________________', pageWidth - 15, y, { align: 'right' })
  doc.text('_________________________', 15, y)

  // Nama jabatan
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Ketua Yayasan', pageWidth - 15, y, { align: 'right' })
  doc.text('Staff Administrasi', 15, y)

  // Nama (placeholder)
  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('(Dr. H. Ahmad Syarif, M.Pd.)', pageWidth - 15, y, { align: 'right' })
  doc.text('(Administrasi Yayasan)', 15, y)
}

function exportPresensiToPDF(data, unitLabel, periodLabel, yayasanInfo = null, signatory = null) {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width
  const centerX = pageWidth / 2
  
  // KOP Surat
  let y = drawKopSurat(doc, unitLabel, yayasanInfo)
  
  // Judul Laporan
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 51, 102)
  doc.text('REKAP LAPORAN PRESENSI PEGAWAI', centerX, y, { align: 'center' })
  y += 6
  
  // Garis bawah judul
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(0.5)
  doc.line(centerX - 60, y, centerX + 60, y)
  y += 10
  
  // Info Laporan - dalam kotak
  const infoBoxY = y
  const infoBoxHeight = 22
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(0.3)
  doc.rect(15, infoBoxY, pageWidth - 30, infoBoxHeight)
  
  // Handle custom period label for display
  let periodDisplay = periodLabel
  if (periodLabel.startsWith('Custom_')) {
    periodDisplay = periodLabel.replace('Custom_', '').replace(/_sd_/, ' s.d. ').replace(/_/g, ' ')
  } else {
    periodDisplay = periodLabel.replace(/_/g, ' ').replace(/Bulanan\s+(\w+)\s+(\d+)/, 'Bulan $1 $2').replace(/Tahunan\s+(\d+)/, 'Tahun $1')
  }
  
  const unitDisplay = unitLabel.replace(/_/g, ' ')
  const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  
  // Kolom kiri
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text('Unit Laporan:', 20, infoBoxY + 7)
  doc.text('Jenis Laporan:', 20, infoBoxY + 14)
  
  doc.setFont('helvetica', 'normal')
  doc.text(unitDisplay, 55, infoBoxY + 7)
  doc.text('Rekap Presensi', 55, infoBoxY + 14)
  
  // Kolom kanan
  doc.setFont('helvetica', 'bold')
  doc.text('Periode Laporan:', pageWidth - 95, infoBoxY + 7)
  doc.text('Tanggal Cetak:', pageWidth - 95, infoBoxY + 14)
  
  doc.setFont('helvetica', 'normal')
  doc.text(periodDisplay, pageWidth - 30, infoBoxY + 7, { align: 'right' })
  doc.text(printDate, pageWidth - 30, infoBoxY + 14, { align: 'right' })
  
  y = infoBoxY + infoBoxHeight + 10
  
  // Tabel
  const columns = [
    { header: 'No', dataKey: 'no' },
    { header: 'Nama Pegawai', dataKey: 'name' },
    { header: 'NIY/NIP', dataKey: 'niy' },
    { header: 'Unit', dataKey: 'unit' },
    { header: 'Hadir', dataKey: 'hadir' },
    { header: 'Terlambat', dataKey: 'terlambat' },
    { header: 'Izin', dataKey: 'izinSakit' },
    { header: 'Alpha', dataKey: 'alpha' },
    { header: '% Kehadiran', dataKey: 'persentaseKehadiran' },
  ]
  
  const rows = data.map((row, i) => ({
    no: i + 1,
    name: row.name,
    niy: row.niy,
    unit: row.unit,
    hadir: row.hadir,
    terlambat: row.terlambat,
    izinSakit: row.izinSakit,
    alpha: row.alpha,
    persentaseKehadiran: row.persentaseKehadiran + '%'
  }))
  
  autoTable(doc, {
    columns,
    body: rows,
    startY: y,
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', lineColor: [200, 200, 200], lineWidth: 0.1 },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8, cellPadding: 4 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      no: { cellWidth: 12, halign: 'center' },
      name: { cellWidth: 42 },
      niy: { cellWidth: 25 },
      unit: { cellWidth: 25 },
      hadir: { cellWidth: 15, halign: 'center' },
      terlambat: { cellWidth: 18, halign: 'center' },
      izinSakit: { cellWidth: 15, halign: 'center' },
      alpha: { cellWidth: 15, halign: 'center' },
      persentaseKehadiran: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Page number
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150)
        doc.text(`Halaman ${i} dari ${pageCount}`, centerX, doc.internal.pageSize.height - 8, { align: 'center' })
      }
    }
  })
  
  // Footer signature - at bottom of last page
  const totalPages = doc.getNumberOfPages()
  doc.setPage(totalPages)
  const pageHeight = doc.internal.pageSize.height
  const footerY = pageHeight - 65
  drawFooterSignatureAt(doc, unitLabel, footerY, signatory, 'presensi')
  
  const fileName = `Rekap_Presensi_${unitLabel.replace(/\s+/g, '_')}_${periodLabel}.pdf`
  doc.save(fileName)
}

// Helper function to draw footer at specific Y position (from top)
function drawFooterSignatureAt(doc, unitLabel, startY, signatory = null, reportType = 'presensi') {
  const pageWidth = doc.internal.pageSize.width
  let y = startY
  
  // Garis pemisah
  doc.setDrawColor(180)
  doc.setLineWidth(0.3)
  doc.line(15, y, pageWidth - 15, y)
  y += 10
  
  // Tempat, tanggal
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  doc.text(`Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 15, y, { align: 'right' })
  
  if (reportType === 'presensi') {
    // ===== REKAP PRESENSI =====
    // Mengetahui: Kepala Sekolah
    // Diperiksa oleh: Petugas Presensi
    const kepalaSekolah = signatory?.kepalaSekolah || { nama: '', jabatan: 'Kepala Sekolah' }
    const petugasPresensi = signatory?.petugasPresensi || { nama: '', jabatan: 'Petugas Presensi' }
    
    // Mengetahui dan Diperiksa
    y += 12
    doc.setTextColor(0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Mengetahui,', pageWidth - 15, y, { align: 'right' })
    doc.text('Diperiksa oleh,', 15, y)
    
    // Ruang tanda tangan
    y += 22
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('_________________________', pageWidth - 15, y, { align: 'right' })
    doc.text('_________________________', 15, y)
    
    // Nama jabatan
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text(kepalaSekolah.jabatan || 'Kepala Sekolah', pageWidth - 15, y, { align: 'right' })
    doc.text(petugasPresensi.jabatan || 'Petugas Presensi', 15, y)
    
    // Nama (if available)
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(kepalaSekolah.nama ? `(${kepalaSekolah.nama})` : '(________________________)', pageWidth - 15, y, { align: 'right' })
    doc.text(petugasPresensi.nama ? `(${petugasPresensi.nama})` : '(________________________)', 15, y)
  } else {
    // ===== REKAP CUTI/IZIN =====
    // Mengetahui: Ketua Yayasan
    // Disiapkan oleh: Admin/TU (Kepala TU atau Operator)
    const ketuaYayasan = signatory?.ketuaYayasan || { nama: '', jabatan: 'Ketua Yayasan' }
    const adminTU = signatory?.adminTU?.kepalaTU || signatory?.adminTU?.operatorSistem || { nama: '', jabatan: 'Admin TU' }
    
    // Mengetahui dan Disiapkan
    y += 12
    doc.setTextColor(0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Mengetahui,', pageWidth - 15, y, { align: 'right' })
    doc.text('Disiapkan oleh,', 15, y)
    
    // Ruang tanda tangan
    y += 22
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('_________________________', pageWidth - 15, y, { align: 'right' })
    doc.text('_________________________', 15, y)
    
    // Nama jabatan
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text(ketuaYayasan.jabatan || 'Ketua Yayasan', pageWidth - 15, y, { align: 'right' })
    doc.text(adminTU.jabatan || 'Admin TU', 15, y)
    
    // Nama (if available)
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(ketuaYayasan.nama ? `(${ketuaYayasan.nama})` : '(________________________)', pageWidth - 15, y, { align: 'right' })
    doc.text(adminTU.nama ? `(${adminTU.nama})` : '(________________________)', 15, y)
  }
}

function exportCutiToPDF(data, unitLabel, periodLabel, yayasanInfo = null, signatory = null) {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width
  const centerX = pageWidth / 2
  
  // KOP Surat
  let y = drawKopSurat(doc, unitLabel, yayasanInfo)
  
  // Judul Laporan
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 51, 102)
  doc.text('REKAP LAPORAN CUTI DAN IZIN PEGAWAI', centerX, y, { align: 'center' })
  y += 6
  
  // Garis bawah judul
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(0.5)
  doc.line(centerX - 60, y, centerX + 60, y)
  y += 10
  
  // Info Laporan - dalam kotak
  const infoBoxY = y
  const infoBoxHeight = 22
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(0.3)
  doc.rect(15, infoBoxY, pageWidth - 30, infoBoxHeight)
  
  let periodDisplay = periodLabel
  if (periodLabel.startsWith('Custom_')) {
    periodDisplay = periodLabel.replace('Custom_', '').replace(/_sd_/, ' s.d. ').replace(/_/g, ' ')
  } else {
    periodDisplay = periodLabel.replace(/_/g, ' ').replace(/Bulanan\s+(\w+)\s+(\d+)/, 'Bulan $1 $2').replace(/Tahunan\s+(\d+)/, 'Tahun $1')
  }
  
  const unitDisplay = unitLabel.replace(/_/g, ' ')
  const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  
  // Kolom kiri
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text('Unit Laporan:', 20, infoBoxY + 7)
  doc.text('Jenis Laporan:', 20, infoBoxY + 14)
  
  doc.setFont('helvetica', 'normal')
  doc.text(unitDisplay, 55, infoBoxY + 7)
  doc.text('Rekap Cuti/Izin', 55, infoBoxY + 14)
  
  // Kolom kanan
  doc.setFont('helvetica', 'bold')
  doc.text('Periode Laporan:', pageWidth - 95, infoBoxY + 7)
  doc.text('Tanggal Cetak:', pageWidth - 95, infoBoxY + 14)
  
  doc.setFont('helvetica', 'normal')
  doc.text(periodDisplay, pageWidth - 30, infoBoxY + 7, { align: 'right' })
  doc.text(printDate, pageWidth - 30, infoBoxY + 14, { align: 'right' })
  
  y = infoBoxY + infoBoxHeight + 10
  
  // Tabel
  const columns = [
    { header: 'No', dataKey: 'no' },
    { header: 'Nama Pegawai', dataKey: 'name' },
    { header: 'NIY/NIP', dataKey: 'niy' },
    { header: 'Unit', dataKey: 'unit' },
    { header: 'Jenis Izin/Cuti', dataKey: 'jenis' },
    { header: 'Tanggal Mulai', dataKey: 'tanggalMulai' },
    { header: 'Tanggal Selesai', dataKey: 'tanggalSelesai' },
    { header: 'Status', dataKey: 'status' },
  ]
  
  const rows = data.map((row, i) => ({
    no: i + 1,
    name: row.name,
    niy: row.niy,
    unit: row.unit,
    jenis: row.jenis,
    tanggalMulai: row.tanggalMulai,
    tanggalSelesai: row.tanggalSelesai,
    status: row.status
  }))
  
  autoTable(doc, {
    columns,
    body: rows,
    startY: y,
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', lineColor: [200, 200, 200], lineWidth: 0.1 },
    headStyles: { fillColor: [0, 100, 0], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8, cellPadding: 4 },
    alternateRowStyles: { fillColor: [235, 248, 235] },
    columnStyles: {
      no: { cellWidth: 10, halign: 'center' },
      name: { cellWidth: 38 },
      niy: { cellWidth: 22 },
      unit: { cellWidth: 22 },
      jenis: { cellWidth: 35 },
      tanggalMulai: { cellWidth: 28, halign: 'center' },
      tanggalSelesai: { cellWidth: 28, halign: 'center' },
      status: { cellWidth: 26, halign: 'center' },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150)
        doc.text(`Halaman ${i} dari ${pageCount}`, centerX, doc.internal.pageSize.height - 8, { align: 'center' })
      }
    }
  })
  
  // Footer signature - at bottom of last page
  const totalPages = doc.getNumberOfPages()
  doc.setPage(totalPages)
  const pageHeight = doc.internal.pageSize.height
  const footerY = pageHeight - 65
  drawFooterSignatureAt(doc, unitLabel, footerY, signatory, 'cuti')
  
  const fileName = `Rekap_Cuti_Izin_${unitLabel.replace(/\s+/g, '_')}_${periodLabel}.pdf`
  doc.save(fileName)
}

function DetailModal({ employee, isOpen, onClose, state }) {
  if (!isOpen || !employee) return null
  
  const attendance = state.attendance || []
  const staffAttendance = attendance.filter(a => a.staffId === employee.id)
  const leaves = state.leaves.filter(l => l.staffId === employee.id && (l.status === 'Disetujui' || l.status === 'Menunggu'))
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 md:p-6 border-b border-surface-container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${avatarStyles[0]} font-label-lg text-label-lg flex items-center justify-center flex-shrink-0`}>
              {employee.initials}
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">{employee.name}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{employee.niy} • {employee.unit}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors" aria-label="Tutup">
            <span className="material-symbols-outlined text-[24px] text-on-surface-variant">close</span>
          </button>
        </div>
        
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-surface-container rounded-lg">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Total Hari Kerja</p>
              <p className="font-headline-md text-headline-md text-primary">{employee.totalHariKerja}</p>
            </div>
            <div className="p-4 bg-surface-container rounded-lg">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Periode</p>
              <p className="font-body-md text-body-md text-on-surface">{employee.periode}</p>
            </div>
            <div className="p-4 bg-surface-container rounded-lg">
              <p className="font-label-sm text-label-sm text-on-surface-variant">% Kehadiran</p>
              <p className="font-headline-md text-headline-md text-primary">{employee.persentaseKehadiran}%</p>
            </div>
            <div className="p-4 bg-surface-container rounded-lg">
              <p className="font-label-sm text-label-sm text-on-surface-variant">Status</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-label-sm text-label-sm ${statusStyles[employee.statusType]}`}>{employee.status}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="font-body-md-medium text-body-md-medium text-on-surface mb-3">Ringkasan Kehadiran</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <p className="font-label-sm text-label-sm text-emerald-800">Hadir</p>
                <p className="font-headline-sm text-headline-sm text-emerald-700">{employee.hadir}</p>
                <p className="font-label-xs text-label-xs text-emerald-600">{employee.tepatWaktu} tepat waktu</p>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <p className="font-label-sm text-label-sm text-amber-800">Terlambat</p>
                <p className="font-headline-sm text-headline-sm text-amber-700">{employee.terlambat}</p>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="font-label-sm text-label-sm text-blue-800">Izin/Sakit</p>
                <p className="font-headline-sm text-headline-sm text-blue-700">{employee.izinSakit}</p>
              </div>
              <div className="p-3 bg-red-50/50 rounded-lg border border-red-100">
                <p className="font-label-sm text-label-sm text-red-800">Alpha</p>
                <p className="font-headline-sm text-headline-sm text-red-700">{employee.alpha}</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="font-body-md-medium text-body-md-medium text-on-surface mb-3">Detail Izin/Sakit</h4>
            {leaves.length > 0 ? (
              <div className="space-y-2">
                {leaves.map(leave => (
                  <div key={leave.id} className="p-3 bg-surface-container rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${leave.status === 'Disetujui' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      <div>
                        <p className="font-body-sm text-body-sm text-on-surface">{leave.jenis}</p>
                        <p className="font-label-xs text-label-xs text-on-surface-variant">{leave.periode} • {leave.durasi}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full font-label-xs text-label-xs ${leave.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant py-4 text-center">Tidak ada data izin/sakit</p>
            )}
          </div>
          
          <div>
            <h4 className="font-body-md-medium text-body-md-medium text-on-surface mb-3">Riwayat Presensi Terbaru</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-on-surface-variant border-b border-surface-container">
                    <th className="pb-2 pr-4 font-medium">Tanggal</th>
                    <th className="pb-2 pr-4 font-medium">Masuk</th>
                    <th className="pb-2 pr-4 font-medium">Pulang</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Metode</th>
                  </tr>
                </thead>
                <tbody>
                  {staffAttendance.slice().reverse().slice(0, 10).map((a, i) => (
                    <tr key={a.id} className="border-b border-surface-container-low/50">
                      <td className="py-2 pr-4 font-body-sm text-on-surface-variant">{a.masuk ? a.masuk.split(' ')[0] : '-'}</td>
                      <td className="py-2 pr-4 font-body-sm text-on-surface">{a.masuk ? a.masuk.split(' ')[1] : '-'}</td>
                      <td className="py-2 pr-4 font-body-sm text-on-surface">{a.pulang || '-'}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-xs text-label-xs ${statusStyles[a.status === 'Tepat Waktu' ? 'good' : a.status === 'Terlambat' ? 'late' : 'alpha']}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-body-sm text-on-surface-variant">{a.method || '-'}</td>
                    </tr>
                  ))}
                  {staffAttendance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-on-surface-variant">Belum ada data presensi</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotifToast({ notification }) {
  if (!notification) return null
  const colors = {
    success: 'bg-emerald-500',
    info: 'bg-secondary',
    error: 'bg-rose-500',
  }
  const icons = {
    success: 'check',
    info: 'info',
    error: 'error',
  }
  return (
    <div className={`fixed top-4 right-4 ${colors[notification.type]} text-on-primary px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in`}>
      <span className="material-symbols-outlined text-[20px]">{icons[notification.type]}</span>
      <span>{notification.message}</span>
    </div>
  )
}

function RekapLaporanPage() {
  const { state, dispatch } = useSimPres()
  const [activePeriod, setActivePeriod] = useState('Bulanan')
  // Unit berasal dari unit terpilih di store (role-aware), bukan state lokal.
  const selectedUnit = selectActiveUnitId(state)
  const canSwitchUnit = selectCanSwitchUnit(state)
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'no', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showPresensiExport, setShowPresensiExport] = useState(false)
  const [showCutiExport, setShowCutiExport] = useState(false)
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [showReportSettings, setShowReportSettings] = useState(false)
  const [reportSettings, setReportSettings] = useState({
    reportType: 'presensi',
    period: 'Bulanan',
    unit: 'all',
    format: 'pdf',
    customStartDate: '',
    customEndDate: ''
  })
  const [exportPresensiConfig, setExportPresensiConfig] = useState({ period: 'Bulanan', unit: 'all', format: 'excel' })
  const [exportCutiConfig, setExportCutiConfig] = useState({ period: 'Bulanan', unit: 'all', format: 'excel' })
  const [isExporting, setIsExporting] = useState(false)
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const periods = ['Harian', 'Mingguan', 'Bulanan', 'Tahunan']
  // Unit terpilih = store utama; role non-Superadmin hanya punya satu opsi (unitnya).
  const unitOptions = [
    ...(canSwitchUnit ? [{ id: ALL_UNITS, nama: `Semua Unit (${state.units.length} Unit)` }] : []),
    ...selectUnitOptionsById(state),
  ]

  const summary = useMemo(() => selectRekapSummary(state, selectedUnit, activePeriod), [state, selectedUnit, activePeriod])
  const chartData = useMemo(() => selectRekapChartData(state, selectedUnit, activePeriod), [state, selectedUnit, activePeriod])
  const kepatuhanChart = useMemo(() => selectRekapKepatuhanChart(state, selectedUnit, activePeriod), [state, selectedUnit, activePeriod])
  const reportData = useMemo(() => selectRekapReportData(state, selectedUnit, activePeriod), [state, selectedUnit, activePeriod])

  const filteredData = useMemo(() => {
    let data = reportData.filter((row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.niy.includes(search) ||
      row.unit.toLowerCase().includes(search.toLowerCase())
    )
    
    data.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    
    return data
  }, [reportData, search, sortConfig])

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedUnit, activePeriod])

  // ===== HELPER FUNCTIONS FOR GLOBAL SETTINGS INTEGRATION =====
  
  // Get yayasan info from global settings
  const getYayasanInfo = () => {
    const settings = state.settings
    return {
      nama: settings.namaYayasan || 'Yayasan Islam Attin Indonesia',
      alamat: settings.alamatYayasan || 'Jl. Raya Cendekia No. 45, Jakarta Selatan',
      kontak: settings.noWhatsapp || '+62 811-9876-5432',
      email: settings.emailSekretariat || 'sekretariat@attinsumbar.sch.id',
      logo: settings.logo || null,
    }
  }

  // Get unit info combined with yayasan info
  const getUnitInfo = (unitLabel) => {
    const yayasanInfo = getYayasanInfo()
    const unitMap = {
      'Semua Unit': { nama: yayasanInfo.nama, unit: 'Seluruh Unit Sekolah' },
      'TKIT Attin Sumbar': { nama: yayasanInfo.nama, unit: 'TKIT Attin Sumbar' },
      'SDIT Attin Sumbar': { nama: yayasanInfo.nama, unit: 'SDIT Attin Sumbar' },
      'SMPIT Attin Sumbar': { nama: yayasanInfo.nama, unit: 'SMPIT Attin Sumbar' },
      'SMAIT Attin Sumbar': { nama: yayasanInfo.nama, unit: 'SMAIT Attin Sumbar' },
    }
    const info = unitMap[unitLabel] || unitMap['Semua Unit']
    return {
      ...info,
      alamat: yayasanInfo.alamat,
      kontak: yayasanInfo.kontak,
    }
  }

  // Get signatory data for a specific unit
  const getSignatory = (unitId) => {
    const penandatangan = state.settings.penandatangan || {}
    const unitIds = { tk: 'tk', sd: 'sd', smp: 'smp', sma: 'sma' }
    const id = unitIds[unitId] || unitId
    
    return {
      // Ketua Yayasan (for all units)
      ketuaYayasan: {
        nama: penandatangan.kepalaYayasan?.nama || '',
        jabatan: penandatangan.kepalaYayasan?.jabatan || 'Ketua Yayasan',
        nip: penandatangan.kepalaYayasan?.nip || '',
      },
      // Kepala Sekolah per unit
      kepalaSekolah: {
        nama: penandatangan.kepalaSekolah?.[id]?.nama || '',
        jabatan: penandatangan.kepalaSekolah?.[id]?.jabatan || `Kepala ${state.units.find(u => u.id === id)?.nama || 'Sekolah'}`,
        nip: penandatangan.kepalaSekolah?.[id]?.nip || '',
      },
      // Petugas Presensi per unit
      petugasPresensi: {
        nama: penandatangan.petugasPresensi?.[id]?.nama || '',
        jabatan: penandatangan.petugasPresensi?.[id]?.jabatan || `Petugas Presensi ${state.units.find(u => u.id === id)?.nama || 'Sekolah'}`,
      },
      // Petugas Presensi Yayasan
      petugasPresensiYayasan: {
        nama: penandatangan.petugasPresensi?.yayasan?.nama || '',
        jabatan: penandatangan.petugasPresensi?.yayasan?.jabatan || 'Petugas Presensi Yayasan',
      },
      // Admin/TU
      adminTU: {
        kepalaTU: {
          nama: penandatangan.adminTU?.kepalaTU?.nama || '',
          jabatan: penandatangan.adminTU?.kepalaTU?.jabatan || 'Kepala Tata Usaha',
        },
        operatorSistem: {
          nama: penandatangan.adminTU?.operatorSistem?.nama || '',
          jabatan: penandatangan.adminTU?.operatorSistem?.jabatan || 'Operator Sistem',
        },
      },
    }
  }

  // Get signatory for "Semua Unit" (use yayasan-level signatories)
  const getSignatoryAllUnits = () => {
    const penandatangan = state.settings.penandatangan || {}
    return {
      ketuaYayasan: {
        nama: penandatangan.kepalaYayasan?.nama || '',
        jabatan: penandatangan.kepalaYayasan?.jabatan || 'Ketua Yayasan',
        nip: penandatangan.kepalaYayasan?.nip || '',
      },
      kepalaSekolah: {
        nama: penandatangan.kepalaSekolah?.tk?.nama || '',
        jabatan: 'Kepala Sekolah',
        nip: penandatangan.kepalaSekolah?.tk?.nip || '',
      },
      petugasPresensi: {
        nama: penandatangan.petugasPresensi?.yayasan?.nama || '',
        jabatan: penandatangan.petugasPresensi?.yayasan?.jabatan || 'Petugas Presensi Yayasan',
      },
      adminTU: {
        kepalaTU: {
          nama: penandatangan.adminTU?.kepalaTU?.nama || '',
          jabatan: penandatangan.adminTU?.kepalaTU?.jabatan || 'Kepala Tata Usaha',
        },
        operatorSistem: {
          nama: penandatangan.adminTU?.operatorSistem?.nama || '',
          jabatan: penandatangan.adminTU?.operatorSistem?.jabatan || 'Operator Sistem',
        },
      },
    }
  }

  // Format date for display
  const getCurrentDateString = () => {
    const now = new Date()
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`
  }

  const getPeriodDisplayLabel = (period) => {
    const labels = { Harian: 'Harian (Hari Ini)', Mingguan: 'Mingguan (Minggu Ini)', Bulanan: 'Bulanan (Bulan Ini)', Tahunan: 'Tahunan (Tahun Ini)' }
    return labels[period] || period
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const selectedUnitObj = state.units.find(u => u.id === selectedUnit)
  const unitLabel = selectedUnit === ALL_UNITS ? `Semua Unit (${state.units.length} Unit)` : selectedUnitObj?.nama || 'Semua Unit'

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'Harian': return 'Hari Ini'
      case 'Mingguan': return 'Minggu Ini'
      case 'Bulanan': return 'Bulan Ini'
      case 'Tahunan': return 'Tahun Ini'
      default: return period
    }
  }

  const getExportPresensiData = (period, unit) => {
    return selectRekapReportData(state, unit === 'all' ? null : unit, period)
  }

  const getExportCutiData = (period, unit) => {
    let staff = state.staff.filter((s) => s.status === 'Aktif')
    if (unit && unit !== 'all') {
      staff = staff.filter((s) => s.unitId === unit)
    }
    const leaves = state.leaves || []
    return staff.map((s, idx) => {
      const unitObj = state.units.find((u) => u.id === s.unitId)
      const staffLeaves = leaves.filter((l) => l.staffId === s.id)
      return staffLeaves.map((leave, li) => ({
        no: idx * 100 + li + 1,
        name: s.name,
        niy: s.niy,
        unit: unitObj?.nama || '-',
        jenis: leave.jenis,
        tanggalMulai: leave.periode.split('–')[0]?.trim() || leave.periode,
        tanggalSelesai: leave.periode.split('–')[1]?.trim() || leave.periode,
        durasi: leave.durasi,
        status: leave.status,
        lampiran: leave.lampiran || '-'
      }))
    }).flat()
  }

  const handleExportPresensi = () => {
    setIsExporting(true)
    try {
      const data = getExportPresensiData(exportPresensiConfig.period, exportPresensiConfig.unit)
      const unitLabel = exportPresensiConfig.unit === 'all' ? 'Semua_Unit' : (state.units.find(u => u.id === exportPresensiConfig.unit)?.nama || 'Semma_Unit').replace(/\s+/g, '_')
      const periodLabel = getMonthYearLabel(exportPresensiConfig.period)
      
      // Get yayasan info and signatory from global settings
      const yayasanInfo = getYayasanInfo()
      const signatory = exportPresensiConfig.unit === 'all' ? getSignatoryAllUnits() : getSignatory(exportPresensiConfig.unit)
      
      if (exportPresensiConfig.format === 'pdf') {
        exportPresensiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory)
      } else {
        exportPresensiToExcel(data, unitLabel, periodLabel, yayasanInfo, signatory)
      }
      
      setShowPresensiExport(false)
      showNotification(`Rekap Presensi (${exportPresensiConfig.format.toUpperCase()}) berhasil diekspor: ${data.length} pegawai`, 'success')
    } catch (e) {
      console.error('Export failed:', e)
      showNotification('Gagal memproses export presensi', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCuti = () => {
    setIsExporting(true)
    try {
      const data = getExportCutiData(exportCutiConfig.period, exportCutiConfig.unit)
      const unitLabel = exportCutiConfig.unit === 'all' ? 'Semua_Unit' : (state.units.find(u => u.id === exportCutiConfig.unit)?.nama || 'Semua_Unit').replace(/\s+/g, '_')
      const periodLabel = getMonthYearLabel(exportCutiConfig.period)
      
      // Get yayasan info and signatory from global settings
      const yayasanInfo = getYayasanInfo()
      const signatory = exportCutiConfig.unit === 'all' ? getSignatoryAllUnits() : getSignatory(exportCutiConfig.unit)
      
      if (exportCutiConfig.format === 'pdf') {
        exportCutiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory)
      } else {
        exportCutiToExcel(data, unitLabel, periodLabel, yayasanInfo, signatory)
      }
      
      setShowCutiExport(false)
      showNotification(`Rekap Cuti/Izin (${exportCutiConfig.format.toUpperCase()}) berhasil diekspor: ${data.length} record`, 'success')
    } catch (e) {
      console.error('Export failed:', e)
      showNotification('Gagal memproses export cuti/izin', 'error')
    } finally {
      setIsExporting(false)
    }
  }

const getMonthYearLabel = (period, customStartDate = null, customEndDate = null) => {
  const now = new Date()
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  
  if (period === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate)
    const end = new Date(customEndDate)
    const startStr = `${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`
    const endStr = `${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`
    return `Custom_${startStr}_sd_${endStr}`.replace(/\s+/g, '_')
  }
  
  const month = now.getMonth()
  const year = now.getFullYear()
  
  switch (period) {
    case 'Harian':
      return `Harian_${now.getDate()}_${monthNames[month]}_${year}`
    case 'Mingguan':
      return `Mingguan_Minggu_${monthNames[month]}_${year}`
    case 'Bulanan':
      return `Bulanan_${monthNames[month]}_${year}`
    case 'Tahunan':
      return `Tahunan_${year}`
    default:
      return period
  }
}

const getPeriodLabelForPrint = (period, customStartDate = null, customEndDate = null) => {
  if (period === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate)
    const end = new Date(customEndDate)
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const startStr = `${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`
    const endStr = `${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`
    return `Rentang Tanggal: ${startStr} s.d. ${endStr}`
  }
  const labels = { Harian: 'Harian (Hari Ini)', Mingguan: 'Mingguan (Minggu Ini)', Bulanan: 'Bulanan (Bulan Ini)', Tahunan: 'Tahunan (Tahun Ini)' }
  return labels[period] || period
}

const filterByDateRange = (dateStr, startDate, endDate) => {
  if (!dateStr || !startDate || !endDate) return true
  const date = new Date(dateStr)
  const start = new Date(startDate)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  return date >= start && date <= end
}

const getReportData = (reportType, period, unit, customStartDate = null, customEndDate = null) => {
  if (reportType === 'presensi') {
    let staff = state.staff.filter((s) => s.status === 'Aktif')
    if (unit && unit !== 'all') {
      staff = staff.filter((s) => s.unitId === unit)
    }
    
    let attendance = buildAttendance(staff)
    if (unit && unit !== 'all') {
      attendance = attendance.filter((a) => a.unitId === unit)
    }
    
    if (period === 'custom' && customStartDate && customEndDate) {
      attendance = attendance.filter(a => filterByDateRange(a.masuk?.split(' ')[0], customStartDate, customEndDate))
    }
    
    let daysInPeriod = 15
    switch (period) {
      case 'Harian': daysInPeriod = 1; break
      case 'Mingguan': daysInPeriod = 6; break
      case 'Bulanan': daysInPeriod = 22; break
      case 'Tahunan': daysInPeriod = 240; break
      case 'custom': 
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate)
          const end = new Date(customEndDate)
          daysInPeriod = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)
        }
        break
    }
    
    const leaves = state.leaves || []
    
    return staff.map((s, idx) => {
      const unitObj = state.units.find((u) => u.id === s.unitId)
      const staffAttendance = attendance.filter((a) => a.staffId === s.id)
      const hadir = staffAttendance.filter((a) => a.masuk !== null).length
      const tepatWaktu = staffAttendance.filter((a) => a.masuk !== null && a.late === 0).length
      const terlambat = staffAttendance.filter((a) => a.masuk !== null && a.late > 0).length
      const staffLeaves = leaves.filter((l) => 
        l.staffId === s.id && (l.status === 'Disetujui' || l.status === 'Menunggu')
      )
      const izinSakit = staffLeaves.length
      const alpha = Math.max(0, daysInPeriod - hadir - izinSakit)
      const persentaseKehadiran = daysInPeriod > 0 ? ((hadir / daysInPeriod) * 100).toFixed(1) : '0.0'
      
      let periodLabel = getPeriodLabel(period)
      if (period === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        periodLabel = `${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`
      }
      
      return {
        no: idx + 1,
        id: s.id,
        initials: initialsOf(s.name),
        name: s.name,
        niy: s.niy,
        unit: unitObj?.nama || '-',
        periode: periodLabel,
        totalHariKerja: daysInPeriod,
        hadir,
        tepatWaktu,
        terlambat,
        izinSakit,
        alpha,
        persentaseKehadiran: parseFloat(persentaseKehadiran),
      }
    })
  } else {
    let staff = state.staff.filter((s) => s.status === 'Aktif')
    if (unit && unit !== 'all') {
      staff = staff.filter((s) => s.unitId === unit)
    }
    const leaves = state.leaves || []
    
    let filteredLeaves = leaves
    if (period === 'custom' && customStartDate && customEndDate) {
      filteredLeaves = leaves.filter(l => 
        filterByDateRange(l.periode.split('–')[0]?.trim() || l.periode, customStartDate, customEndDate)
      )
    }
    
    return staff.map((s, idx) => {
      const unitObj = state.units.find((u) => u.id === s.unitId)
      const staffLeaves = filteredLeaves.filter((l) => l.staffId === s.id)
      return staffLeaves.map((leave, li) => ({
        no: idx * 100 + li + 1,
        name: s.name,
        niy: s.niy,
        unit: unitObj?.nama || '-',
        jenis: leave.jenis,
        tanggalMulai: leave.periode.split('–')[0]?.trim() || leave.periode,
        tanggalSelesai: leave.periode.split('–')[1]?.trim() || leave.periode,
        durasi: leave.durasi,
        status: leave.status,
        lampiran: leave.lampiran || '-'
      }))
    }).flat()
  }
}

  const handleReportAction = (action) => {
    setIsExporting(true)
    try {
      const { reportType, period, unit, format, customStartDate, customEndDate } = reportSettings
      
      // Validasi: Periode harus dipilih
      if (!period) {
        showNotification('Silakan pilih periode laporan', 'error')
        setIsExporting(false)
        return
      }
      
      // Validasi: Custom date range perlu tanggal mulai dan selesai
      if (period === 'custom' && (!customStartDate || !customEndDate)) {
        showNotification('Silakan isi tanggal mulai dan tanggal selesai untuk periode custom', 'error')
        setIsExporting(false)
        return
      }
      
      const data = getReportData(reportType, period, unit, customStartDate, customEndDate)
      
      // Validasi: Data tidak boleh kosong
      if (!data || data.length === 0) {
        showNotification('Tidak ada data untuk laporan ini', 'error')
        setIsExporting(false)
        return
      }
      
      const unitLabel = unit === 'all' ? 'Semua_Unit' : (state.units.find(u => u.id === unit)?.nama || 'Semua_Unit').replace(/\s+/g, '_')
      const periodLabel = getMonthYearLabel(period, customStartDate, customEndDate)
      
      // Get yayasan info and signatory from global settings
      const yayasanInfo = getYayasanInfo()
      const signatory = unit === 'all' ? getSignatoryAllUnits() : getSignatory(unit)
      
      const reportTitle = reportType === 'presensi' ? 'Rekap Presensi' : 'Rekap Cuti/Izin'
      
      if (action === 'print') {
        const printWindow = window.open('', '_blank', 'width=1000,height=800')
        if (!printWindow) {
          showNotification('Popup diblokir oleh browser. Izinkan popup untuk mencetak.', 'error')
          setIsExporting(false)
          return
        }

        const unitDisplay = unit === 'all' ? 'Semua Unit' : (state.units.find(u => u.id === unit)?.nama || 'Semua Unit')
        const periodDisplay = getPeriodLabelForPrint(period, customStartDate, customEndDate)
        const now = new Date()
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`

        let tableHtml = ''
        let footerHtml = ''
        
        if (reportType === 'presensi') {
          tableHtml = `
            <table>
              <thead>
                <tr>
                  <th style="width: 30px;">No</th>
                  <th style="width: 160px;">Nama Pegawai</th>
                  <th style="width: 90px;">NIY/NIP</th>
                  <th style="width: 120px;">Unit</th>
                  <th style="width: 90px;">Periode Rekap</th>
                  <th style="width: 70px;">Hari Kerja</th>
                  <th style="width: 50px;">Hadir</th>
                  <th style="width: 60px;">Terlambat</th>
                  <th style="width: 60px;">Izin/Sakit</th>
                  <th style="width: 50px;">Alpha</th>
                  <th style="width: 100px;">% Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                ${data.map((row, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${row.name}</td>
                    <td>${row.niy}</td>
                    <td>${row.unit}</td>
                    <td>${row.periode}</td>
                    <td>${row.totalHariKerja}</td>
                    <td>${row.hadir}</td>
                    <td>${row.terlambat}</td>
                    <td>${row.izinSakit}</td>
                    <td>${row.alpha}</td>
                    <td>${row.persentaseKehadiran}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `
          // Footer for presensi: Kepala Sekolah & Petugas Presensi
          const kepalaSekolah = signatory.kepalaSekolah || { nama: '', jabatan: 'Kepala Sekolah' }
          const petugasPresensi = signatory.petugasPresensi || { nama: '', jabatan: 'Petugas Presensi' }
          footerHtml = `
            <div class="footer">
              <div>
                <div class="sign-line"></div>
                <div class="footer-title">Mengetahui,</div>
                <div>${kepalaSekolah.jabatan}</div>
                <div style="margin-top: 10px; color: #888;">${kepalaSekolah.nama ? `(${kepalaSekolah.nama})` : '(________________________)'}</div>
              </div>
              <div>
                <div class="sign-line"></div>
                <div class="footer-title">Diperiksa oleh,</div>
                <div>${petugasPresensi.jabatan}</div>
                <div style="margin-top: 10px; color: #888;">${petugasPresensi.nama ? `(${petugasPresensi.nama})` : '(________________________)'}</div>
              </div>
            </div>
          `
        } else {
          tableHtml = `
            <table>
              <thead>
                <tr>
                  <th style="width: 30px;">No</th>
                  <th style="width: 160px;">Nama Pegawai</th>
                  <th style="width: 90px;">NIY/NIP</th>
                  <th style="width: 120px;">Unit</th>
                  <th style="width: 140px;">Jenis Izin/Cuti</th>
                  <th style="width: 90px;">Tanggal Mulai</th>
                  <th style="width: 90px;">Tanggal Selesai</th>
                  <th style="width: 70px;">Lama Cuti</th>
                  <th style="width: 100px;">Status Persetujuan</th>
                </tr>
              </thead>
              <tbody>
                ${data.map((row, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${row.name}</td>
                    <td>${row.niy}</td>
                    <td>${row.unit}</td>
                    <td>${row.jenis}</td>
                    <td>${row.tanggalMulai}</td>
                    <td>${row.tanggalSelesai}</td>
                    <td>${row.durasi}</td>
                    <td>${row.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `
          // Footer for cuti: Ketua Yayasan & Admin/TU
          const ketuaYayasan = signatory.ketuaYayasan || { nama: '', jabatan: 'Ketua Yayasan' }
          const adminTU = signatory.adminTU?.kepalaTU || signatory.adminTU?.operatorSistem || { nama: '', jabatan: 'Admin TU' }
          footerHtml = `
            <div class="footer">
              <div>
                <div class="sign-line"></div>
                <div class="footer-title">Mengetahui,</div>
                <div>${ketuaYayasan.jabatan}</div>
                <div style="margin-top: 10px; color: #888;">${ketuaYayasan.nama ? `(${ketuaYayasan.nama})` : '(________________________)'}</div>
              </div>
              <div>
                <div class="sign-line"></div>
                <div class="footer-title">Disiapkan oleh,</div>
                <div>${adminTU.jabatan}</div>
                <div style="margin-top: 10px; color: #888;">${adminTU.nama ? `(${adminTU.nama})` : '(________________________)'}</div>
              </div>
            </div>
          `
        }

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${reportTitle}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
              body { padding: 20px; font-size: 11px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #0066CC; padding-bottom: 15px; }
              .logo { width: 60px; height: 60px; border: 2px solid #0066CC; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; color: #0066CC; font-weight: bold; font-size: 14px; }
              .org-name { font-size: 16px; font-weight: bold; color: #000; }
              .unit-name { font-size: 13px; color: #333; margin-top: 2px; }
              .address { font-size: 10px; color: #666; margin-top: 2px; }
              .title { font-size: 15px; font-weight: bold; margin: 20px 0 10px; text-align: center; text-transform: uppercase; color: #000; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; }
              .info-label { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
              th, td { border: 1px solid #ddd; padding: 6px 4px; text-align: center; }
              th { background: #0066CC; color: white; font-weight: bold; }
              tr:nth-child(even) td { background: #f5f8fc; }
              td:first-child, td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: left; padding-left: 8px; }
              .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; }
              .footer div { text-align: center; width: 45%; }
              .sign-line { border-top: 1px solid #000; margin: 50px 0 10px; }
              .footer-title { font-weight: bold; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
              @page { margin: 15mm; size: landscape; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">LOGO</div>
              <div class="org-name">${yayasanInfo.nama}</div>
              <div class="unit-name">${unitDisplay}</div>
              <div class="address">${yayasanInfo.alamat} | ${yayasanInfo.kontak} | ${yayasanInfo.email}</div>
            </div>
            <div class="title">${reportTitle.toUpperCase()} PEGAWAI</div>
            <div class="info-row"><span class="info-label">Unit Laporan:</span> <span>${unitDisplay}</span></div>
            <div class="info-row"><span class="info-label">Periode Laporan:</span> <span>${periodDisplay}</span></div>
            <div class="info-row"><span class="info-label">Tanggal Cetak:</span> <span>${dateStr}</span></div>
            ${tableHtml}
            ${footerHtml}
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
          </html>
        `

        printWindow.document.write(html)
        printWindow.document.close()
        showNotification(`${reportTitle} dibuka untuk dicetak`, 'success')
      } else {
        if (format === 'pdf') {
          if (reportType === 'presensi') {
            exportPresensiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory)
          } else {
            exportCutiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory)
          }
        } else {
          if (reportType === 'presensi') {
            exportPresensiToExcel(data, unitLabel, periodLabel, yayasanInfo, signatory)
          } else {
            exportCutiToExcel(data, unitLabel, periodLabel, yayasanInfo, signatory)
          }
        }
        showNotification(`${reportTitle} (${format.toUpperCase()}) berhasil diekspor: ${data.length} ${reportType === 'presensi' ? 'pegawai' : 'record'}`, 'success')
      }
      
      setShowReportSettings(false)
    } catch (e) {
      console.error('Report action failed:', e)
      showNotification('Gagal memproses laporan', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDirectDownload = (reportType, format = 'pdf') => {
    setIsExporting(true)
    try {
      const period = activePeriod
      const unit = selectedUnit
      
      // Get custom dates from reportSettings if period is custom
      const customStartDate = (period === 'custom' && reportSettings.customStartDate) ? reportSettings.customStartDate : null
      const customEndDate = (period === 'custom' && reportSettings.customEndDate) ? reportSettings.customEndDate : null
      
      const data = getReportData(reportType, period, unit, customStartDate, customEndDate)
      
      if (!data || data.length === 0) {
        showNotification('Tidak ada data untuk laporan ini', 'error')
        setIsExporting(false)
        return
      }
      
      const unitLabel = unit === 'all' ? 'Semua_Unit' : (state.units.find(u => u.id === unit)?.nama || 'Semua_Unit').replace(/\s+/g, '_')
      const periodLabel = getMonthYearLabel(period, customStartDate, customEndDate)
      
      // Get yayasan info and signatory from global settings
      const yayasanInfo = getYayasanInfo()
      const signatory = unit === 'all' ? getSignatoryAllUnits() : getSignatory(unit)
      
      if (reportType === 'presensi') {
        if (format === 'pdf') {
          exportPresensiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory)
        } else {
          exportPresensiToExcel(data, unitLabel, periodLabel, yayasanInfo, signatory)
        }
      } else {
        if (format === 'pdf') {
          exportCutiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory)
        } else {
          exportCutiToExcel(data, unitLabel, periodLabel, yayasanInfo, signatory)
        }
      }
      
      showNotification(`Rekap ${reportType === 'presensi' ? 'Presensi' : 'Cuti/Izin'} (${format.toUpperCase()}) berhasil diekspor: ${data.length} ${reportType === 'presensi' ? 'pegawai' : 'record'}`, 'success')
    } catch (e) {
      console.error('Direct download failed:', e)
      showNotification('Gagal memproses download', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrintReport = () => {
    const { reportType, period, unit } = reportSettings
    const data = getReportData(reportType, period, unit)
    const unitLabel = unit === 'all' ? 'Semua_Unit' : (state.units.find(u => u.id === unit)?.nama || 'Semua_Unit').replace(/\s+/g, '_')
    const periodLabel = getMonthYearLabel(period)
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      showNotification('Popup diblokir oleh browser. Izinkan popup untuk mencetak.', 'error')
      return
    }

    const unitDisplay = unit === 'all' ? 'Semua Unit' : (state.units.find(u => u.id === unit)?.nama || 'Semua Unit')
    const periodDisplay = getPeriodLabelForPrint(period)
    const now = new Date()
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const dateStr = `${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`

    const reportTitle = reportType === 'presensi' ? 'Rekap Presensi' : 'Rekap Cuti/Izin'
    
    // Get yayasan info and signatory from global settings
    const yayasanInfo = getYayasanInfo()
    const signatory = unit === 'all' ? getSignatoryAllUnits() : getSignatory(unit)

    let tableHtml = ''
    let footerHtml = ''
    
    if (reportType === 'presensi') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th style="width: 160px;">Nama Pegawai</th>
              <th style="width: 90px;">NIY/NIP</th>
              <th style="width: 120px;">Unit</th>
              <th style="width: 90px;">Periode Rekap</th>
              <th style="width: 70px;">Hari Kerja</th>
              <th style="width: 50px;">Hadir</th>
              <th style="width: 60px;">Terlambat</th>
              <th style="width: 60px;">Izin/Sakit</th>
              <th style="width: 50px;">Alpha</th>
              <th style="width: 100px;">% Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((row, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${row.name}</td>
                <td>${row.niy}</td>
                <td>${row.unit}</td>
                <td>${row.periode}</td>
                <td>${row.totalHariKerja}</td>
                <td>${row.hadir}</td>
                <td>${row.terlambat}</td>
                <td>${row.izinSakit}</td>
                <td>${row.alpha}</td>
                <td>${row.persentaseKehadiran}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      // Footer for presensi: Kepala Sekolah & Petugas Presensi
      const kepalaSekolah = signatory.kepalaSekolah || { nama: '', jabatan: 'Kepala Sekolah' }
      const petugasPresensi = signatory.petugasPresensi || { nama: '', jabatan: 'Petugas Presensi' }
      footerHtml = `
        <div class="footer">
          <div>
            <div class="sign-line"></div>
            <div class="footer-title">Mengetahui,</div>
            <div>${kepalaSekolah.jabatan}</div>
            <div style="margin-top: 10px; color: #888;">${kepalaSekolah.nama ? `(${kepalaSekolah.nama})` : '(________________________)'}</div>
          </div>
          <div>
            <div class="sign-line"></div>
            <div class="footer-title">Diperiksa oleh,</div>
            <div>${petugasPresensi.jabatan}</div>
            <div style="margin-top: 10px; color: #888;">${petugasPresensi.nama ? `(${petugasPresensi.nama})` : '(________________________)'}</div>
          </div>
        </div>
      `
    } else {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th style="width: 160px;">Nama Pegawai</th>
              <th style="width: 90px;">NIY/NIP</th>
              <th style="width: 120px;">Unit</th>
              <th style="width: 140px;">Jenis Izin/Cuti</th>
              <th style="width: 90px;">Tanggal Mulai</th>
              <th style="width: 90px;">Tanggal Selesai</th>
              <th style="width: 70px;">Lama Cuti</th>
              <th style="width: 100px;">Status Persetujuan</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((row, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${row.name}</td>
                <td>${row.niy}</td>
                <td>${row.unit}</td>
                <td>${row.jenis}</td>
                <td>${row.tanggalMulai}</td>
                <td>${row.tanggalSelesai}</td>
                <td>${row.durasi}</td>
                <td>${row.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      // Footer for cuti: Ketua Yayasan & Admin/TU
      const ketuaYayasan = signatory.ketuaYayasan || { nama: '', jabatan: 'Ketua Yayasan' }
      const adminTU = signatory.adminTU?.kepalaTU || signatory.adminTU?.operatorSistem || { nama: '', jabatan: 'Admin TU' }
      footerHtml = `
        <div class="footer">
          <div>
            <div class="sign-line"></div>
            <div class="footer-title">Mengetahui,</div>
            <div>${ketuaYayasan.jabatan}</div>
            <div style="margin-top: 10px; color: #888;">${ketuaYayasan.nama ? `(${ketuaYayasan.nama})` : '(________________________)'}</div>
          </div>
          <div>
            <div class="sign-line"></div>
            <div class="footer-title">Disiapkan oleh,</div>
            <div>${adminTU.jabatan}</div>
            <div style="margin-top: 10px; color: #888;">${adminTU.nama ? `(${adminTU.nama})` : '(________________________)'}</div>
          </div>
        </div>
      `
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
          body { padding: 20px; font-size: 11px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #0066CC; padding-bottom: 15px; }
          .logo { width: 60px; height: 60px; border: 2px solid #0066CC; margin: 0 auto 10px; display: flex; align-items: center; justify_content: center; color: #0066CC; font-weight: bold; font-size: 14px; }
          .org-name { font-size: 16px; font-weight: bold; color: #000; }
          .unit-name { font-size: 13px; color: #333; margin-top: 2px; }
          .address { font-size: 10px; color: #666; margin-top: 2px; }
          .title { font-size: 15px; font-weight: bold; margin: 20px 0 10px; text-align: center; text-transform: uppercase; color: #000; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 4px; text-align: center; }
          th { background: #0066CC; color: white; font-weight: bold; }
          tr:nth-child(even) td { background: #f5f8fc; }
          td:first-child, td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: left; padding-left: 8px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; }
          .footer div { text-align: center; width: 45%; }
          .sign-line { border-top: 1px solid #000; margin: 50px 0 10px; }
          .footer-title { font-weight: bold; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
          @page { margin: 15mm; size: landscape; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">LOGO</div>
          <div class="org-name">${yayasanInfo.nama}</div>
          <div class="unit-name">${unitDisplay}</div>
          <div class="address">${yayasanInfo.alamat} | ${yayasanInfo.kontak} | ${yayasanInfo.email}</div>
        </div>
        <div class="title">${reportTitle.toUpperCase()} PEGAWAI</div>
        <div class="info-row"><span class="info-label">Unit Laporan:</span> <span>${unitDisplay}</span></div>
        <div class="info-row"><span class="info-label">Periode Laporan:</span> <span>${periodDisplay}</span></div>
        <div class="info-row"><span class="info-label">Tanggal Cetak:</span> <span>${dateStr}</span></div>
        ${tableHtml}
        ${footerHtml}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="flex flex-col w-full">
      <NotifToast notification={notification} />
      {showReportSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowReportSettings(false)}>
          <div className="w-full max-w-md max-h-[90vh] bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b border-surface-container flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">Pengaturan Laporan</h3>
              <button onClick={() => setShowReportSettings(false)} className="p-2 rounded-lg hover:bg-surface-container transition-colors" aria-label="Tutup">
                <span className="material-symbols-outlined text-[24px] text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Jenis Laporan</label>
                  <div className="flex gap-3">
                    <label className="flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-colors bg-surface-container hover:bg-surface-container-low">
                      <input type="radio" name="reportType" value="presensi" checked={reportSettings.reportType === 'presensi'} onChange={(e) => setReportSettings(prev => ({...prev, reportType: e.target.value}))} className="text-primary" />
                      <span className="font-body-sm text-body-sm text-on-surface">Rekap Presensi</span>
                    </label>
                    <label className="flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-colors bg-surface-container hover:bg-surface-container-low">
                      <input type="radio" name="reportType" value="cuti" checked={reportSettings.reportType === 'cuti'} onChange={(e) => setReportSettings(prev => ({...prev, reportType: e.target.value}))} className="text-primary" />
                      <span className="font-body-sm text-body-sm text-on-surface">Rekap Cuti/Izin</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Periode Laporan</label>
                  <select value={reportSettings.period} onChange={(e) => setReportSettings(prev => ({...prev, period: e.target.value}))} className="w-full h-9 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary">
                    {periods.map(p => <option key={p} value={p}>{getPeriodLabel(p)}</option>)}
                    <option value="custom">Rentang Tanggal Custom</option>
                  </select>
                </div>
                {reportSettings.period === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Tanggal Mulai</label>
                      <input type="date" value={reportSettings.customStartDate} onChange={(e) => setReportSettings(prev => ({...prev, customStartDate: e.target.value}))} className="w-full h-9 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Tanggal Selesai</label>
                      <input type="date" value={reportSettings.customEndDate} onChange={(e) => setReportSettings(prev => ({...prev, customEndDate: e.target.value}))} className="w-full h-9 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Unit</label>
                  <select value={reportSettings.unit} onChange={(e) => setReportSettings(prev => ({...prev, unit: e.target.value}))} className="w-full h-9 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="all">Semua Unit</option>
                    {state.units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                  </select>
                </div>
                {reportSettings.format !== 'print' && (
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Format Output</label>
                    <div className="flex gap-3">
                      <label className="flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-colors bg-surface-container hover:bg-surface-container-low">
                        <input type="radio" name="format" value="pdf" checked={reportSettings.format === 'pdf'} onChange={(e) => setReportSettings(prev => ({...prev, format: e.target.value}))} className="text-primary" />
                        <span className="font-body-sm text-body-sm text-on-surface">PDF</span>
                      </label>
                      <label className="flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-colors bg-surface-container hover:bg-surface-container-low">
                        <input type="radio" name="format" value="excel" checked={reportSettings.format === 'excel'} onChange={(e) => setReportSettings(prev => ({...prev, format: e.target.value}))} className="text-primary" />
                        <span className="font-body-sm text-body-sm text-on-surface">Excel (.xlsx)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 md:p-6 border-t border-surface-container flex gap-3 justify-end">
              <button onClick={() => setShowReportSettings(false)} className="px-4 py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-sm text-label-sm transition-colors">Batal</button>
              <button onClick={() => handleReportAction(reportSettings.format === 'print' ? 'print' : 'download')} disabled={isExporting} className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-label-sm text-label-sm transition-colors disabled:opacity-50">
                {isExporting ? 'Memproses...' : (reportSettings.format === 'print' ? 'Cetak' : 'Download')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-space-lg md:p-space-xl flex flex-col gap-space-lg max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[26px]">bar_chart</span>
              <h1 className="font-headline-md text-headline-md text-primary tracking-tight">Rekap & Laporan</h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">Analisis komprehensif kehadiran, kepatuhan jam kerja, dan ekspor laporan berkala seluruh unit sekolah.</p>
          </div>
          <div className="flex items-center self-start md:self-auto bg-surface-container-low px-space-md py-1.5 rounded-full shadow-sm">
            <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-outline">home</span>
              <span>Home</span>
              <span className="text-outline">/</span>
              <span>Laporan</span>
              <span className="text-outline">/</span>
              <span className="text-secondary font-body-md-medium text-body-md-medium">Rekap & Laporan Kehadiran</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md">
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="inline-flex p-1 bg-surface-container rounded-lg gap-1">
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => setActivePeriod(period)}
                  className={`px-3.5 py-1.5 rounded-md font-label-md text-label-md transition-colors cursor-pointer ${
                    activePeriod === period ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  {period}
                </button>
              ))}
            </div>
            <div className="relative flex items-center bg-surface-container rounded-lg px-3 py-2 cursor-pointer hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[18px] text-outline mr-2">calendar_today</span>
              <span className="font-body-md-medium text-body-md-medium text-on-surface">{getPeriodLabel(activePeriod)}</span>
              <span className="material-symbols-outlined text-[18px] text-outline ml-2">arrow_drop_down</span>
            </div>
            {canSwitchUnit ? (
              <div className="relative" onMouseLeave={() => setShowUnitDropdown(false)}>
                <button
                  onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-surface-container rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-outline">domain</span>
                  <span className="font-body-md-medium text-body-md-medium text-on-surface">{unitLabel}</span>
                  <span className="material-symbols-outlined text-[18px] text-outline">{showUnitDropdown ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showUnitDropdown && (
                  <div className="absolute left-0 top-full mt-1.5 min-w-[220px] bg-surface-container-lowest rounded-lg shadow-lg border border-surface-container py-2 z-50 animate-fade-in">
                    {unitOptions.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { dispatch({ type: 'SET_SELECTED_UNIT', payload: u.id }); setShowUnitDropdown(false); }}
                        className={`w-full px-4 py-2 text-left font-body-md text-body-md transition-colors ${selectedUnit === u.id ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container'}`}
                        type="button"
                      >
                        {u.nama}
                      </button>
                    ))}
                    <hr className="my-1 border-surface-container" />
                    <button
                      onClick={() => { dispatch({ type: 'SET_SELECTED_UNIT', payload: ALL_UNITS }); setShowUnitDropdown(false); }}
                      className={`w-full px-4 py-2 text-left font-body-md text-body-md transition-colors ${selectedUnit === ALL_UNITS ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container'}`}
                      type="button"
                    >
                      Semua Unit ({state.units.length} Unit)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-container rounded-lg cursor-not-allowed" title="Unit mengikuti akun Anda">
                <span className="material-symbols-outlined text-[18px] text-outline">domain</span>
                <span className="font-body-md-medium text-body-md-medium text-on-surface">{unitLabel}</span>
                <span className="material-symbols-outlined text-[16px] text-outline/70">lock</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-nowrap">
            <div className="relative" onMouseLeave={() => setShowReportSettings(false)}>
              <button
                onClick={() => handleDirectDownload('presensi')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white font-label-md text-label-md hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Download Rekap Presensi</span>
              </button>
            </div>
            <div className="relative" onMouseLeave={() => setShowReportSettings(false)}>
              <button
                onClick={() => handleDirectDownload('cuti')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 text-white font-label-md text-label-md hover:bg-emerald-800 shadow-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Download Rekap Cuti/Izin</span>
              </button>
            </div>
            <button onClick={() => { setReportSettings(prev => ({...prev, format: 'print' })); setShowReportSettings(!showReportSettings); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors cursor-pointer whitespace-nowrap flex-shrink-0" type="button">
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span className="hidden sm:inline">Cetak</span>
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-space-xs">
                <h2 className="font-headline-sm text-headline-sm text-primary">Tren Kehadiran & Kepatuhan Jam Kerja</h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">{kepatuhanChart.kepatuhan}% Rata-rata</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Periode {getPeriodLabel(activePeriod)} ({unitLabel})</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-secondary-container"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Hadir Tepat Waktu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#F59E0B]"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Terlambat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-tertiary-fixed-dim"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Izin/Sakit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-error"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Alpha</span>
              </div>
            </div>
          </div>

          <div className="relative w-full pt-4">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-on-surface-variant/40 font-label-sm text-label-sm">
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">100%</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">75%</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">50%</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">25%</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">0%</span>
                <div className="flex-1 h-px bg-surface-container-high"></div>
              </div>
            </div>

            <div className="relative ml-9 h-56 flex items-end justify-between gap-1.5 sm:gap-3 overflow-x-auto pt-2 pb-8">
              {chartData.map((d) => (
                <div key={d.day} className={`group flex flex-col items-center flex-1 min-w-[28px] h-full justify-end ${d.weekend ? 'opacity-40' : ''} cursor-pointer`}>
                  <div className={`w-full max-w-[24px] rounded-t-sm bg-surface-container-low flex flex-col-reverse overflow-hidden shadow-sm group-hover:opacity-90 transition-opacity ${d.current ? 'shadow-md ring-2 ring-secondary/20' : ''}`} style={{ height: `${Math.min(100, d.hadir + d.terlambat + d.izin + d.alpha)}%` }}>
                    <div className="w-full bg-secondary-container" style={{ height: `${d.hadir}%` }}></div>
                    <div className="w-full bg-[#F59E0B]" style={{ height: `${d.terlambat}%` }}></div>
                    {d.izin > 0 && <div className="w-full bg-tertiary-fixed-dim" style={{ height: `${d.izin}%` }}></div>}
                    {d.alpha > 0 && <div className="w-full bg-error" style={{ height: `${d.alpha}%` }}></div>}
                  </div>
                  <span className={`absolute -bottom-1 ${d.weekend ? 'font-label-sm text-label-sm text-outline' : d.current ? 'font-body-sm-medium text-body-sm-medium text-secondary' : 'font-label-sm text-label-sm group-hover:text-primary text-on-surface-variant'}`}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-space-sm pt-2">
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm">
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Total Pegawai</span>
                <span className="font-body-md-medium text-body-md-medium text-primary leading-snug">{summary.totalPegawai.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-[#16A34A] shadow-sm">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Hadir</span>
                <span className="font-body-md-medium text-body-md-medium text-primary leading-snug">{summary.hadir.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-[#B45309] shadow-sm">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Terlambat</span>
                <span className="font-body-md-medium text-body-md-medium text-primary leading-snug">{summary.terlambat.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-[#16A34A] shadow-sm">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">% Kehadiran</span>
                <span className="font-body-md-medium text-body-md-medium text-primary leading-snug">{summary.persentaseKehadiran}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-2 border-t border-surface-container">
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Total Jam Kerja</span>
                <span className="font-body-md-medium text-body-md-medium text-primary leading-snug">{(summary.hadir * 8).toLocaleString()} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">Jam</span></span>
              </div>
            </div>
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-[#B45309] shadow-sm">
                <span className="material-symbols-outlined text-[20px]">history_toggle_off</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Rata-rata Keterlambatan</span>
                <span className="font-body-md-medium text-body-md-medium text-primary leading-snug">{(summary.terlambat > 0 ? (chartData.reduce((s, d) => s + d.terlambat, 0) / Math.max(chartData.filter(d => d.terlambat > 0).length, 1)).toFixed(1) : '0.0')} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">Menit / staf</span></span>
              </div>
            </div>
            <div className="p-3.5 bg-surface-container rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-[#16A34A] shadow-sm">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Tingkat Kepatuhan Jadwal</span>
                <span className="font-body-md-medium text-body-md-medium text-primary leading-snug">{kepatuhanChart.kepatuhan}% <span className="font-body-sm text-body-sm text-[#16A34A] font-normal">+1.2%</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm pb-4">
            <div className="flex flex-col">
              <h3 className="font-body-md-medium text-body-md-medium text-primary">Laporan Rekap Kehadiran Pegawai</h3>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Menampilkan {paginatedData.length} dari {filteredData.length} pegawai • Periode {getPeriodLabel(activePeriod)}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input
                  className="w-full h-9 pl-9 pr-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container"
                  placeholder="Cari nama, NIY, unit..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="h-9 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
                <option value={100}>100 / halaman</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider leading-tight">
                    <th className="py-2.5 px-3 text-center" scope="col" style={{ width: '40px' }}>No</th>
                    <th className="py-2.5 px-3" scope="col" style={{ width: '200px', minWidth: '160px' }}>
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-primary transition-colors whitespace-nowrap">Nama Pegawai {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3" scope="col" style={{ width: '110px', minWidth: '100px' }}>
                      <button onClick={() => handleSort('niy')} className="flex items-center gap-1 hover:text-primary transition-colors whitespace-nowrap">NIY/NIP {sortConfig.key === 'niy' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3" scope="col" style={{ width: '120px', minWidth: '100px' }}>
                      <button onClick={() => handleSort('unit')} className="flex items-center gap-1 hover:text-primary transition-colors whitespace-nowrap">Unit {sortConfig.key === 'unit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3 text-center hidden sm:table-cell" scope="col" style={{ width: '90px' }}>Periode</th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell" scope="col" style={{ width: '70px' }}>
                      <button onClick={() => handleSort('totalHariKerja')} className="flex items-center justify-center gap-1 hover:text-primary transition-colors whitespace-nowrap">Hari Kerja {sortConfig.key === 'totalHariKerja' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3 text-center" scope="col" style={{ width: '60px' }}>
                      <button onClick={() => handleSort('hadir')} className="flex items-center justify-center gap-1 hover:text-primary transition-colors whitespace-nowrap">Hadir {sortConfig.key === 'hadir' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell" scope="col" style={{ width: '70px' }}>
                      <button onClick={() => handleSort('tepatWaktu')} className="flex items-center justify-center gap-1 hover:text-primary transition-colors whitespace-nowrap">Tepat {sortConfig.key === 'tepatWaktu' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3 text-center" scope="col" style={{ width: '70px' }}>
                      <button onClick={() => handleSort('terlambat')} className="flex items-center justify-center gap-1 hover:text-primary transition-colors whitespace-nowrap">Terlambat {sortConfig.key === 'terlambat' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3 text-center hidden lg:table-cell" scope="col" style={{ width: '70px' }}>
                      <button onClick={() => handleSort('izinSakit')} className="flex items-center justify-center gap-1 hover:text-primary transition-colors whitespace-nowrap">Izin/Sakit {sortConfig.key === 'izinSakit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3 text-center hidden lg:table-cell" scope="col" style={{ width: '60px' }}>
                      <button onClick={() => handleSort('alpha')} className="flex items-center justify-center gap-1 hover:text-primary transition-colors whitespace-nowrap">Alpha {sortConfig.key === 'alpha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3 text-center" scope="col" style={{ width: '80px' }}>
                      <button onClick={() => handleSort('persentaseKehadiran')} className="flex items-center justify-center gap-1 hover:text-primary transition-colors whitespace-nowrap">% Kehadiran {sortConfig.key === 'persentaseKehadiran' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-2.5 px-3 text-center" scope="col" style={{ width: '100px' }}>Status</th>
                    <th className="py-2.5 px-3 text-center" scope="col" style={{ width: '44px' }}>Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {paginatedData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-body-xs-medium text-body-xs-medium text-on-surface-variant">{row.no}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-full ${avatarStyles[idx % avatarStyles.length] || 'bg-secondary-fixed text-on-secondary-fixed'} font-label-xs text-label-xs flex items-center justify-center flex-shrink-0`}>
                            {row.initials}
                          </div>
                          <span className="font-body-sm-medium text-body-sm-medium text-on-surface truncate">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-body-xs-medium text-body-xs-medium text-on-surface-variant">{row.niy}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs whitespace-nowrap">{row.unit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center hidden sm:table-cell font-body-xs text-body-xs text-on-surface-variant">{row.periode}</td>
                      <td className="py-2.5 px-3 text-center hidden md:table-cell font-body-sm-medium text-body-sm-medium text-on-surface">{row.totalHariKerja}</td>
                      <td className="py-2.5 px-3 text-center font-body-sm-medium text-body-sm-medium text-[#16A34A]">{row.hadir}</td>
                      <td className="py-2.5 px-3 text-center hidden md:table-cell font-body-xs text-body-xs text-[#16A34A]">{row.tepatWaktu}</td>
                      <td className="py-2.5 px-3 text-center font-body-sm-medium text-body-sm-medium text-[#B45309]">{row.terlambat}</td>
                      <td className="py-2.5 px-3 text-center hidden lg:table-cell font-body-xs text-body-xs text-blue-600">{row.izinSakit}</td>
                      <td className="py-2.5 px-3 text-center hidden lg:table-cell font-body-xs text-body-xs text-error">{row.alpha}</td>
                      <td className="py-2.5 px-3 text-center font-body-sm-medium text-body-sm-medium text-primary">{row.persentaseKehadiran}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-xs text-label-xs ${statusStyles[row.statusType]}`}>{row.status}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => { setSelectedEmployee(row); setShowDetail(true); }}
                          className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                          aria-label={`Detail ${row.name}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-on-surface-variant">Tidak ada data pegawai</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="hidden lg:block bg-surface-container-low/50 px-3 py-2 text-right border-t border-surface-container-low">
              <span className="font-label-xs text-label-xs text-on-surface-variant">
                Kolom tersembunyi di mobile: Periode, Hari Kerja, Tepat Waktu, Izin/Sakit, Alpha
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-4 border-t border-surface-container-low">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Menampilkan <span className="font-body-sm-medium text-on-surface">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-body-sm-medium text-on-surface">{Math.min(currentPage * pageSize, filteredData.length)}</span> dari <span className="font-body-sm-medium text-primary">{filteredData.length}</span> pegawai
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs">
                {totalPages} halaman
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary font-label-md text-label-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                type="button"
                aria-label="Halaman sebelumnya"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) pageNum = i + 1
                else if (currentPage <= 3) pageNum = i + 1
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = currentPage - 2 + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg font-label-md text-label-md flex items-center justify-center transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary'
                    }`}
                    type="button"
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 5 && currentPage > 3 && (
                <span className="w-8 h-8 flex items-center justify-center text-outline">...</span>
              )}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="w-8 h-8 flex items-center justify-center text-outline">...</span>
              )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary font-label-md text-label-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                type="button"
                aria-label="Halaman berikutnya"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <DetailModal
        employee={selectedEmployee}
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedEmployee(null); }}
        state={state}
      />
    </div>
  )
}

export default RekapLaporanPage