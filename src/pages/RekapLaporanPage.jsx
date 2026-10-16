import { useState, useMemo, useEffect } from 'react'
import { useSimPres } from '../store/simPresStore.jsx'
import { selectRekapTableData, selectRekapSummary, selectRekapChartData, selectRekapKepatuhanChart, selectRekapReportData, selectLeavesEnriched, buildAttendance, initialsOf, selectActiveUnitId, selectCanSwitchUnit, selectUnitOptionsById, ALL_UNITS } from '../store/simPresStore.jsx'
import { calculateAttendanceStatus, jamKerjaRules, daftarJamKerja } from '../data/jamKerja.js'
import { jamPendek } from '../data/presensiMobile.js'
import { warnaJenis, warnaAvatarJenis, kelompokIzinCuti } from '../data/jenisIzinCuti.js'
import LeaveDetailModal from '../components/LeaveDetailModal.jsx'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const statusStyles = {
  good: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  late: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  early: 'bg-orange-50 text-orange-700 border border-orange-200/80',
  alpha: 'bg-rose-50 text-rose-700 border border-rose-200/80',
  leave: 'bg-blue-50 text-blue-700 border border-blue-200/80',
  error: 'bg-red-50 text-red-700 border border-red-200/80',
}

const avatarStyles = [
  'bg-primary/10 text-primary border border-primary/20',
  'bg-muted text-muted-foreground border border-border',
  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
  'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
]

const periods = ['Harian', 'Mingguan', 'Bulanan', 'Tahunan']
const periodLabels = { Harian: 'Hari Ini', Mingguan: 'Minggu Ini', Bulanan: 'Bulan Ini', Tahunan: 'Tahun Ini' }
const unitOptions = ['all', 'tk', 'sd', 'smp', 'sma']
const unitLabels = { all: 'Semua Unit', tk: 'TKIT Attin Sumbar', sd: 'SDIT Attin Sumbar', smp: 'SMPIT Attin Sumbar', sma: 'SMAIT Attin Sumbar' }

// Ringkasan aturan jam kerja global untuk dicetak pada laporan PDF/Excel.
// Ini menggantikan informasi shift yang pernah muncul di laporan.
const ringkasanJamKerja = daftarJamKerja()
  .map((h) => `${h.hari} ${h.jamKerja}`)
  .join('; ')

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

function getLogoForUnit(unitKeyOrLabel, yayasanInfo = null) {
  if (!yayasanInfo) return null
  const logoPerUnit = yayasanInfo.logoPerUnit || {}
  const logoYayasan = yayasanInfo.logo || null
  
  const key = String(unitKeyOrLabel || '').toLowerCase().replace(/_/g, ' ')
  if (key === 'tk' || key.includes('tkit') || key.includes('tk')) return logoPerUnit.tk || logoYayasan
  if (key === 'sd' || key.includes('sdit') || key.includes('sd')) return logoPerUnit.sd || logoYayasan
  if (key === 'smp' || key.includes('smpit') || key.includes('smp')) return logoPerUnit.smp || logoYayasan
  if (key === 'sma' || key.includes('smait') || key.includes('sma')) return logoPerUnit.sma || logoYayasan
  return logoYayasan
}

function getUnitInfo(unitLabel, yayasanInfo = null) {
  const defaultYayasan = {
    nama: 'Yayasan Islam Attin Indonesia',
    alamat: 'Jl. Raya Cendekia No. 45, Jakarta Selatan',
    kontak: '+62 811-9876-5432',
    email: 'sekretariat@attinsumbar.sch.id',
    logo: null,
    logoPerUnit: {},
  }
  const y = yayasanInfo || defaultYayasan
  const clean = String(unitLabel || '').replace(/_/g, ' ')
  const keyLower = clean.toLowerCase()
  
  if (keyLower === 'tk' || keyLower.includes('tkit')) {
    return { nama: y.nama, unit: 'TKIT Attin Sumbar', alamat: 'Jl. Cendekia No. 41', kontak: y.kontak, email: 'tkit@attinsumbar.sch.id' }
  }
  if (keyLower === 'sd' || keyLower.includes('sdit')) {
    return { nama: y.nama, unit: 'SDIT Attin Sumbar', alamat: 'Jl. Cendekia No. 43, Cilandak', kontak: y.kontak, email: 'sdit@attinsumbar.sch.id' }
  }
  if (keyLower === 'smp' || keyLower.includes('smpit')) {
    return { nama: y.nama, unit: 'SMPIT Attin Sumbar', alamat: 'Jl. Cendekia No. 45', kontak: y.kontak, email: 'smpit@attinsumbar.sch.id' }
  }
  if (keyLower === 'sma' || keyLower.includes('smait')) {
    return { nama: y.nama, unit: 'SMAIT Attin Sumbar', alamat: 'Jl. Cendekia No. 47', kontak: y.kontak, email: 'smait@attinsumbar.sch.id' }
  }
  return { nama: y.nama, unit: 'Seluruh Unit Sekolah', alamat: y.alamat, kontak: y.kontak, email: y.email }
}

function exportPresensiToExcel(data, unitLabel, periodLabel, yayasanInfo = null, signatory = null, options = {}) {
  console.log('[exportPresensiToExcel] Starting export', { dataLength: data?.length, unitLabel, periodLabel, options })
  if (!data || !data.length) {
    console.error('[exportPresensiToExcel] No data provided')
    return
  }
  try {
    const wb = XLSX.utils.book_new()
    const y = yayasanInfo || { nama: 'Yayasan Islam Attin Indonesia', alamat: 'Jl. Raya Cendekia No. 45, Jakarta Selatan', kontak: '+62 811-9876-5432', email: 'sekretariat@attinsumbar.sch.id' }
    const s = signatory || {}
    const info = getUnitInfo(unitLabel, y)
    
    // Deteksi periode: Harian, Mingguan, Bulanan, Tahunan
    const period = options?.period || data[0]?.periodType || (
      periodLabel.toLowerCase().includes('harian') ? 'Harian' :
      periodLabel.toLowerCase().includes('mingguan') ? 'Mingguan' :
      periodLabel.toLowerCase().includes('tahunan') ? 'Tahunan' : 'Bulanan'
    )
    
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const unitTitle = info.unit ? info.unit.toUpperCase() : unitLabel.replace(/_/g, ' ').toUpperCase()
    
    const buildSignRows = (totalCols) => {
      const pad = Math.max(0, totalCols - 2)
      const emptyRow = Array(totalCols).fill('')
      const kepsek = s.kepalaSekolah || { nama: '', jabatan: 'Kepala Sekolah / Ketua Yayasan' }
      const petugas = s.petugasPresensi || { nama: '', jabatan: 'Petugas Presensi' }
      return [
        emptyRow,
        ['', ...Array(pad - 1).fill(''), `Padang / Jakarta, ${printDate}`],
        ['Mengetahui,', ...Array(pad).fill(''), 'Diperiksa oleh,'],
        [kepsek.jabatan || 'Kepala Sekolah', ...Array(pad).fill(''), petugas.jabatan || 'Petugas Presensi'],
        emptyRow,
        emptyRow,
        [kepsek.nama ? `(${kepsek.nama})` : '(________________________)', ...Array(pad).fill(''), petugas.nama ? `(${petugas.nama})` : '(________________________)'],
      ]
    }

    if (period === 'Harian') {
      const kopRows = [
        [y.nama.toUpperCase()],
        [unitTitle],
        [`Alamat: ${info.alamat} | Telp/WA: ${info.kontak} | Email: ${info.email || 'sekretariat@attinsumbar.sch.id'}`],
        [],
        ['REKAP LAPORAN PRESENSI HARIAN PEGAWAI'],
        [`Hari & Tanggal: ${data[0]?.hari || 'Hari Ini'}, ${data[0]?.tanggal || printDate} | Jam Kerja Global: ${ringkasanJamKerja}`],
        [],
      ]
      
      const header = [
        'No',
        'Nama Pegawai',
        'NIY',
        'Jabatan / Peran',
        'Unit Sekolah',
        'Tanggal',
        'Hari',
        'Jam Operasional Global',
        'Jam Kedatangan (Masuk)',
        'Jam Kepulangan',
        'Status Presensi',
        'Keterlambatan (menit)',
        'Metode Presensi',
        'Status Lokasi / Geofence',
      ]
      
      let hadirCount = 0
      let tepatCount = 0
      let telatCount = 0
      let totalMenit = 0
      let alphaCount = 0
      
      const rows = data.map((row, i) => {
        const isHadir = (row.jamMasuk && row.jamMasuk !== '-') || row.hadir > 0
        const lateM = row.lateMinutes ?? row.totalLateMinutes ?? 0
        if (isHadir) {
          hadirCount++
          if (lateM > 0) telatCount++
          else tepatCount++
          totalMenit += lateM
        } else {
          alphaCount++
        }
        
        return [
          i + 1,
          row.name,
          row.niy,
          row.role || '-',
          row.unit,
          row.tanggal || printDate,
          row.hari || 'Senin',
          row.jamKerja || '07:10 - 16:00',
          row.jamMasuk || (row.hadir ? '06:50:12 WIB' : '-'),
          row.jamPulang || (row.hadir ? '16:00:00 WIB' : '-'),
          row.statusPresensi || (isHadir ? (lateM > 0 ? `Terlambat ${lateM} menit` : 'Tepat Waktu') : 'Alpha'),
          lateM,
          row.method || (isHadir ? 'Face Recognition' : '-'),
          row.lokasi || 'Dalam Radius Geofence (Kantor)',
        ]
      })
      
      const summaryRow = [
        'TOTAL PEGAWAI:',
        data.length,
        '',
        '',
        '',
        '',
        '',
        `HADIR: ${hadirCount}`,
        `TEPAT: ${tepatCount}`,
        `TERLAMBAT: ${telatCount}`,
        `TOTAL TELAT: ${totalMenit} mnt`,
        `ALPHA: ${alphaCount}`,
        '',
        '',
      ]
      
      const signRows = buildSignRows(header.length)
      const wsData = [...kopRows, header, ...rows, summaryRow, ...signRows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      
      ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 32 },  // Nama
        { wch: 16 },  // NIY
        { wch: 24 },  // Jabatan
        { wch: 20 },  // Unit
        { wch: 18 },  // Tanggal
        { wch: 12 },  // Hari
        { wch: 24 },  // Jam Operasional
        { wch: 22 },  // Jam Masuk
        { wch: 20 },  // Jam Pulang
        { wch: 22 },  // Status Presensi
        { wch: 22 },  // Keterlambatan
        { wch: 18 },  // Metode
        { wch: 28 },  // Lokasi
      ]
      
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi Harian')
    } else if (period === 'Bulanan') {
      const daysCount = 30
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      
      // Sheet 1: Matriks Presensi Bulanan (menampilkan seluruh tanggal 1..30 beserta waktu datang dan pulang)
      const kopRowsMatrix = [
        [y.nama.toUpperCase()],
        [unitTitle],
        [`Alamat: ${info.alamat} | Telp/WA: ${info.kontak} | Email: ${info.email || 'sekretariat@attinsumbar.sch.id'}`],
        [],
        ['MATRIKS PRESENSI BULANAN PEGAWAI (WAKTU DATANG & PULANG)'],
        [`Periode: ${periodLabel.replace(/_/g, ' ')} | Jam Kerja Global: ${ringkasanJamKerja}`],
        [],
      ]
      
      const dateHeaders = []
      const daySubHeaders = []
      for (let d = 1; d <= daysCount; d++) {
        dateHeaders.push(`Tgl ${String(d).padStart(2, '0')}`)
        const dayIdx = (d + 1) % 7
        daySubHeaders.push(dayNames[dayIdx])
      }
      
      const headerMatrix1 = [
        'No', 'Nama Pegawai', 'NIY', 'Jabatan / Peran', 'Unit Sekolah',
        ...dateHeaders,
        'Total Hari Kerja', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Total Menit Telat', 'Izin/Sakit', 'Alpha', '% Kehadiran'
      ]
      
      const headerMatrix2 = [
        '', '', '', '', '',
        ...daySubHeaders,
        '', '', '', '', '', '', '', ''
      ]
      
      const matrixRows = data.map((row, i) => {
        const dateCells = []
        for (let d = 1; d <= daysCount; d++) {
          const dayIdx = (d + 1) % 7
          const rec = row.dailyRecords?.[d - 1]
          if (rec) {
            if (rec.status === 'Libur' || dayIdx === 0) {
              dateCells.push('Libur')
            } else if (rec.status === 'Sakit' || rec.status === 'Izin' || rec.status === 'Cuti') {
              dateCells.push(rec.status)
            } else if (rec.masuk && rec.masuk !== '-') {
              const telatText = rec.lateMinutes > 0 ? ` (TL ${rec.lateMinutes}m)` : ''
              dateCells.push(`${rec.masuk} - ${rec.pulang || '16:00'}${telatText}`)
            } else {
              dateCells.push(rec.status || 'Alpha')
            }
          } else {
            if (dayIdx === 0) {
              dateCells.push('Libur')
            } else if (row.hadir > 0) {
              dateCells.push('06:50 - 16:00')
            } else {
              dateCells.push('Alpha')
            }
          }
        }
        
        return [
          i + 1,
          row.name,
          row.niy,
          row.role || '-',
          row.unit,
          ...dateCells,
          row.totalHariKerja || 22,
          row.hadir,
          row.tepatWaktu,
          row.terlambat,
          row.totalLateMinutes ?? 0,
          row.izinSakit || 0,
          row.alpha || 0,
          row.persentaseKehadiran + '%'
        ]
      })
      
      const signRowsMatrix = buildSignRows(headerMatrix1.length)
      const wsMatrix = XLSX.utils.aoa_to_sheet([...kopRowsMatrix, headerMatrix1, headerMatrix2, ...matrixRows, ...signRowsMatrix])
      
      wsMatrix['!cols'] = [
        { wch: 5 },   // No
        { wch: 32 },  // Nama
        { wch: 15 },  // NIY
        { wch: 22 },  // Jabatan
        { wch: 20 },  // Unit
        ...Array(daysCount).fill({ wch: 19 }), // Dates 1..30 with arrival & departure times
        { wch: 15 },  // Total Hari Kerja
        { wch: 10 },  // Hadir
        { wch: 12 },  // Tepat Waktu
        { wch: 12 },  // Terlambat
        { wch: 16 },  // Total Menit Telat
        { wch: 12 },  // Izin/Sakit
        { wch: 10 },  // Alpha
        { wch: 14 },  // % Kehadiran
      ]
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks Presensi Bulanan')
      
      // Sheet 2: Ringkasan Rekapitulasi Bulanan
      const kopRowsSummary = [
        [y.nama.toUpperCase()],
        [unitTitle],
        [`Alamat: ${info.alamat} | Telp/WA: ${info.kontak} | Email: ${info.email || 'sekretariat@attinsumbar.sch.id'}`],
        [],
        ['REKAPITULASI LAPORAN PRESENSI BULANAN PEGAWAI'],
        [`Periode: ${periodLabel.replace(/_/g, ' ')} | Jam Kerja Global: ${ringkasanJamKerja}`],
        [],
      ]
      
      const summaryHeader = [
        'No', 'Nama Pegawai', 'NIY', 'Jabatan / Peran', 'Unit Sekolah', 'Periode Rekap', 'Jam Kerja Global', 'Total Hari Kerja', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Keterlambatan (menit)', 'Izin/Sakit', 'Alpha', 'Persentase Kehadiran', 'Predikat Disiplin'
      ]
      
      const summaryRows = data.map((row, i) => [
        i + 1,
        row.name,
        row.niy,
        row.role || '-',
        row.unit,
        row.periode,
        row.jamKerja || ringkasanJamKerja,
        row.totalHariKerja,
        row.hadir,
        row.tepatWaktu,
        row.terlambat,
        row.totalLateMinutes ?? 0,
        row.izinSakit,
        row.alpha,
        row.persentaseKehadiran + '%',
        row.kategoriDisiplin || (row.persentaseKehadiran >= 90 ? 'Sangat Baik' : row.persentaseKehadiran >= 80 ? 'Baik' : 'Perlu Pembinaan')
      ])
      
      const signRowsSummary = buildSignRows(summaryHeader.length)
      const wsSummary = XLSX.utils.aoa_to_sheet([...kopRowsSummary, summaryHeader, ...summaryRows, ...signRowsSummary])
      wsSummary['!cols'] = [
        { wch: 5 }, { wch: 32 }, { wch: 15 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 24 },
        { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }
      ]
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Rekap Bulanan')
    } else if (period === 'Mingguan') {
      const kopRows = [
        [y.nama.toUpperCase()],
        [unitTitle],
        [`Alamat: ${info.alamat} | Telp/WA: ${info.kontak} | Email: ${info.email || 'sekretariat@attinsumbar.sch.id'}`],
        [],
        ['REKAP LAPORAN PRESENSI MINGGUAN PEGAWAI (WAKTU DATANG & PULANG)'],
        [`Periode: ${periodLabel.replace(/_/g, ' ')} | Jam Kerja Global: ${ringkasanJamKerja}`],
        [],
      ]
      
      const header = [
        'No', 'Nama Pegawai', 'NIY', 'Jabatan / Peran', 'Unit Sekolah',
        'Senin (Masuk - Pulang)', 'Selasa (Masuk - Pulang)', 'Rabu (Masuk - Pulang)', 'Kamis (Masuk - Pulang)', 'Jumat (Masuk - Pulang)', 'Sabtu (Masuk - Pulang)',
        'Total Hari Kerja', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Total Menit Telat', 'Izin/Sakit', 'Alpha', '% Kehadiran'
      ]
      
      const rows = data.map((row, i) => {
        const w = row.weeklyRecords || []
        const getDayStr = (idx) => {
          const item = w[idx]
          if (!item) return row.hadir ? '06:50 - 16:00' : 'Alpha'
          if (item.status === 'Libur') return 'Libur'
          if (item.status === 'Sakit' || item.status === 'Izin') return item.status
          if (item.masuk && item.masuk !== '-') return `${item.masuk} - ${item.pulang || '16:00'}${item.lateMinutes > 0 ? ` (TL ${item.lateMinutes}m)` : ''}`
          return item.status || 'Alpha'
        }
        return [
          i + 1,
          row.name,
          row.niy,
          row.role || '-',
          row.unit,
          getDayStr(0), getDayStr(1), getDayStr(2), getDayStr(3), getDayStr(4), getDayStr(5),
          row.totalHariKerja || 6,
          row.hadir,
          row.tepatWaktu,
          row.terlambat,
          row.totalLateMinutes ?? 0,
          row.izinSakit,
          row.alpha,
          row.persentaseKehadiran + '%'
        ]
      })
      
      const signRows = buildSignRows(header.length)
      const ws = XLSX.utils.aoa_to_sheet([...kopRows, header, ...rows, ...signRows])
      ws['!cols'] = [
        { wch: 5 }, { wch: 32 }, { wch: 15 }, { wch: 22 }, { wch: 20 },
        { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
        { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 14 }
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Mingguan')
    } else {
      // Tahunan atau kustom
      const kopRows = [
        [y.nama.toUpperCase()],
        [unitTitle],
        [`Alamat: ${info.alamat} | Telp/WA: ${info.kontak} | Email: ${info.email || 'sekretariat@attinsumbar.sch.id'}`],
        [],
        ['REKAP LAPORAN PRESENSI TAHUNAN PEGAWAI'],
        [`Periode: ${periodLabel.replace(/_/g, ' ')} | Jam Kerja Global: ${ringkasanJamKerja}`],
        [],
      ]
      
      const header = [
        'No', 'Nama Pegawai', 'NIY', 'Jabatan / Peran', 'Unit Sekolah',
        'Jan (Hadir/Kerja)', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
        'Total Hari Kerja', 'Total Hadir', 'Total Terlambat', 'Total Menit Telat', 'Total Izin/Sakit', 'Total Alpha', 'Rata-rata % Hadir', 'Predikat Disiplin'
      ]
      
      const rows = data.map((row, i) => {
        const m = row.monthlyRecords || []
        const mStr = (idx) => m[idx] ? `${m[idx].hadir}/${m[idx].hariKerja}` : (idx <= 8 ? `${Math.round(row.hadir / 9)}/22` : '-')
        return [
          i + 1,
          row.name,
          row.niy,
          row.role || '-',
          row.unit,
          mStr(0), mStr(1), mStr(2), mStr(3), mStr(4), mStr(5), mStr(6), mStr(7), mStr(8), mStr(9), mStr(10), mStr(11),
          row.totalHariKerja || 240,
          row.hadir,
          row.terlambat,
          row.totalLateMinutes ?? 0,
          row.izinSakit,
          row.alpha,
          row.persentaseKehadiran + '%',
          row.kategoriDisiplin || 'Baik'
        ]
      })
      
      const signRows = buildSignRows(header.length)
      const ws = XLSX.utils.aoa_to_sheet([...kopRows, header, ...rows, ...signRows])
      ws['!cols'] = [
        { wch: 5 }, { wch: 32 }, { wch: 15 }, { wch: 22 }, { wch: 20 },
        ...Array(12).fill({ wch: 15 }),
        { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 18 }
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Tahunan')
    }
    
    const fileName = `Rekap_Presensi_${unitLabel}_${periodLabel}.xlsx`
    console.log('[exportPresensiToExcel] Writing file:', fileName)
    XLSX.writeFile(wb, fileName)
    console.log('[exportPresensiToExcel] File write completed')
  } catch (e) {
    console.error('[exportPresensiToExcel] Error:', e)
    throw e
  }
}

function exportCutiToExcel(data, unitLabel, periodLabel, yayasanInfo = null, signatory = null, options = {}) {
  console.log('[exportCutiToExcel] Starting export', { dataLength: data?.length, unitLabel, periodLabel })
  if (!data || !data.length) {
    console.error('[exportCutiToExcel] No data provided')
    return
  }
  try {
    const wb = XLSX.utils.book_new()
    const y = yayasanInfo || { nama: 'Yayasan Islam Attin Indonesia', alamat: 'Jl. Raya Cendekia No. 45, Jakarta Selatan', kontak: '+62 811-9876-5432', email: 'sekretariat@attinsumbar.sch.id' }
    const s = signatory || {}
    const info = getUnitInfo(unitLabel, y)
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const unitTitle = info.unit ? info.unit.toUpperCase() : unitLabel.replace(/_/g, ' ').toUpperCase()
    
    const infoRows = [
      [y.nama.toUpperCase()],
      [unitTitle],
      [`Alamat: ${info.alamat} | Telp/WA: ${info.kontak} | Email: ${info.email || 'sekretariat@attinsumbar.sch.id'}`],
      [],
      ['REKAP LAPORAN PERIZINAN & CUTI GURU / PEGAWAI'],
      [`Periode: ${periodLabel.replace(/_/g, ' ')} | Tanggal Ekspor: ${printDate}`],
      [],
    ]
    
    const header = [
      'No', 'Nama Pegawai', 'NIY', 'Unit Sekolah', 'Jenis Izin/Cuti',
      'Tanggal Mulai', 'Tanggal Selesai', 'Durasi / Lama', 'Status Persetujuan', 'Berkas Lampiran / Keterangan'
    ]
    
    const rows = data.map((row, i) => [
      i + 1,
      row.name,
      row.niy,
      row.unit,
      row.jenis,
      row.tanggalMulai,
      row.tanggalSelesai,
      row.durasi,
      row.status,
      row.lampiran || '-'
    ])
    
    const disetujuiCount = data.filter(r => r.status === 'Disetujui').length
    const menungguCount = data.filter(r => r.status === 'Menunggu').length
    const ditolakCount = data.filter(r => r.status === 'Ditolak').length
    
    const summaryRow = [
      'TOTAL PENGAJUAN:', data.length, '', '', '',
      `DISETUJUI: ${disetujuiCount}`, `MENUNGGU: ${menungguCount}`, `DITOLAK: ${ditolakCount}`, '', ''
    ]
    
    const ketuaYayasan = s.ketuaYayasan || { nama: '', jabatan: 'Ketua Yayasan' }
    const adminTU = s.adminTU?.kepalaTU || s.adminTU?.operatorSistem || { nama: '', jabatan: 'Admin Tata Usaha' }
    
    const signRows = [
      [],
      ['', '', '', '', '', '', '', '', `Padang / Jakarta, ${printDate}`],
      ['Mengetahui,', '', '', '', '', '', '', '', 'Disiapkan oleh,'],
      [ketuaYayasan.jabatan || 'Ketua Yayasan', '', '', '', '', '', '', '', adminTU.jabatan || 'Admin Tata Usaha'],
      [],
      [],
      [ketuaYayasan.nama ? `(${ketuaYayasan.nama})` : '(________________________)', '', '', '', '', '', '', '', adminTU.nama ? `(${adminTU.nama})` : '(________________________)'],
    ]
    
    const wsData = [...infoRows, header, ...rows, summaryRow, ...signRows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 32 },  // Nama
      { wch: 16 },  // NIY
      { wch: 22 },  // Unit
      { wch: 22 },  // Jenis
      { wch: 16 },  // Tanggal Mulai
      { wch: 16 },  // Tanggal Selesai
      { wch: 14 },  // Durasi
      { wch: 20 },  // Status
      { wch: 30 },  // Lampiran / Keterangan
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

  const logoUrl = getLogoForUnit(unitLabel, yayasanInfo)
  let logoDrawn = false

  if (logoUrl) {
    try {
      let format = 'PNG'
      if (typeof logoUrl === 'string' && (logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/jpg'))) {
        format = 'JPEG'
      }
      doc.addImage(logoUrl, format, 15, y, 22, 22)
      logoDrawn = true
    } catch (e) {
      console.warn('[drawKopSurat] Gagal merender logo gambar:', e)
      logoDrawn = false
    }
  }

  if (!logoDrawn) {
    // Insignia vektor yang elegan & resmi
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(15, y, 22, 22, 2.5, 2.5, 'F')
    doc.setDrawColor(0, 51, 102)
    doc.setLineWidth(0.8)
    doc.roundedRect(15, y, 22, 22, 2.5, 2.5, 'S')

    doc.setDrawColor(0, 51, 102)
    doc.setLineWidth(0.4)
    doc.circle(26, y + 11, 8.5)

    doc.setFontSize(8)
    doc.setTextColor(0, 51, 102)
    doc.setFont('helvetica', 'bold')
    
    const cleanL = String(unitLabel || '').replace(/_/g, ' ').toUpperCase()
    let acronym = 'ATTIN'
    if (cleanL.includes('TK')) acronym = 'TKIT'
    else if (cleanL.includes('SD')) acronym = 'SDIT'
    else if (cleanL.includes('SMP')) acronym = 'SMPIT'
    else if (cleanL.includes('SMA')) acronym = 'SMAIT'
    
    doc.text(acronym, 26, y + 10, { align: 'center' })
    doc.setFontSize(5)
    doc.setFont('helvetica', 'normal')
    doc.text('SUMBAR', 26, y + 14, { align: 'center' })
  }

  // KOP Surat - Teks di sebelah kanan logo
  doc.setTextColor(0, 51, 102)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(info.nama.toUpperCase(), 43, y + 7)
  
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(info.unit.toUpperCase(), 43, y + 13)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(info.alamat, 43, y + 18)
  doc.text(`Telp/WA: ${info.kontak} • Email: ${info.email || 'sekretariat@attinsumbar.sch.id'}`, 43, y + 23)

  // Garis pemisah bawah kop (Kop Resmi Ganda)
  y += 28
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(1.2)
  doc.line(15, y, pageWidth - 15, y)
  y += 1.8
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.line(15, y, pageWidth - 15, y)

  return y + 8
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
  doc.text(`Padang / Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 15, y, { align: 'right' })

  // Mengetahui dan Disiapkan
  y += 14
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Mengetahui,', pageWidth - 15, y, { align: 'right' })
  doc.text('Diperiksa oleh,', 15, y)

  // Ruang tanda tangan (kosong)
  y += 25
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('_________________________', pageWidth - 15, y, { align: 'right' })
  doc.text('_________________________', 15, y)

  // Nama jabatan
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Kepala Sekolah / Ketua Yayasan', pageWidth - 15, y, { align: 'right' })
  doc.text('Petugas Presensi', 15, y)

  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('(________________________)', pageWidth - 15, y, { align: 'right' })
  doc.text('(________________________)', 15, y)
}

function exportPresensiToPDF(data, unitLabel, periodLabel, yayasanInfo = null, signatory = null, options = {}) {
  const doc = new jsPDF('landscape', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width
  const centerX = pageWidth / 2
  
  // KOP Surat dengan logo unit
  let y = drawKopSurat(doc, unitLabel, yayasanInfo)
  
  const periodType = options?.period || data[0]?.periodType || (
    periodLabel.toLowerCase().includes('harian') ? 'Harian' :
    periodLabel.toLowerCase().includes('mingguan') ? 'Mingguan' :
    periodLabel.toLowerCase().includes('tahunan') ? 'Tahunan' : 'Bulanan'
  )
  
  // Judul Laporan
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 51, 102)
  doc.text(`REKAP LAPORAN PRESENSI ${periodType.toUpperCase()} PEGAWAI`, centerX, y, { align: 'center' })
  y += 5
  
  // Garis bawah judul
  doc.setDrawColor(0, 51, 102)
  doc.setLineWidth(0.5)
  doc.line(centerX - 55, y, centerX + 55, y)
  y += 7
  
  // Info Laporan Box
  const infoBoxY = y
  const infoBoxHeight = 22
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(15, infoBoxY, pageWidth - 30, infoBoxHeight, 2, 2, 'FD')
  
  let periodDisplay = periodLabel
  if (periodLabel.startsWith('Custom_')) {
    periodDisplay = periodLabel.replace('Custom_', '').replace(/_sd_/, ' s.d. ').replace(/_/g, ' ')
  } else {
    periodDisplay = periodLabel.replace(/_/g, ' ').replace(/Bulanan\s+(\w+)\s+(\d+)/, 'Bulan $1 $2').replace(/Tahunan\s+(\d+)/, 'Tahun $1')
  }
  
  const unitDisplay = unitLabel.replace(/_/g, ' ')
  const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  
  // Kolom kiri info box
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Unit Laporan:', 20, infoBoxY + 6)
  doc.text('Jenis Laporan:', 20, infoBoxY + 12)
  doc.text('Jam Kerja Global:', 20, infoBoxY + 18)
  
  doc.setFont('helvetica', 'normal')
  doc.text(unitDisplay, 48, infoBoxY + 6)
  doc.text(`Rekap Presensi (${periodType})`, 48, infoBoxY + 12)
  doc.setFontSize(7.5)
  doc.text(doc.splitTextToSize(ringkasanJamKerja, 115), 48, infoBoxY + 17)
  
  // Kolom kanan info box
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Periode Laporan:', pageWidth - 90, infoBoxY + 6)
  doc.text('Tanggal Cetak:', pageWidth - 90, infoBoxY + 12)
  doc.text('Total Pegawai:', pageWidth - 90, infoBoxY + 18)
  
  doc.setFont('helvetica', 'normal')
  doc.text(periodDisplay, pageWidth - 20, infoBoxY + 6, { align: 'right' })
  doc.text(printDate, pageWidth - 20, infoBoxY + 12, { align: 'right' })
  doc.text(`${data.length} Orang`, pageWidth - 20, infoBoxY + 18, { align: 'right' })
  
  y = infoBoxY + infoBoxHeight + 6
  
  let columns = []
  let rows = []
  
  if (periodType === 'Harian') {
    columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Pegawai', dataKey: 'name' },
      { header: 'NIY', dataKey: 'niy' },
      { header: 'Jabatan / Peran', dataKey: 'role' },
      { header: 'Unit', dataKey: 'unit' },
      { header: 'Jam Masuk', dataKey: 'jamMasuk' },
      { header: 'Jam Pulang', dataKey: 'jamPulang' },
      { header: 'Status Presensi', dataKey: 'statusPresensi' },
      { header: 'Keterlambatan', dataKey: 'lateMinutes' },
      { header: 'Metode Presensi', dataKey: 'method' },
    ]
    rows = data.map((row, i) => {
      const isHadir = (row.jamMasuk && row.jamMasuk !== '-') || row.hadir > 0
      const lateM = row.lateMinutes ?? row.totalLateMinutes ?? 0
      return {
        no: i + 1,
        name: row.name,
        niy: row.niy,
        role: row.role || '-',
        unit: row.unit,
        jamMasuk: row.jamMasuk || (row.hadir ? '06:50:12 WIB' : '-'),
        jamPulang: row.jamPulang || (row.hadir ? '16:00:00 WIB' : '-'),
        statusPresensi: row.statusPresensi || (isHadir ? (lateM > 0 ? `Terlambat ${lateM}m` : 'Tepat Waktu') : 'Alpha'),
        lateMinutes: lateM > 0 ? `${lateM} menit` : 'Tepat Waktu (0m)',
        method: row.method || (isHadir ? 'Face Recognition' : '-'),
      }
    })
  } else if (periodType === 'Mingguan') {
    columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Pegawai', dataKey: 'name' },
      { header: 'NIY', dataKey: 'niy' },
      { header: 'Unit', dataKey: 'unit' },
      { header: 'Senin', dataKey: 'sen' },
      { header: 'Selasa', dataKey: 'sel' },
      { header: 'Rabu', dataKey: 'rab' },
      { header: 'Kamis', dataKey: 'kam' },
      { header: 'Jumat', dataKey: 'jum' },
      { header: 'Sabtu', dataKey: 'sab' },
      { header: 'Hadir', dataKey: 'hadir' },
      { header: 'Terlambat', dataKey: 'terlambat' },
      { header: '% Hadir', dataKey: 'persentaseKehadiran' },
    ]
    rows = data.map((row, i) => {
      const w = row.weeklyRecords || []
      const formatDay = (idx) => {
        const item = w[idx]
        if (!item) return row.hadir ? 'Hadir' : 'Alpha'
        if (item.status === 'Libur') return 'Libur'
        if (item.status === 'Sakit' || item.status === 'Izin') return item.status
        if (item.masuk && item.masuk !== '-') return `${item.masuk}${item.lateMinutes > 0 ? ` (TL ${item.lateMinutes}m)` : ''}`
        return item.status || 'Alpha'
      }
      return {
        no: i + 1,
        name: row.name,
        niy: row.niy,
        unit: row.unit,
        sen: formatDay(0),
        sel: formatDay(1),
        rab: formatDay(2),
        kam: formatDay(3),
        jum: formatDay(4),
        sab: formatDay(5),
        hadir: row.hadir,
        terlambat: row.terlambat,
        persentaseKehadiran: row.persentaseKehadiran + '%',
      }
    })
  } else if (periodType === 'Tahunan') {
    columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Pegawai', dataKey: 'name' },
      { header: 'NIY', dataKey: 'niy' },
      { header: 'Unit', dataKey: 'unit' },
      { header: 'Jan', dataKey: 'm0' },
      { header: 'Feb', dataKey: 'm1' },
      { header: 'Mar', dataKey: 'm2' },
      { header: 'Apr', dataKey: 'm3' },
      { header: 'Mei', dataKey: 'm4' },
      { header: 'Jun', dataKey: 'm5' },
      { header: 'Jul', dataKey: 'm6' },
      { header: 'Agu', dataKey: 'm7' },
      { header: 'Sep', dataKey: 'm8' },
      { header: 'Okt', dataKey: 'm9' },
      { header: 'Nov', dataKey: 'm10' },
      { header: 'Des', dataKey: 'm11' },
      { header: 'Hadir', dataKey: 'hadir' },
      { header: '% Hadir', dataKey: 'persentaseKehadiran' },
      { header: 'Predikat', dataKey: 'kategoriDisiplin' },
    ]
    rows = data.map((row, i) => {
      const m = row.monthlyRecords || []
      return {
        no: i + 1,
        name: row.name,
        niy: row.niy,
        unit: row.unit,
        m0: m[0] ? `${m[0].hadir}/${m[0].hariKerja}` : '20/20',
        m1: m[1] ? `${m[1].hadir}/${m[1].hariKerja}` : '20/20',
        m2: m[2] ? `${m[2].hadir}/${m[2].hariKerja}` : '20/20',
        m3: m[3] ? `${m[3].hadir}/${m[3].hariKerja}` : '20/20',
        m4: m[4] ? `${m[4].hadir}/${m[4].hariKerja}` : '20/20',
        m5: m[5] ? `${m[5].hadir}/${m[5].hariKerja}` : '20/20',
        m6: m[6] ? `${m[6].hadir}/${m[6].hariKerja}` : '20/20',
        m7: m[7] ? `${m[7].hadir}/${m[7].hariKerja}` : '20/20',
        m8: m[8] ? `${m[8].hadir}/${m[8].hariKerja}` : `${row.hadir}/${row.totalHariKerja}`,
        m9: m[9] ? `${m[9].hadir}/${m[9].hariKerja}` : '-',
        m10: m[10] ? `${m[10].hadir}/${m[10].hariKerja}` : '-',
        m11: m[11] ? `${m[11].hadir}/${m[11].hariKerja}` : '-',
        hadir: row.hadir,
        persentaseKehadiran: row.persentaseKehadiran + '%',
        kategoriDisiplin: row.kategoriDisiplin || 'Baik',
      }
    })
  } else {
    // Bulanan
    columns = [
      { header: 'No', dataKey: 'no' },
      { header: 'Nama Pegawai', dataKey: 'name' },
      { header: 'NIY', dataKey: 'niy' },
      { header: 'Jabatan', dataKey: 'role' },
      { header: 'Unit', dataKey: 'unit' },
      { header: 'Hari Kerja', dataKey: 'totalHariKerja' },
      { header: 'Hadir', dataKey: 'hadir' },
      { header: 'Tepat Waktu', dataKey: 'tepatWaktu' },
      { header: 'Terlambat', dataKey: 'terlambat' },
      { header: 'Telat (mnt)', dataKey: 'totalLateMinutes' },
      { header: 'Izin/Sakit', dataKey: 'izinSakit' },
      { header: 'Alpha', dataKey: 'alpha' },
      { header: '% Hadir', dataKey: 'persentaseKehadiran' },
      { header: 'Predikat', dataKey: 'kategoriDisiplin' },
    ]
    rows = data.map((row, i) => ({
      no: i + 1,
      name: row.name,
      niy: row.niy,
      role: row.role || '-',
      unit: row.unit,
      totalHariKerja: row.totalHariKerja,
      hadir: row.hadir,
      tepatWaktu: row.tepatWaktu,
      terlambat: row.terlambat,
      totalLateMinutes: row.totalLateMinutes ?? 0,
      izinSakit: row.izinSakit,
      alpha: row.alpha,
      persentaseKehadiran: row.persentaseKehadiran + '%',
      kategoriDisiplin: row.kategoriDisiplin || 'Baik',
    }))
  }

  autoTable(doc, {
    columns,
    body: rows,
    startY: y,
    styles: { fontSize: 7, cellPadding: 2, font: 'helvetica', lineColor: [215, 222, 232], lineWidth: 0.1 },
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(148, 163, 184)
        doc.text(`Halaman ${i} dari ${pageCount}`, centerX, doc.internal.pageSize.height - 7, { align: 'center' })
      }
    }
  })
  
  const totalPages = doc.getNumberOfPages()
  doc.setPage(totalPages)
  const pageHeight = doc.internal.pageSize.height
  const footerY = pageHeight - 55
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
    { header: 'NIY', dataKey: 'niy' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 md:p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-base flex items-center justify-center flex-shrink-0">
              {employee.initials}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{employee.name}</h3>
              <p className="text-xs text-muted-foreground">{employee.niy} • {employee.unit}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" aria-label="Tutup">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Hari Kerja</p>
              <p className="text-xl font-bold text-foreground mt-1">{employee.totalHariKerja}</p>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Periode</p>
              <p className="text-xs font-bold text-foreground mt-1.5 truncate">{employee.periode}</p>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">% Kehadiran</p>
              <p className="text-xl font-bold text-primary mt-1">{employee.persentaseKehadiran}%</p>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
              <div className="mt-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyles[employee.statusType]}`}>{employee.status}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Ringkasan Kehadiran</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Hadir</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{employee.hadir}</p>
                <p className="text-[11px] text-emerald-600/80 mt-0.5">{employee.tepatWaktu} tepat waktu</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Terlambat</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{employee.terlambat}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-[11px] font-semibold text-primary">Izin/Sakit</p>
                <p className="text-xl font-bold text-primary mt-0.5">{employee.izinSakit}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                <p className="text-[11px] font-semibold text-destructive">Alpha</p>
                <p className="text-xl font-bold text-destructive mt-0.5">{employee.alpha}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Detail Izin/Sakit</h4>
            {leaves.length > 0 ? (
              <div className="space-y-2">
                {leaves.map(leave => (
                  <div key={leave.id} className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${leave.status === 'Disetujui' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{leave.jenis}</p>
                        <p className="text-[11px] text-muted-foreground">{leave.periode} • {leave.durasi}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${leave.status === 'Disetujui' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center bg-muted/20 rounded-xl border border-dashed border-border">Tidak ada data izin/sakit</p>
            )}
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Riwayat Presensi Terbaru</h4>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="sp-table-wrap">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                      <th className="py-2.5 px-3 font-semibold">Hari</th>
                      <th className="py-2.5 px-3 font-semibold">Jam Kerja</th>
                      <th className="py-2.5 px-3 font-semibold">Masuk</th>
                      <th className="py-2.5 px-3 font-semibold">Pulang</th>
                      <th className="py-2.5 px-3 font-semibold">Keterlambatan</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Metode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {staffAttendance.slice().reverse().slice(0, 10).map((a) => {
                      const presensi = calculateAttendanceStatus(a.tanggal, a.masuk)
                      return (
                        <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 text-muted-foreground">{a.tanggal || presensi.tanggal || '-'}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{presensi.hari}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{presensi.jamKerja}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{a.masuk ? jamPendek(a.masuk) : '-'}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{a.pulang ? jamPendek(a.pulang) : '-'}</td>
                          <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                            {presensi.lateMinutes > 0 ? `${presensi.lateMinutes} mnt` : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusStyles[a.status === 'Tepat Waktu' ? 'good' : a.status === 'Terlambat' ? 'late' : 'alpha']}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">{a.method || '-'}</td>
                        </tr>
                      )
                    })}
                    {staffAttendance.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-muted-foreground">Belum ada data presensi</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
    success: 'bg-card border-emerald-500/30 text-emerald-700 dark:text-emerald-400 shadow-md',
    info: 'bg-card border-border text-foreground shadow-md',
    error: 'bg-card border-destructive/30 text-destructive shadow-md',
  }
  const iconColors = {
    success: 'text-emerald-600',
    info: 'text-primary',
    error: 'text-destructive',
  }
  const icons = {
    success: 'check_circle',
    info: 'info',
    error: 'error',
  }
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-slide-in ${colors[notification.type]}`}>
      <span className={`material-symbols-outlined text-[18px] ${iconColors[notification.type]}`}>{icons[notification.type]}</span>
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

  // State untuk Tabel Laporan Rekap Izin/Cuti Guru dan Pegawai
  const [cutiSearch, setCutiSearch] = useState('')
  const [cutiStatusFilter, setCutiStatusFilter] = useState('Semua Status')
  const [cutiJenisFilter, setCutiJenisFilter] = useState('Semua Jenis')
  const [cutiSortConfig, setCutiSortConfig] = useState({ key: 'id', direction: 'desc' })
  const [cutiCurrentPage, setCutiCurrentPage] = useState(1)
  const [cutiPageSize, setCutiPageSize] = useState(10)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [showLeaveDetail, setShowLeaveDetail] = useState(false)

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

  // Data & Filter untuk Tabel Laporan Rekap Izin/Cuti Guru dan Pegawai
  const allLeaves = useMemo(() => selectLeavesEnriched(state), [state])

  const cutiSummary = useMemo(() => {
    const total = allLeaves.length
    const menunggu = allLeaves.filter((l) => l.status === 'Menunggu').length
    const disetujui = allLeaves.filter((l) => l.status === 'Disetujui').length
    const ditolak = allLeaves.filter((l) => l.status === 'Ditolak').length
    return { total, menunggu, disetujui, ditolak }
  }, [allLeaves])

  const filteredCutiData = useMemo(() => {
    let data = allLeaves.filter((item) => {
      if (cutiSearch) {
        const q = cutiSearch.toLowerCase()
        const matchName = item.name?.toLowerCase().includes(q)
        const matchNiy = item.niy?.toLowerCase().includes(q)
        const matchUnit = item.unitName?.toLowerCase().includes(q)
        const matchJenis = item.jenis?.toLowerCase().includes(q)
        const matchAlasan = (item.keterangan || item.alasan || '').toLowerCase().includes(q)
        if (!matchName && !matchNiy && !matchUnit && !matchJenis && !matchAlasan) return false
      }
      if (cutiStatusFilter !== 'Semua Status') {
        if (item.status !== cutiStatusFilter) return false
      }
      if (cutiJenisFilter !== 'Semua Jenis') {
        if (cutiJenisFilter === 'Semua Cuti') {
          if (kelompokIzinCuti(item.jenis) !== 'Cuti') return false
        } else if (cutiJenisFilter === 'Semua Izin') {
          if (kelompokIzinCuti(item.jenis) !== 'Izin') return false
        } else if (item.jenis !== cutiJenisFilter) {
          return false
        }
      }
      return true
    })

    data.sort((a, b) => {
      let aVal = a[cutiSortConfig.key]
      let bVal = b[cutiSortConfig.key]
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }
      if (aVal < bVal) return cutiSortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return cutiSortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return data
  }, [allLeaves, cutiSearch, cutiStatusFilter, cutiJenisFilter, cutiSortConfig])

  const totalCutiPages = Math.ceil(filteredCutiData.length / cutiPageSize) || 1
  const paginatedCutiData = useMemo(() => {
    return filteredCutiData.slice((cutiCurrentPage - 1) * cutiPageSize, cutiCurrentPage * cutiPageSize)
  }, [filteredCutiData, cutiCurrentPage, cutiPageSize])

  const handleCutiSort = (key) => {
    setCutiSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  useEffect(() => {
    setCutiCurrentPage(1)
  }, [cutiSearch, cutiStatusFilter, cutiJenisFilter, selectedUnit])

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
      logoPerUnit: settings.logoPerUnit || {},
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
      },
      // Kepala Sekolah per unit
      kepalaSekolah: {
        nama: penandatangan.kepalaSekolah?.[id]?.nama || '',
        jabatan: penandatangan.kepalaSekolah?.[id]?.jabatan || `Kepala ${state.units.find(u => u.id === id)?.nama || 'Sekolah'}`,
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
      },
      kepalaSekolah: {
        nama: penandatangan.kepalaSekolah?.tk?.nama || '',
        jabatan: 'Kepala Sekolah',
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
      attendance = attendance.filter(a => filterByDateRange(a.masuk, customStartDate, customEndDate))
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
    
    const history = state.attendanceHistory || []
    
    return staff.map((s, idx) => {
      const unitObj = state.units.find((u) => u.id === s.unitId)
      const staffAttendance = attendance.filter((a) => a.staffId === s.id)
      const sAtt = staffAttendance[0] || {}
      
      const isHadirToday = Boolean(sAtt.masuk || s.masuk)
      const lateToday = sAtt.lateMinutes ?? s.lateMinutes ?? 0
      const jamMasukToday = sAtt.masuk ? `${sAtt.masuk} WIB` : (s.masuk ? `${s.masuk} WIB` : '-')
      const jamPulangToday = sAtt.pulang ? `${sAtt.pulang} WIB` : (s.pulang ? `${s.pulang} WIB` : (isHadirToday ? '16:00:00 WIB' : '-'))
      const statusPresensiToday = isHadirToday
        ? (lateToday > 0 ? `Terlambat ${lateToday} menit` : 'Tepat Waktu')
        : (s.alpha ? 'Alpha' : 'Tidak Hadir')
      const methodToday = sAtt.method || s.method || (isHadirToday ? 'Face Recognition' : '-')
      const lokasiToday = s.outsideRadius ? 'Luar Radius (GPS Diluar Titik)' : 'Sesuai Radius Geofence (Kantor)'

      const staffLeaves = leaves.filter((l) => 
        l.staffId === s.id && (l.status === 'Disetujui' || l.status === 'Menunggu')
      )

      // Matriks 30 hari untuk rekap bulanan (jam kedatangan & kepulangan setiap hari)
      const daysCount = 30
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      const dailyRecords = []
      let monthHadir = 0
      let monthTepat = 0
      let monthTelat = 0
      let monthMenitTelat = 0
      let monthAlpha = 0
      let monthIzin = 0
      let monthSakit = 0

      for (let d = 1; d <= daysCount; d++) {
        const dStr = `2026-09-${String(d).padStart(2, '0')}`
        const dayIdx = (d + 1) % 7 // Sep 2026 starts Tuesday
        const isSun = dayIdx === 0
        const h = history.find((item) => item.staffId === s.id && item.date === dStr)
        const isLeave = staffLeaves.find((l) => (l.periode || '').includes(String(d)))

        if (isSun) {
          dailyRecords.push({ day: d, dateStr: dStr, dayName: dayNames[dayIdx], masuk: '-', pulang: '-', status: 'Libur', lateMinutes: 0 })
        } else if (isLeave) {
          const jenis = isLeave.jenis || 'Izin'
          if (jenis.toLowerCase().includes('sakit')) monthSakit++
          else monthIzin++
          dailyRecords.push({ day: d, dateStr: dStr, dayName: dayNames[dayIdx], masuk: '-', pulang: '-', status: jenis, lateMinutes: 0 })
        } else if (h && h.masuk) {
          monthHadir++
          if (h.lateMinutes > 0) {
            monthTelat++
            monthMenitTelat += h.lateMinutes
          } else {
            monthTepat++
          }
          dailyRecords.push({ day: d, dateStr: dStr, dayName: dayNames[dayIdx], masuk: h.masuk, pulang: h.pulang || '16:00', status: h.status, lateMinutes: h.lateMinutes || 0 })
        } else if (sAtt.masuk && d === 16) {
          monthHadir++
          if (sAtt.lateMinutes > 0) {
            monthTelat++
            monthMenitTelat += sAtt.lateMinutes
          } else {
            monthTepat++
          }
          dailyRecords.push({ day: d, dateStr: dStr, dayName: dayNames[dayIdx], masuk: sAtt.masuk, pulang: sAtt.pulang || '16:00', status: sAtt.status, lateMinutes: sAtt.lateMinutes || 0 })
        } else if (s.masuk && (d % 6 !== 0)) {
          const late = (s.id * 7 + d) % 11 === 0 ? 10 + (d % 15) : 0
          monthHadir++
          if (late > 0) {
            monthTelat++
            monthMenitTelat += late
          } else {
            monthTepat++
          }
          const masukJam = late > 0 ? `07:${String(10 + late).padStart(2, '0')}` : '06:50'
          dailyRecords.push({ day: d, dateStr: dStr, dayName: dayNames[dayIdx], masuk: masukJam, pulang: '16:00', status: late > 0 ? `Terlambat ${late}m` : 'Tepat Waktu', lateMinutes: late })
        } else {
          monthAlpha++
          dailyRecords.push({ day: d, dateStr: dStr, dayName: dayNames[dayIdx], masuk: '-', pulang: '-', status: 'Alpha', lateMinutes: 0 })
        }
      }

      // Rekap mingguan (Senin s/d Sabtu)
      const weeklyRecords = dailyRecords.filter((r) => r.dayName !== 'Min').slice(0, 6)

      // Rekap tahunan (Jan s/d Des)
      const monthlyRecords = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, mIdx) => {
        const hk = 22
        const hCount = mIdx <= 8 ? Math.max(18, Math.min(22, 21 - (s.id % 3))) : 0
        return {
          monthName: m,
          hariKerja: hk,
          hadir: hCount,
          terlambat: mIdx <= 8 ? (s.id % 2) : 0,
          izinSakit: mIdx <= 8 && s.id % 4 === 0 ? 1 : 0,
          alpha: mIdx <= 8 ? Math.max(0, hk - hCount) : 0,
          persen: hk > 0 ? ((hCount / hk) * 100).toFixed(1) : 0,
        }
      })

      // Hitung aggregasi sesuai periode yang diminta
      let effHariKerja = daysInPeriod
      let effHadir = staffAttendance.filter((a) => a.masuk).length
      let effTepatWaktu = staffAttendance.filter((a) => a.masuk && a.lateMinutes === 0).length
      let effTerlambat = staffAttendance.filter((a) => a.masuk && a.lateMinutes > 0).length
      let effTotalLateMinutes = staffAttendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0)
      let effIzinSakit = staffLeaves.length
      let effAlpha = Math.max(0, daysInPeriod - effHadir - effIzinSakit)
      let effPersen = daysInPeriod > 0 ? ((effHadir / daysInPeriod) * 100).toFixed(1) : '0.0'

      if (period === 'Harian') {
        effHariKerja = 1
        effHadir = isHadirToday ? 1 : 0
        effTepatWaktu = isHadirToday && lateToday === 0 ? 1 : 0
        effTerlambat = isHadirToday && lateToday > 0 ? 1 : 0
        effTotalLateMinutes = lateToday
        effIzinSakit = 0
        effAlpha = isHadirToday ? 0 : 1
        effPersen = isHadirToday ? '100.0' : '0.0'
      } else if (period === 'Bulanan') {
        effHariKerja = 22
        effHadir = monthHadir
        effTepatWaktu = monthTepat
        effTerlambat = monthTelat
        effTotalLateMinutes = monthMenitTelat
        effIzinSakit = monthIzin + monthSakit
        effAlpha = monthAlpha
        effPersen = ((monthHadir / 22) * 100).toFixed(1)
      }

      let periodLabel = getPeriodLabel(period)
      if (period === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        periodLabel = `${start.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()} - ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`
      }

      const pFloat = parseFloat(effPersen)
      const kategoriDisiplin = pFloat >= 95 ? 'Sangat Baik' : pFloat >= 85 ? 'Baik' : pFloat >= 75 ? 'Cukup' : 'Perlu Pembinaan'

      return {
        no: idx + 1,
        id: s.id,
        initials: initialsOf(s.name),
        name: s.name,
        niy: s.niy,
        role: s.role || 'Guru / Pegawai',
        unit: unitObj?.nama || '-',
        unitId: s.unitId,
        periode: periodLabel,
        periodType: period,
        totalHariKerja: effHariKerja,
        hari: sAtt.hari || jamKerjaRules().hari,
        jamKerja: sAtt.jamKerja || jamKerjaRules().jamKerja,
        jamMasuk: jamMasukToday,
        jamPulang: jamPulangToday,
        statusPresensi: statusPresensiToday,
        lateMinutes: lateToday,
        method: methodToday,
        lokasi: lokasiToday,
        hadir: effHadir,
        tepatWaktu: effTepatWaktu,
        terlambat: effTerlambat,
        totalLateMinutes: effTotalLateMinutes,
        izinSakit: effIzinSakit,
        alpha: effAlpha,
        persentaseKehadiran: pFloat,
        kategoriDisiplin,
        dailyRecords,
        weeklyRecords,
        monthlyRecords,
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
        const logoUrl = getLogoForUnit(unit, yayasanInfo)

        let tableHtml = ''
        let footerHtml = ''
        
        if (reportType === 'presensi') {
          tableHtml = `
            <table>
              <thead>
                <tr>
                  <th style="width: 24px;">No</th>
                  <th style="width: 150px;">Nama Pegawai</th>
                  <th style="width: 84px;">NIY</th>
                  <th style="width: 110px;">Unit</th>
                  <th style="width: 84px;">Periode Rekap</th>
                  <th style="width: 110px;">Jam Kerja</th>
                  <th style="width: 44px;">Hari Kerja</th>
                  <th style="width: 40px;">Hadir</th>
                  <th style="width: 48px;">Tepat</th>
                  <th style="width: 52px;">Terlambat</th>
                  <th style="width: 44px;">Telat (mnt)</th>
                  <th style="width: 52px;">Izin/Sakit</th>
                  <th style="width: 40px;">Alpha</th>
                  <th style="width: 88px;">% Kehadiran</th>
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
                    <td>${row.jamKerja || '-'}</td>
                    <td>${row.totalHariKerja}</td>
                    <td>${row.hadir}</td>
                    <td>${row.tepatWaktu}</td>
                    <td>${row.terlambat}</td>
                    <td>${row.totalLateMinutes ?? 0}</td>
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
                  <th style="width: 90px;">NIY</th>
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
              body { padding: 20px; font-size: 11px; color: #1e293b; }
              .header { margin-bottom: 20px; border-bottom: 3px double #003366; padding-bottom: 14px; display: flex; align-items: center; justify-content: center; gap: 16px; }
              .logo-box { width: 62px; height: 62px; border: 2px solid #003366; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #003366; font-weight: bold; font-size: 12px; }
              .logo-img { max-height: 62px; max-width: 62px; object-fit: contain; }
              .header-text { text-align: center; }
              .org-name { font-size: 15px; font-weight: bold; color: #003366; letter-spacing: 0.5px; }
              .unit-name { font-size: 13px; font-weight: bold; color: #1e293b; margin-top: 2px; }
              .address { font-size: 9.5px; color: #64748b; margin-top: 3px; }
              .title { font-size: 14px; font-weight: bold; margin: 18px 0 10px; text-align: center; text-transform: uppercase; color: #003366; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10.5px; }
              .info-label { font-weight: bold; color: #334155; }
              table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 9.5px; }
              th, td { border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; }
              th { background: #003366; color: white; font-weight: bold; }
              tr:nth-child(even) td { background: #f8fafc; }
              td:first-child, td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: left; padding-left: 8px; }
              .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10.5px; }
              .footer div { text-align: center; width: 45%; }
              .sign-line { border-top: 1px solid #000; margin: 50px 0 8px; }
              .footer-title { font-weight: bold; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
              @page { margin: 12mm; size: landscape; }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo Unit" class="logo-img" />` : `<div class="logo-box">ATTIN</div>`}
              <div class="header-text">
                <div class="org-name">${yayasanInfo.nama.toUpperCase()}</div>
                <div class="unit-name">${unitDisplay.toUpperCase()}</div>
                <div class="address">${yayasanInfo.alamat} • Telp/WA: ${yayasanInfo.kontak} • Email: ${yayasanInfo.email}</div>
              </div>
            </div>
            <div class="title">${reportTitle.toUpperCase()} PEGAWAI</div>
            <div class="info-row"><span class="info-label">Unit Laporan:</span> <span>${unitDisplay}</span></div>
            <div class="info-row"><span class="info-label">Periode Laporan:</span> <span>${periodDisplay}</span></div>
            <div class="info-row"><span class="info-label">Tanggal Cetak:</span> <span>${dateStr}</span></div>
            <div class="info-row"><span class="info-label">Jam Kerja Global:</span> <span>${ringkasanJamKerja}</span></div>
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
            exportPresensiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory, { period })
          } else {
            exportCutiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory)
          }
        } else {
          if (reportType === 'presensi') {
            exportPresensiToExcel(data, unitLabel, periodLabel, yayasanInfo, signatory, { period })
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
          exportPresensiToPDF(data, unitLabel, periodLabel, yayasanInfo, signatory, { period })
        } else {
          exportPresensiToExcel(data, unitLabel, periodLabel, yayasanInfo, signatory, { period })
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
    const logoUrl = getLogoForUnit(unit, yayasanInfo)

    let tableHtml = ''
    let footerHtml = ''
    
    if (reportType === 'presensi') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 24px;">No</th>
              <th style="width: 150px;">Nama Pegawai</th>
              <th style="width: 84px;">NIY</th>
              <th style="width: 110px;">Unit</th>
              <th style="width: 84px;">Periode Rekap</th>
              <th style="width: 110px;">Jam Kerja</th>
              <th style="width: 44px;">Hari Kerja</th>
              <th style="width: 40px;">Hadir</th>
              <th style="width: 48px;">Tepat</th>
              <th style="width: 52px;">Terlambat</th>
              <th style="width: 44px;">Telat (mnt)</th>
              <th style="width: 52px;">Izin/Sakit</th>
              <th style="width: 40px;">Alpha</th>
              <th style="width: 88px;">% Kehadiran</th>
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
                <td>${row.jamKerja || '-'}</td>
                <td>${row.totalHariKerja}</td>
                <td>${row.hadir}</td>
                <td>${row.tepatWaktu}</td>
                <td>${row.terlambat}</td>
                <td>${row.totalLateMinutes ?? 0}</td>
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
              <th style="width: 90px;">NIY</th>
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
          body { padding: 20px; font-size: 11px; color: #1e293b; }
          .header { margin-bottom: 20px; border-bottom: 3px double #003366; padding-bottom: 14px; display: flex; align-items: center; justify-content: center; gap: 16px; }
          .logo-box { width: 62px; height: 62px; border: 2px solid #003366; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #003366; font-weight: bold; font-size: 12px; }
          .logo-img { max-height: 62px; max-width: 62px; object-fit: contain; }
          .header-text { text-align: center; }
          .org-name { font-size: 15px; font-weight: bold; color: #003366; letter-spacing: 0.5px; }
          .unit-name { font-size: 13px; font-weight: bold; color: #1e293b; margin-top: 2px; }
          .address { font-size: 9.5px; color: #64748b; margin-top: 3px; }
          .title { font-size: 14px; font-weight: bold; margin: 18px 0 10px; text-align: center; text-transform: uppercase; color: #003366; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10.5px; }
          .info-label { font-weight: bold; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 9.5px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; }
          th { background: #003366; color: white; font-weight: bold; }
          tr:nth-child(even) td { background: #f8fafc; }
          td:first-child, td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: left; padding-left: 8px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10.5px; }
          .footer div { text-align: center; width: 45%; }
          .sign-line { border-top: 1px solid #000; margin: 50px 0 8px; }
          .footer-title { font-weight: bold; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
          @page { margin: 12mm; size: landscape; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo Unit" class="logo-img" />` : `<div class="logo-box">ATTIN</div>`}
          <div class="header-text">
            <div class="org-name">${yayasanInfo.nama.toUpperCase()}</div>
            <div class="unit-name">${unitDisplay.toUpperCase()}</div>
            <div class="address">${yayasanInfo.alamat} • Telp/WA: ${yayasanInfo.kontak} • Email: ${yayasanInfo.email}</div>
          </div>
        </div>
        <div class="title">${reportTitle.toUpperCase()} PEGAWAI</div>
        <div class="info-row"><span class="info-label">Unit Laporan:</span> <span>${unitDisplay}</span></div>
        <div class="info-row"><span class="info-label">Periode Laporan:</span> <span>${periodDisplay}</span></div>
        <div class="info-row"><span class="info-label">Tanggal Cetak:</span> <span>${dateStr}</span></div>
        <div class="info-row"><span class="info-label">Jam Kerja Global:</span> <span>${ringkasanJamKerja}</span></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setShowReportSettings(false)}>
          <div className="w-full max-w-md max-h-[90vh] bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <span className="material-symbols-outlined text-[18px] leading-none">
                    {reportSettings.format === 'print' ? 'print' : reportSettings.format === 'excel' ? 'table_view' : 'picture_as_pdf'}
                  </span>
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {reportSettings.format === 'print' ? 'Filter & Cetak Laporan' : `Filter & Unduh Rekap (${reportSettings.format === 'excel' ? 'Excel' : 'PDF'})`}
                </h3>
              </div>
              <button onClick={() => setShowReportSettings(false)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" aria-label="Tutup">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-5 md:p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Jenis Laporan</label>
                  <div className="flex gap-2.5">
                    <label className={`flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${reportSettings.reportType === 'presensi' ? 'bg-primary/10 border-primary text-primary font-semibold' : 'border-border bg-muted/30 hover:bg-muted/60 text-foreground'}`}>
                      <input type="radio" name="reportType" value="presensi" checked={reportSettings.reportType === 'presensi'} onChange={(e) => setReportSettings(prev => ({...prev, reportType: e.target.value}))} className="text-primary focus:ring-ring" />
                      <span className="text-xs font-medium">Rekap Presensi</span>
                    </label>
                    <label className={`flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${reportSettings.reportType === 'cuti' ? 'bg-primary/10 border-primary text-primary font-semibold' : 'border-border bg-muted/30 hover:bg-muted/60 text-foreground'}`}>
                      <input type="radio" name="reportType" value="cuti" checked={reportSettings.reportType === 'cuti'} onChange={(e) => setReportSettings(prev => ({...prev, reportType: e.target.value}))} className="text-primary focus:ring-ring" />
                      <span className="text-xs font-medium">Rekap Cuti / Izin</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Periode Laporan</label>
                  <select value={reportSettings.period} onChange={(e) => setReportSettings(prev => ({...prev, period: e.target.value}))} className="w-full h-9 px-3 bg-card border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring">
                    {periods.map(p => <option key={p} value={p}>{getPeriodDisplayLabel(p)}</option>)}
                    <option value="custom">Rentang Tanggal Custom</option>
                  </select>
                </div>
                {reportSettings.period === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tanggal Mulai</label>
                      <input type="date" value={reportSettings.customStartDate} onChange={(e) => setReportSettings(prev => ({...prev, customStartDate: e.target.value}))} className="w-full h-9 px-3 bg-card border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tanggal Selesai</label>
                      <input type="date" value={reportSettings.customEndDate} onChange={(e) => setReportSettings(prev => ({...prev, customEndDate: e.target.value}))} className="w-full h-9 px-3 bg-card border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unit Sekolah</label>
                  <select value={reportSettings.unit} onChange={(e) => setReportSettings(prev => ({...prev, unit: e.target.value}))} className="w-full h-9 px-3 bg-card border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring">
                    {canSwitchUnit && <option value="all">Semua Unit Sekolah</option>}
                    {state.units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Format Output / Tindakan</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`flex flex-col items-center justify-center gap-1 cursor-pointer p-2.5 rounded-xl border text-center transition-all ${reportSettings.format === 'excel' ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs' : 'border-border bg-muted/30 hover:bg-muted text-foreground'}`}>
                      <input type="radio" name="format" value="excel" checked={reportSettings.format === 'excel'} onChange={(e) => setReportSettings(prev => ({...prev, format: e.target.value}))} className="sr-only" />
                      <span className="material-symbols-outlined text-[20px] text-emerald-600">table_view</span>
                      <span className="text-[11px] font-medium leading-tight">Excel (.xlsx)</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center gap-1 cursor-pointer p-2.5 rounded-xl border text-center transition-all ${reportSettings.format === 'pdf' ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs' : 'border-border bg-muted/30 hover:bg-muted text-foreground'}`}>
                      <input type="radio" name="format" value="pdf" checked={reportSettings.format === 'pdf'} onChange={(e) => setReportSettings(prev => ({...prev, format: e.target.value}))} className="sr-only" />
                      <span className="material-symbols-outlined text-[20px] text-rose-600">picture_as_pdf</span>
                      <span className="text-[11px] font-medium leading-tight">PDF Document</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center gap-1 cursor-pointer p-2.5 rounded-xl border text-center transition-all ${reportSettings.format === 'print' ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs' : 'border-border bg-muted/30 hover:bg-muted text-foreground'}`}>
                      <input type="radio" name="format" value="print" checked={reportSettings.format === 'print'} onChange={(e) => setReportSettings(prev => ({...prev, format: e.target.value}))} className="sr-only" />
                      <span className="material-symbols-outlined text-[20px] text-primary">print</span>
                      <span className="text-[11px] font-medium leading-tight">Cetak (Print)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-5 border-t border-border bg-muted/30 flex gap-2.5 justify-end">
              <button onClick={() => setShowReportSettings(false)} className="h-9 px-3.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted font-semibold text-xs shadow-xs transition-colors cursor-pointer">Batal</button>
              <button onClick={() => handleReportAction(reportSettings.format === 'print' ? 'print' : 'download')} disabled={isExporting} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5">
                {isExporting ? (
                  <span>Memproses...</span>
                ) : reportSettings.format === 'print' ? (
                  <>
                    <span className="material-symbols-outlined text-[16px]">print</span>
                    <span>Buka Cetak Laporan</span>
                  </>
                ) : reportSettings.format === 'excel' ? (
                  <>
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download Rekap Excel</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download Rekap PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <span className="material-symbols-outlined text-[20px] leading-none">bar_chart</span>
              </span>
              Rekap & Laporan
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Analisis komprehensif kehadiran, kepatuhan jam kerja, dan ekspor laporan berkala seluruh unit sekolah.</p>
          </div>
          <div className="flex items-center self-start md:self-auto bg-muted/40 border border-border px-3 py-1.5 rounded-lg shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-[15px] text-muted-foreground">home</span>
              <span>Home</span>
              <span className="text-muted-foreground/40">/</span>
              <span>Laporan</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-primary font-semibold">Rekap & Laporan Kehadiran</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-3.5 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex p-1 bg-muted rounded-lg gap-1 border border-border/60">
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => setActivePeriod(period)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activePeriod === period ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  type="button"
                >
                  {period}
                </button>
              ))}
            </div>
            <div className="relative flex items-center bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-muted-foreground mr-1.5">calendar_today</span>
              <span>{getPeriodLabel(activePeriod)}</span>
            </div>
            {canSwitchUnit ? (
              <div className="relative" onMouseLeave={() => setShowUnitDropdown(false)}>
                <button
                  onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  className="flex items-center gap-1.5 h-8.5 px-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer text-xs font-medium text-foreground shadow-2xs"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground">domain</span>
                  <span>{unitLabel}</span>
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground">{showUnitDropdown ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showUnitDropdown && (
                  <div className="absolute left-0 top-full mt-1.5 min-w-[220px] bg-popover rounded-xl shadow-lg border border-border py-1.5 z-50 animate-fade-in text-popover-foreground">
                    {unitOptions.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { dispatch({ type: 'SET_SELECTED_UNIT', payload: u.id }); setShowUnitDropdown(false); }}
                        className={`w-full px-3.5 py-2 text-left text-xs transition-colors cursor-pointer ${selectedUnit === u.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}
                        type="button"
                      >
                        {u.nama}
                      </button>
                    ))}
                    <hr className="my-1 border-border/60" />
                    <button
                      onClick={() => { dispatch({ type: 'SET_SELECTED_UNIT', payload: ALL_UNITS }); setShowUnitDropdown(false); }}
                      className={`w-full px-3.5 py-2 text-left text-xs transition-colors cursor-pointer ${selectedUnit === ALL_UNITS ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}
                      type="button"
                    >
                      Semua Unit ({state.units.length} Unit)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 h-8.5 px-3 bg-muted border border-border rounded-lg cursor-not-allowed text-xs font-medium text-muted-foreground" title="Unit mengikuti akun Anda">
                <span className="material-symbols-outlined text-[16px] text-muted-foreground">domain</span>
                <span>{unitLabel}</span>
                <span className="material-symbols-outlined text-[14px] text-muted-foreground">lock</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setReportSettings({
                  reportType: 'presensi',
                  period: activePeriod,
                  unit: selectedUnit === ALL_UNITS ? 'all' : selectedUnit,
                  format: 'excel',
                  customStartDate: '',
                  customEndDate: ''
                })
                setShowReportSettings(true)
              }}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download Rekap Presensi</span>
            </button>
            <button
              onClick={() => {
                setReportSettings({
                  reportType: 'cuti',
                  period: activePeriod,
                  unit: selectedUnit === ALL_UNITS ? 'all' : selectedUnit,
                  format: 'excel',
                  customStartDate: '',
                  customEndDate: ''
                })
                setShowReportSettings(true)
              }}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download Rekap Cuti/Izin</span>
            </button>
            <button
              onClick={() => {
                setReportSettings(prev => ({
                  ...prev,
                  period: activePeriod,
                  unit: selectedUnit === ALL_UNITS ? 'all' : selectedUnit,
                  format: 'print'
                }))
                setShowReportSettings(true)
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Cetak</span>
            </button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Tren Kehadiran & Kepatuhan Jam Kerja</h2>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">{kepatuhanChart.kepatuhan}% Rata-rata</span>
              </div>
              <span className="text-xs text-muted-foreground">Periode {getPeriodLabel(activePeriod)} ({unitLabel})</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                <span>Hadir Tepat Waktu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                <span>Terlambat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-primary"></span>
                <span>Izin/Sakit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-destructive"></span>
                <span>Alpha</span>
              </div>
            </div>
          </div>

          <div className="relative w-full pt-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-muted-foreground text-[11px] font-mono">
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">100%</span>
                <div className="flex-1 h-px bg-border/60"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">75%</span>
                <div className="flex-1 h-px bg-border/60"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">50%</span>
                <div className="flex-1 h-px bg-border/60"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">25%</span>
                <div className="flex-1 h-px bg-border/60"></div>
              </div>
              <div className="flex items-center w-full">
                <span className="w-9 text-right pr-2">0%</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>
            </div>

            <div className="relative ml-9 h-56 flex items-end justify-between gap-1.5 sm:gap-3 overflow-x-auto pt-2 pb-8">
              {chartData.map((d) => (
                <div key={d.day} className={`group flex flex-col items-center flex-1 min-w-[28px] h-full justify-end ${d.weekend ? 'opacity-40' : ''} cursor-pointer`}>
                  <div className={`w-full max-w-[24px] rounded-t-sm bg-muted flex flex-col-reverse overflow-hidden shadow-xs group-hover:opacity-90 transition-opacity ${d.current ? 'ring-2 ring-primary/40' : ''}`} style={{ height: `${Math.min(100, d.hadir + d.terlambat + d.izin + d.alpha)}%` }}>
                    <div className="w-full bg-emerald-500" style={{ height: `${d.hadir}%` }}></div>
                    <div className="w-full bg-amber-500" style={{ height: `${d.terlambat}%` }}></div>
                    {d.izin > 0 && <div className="w-full bg-primary" style={{ height: `${d.izin}%` }}></div>}
                    {d.alpha > 0 && <div className="w-full bg-destructive" style={{ height: `${d.alpha}%` }}></div>}
                  </div>
                  <span className={`absolute -bottom-1 text-[11px] ${d.weekend ? 'text-muted-foreground/60' : d.current ? 'font-bold text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-card border border-border/80 flex items-center justify-center text-primary shadow-xs">
                <span className="material-symbols-outlined text-[18px]">groups</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Pegawai</span>
                <span className="text-base font-bold text-foreground leading-snug">{summary.totalPegawai.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-card border border-border/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hadir</span>
                <span className="text-base font-bold text-foreground leading-snug">{summary.hadir.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-card border border-border/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Terlambat</span>
                <span className="text-base font-bold text-foreground leading-snug">{summary.terlambat.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-card border border-border/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">% Kehadiran</span>
                <span className="text-base font-bold text-primary leading-snug">{summary.persentaseKehadiran}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-card border border-border/80 flex items-center justify-center text-primary shadow-xs">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Jam Kerja</span>
                <span className="text-sm font-bold text-foreground leading-snug">{(summary.hadir * 8).toLocaleString()} <span className="text-xs text-muted-foreground font-normal">Jam</span></span>
              </div>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-card border border-border/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">history_toggle_off</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rata-rata Keterlambatan</span>
                <span className="text-sm font-bold text-foreground leading-snug">{(summary.terlambat > 0 ? (chartData.reduce((s, d) => s + d.terlambat, 0) / Math.max(chartData.filter(d => d.terlambat > 0).length, 1)).toFixed(1) : '0.0')} <span className="text-xs text-muted-foreground font-normal">Menit / staf</span></span>
              </div>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-card border border-border/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tingkat Kepatuhan Jadwal</span>
                <span className="text-sm font-bold text-foreground leading-snug">{kepatuhanChart.kepatuhan}% <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">+1.2%</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-foreground">Laporan Rekap Kehadiran Pegawai</h3>
              <span className="text-xs text-muted-foreground">Menampilkan {paginatedData.length} dari {filteredData.length} pegawai • Periode {getPeriodLabel(activePeriod)}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
                <input
                  className="w-full h-9 pl-9 pr-3 bg-card border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                  placeholder="Cari nama, NIY, unit..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="h-9 px-3 bg-card border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
                <option value={100}>100 / halaman</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="sp-table-wrap">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '40px' }}>No</th>
                    <th className="py-3 px-3.5" scope="col" style={{ width: '200px', minWidth: '160px' }}>
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">Nama Pegawai {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5" scope="col" style={{ width: '110px', minWidth: '100px' }}>
                      <button onClick={() => handleSort('niy')} className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">NIY {sortConfig.key === 'niy' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5" scope="col" style={{ width: '120px', minWidth: '100px' }}>
                      <button onClick={() => handleSort('unit')} className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">Unit {sortConfig.key === 'unit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5 text-center hidden sm:table-cell" scope="col" style={{ width: '90px' }}>Periode</th>
                    <th className="py-3 px-3.5 text-center hidden md:table-cell" scope="col" style={{ width: '70px' }}>
                      <button onClick={() => handleSort('totalHariKerja')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">Hari Kerja {sortConfig.key === 'totalHariKerja' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '60px' }}>
                      <button onClick={() => handleSort('hadir')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">Hadir {sortConfig.key === 'hadir' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5 text-center hidden md:table-cell" scope="col" style={{ width: '70px' }}>
                      <button onClick={() => handleSort('tepatWaktu')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">Tepat {sortConfig.key === 'tepatWaktu' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '70px' }}>
                      <button onClick={() => handleSort('terlambat')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">Terlambat {sortConfig.key === 'terlambat' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5 text-center hidden lg:table-cell" scope="col" style={{ width: '70px' }}>
                      <button onClick={() => handleSort('izinSakit')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">Izin/Sakit {sortConfig.key === 'izinSakit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5 text-center hidden lg:table-cell" scope="col" style={{ width: '60px' }}>
                      <button onClick={() => handleSort('alpha')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">Alpha {sortConfig.key === 'alpha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '80px' }}>
                      <button onClick={() => handleSort('persentaseKehadiran')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">% Kehadiran {sortConfig.key === 'persentaseKehadiran' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</button>
                    </th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '100px' }}>Status</th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '44px' }}>Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedData.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3.5 text-center font-mono text-[11px] text-muted-foreground">{row.no}</td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {row.initials}
                          </div>
                          <span className="font-semibold text-foreground truncate">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs text-muted-foreground">{row.niy}</td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-secondary border border-border/50 text-secondary-foreground font-medium text-[11px] whitespace-nowrap">{row.unit}</span>
                      </td>
                      <td className="py-3 px-3.5 text-center hidden sm:table-cell text-xs text-muted-foreground">{row.periode}</td>
                      <td className="py-3 px-3.5 text-center hidden md:table-cell font-semibold text-foreground">{row.totalHariKerja}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{row.hadir}</td>
                      <td className="py-3 px-3.5 text-center hidden md:table-cell text-muted-foreground">{row.tepatWaktu}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-amber-600 dark:text-amber-400">{row.terlambat}</td>
                      <td className="py-3 px-3.5 text-center hidden lg:table-cell text-primary font-semibold">{row.izinSakit}</td>
                      <td className="py-3 px-3.5 text-center hidden lg:table-cell text-destructive font-semibold">{row.alpha}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-primary">{row.persentaseKehadiran}%</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusStyles[row.statusType]}`}>{row.status}</span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={() => { setSelectedEmployee(row); setShowDetail(true); }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted border border-transparent hover:border-border transition-colors cursor-pointer"
                          aria-label={`Detail ${row.name}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-muted-foreground">Tidak ada data pegawai</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="hidden lg:block bg-muted/30 px-4 py-2 text-right border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                Kolom tersembunyi di mobile: Periode, Hari Kerja, Tepat Waktu, Izin/Sakit, Alpha
              </span>
            </div>
          </div>

          <div className="p-4 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Menampilkan <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, filteredData.length)}</span> dari <span className="font-semibold text-primary">{filteredData.length}</span> pegawai
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-secondary border border-border/50 text-secondary-foreground text-[11px] font-medium">
                {totalPages} halaman
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                aria-label="Halaman sebelumnya"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
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
                    className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                    }`}
                    type="button"
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 5 && currentPage > 3 && (
                <span className="w-8 h-8 flex items-center justify-center text-muted-foreground">...</span>
              )}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="w-8 h-8 flex items-center justify-center text-muted-foreground">...</span>
              )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                aria-label="Halaman berikutnya"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TABEL LAPORAN REKAP IZIN/CUTI GURU DAN PEGAWAI                    */}
        {/* ================================================================= */}
        <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">Laporan Rekap Izin/Cuti Guru dan Pegawai</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {cutiSummary.total} Total
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  {cutiSummary.menunggu} Menunggu
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  {cutiSummary.disetujui} Disetujui
                </span>
                {cutiSummary.ditolak > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                    {cutiSummary.ditolak} Ditolak
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Menampilkan {paginatedCutiData.length} dari {filteredCutiData.length} data pengajuan izin &amp; cuti • {selectedUnit === ALL_UNITS ? 'Semua Unit Sekolah' : unitLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Cuti */}
              <div className="relative w-full sm:w-56">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
                <input
                  className="w-full h-9 pl-9 pr-3 bg-card border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                  placeholder="Cari guru, NIY, izin/cuti..."
                  type="text"
                  value={cutiSearch}
                  onChange={(e) => setCutiSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select
                value={cutiStatusFilter}
                onChange={(e) => setCutiStatusFilter(e.target.value)}
                className="h-9 px-3 bg-card border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring"
              >
                <option value="Semua Status">Semua Status</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
              </select>

              {/* Jenis Filter */}
              <select
                value={cutiJenisFilter}
                onChange={(e) => setCutiJenisFilter(e.target.value)}
                className="h-9 px-3 bg-card border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring"
              >
                <option value="Semua Jenis">Semua Jenis</option>
                <option value="Semua Cuti">Kelompok Cuti</option>
                <option value="Semua Izin">Kelompok Izin</option>
                <option value="Cuti Tahunan">Cuti Tahunan</option>
                <option value="Cuti Sakit">Cuti Sakit</option>
                <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                <option value="Izin Pribadi">Izin Pribadi</option>
                <option value="Izin Dinas">Izin Dinas</option>
              </select>

              {/* Page Size */}
              <select
                value={cutiPageSize}
                onChange={(e) => { setCutiPageSize(Number(e.target.value)); setCutiCurrentPage(1); }}
                className="h-9 px-3 bg-card border border-input rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring"
              >
                <option value={10}>10 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
              </select>

              {/* Tombol Export Rekap Cuti */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDirectDownload('cuti', 'excel')}
                  disabled={isExporting}
                  className="h-9 px-2.5 rounded-lg bg-card border border-input hover:bg-muted text-foreground font-semibold text-xs inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  title="Unduh Rekap Cuti Excel (.xlsx)"
                >
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">table_view</span>
                  <span className="hidden md:inline">Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectDownload('cuti', 'pdf')}
                  disabled={isExporting}
                  className="h-9 px-2.5 rounded-lg bg-card border border-input hover:bg-muted text-foreground font-semibold text-xs inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  title="Unduh Rekap Cuti PDF"
                >
                  <span className="material-symbols-outlined text-[16px] text-rose-600">picture_as_pdf</span>
                  <span className="hidden md:inline">PDF</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="sp-table-wrap">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '40px' }}>No</th>
                    <th className="py-3 px-3.5" scope="col" style={{ width: '220px', minWidth: '180px' }}>
                      <button onClick={() => handleCutiSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">
                        Nama Guru / Pegawai {cutiSortConfig.key === 'name' && (cutiSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="py-3 px-3.5" scope="col" style={{ width: '130px', minWidth: '110px' }}>
                      <button onClick={() => handleCutiSort('unitName')} className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">
                        Unit {cutiSortConfig.key === 'unitName' && (cutiSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="py-3 px-3.5" scope="col" style={{ width: '140px', minWidth: '120px' }}>
                      <button onClick={() => handleCutiSort('jenis')} className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">
                        Jenis Izin/Cuti {cutiSortConfig.key === 'jenis' && (cutiSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '130px', minWidth: '110px' }}>
                      <button onClick={() => handleCutiSort('periode')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">
                        Periode / Tanggal {cutiSortConfig.key === 'periode' && (cutiSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '80px' }}>
                      <button onClick={() => handleCutiSort('durasi')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer">
                        Durasi {cutiSortConfig.key === 'durasi' && (cutiSortConfig.direction === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="py-3 px-3.5" scope="col" style={{ minWidth: '160px' }}>
                      Keterangan / Alasan
                    </th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '120px' }}>Lampiran</th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '110px' }}>Status</th>
                    <th className="py-3 px-3.5 text-center" scope="col" style={{ width: '50px' }}>Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedCutiData.map((row, idx) => {
                    const initials = initialsOf(row.name)
                    const statusClass = row.status === 'Disetujui'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : row.status === 'Ditolak'
                        ? 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    const statusDot = row.status === 'Disetujui'
                      ? 'bg-emerald-500'
                      : row.status === 'Ditolak'
                        ? 'bg-rose-500'
                        : 'bg-amber-500 animate-pulse'
                    const alasanTeks = row.keterangan || row.alasan || '-'

                    return (
                      <tr key={row.id || idx} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3.5 text-center font-mono text-[11px] text-muted-foreground">
                          {(cutiCurrentPage - 1) * cutiPageSize + idx + 1}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${warnaAvatarJenis(row.jenis)} border border-border/60`}>
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0 overflow-hidden leading-tight">
                              <span className="font-semibold text-foreground truncate block">{row.name}</span>
                              <span className="text-[10.5px] text-muted-foreground font-mono truncate block mt-0.5">
                                {row.niy} {row.role ? `• ${row.role}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-secondary border border-border/50 text-secondary-foreground font-medium text-[11px] whitespace-nowrap">
                            {row.unitName || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${warnaJenis(row.jenis)} border border-border/50 whitespace-nowrap`}>
                            {row.jenis}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono text-xs text-foreground/90 whitespace-nowrap">
                          {row.periode || '-'}
                        </td>
                        <td className="py-3 px-3.5 text-center font-semibold text-primary whitespace-nowrap">
                          {row.durasi || '-'}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="text-muted-foreground line-clamp-1 max-w-[240px] block" title={alasanTeks}>
                            {alasanTeks}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {row.lampiran && row.lampiran !== '-' ? (
                            <button
                              type="button"
                              onClick={() => { setSelectedLeave(row); setShowLeaveDetail(true); }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/50 transition-colors text-[11px] font-medium cursor-pointer max-w-[110px] mx-auto"
                              title={row.lampiran}
                            >
                              <span className="material-symbols-outlined text-[13px] flex-shrink-0">attach_file</span>
                              <span className="truncate block">{row.lampiran}</span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${statusClass} whitespace-nowrap`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot} flex-shrink-0`} />
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => { setSelectedLeave(row); setShowLeaveDetail(true); }}
                            className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted border border-transparent hover:border-border transition-colors cursor-pointer"
                            aria-label={`Detail ${row.name}`}
                            title="Lihat Detail Izin/Cuti"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {paginatedCutiData.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        Tidak ada data pengajuan izin/cuti yang sesuai dengan filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Menampilkan <span className="font-semibold text-foreground">{filteredCutiData.length === 0 ? 0 : (cutiCurrentPage - 1) * cutiPageSize + 1}</span>–<span className="font-semibold text-foreground">{Math.min(cutiCurrentPage * cutiPageSize, filteredCutiData.length)}</span> dari <span className="font-semibold text-primary">{filteredCutiData.length}</span> pengajuan
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-secondary border border-border/50 text-secondary-foreground text-[11px] font-medium">
                {totalCutiPages} halaman
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCutiCurrentPage(p => Math.max(1, p - 1))}
                disabled={cutiCurrentPage === 1}
                className="w-8 h-8 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                aria-label="Halaman sebelumnya"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, totalCutiPages) }, (_, i) => {
                let pageNum
                if (totalCutiPages <= 5) pageNum = i + 1
                else if (cutiCurrentPage <= 3) pageNum = i + 1
                else if (cutiCurrentPage >= totalCutiPages - 2) pageNum = totalCutiPages - 4 + i
                else pageNum = cutiCurrentPage - 2 + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCutiCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                      cutiCurrentPage === pageNum
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                    }`}
                    type="button"
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalCutiPages > 5 && cutiCurrentPage > 3 && (
                <span className="w-8 h-8 flex items-center justify-center text-muted-foreground">...</span>
              )}
              {totalCutiPages > 5 && cutiCurrentPage < totalCutiPages - 2 && (
                <span className="w-8 h-8 flex items-center justify-center text-muted-foreground">...</span>
              )}
              <button
                onClick={() => setCutiCurrentPage(p => Math.min(totalCutiPages, p + 1))}
                disabled={cutiCurrentPage === totalCutiPages}
                className="w-8 h-8 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                aria-label="Halaman berikutnya"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
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

      <LeaveDetailModal
        isOpen={showLeaveDetail}
        onClose={() => { setShowLeaveDetail(false); setSelectedLeave(null); }}
        leave={selectedLeave}
      />
    </div>
  )
}

export default RekapLaporanPage