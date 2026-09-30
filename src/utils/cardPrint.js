// Ekspor Kartu ID ke PDF (jsPDF), menggambar ulang wajah kartu yang sama
// dengan yang tampil di layar.
//
// Menggambar vektor (bukan screenshot) disengaja: barcode, QR, teks, dan
// garis tetap tajam pada skala apa pun, ukuran kartu benar-benar 85.60 x
// 53.98 mm, dan printer kartu direct-to-card bisa langsung dicetak tanpa
// penskalaan. Setiap modul QR digambar sebagai persegi panjang tersendiri,
// sehingga "resolusi" QR di PDF tidak terbatas — bukan gambar 72 dpi.

import { jsPDF } from 'jspdf'
import { encodeQrMatrix, QR_QUIET_ZONE } from './qrcode.js'
import { toBarRuns, BARCODE_QUIET_MODULES } from './barcode.js'
import {
  cardPhotoOf, formatDateID, CARD_QR_PREFIX_LABEL, CARD_SIZE_MM, CARD_GEOMETRY,
  EM_PER_WIDTH, printLayoutByValue, shortUnitCode,
} from '../data/employeeCard.js'

const COLORS = {
  navy: [11, 31, 61],
  blue: [0, 81, 213],
  white: [255, 255, 255],
  light: [242, 244, 247], // dipakai untuk isian foto tanpa foto (fallback)
  border: [197, 198, 206],
  text: [25, 28, 30],
  muted: [68, 71, 78],
  outline: [117, 119, 126],
  amber: [180, 83, 9],
  status: {
    Tetap: [209, 250, 229],
    Kontrak: [224, 242, 254],
    Honorer: [254, 243, 199],
  },
}

// Skala tipografi: kartu CR80 lebarnya EM_PER_WIDTH "em" (lihat EmployeeIdCard).
const toPt = (mm) => mm * 2.834645669

// Nama berkas tetap supaya hasil unduh bisa langsung dipakai untuk arsip/
// nomor poli (Kartu_ID_Pegawai_Attin_Indonesia.pdf).
export const DEFAULT_PDF_FILE_NAME = 'Kartu_ID_Pegawai_Attin_Indonesia.pdf'

function statusFill(statusGroup) {
  return COLORS.status[statusGroup] || COLORS.status.Tetap
}

function statusTextColor(statusGroup) {
  if (statusGroup === 'Kontrak') return [3, 105, 161]
  if (statusGroup === 'Honorer') return [146, 64, 14]
  if (statusGroup === 'Tetap') return [4, 120, 87]
  return COLORS.muted
}

function roundedRectWithSquareEdge(doc, x, y, w, h, radius, squareEdge) {
  // roundedRect lalu ditutuppersegi di sisi yang menempel kartu agar sambungan
  // header/footer terlihat rapi.
  doc.roundedRect(x, y, w, h, radius, radius, 'F')
  if (squareEdge === 'bottom') doc.rect(x, y + h - radius, w, radius, 'F')
  if (squareEdge === 'top') doc.rect(x, y, w, radius, 'F')
}

function drawText(doc, text, x, y, { size, color = COLORS.text, font = 'helvetica', style = 'normal', align = 'left' } = {}) {
  if (text === null || text === undefined || text === '') return
  doc.setFont(font, style)
  doc.setFontSize(toPt(size))
  doc.setTextColor(color[0], color[1], color[2])
  doc.text(String(text), x, y, { align, baseline: 'middle' })
}

/**
 * QR sebagai vektor: satu persegi panjang filled per modul gelap.
 *
 * `size` adalah sisi LUAR QR (termasuk quiet zone 4 modul), sama persis dengan
 * kotak yang dirender di DOM. Menggambar background putih dulu memastikan
 * zona tenang ikut tercetak — tanpa itu pemindai bisa gagal membaca kartu
 * yang dicetak di atas kertas berwarna.
 */
function drawQr(doc, value, x, y, size) {
  const matrix = encodeQrMatrix(value)
  if (!matrix) return
  const total = matrix.size + QR_QUIET_ZONE * 2
  const module = size / total
  doc.setFillColor(255, 255, 255)
  doc.rect(x, y, size, size, 'F')
  doc.setFillColor(0, 0, 0)
  const offset = QR_QUIET_ZONE * module
  for (let row = 0; row < matrix.size; row++) {
    let runStart = -1
    for (let col = 0; col <= matrix.size; col++) {
      const dark = col < matrix.size && matrix.modules[row][col] === 1
      if (dark && runStart === -1) runStart = col
      if (!dark && runStart !== -1) {
        // Modul darkness digabung per baris supaya jumlah perintah gambar
        // (dan ukuran berkas) tetap ramping.
        doc.rect(x + offset + runStart * module, y + offset + row * module, (col - runStart) * module, module, 'F')
        runStart = -1
      }
    }
  }
}

/**
 * Barcode 1D sebagai vektor. `width` adalah lebar kotak luar termasuk quiet
 * zone 10 modul, sama seperti pada komponen <BarcodeSvg>.
 */
function drawBarcode(doc, value, x, y, width, height) {
  const { runs, totalWidth, ok } = toBarRuns(value)
  if (!ok || totalWidth === 0) return
  const viewWidth = totalWidth + BARCODE_QUIET_MODULES * 2
  const unit = width / viewWidth
  doc.setFillColor(255, 255, 255)
  doc.rect(x, y, width, height, 'F')
  doc.setFillColor(11, 31, 61)
  let offset = BARCODE_QUIET_MODULES
  for (const run of runs) {
    if (run.bar) doc.rect(x + offset * unit, y, run.width * unit, height, 'F')
    offset += run.width
  }
}

function initialsOf(name) {
  const parts = String(name || '').split(/[\s,]+/).filter(Boolean)
  return (parts.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase()
}

/**
 * Gambar satu kartu lengkap pada koordinat (x, y) dengan lebar `width` mm.
 *
 * Tinggi otomatis mengikuti rasio CR80. Seluruh ukuran diturunkan dari
 * CARD_GEOMETRY — sama persis dengan yang dipakai kartu di DOM — sehingga
 * berkas PDF yang diunduh identik dengan hasil "Cetak Terpilih".
 */
function drawCard(doc, row, settings, unit, { x, y, width, photoDataUrl }) {
  const G = CARD_GEOMETRY
  const height = width * (CARD_SIZE_MM.height / CARD_SIZE_MM.width)
  const em = width / EM_PER_WIDTH
  const headerH = em * G.header
  const footerH = em * G.footer
  const padX = em * G.padX
  const bodyPadY = em * G.bodyPadY
  const gap = em * G.gap
  const radius = 1.2

  // Bodi kartu
  doc.setFillColor(...COLORS.white)
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y, width, height, radius, radius, 'FD')

  // ---- Header navy: logo + nama yayasan (kiri), logo + unit (kanan) ----
  doc.setFillColor(...COLORS.navy)
  roundedRectWithSquareEdge(doc, x, y, width, headerH, radius, 'bottom')

  const logo = em * G.logo
  const logoX = x + padX
  const logoY = y + (headerH - logo) / 2
  const yayasanLogo = String(settings?.logo || '').trim()
  if (yayasanLogo) {
    try {
      doc.addImage(yayasanLogo, 'AUTO', logoX, logoY, logo, logo, undefined, 'FAST')
    } catch {
      doc.setFillColor(...COLORS.white)
      doc.circle(logoX + logo / 2, logoY + logo / 2, logo / 2, 'F')
    }
  } else {
    doc.setFillColor(...COLORS.white)
    doc.circle(logoX + logo / 2, logoY + logo / 2, logo / 2, 'F')
    drawText(doc, initialsOf(settings?.namaYayasan), logoX + logo / 2, logoY + logo / 2, {
      size: em * G.headerLabel * 1.3, color: COLORS.navy, style: 'bold', align: 'center',
    })
  }

  const titleX = logoX + logo + em * 0.4
  const yayasanName = settings?.namaYayasan || 'Yayasan Pendidikan'
  drawText(doc, 'KARTU IDENTITAS PEGAWAI', titleX, logoY + logo * 0.34, {
    size: em * G.headerLabel, color: [168, 182, 213], style: 'bold',
  })
  drawText(doc, yayasanName, titleX, logoY + logo * 0.72, {
    size: em * G.headerTitle, color: COLORS.white, style: 'bold',
  })

  // Logo + nama unit
  const unitLogoX = x + width - padX - logo
  doc.setFillColor(...COLORS.blue)
  doc.circle(unitLogoX + logo / 2, logoY + logo / 2, logo / 2, 'F')
  drawText(doc, shortUnitCode(unit), unitLogoX + logo / 2, logoY + logo / 2, {
    size: em * G.headerLabel * 1.1, color: COLORS.white, style: 'bold', align: 'center',
  })
  const unitTextX = unitLogoX - em * 0.4
  drawText(doc, 'UNIT SEKOLAH', unitTextX, logoY + logo * 0.34, {
    size: em * G.headerLabel, color: [168, 182, 213], style: 'bold', align: 'right',
  })
  drawText(doc, row.unit, unitTextX, logoY + logo * 0.72, {
    size: em * G.headerUnit, color: COLORS.white, style: 'bold', align: 'right',
  })

  // ---- Body: foto + identitas | QR 22 mm ----
  const bodyTop = y + headerH
  const bodyH = height - headerH - footerH
  const bodyCenter = bodyTop + bodyH / 2

  // Foto (20.0 x 24.4 mm) + siluet bila belum ada foto.
  const photoW = em * G.photoW
  const photoH = em * G.photoH
  const badgeGap = em * G.badgeGap
  const badgeH = em * G.badge * 1.3
  const photoX = x + padX
  // Blok foto + badge disejajarkan vertikal di tengah body, sama seperti flex
  // items-center pada kartu di DOM.
  const photoBlockH = photoH + badgeGap + badgeH
  const photoY = bodyCenter - photoBlockH / 2

  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'AUTO', photoX, photoY, photoW, photoH, undefined, 'FAST')
    } catch {
      doc.setFillColor(242, 244, 247)
      doc.rect(photoX, photoY, photoW, photoH, 'F')
    }
  } else {
    // Monogram inisial + siluet, tata letak sama dengan kartu di DOM:
    // siluet di atas (kepala + bahu), inisial di bawahnya.
    doc.setFillColor(215, 227, 255)
    doc.roundedRect(photoX, photoY, photoW, photoH, 0.8, 0.8, 'F')
    const cx = photoX + photoW / 2
    doc.setFillColor(6, 27, 57)
    doc.circle(cx, photoY + em * 3.3, em * 0.95, 'F')
    doc.ellipse(cx, photoY + em * 6.6, em * 2.1, em * 1.5, 'F')
    drawText(doc, initialsOf(row.staff.name).slice(0, 2), cx, photoY + em * 9.7, {
      size: em * 1.1, color: [6, 27, 57], style: 'bold', align: 'center',
    })
  }
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(photoX, photoY, photoW, photoH, 0.8, 0.8, 'S')

  // Badge status kepegawaian
  const badgeY = photoY + photoH + badgeGap
  doc.setFillColor(...statusFill(row.statusGroup))
  doc.setDrawColor(...statusFill(row.statusGroup))
  doc.roundedRect(photoX, badgeY, photoW, badgeH, 0.5, 0.5, 'FD')
  drawText(doc, row.statusGroup, photoX + photoW / 2, badgeY + badgeH / 2, {
    size: em * G.badge, color: statusTextColor(row.statusGroup), style: 'bold', align: 'center',
  })

  // ---- Blok teks: nama (dominan) > jabatan > NIY/NIP > masa berlaku ----
  const textX = photoX + photoW + gap
  let cursor = bodyTop + bodyPadY

  cursor += em * G.name * 0.5
  drawText(doc, row.staff.name, textX, cursor, {
    size: em * G.name, color: COLORS.text, style: 'bold',
  })
  cursor += em * G.name * 1.2
  drawText(doc, row.staff.role || '-', textX, cursor, {
    size: em * G.role, color: COLORS.blue, style: 'bold',
  })
  cursor += em * G.role * 1.5

  const labelW = em * 3.5
  const idRows = [
    ['NIY', row.staff.niy || '-', em * G.niy],
    ...(row.staff.nip ? [['NIP', row.staff.nip, em * G.nip]] : []),
  ]
  for (const [label, value, size] of idRows) {
    drawText(doc, label, textX, cursor, { size, color: COLORS.outline, style: 'bold' })
    drawText(doc, value, textX + labelW, cursor, { size, color: COLORS.text, font: 'courier', style: 'bold' })
    cursor += size * 1.35
  }
  cursor += em * 0.18
  drawText(doc, `Berlaku s/d ${formatDateID(row.card.expired_date)}`, textX, cursor, {
    size: em * G.meta, color: COLORS.amber, style: 'bold',
  })

  // ---- QR 22 mm dengan quiet zone (kanan body) ----
  const qrSize = em * G.qr
  const qrLabelH = em * G.qrLabel * 1.4
  const qrLabelGap = em * G.qrLabelGap
  const qrBlockH = qrSize + qrLabelGap + qrLabelH
  const qrX = x + width - padX - qrSize
  const qrY = bodyCenter - qrBlockH / 2
  // Latar putih di luar QR其实是 quiet zone 4 modul, digambar oleh drawQr.
  drawQr(doc, row.qr, qrX, qrY, qrSize)
  drawText(doc, CARD_QR_PREFIX_LABEL, qrX + qrSize / 2, qrY + qrSize + qrLabelGap + qrLabelH / 2, {
    size: em * G.qrLabel, color: COLORS.outline, style: 'bold', align: 'center',
  })

  // ---- Footer: barcode NIY + tanggal terbit ----
  // Latar putih (bukan abu-abu) supaya quiet zone barcode menyatu dengan kartu,
  // sama seperti versi DOM.
  const footerY = y + height - footerH
  doc.setFillColor(...COLORS.white)
  doc.rect(x, footerY, width, footerH, 'F')
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.line(x, footerY, x + width, footerY)

  const barcodeW = em * G.barcodeW
  const barcodeH = em * G.barcodeH
  const barcodeTextH = em * G.barcodeText * 1.35
  const barcodeBlockH = barcodeH + em * 0.08 + barcodeTextH
  const barcodeX = x + padX
  const barcodeY = footerY + (footerH - barcodeBlockH) / 2
  drawBarcode(doc, row.barcode, barcodeX, barcodeY, barcodeW, barcodeH)
  drawText(doc, row.barcode, barcodeX, barcodeY + barcodeH + em * 0.08 + barcodeTextH / 2, {
    size: em * G.barcodeText, color: COLORS.text, font: 'courier', style: 'bold',
  })

  // Blok kanan: tanggal terbit + ID kartu.
  // ("Berlaku s/d" sengaja hanya muncul di blok body, tidak diduplikasi.)
  const metaRight = x + width - padX
  const metaSize = em * G.meta
  let metaCursor = footerY + footerH / 2 - metaSize * 0.55
  drawText(doc, `Terbit ${formatDateID(row.card.issued_date)}`, metaRight, metaCursor, {
    size: metaSize, color: COLORS.outline, style: 'bold', align: 'right',
  })
  metaCursor += metaSize * 1.15
  drawText(doc, row.card.id, metaRight, metaCursor, {
    size: metaSize * 0.86, color: COLORS.outline, font: 'courier', align: 'right',
  })

  return height
}

function loadImageAsDataUrl(url) {
  return new Promise((resolve) => {
    if (!url) {
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
        canvas.getContext('2d').drawImage(img, 0, 0)
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
 * Unduh PDF berisi kartu-kartu terpilih.
 * @param {object[]} rows hasil selectCardRows(state, staffList)
 * @param {object}   options { settings, units, layout, fileName, onProgress }
 */
export async function exportCardsToPdf(rows, { settings, units, layout = 'cr80', fileName, onProgress } = {}) {
  if (!rows || rows.length === 0) return { ok: false, reason: 'empty' }
  const config = printLayoutByValue(layout)
  const isCard = config.pageFormat === 'card'

  const doc = isCard
    ? new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_SIZE_MM.width, CARD_SIZE_MM.height] })
    : new jsPDF('portrait', 'mm', 'a4')

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const cardW = CARD_SIZE_MM.width
  const cardH = CARD_SIZE_MM.height
  const cols = isCard ? 1 : config.columns
  const rowsPerPage = isCard ? 1 : config.rows
  const perPage = cols * rowsPerPage
  const originX = (pageW - cols * cardW) / 2
  const originY = (pageH - rowsPerPage * cardH) / 2

  // Foto (jika ada) dimuat lebih dulu supaya gambar tidak menggambar async.
  const photoUrls = await Promise.all(rows.map((row) => loadImageAsDataUrl(cardPhotoOf(row.staff))))
  if (onProgress) onProgress({ stage: 'photo', done: rows.length, total: rows.length })

  rows.forEach((row, index) => {
    if (index > 0 && index % perPage === 0) doc.addPage()
    const slot = index % perPage
    const col = slot % cols
    const line = Math.floor(slot / cols)
    const unit = units.find((u) => u.id === row.staff.unitId)
    drawCard(doc, row, settings, unit, {
      x: originX + col * cardW,
      y: originY + line * cardH,
      width: cardW,
      photoDataUrl: photoUrls[index],
    })
    if (onProgress && (index + 1) % 25 === 0) {
      onProgress({ stage: 'draw', done: index + 1, total: rows.length })
    }
  })

  if (onProgress) onProgress({ stage: 'draw', done: rows.length, total: rows.length })

  const name = fileName || DEFAULT_PDF_FILE_NAME
  doc.save(name)
  return { ok: true, fileName: name, pages: Math.ceil(rows.length / perPage) }
}

export { drawCard }
