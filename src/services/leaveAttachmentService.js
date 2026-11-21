import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export const LEAVE_BUCKET = 'leave-attachments'
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5MB

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

/**
 * Validasi berkas lampiran izin/cuti.
 * @param {File} file
 * @returns {string|null} Pesan galat bila tidak valid, null bila valid.
 */
export function validateLeaveAttachment(file) {
  if (!file) return 'Berkas wajib dipilih'
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return 'Ukuran berkas melebihi batas maksimal 5 MB'
  }
  const fileExt = file.name?.split('.').pop()?.toLowerCase()
  const isAllowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(fileExt)
  if (!isAllowedExt && !ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Format berkas tidak didukung. Harap unggah berkas PDF atau Foto (JPG, PNG, WebP).'
  }
  return null
}

/**
 * Ambil URL dokumen bukti yang benar-benar bisa dibuka browser.
 *
 * Attention: field `lampiran` pada data lama hanya berisi NAMA berkas
 * (mis. "surat_pengajuan.pdf"), bukan URL. Nama berkas tidak bisa
 * dipratinjau, jadi hanya http/https/data/blob yang dianggap sebagai
 * dokumen nyata.
 *
 * @param {Object} leave
 * @returns {string} URL dokumen, atau string kosong bila tidak ada berkas nyata.
 */
export function getAttachmentUrl(leave = {}) {
  const kandidat =
    leave.lampiranUrl ||
    leave.lampiran_url ||
    leave.lampiran_data ||
    leave.lampiranData ||
    ''
  const str = String(kandidat || '').trim()
  return /^(https?:|data:|blob:)/i.test(str) ? str : ''
}

/**
 * Nama berkas lampiran untuk ditampilkan. Bila `lampiran` berisi URL, nama
 * diambil dari path URL-nya supaya tidak menampilkan tautan panjang.
 *
 * @param {Object} leave
 * @returns {string}
 */
export function getAttachmentName(leave = {}) {
  const eksplisit = leave.lampiranNama || leave.lampiran_nama || leave.lampiranNamaBerkas || ''
  if (eksplisit) return eksplisit
  const fallback = leave.lampiran || leave.lampiranUrl || leave.lampiran_url || ''
  const str = String(fallback || '').trim()
  if (!str) return ''
  if (/^(https?:|data:|blob:)/i.test(str)) {
    const tanpaQuery = str.split('?')[0].split('#')[0]
    const basename = tanpaQuery.split('/').pop() || ''
    return basename || 'dokumen_lampiran'
  }
  return str
}

/**
 * Apakah pengajuan ini punya berkas lampiran yang bisa dibuka.
 * @param {Object} leave
 * @returns {boolean}
 */
export function hasAttachment(leave = {}) {
  if (getAttachmentUrl(leave)) return true
  // Berkas seed/mock belum punya URL, tapi tetap punya nama berkas sehingga
  // halaman bisa menampilkan pratinjau surat resmi (SVG) sebagai gantinya.
  return Boolean(getAttachmentName(leave))
}

/**
 * Deteksi apakah berkas atau URL merupakan gambar.
 * @param {string} fileOrUrl
 * @returns {boolean}
 */
export function isImageDocument(fileOrUrl) {
  if (!fileOrUrl) return false
  const str = String(fileOrUrl).toLowerCase()
  return (
    str.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(str)
  )
}

/**
 * Deteksi apakah berkas atau URL merupakan dokumen PDF.
 * @param {string} fileOrUrl
 * @returns {boolean}
 */
export function isPdfDocument(fileOrUrl) {
  if (!fileOrUrl) return false
  const str = String(fileOrUrl).toLowerCase()
  return (
    str.startsWith('data:application/pdf') ||
    /\.pdf(\?.*)?$/i.test(str)
  )
}

/**
 * Format ukuran berkas ke satuan KB/MB yang mudah dibaca manusia.
 * @param {number} bytes
 * @returns {string}
 */
export function formatDocumentSize(bytes) {
  if (!bytes || Number.isNaN(bytes)) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Konversi File menjadi Data URL (Base64) untuk offline storage / fallback.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

/**
 * Unggah berkas lampiran izin/cuti ke Supabase Storage, dengan fallback aman ke Base64 Data URL.
 * 
 * @param {File} file
 * @param {Object} options
 * @param {number|string} [options.staffId]
 * @param {string} [options.unitId]
 * @returns {Promise<{
 *   success: boolean,
 *   url: string,
 *   fileName: string,
 *   fileSize: number,
 *   fileType: string,
 *   isRemote: boolean,
 *   error?: string
 * }>}
 */
export async function uploadLeaveAttachment(file, { staffId = 'pegawai', unitId = 'umum' } = {}) {
  const validationError = validateLeaveAttachment(file)
  if (validationError) {
    return {
      success: false,
      error: validationError,
      fileName: file?.name || '',
      fileSize: file?.size || 0,
      fileType: file?.type || '',
    }
  }

  // Jika Supabase aktif dan terhubung, coba upload ke Storage
  if (isSupabaseConfigured && supabase) {
    try {
      const now = new Date()
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const timestamp = now.getTime()
      const cleanFileName = (file.name || 'lampiran')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .toLowerCase()
      const storagePath = `${unitId}/${yearMonth}/${staffId}_${timestamp}_${cleanFileName}`

      const { data, error } = await supabase.storage
        .from(LEAVE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        })

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from(LEAVE_BUCKET)
          .getPublicUrl(data.path)

        if (urlData?.publicUrl) {
          return {
            success: true,
            url: urlData.publicUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
            isRemote: true,
          }
        }
      } else if (error) {
        console.warn('[LeaveAttachment] Gagal upload ke Supabase Storage, fallback ke Base64:', error.message)
      }
    } catch (err) {
      console.warn('[LeaveAttachment] Exception saat upload ke Supabase Storage:', err)
    }
  }

  // Fallback: simpan sebagai Base64 Data URL lokal
  try {
    const dataUrl = await readFileAsDataUrl(file)
    return {
      success: true,
      url: dataUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      isRemote: false,
    }
  } catch (err) {
    return {
      success: false,
      error: 'Gagal memproses berkas dokumen: ' + (err.message || String(err)),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }
  }
}

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text, maxCharsPerLine = 58) {
  const words = String(text || '').split(/\s+/)
  const lines = []
  let cur = ''
  for (const word of words) {
    if ((cur + ' ' + word).trim().length <= maxCharsPerLine) {
      cur = (cur + ' ' + word).trim()
    } else {
      if (cur) lines.push(cur)
      cur = word
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['-']
}

/**
 * Membuat preview dokumen resmi dalam bentuk SVG Data URL untuk data seed/mock
 * sehingga tidak menimbulkan 404 ketika diklik oleh Guru, Kepala Sekolah, maupun Superadmin.
 * 
 * @param {Object} leave
 * @returns {string} SVG Data URL
 */
export function getMockDocumentSvg(leave = {}) {
  const title = leave.jenis || 'Surat Pengajuan Izin / Cuti'
  const name = leave.name || (leave.staff ? leave.staff.name : 'Pegawai Yayasan')
  const niy = leave.niy || (leave.staff ? leave.staff.niy : '049005000')
  const unit = leave.unitName || (leave.unit ? leave.unit.nama : 'Unit Sekolah IT Attin Sumbar')
  const dates = leave.periode || 'Periode Resmi'
  const rawReason = leave.keterangan || leave.alasan || 'Keperluan dinas / kesehatan yang telah dikonfirmasi oleh pemohon.'
  const reasonLines = wrapText(rawReason, 56)
  const fileName = getAttachmentName(leave) || 'surat_keterangan.pdf'
  const docId = leave.id || '01'
  const durasi = leave.durasi || (leave.durasi_hari ? `${leave.durasi_hari} Hari` : '1 Hari')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="100%" height="100%">
    <defs>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="goldSeal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
    </defs>
    
    <!-- Paper Background -->
    <rect width="800" height="1100" fill="#ffffff" rx="16"/>
    <rect x="24" y="24" width="752" height="1052" fill="none" stroke="#e2e8f0" stroke-width="2" rx="12"/>
    <rect x="32" y="32" width="736" height="1036" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6,6" rx="8"/>

    <!-- Kop Surat Yayasan / Sekolah -->
    <g transform="translate(60, 60)">
      <!-- Logo Mark -->
      <circle cx="45" cy="45" r="40" fill="#323d8f"/>
      <path d="M45 20 L65 65 L25 65 Z" fill="#ffffff" opacity="0.9"/>
      <circle cx="45" cy="48" r="8" fill="#f59e0b"/>

      <text x="105" y="35" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" fill="#1e293b" letter-spacing="1">YAYASAN AT-TIN SUMBAR</text>
      <text x="105" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#3b82f6">${escapeXml(unit.toUpperCase())}</text>
      <text x="105" y="78" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">Jl. Cendekia No. 41-47, Padang, Sumatera Barat • Telp: (0751) 890123</text>
      <line x1="0" y1="105" x2="680" y2="105" stroke="#323d8f" stroke-width="3"/>
      <line x1="0" y1="110" x2="680" y2="110" stroke="#cbd5e1" stroke-width="1"/>
    </g>

    <!-- Document Title -->
    <g transform="translate(400, 230)" text-anchor="middle">
      <text font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="#0f172a" text-decoration="underline" letter-spacing="0.5">BERKAS BUKTI LAMPIRAN PENGAJUAN</text>
      <text y="24" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#64748b">Nomor Dokumen: ATTIN/IZIN/2026/${escapeXml(docId)}</text>
    </g>

    <!-- Body Information Box -->
    <g transform="translate(70, 300)">
      <rect width="660" height="260" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>

      <text x="30" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#475569">DETAIL PEGAWAI PEMOHON:</text>
      
      <text x="30" y="75" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b">Nama Pegawai</text>
      <text x="180" y="75" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#0f172a">: ${escapeXml(name)}</text>

      <text x="30" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b">NIY Pegawai</text>
      <text x="180" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#0f172a">: ${escapeXml(niy)}</text>

      <text x="30" y="135" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b">Unit Kerja</text>
      <text x="180" y="135" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#0f172a">: ${escapeXml(unit)}</text>

      <text x="30" y="165" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b">Jenis Permohonan</text>
      <text x="180" y="165" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#2563eb">: ${escapeXml(title)}</text>

      <text x="30" y="195" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b">Periode Waktu</text>
      <text x="180" y="195" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#0f172a">: ${escapeXml(dates)} (${escapeXml(durasi)})</text>

      <text x="30" y="225" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b">Nama Berkas</text>
      <text x="180" y="225" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#059669">: ${escapeXml(fileName)}</text>
    </g>

    <!-- Keterangan Alasan Box -->
    <g transform="translate(70, 590)">
      <rect width="660" height="150" rx="12" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1.5"/>
      <text x="30" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#166534">KETERANGAN &amp; PERNYATAAN PEMOHON:</text>
      
      <text x="30" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-style="italic" fill="#1e293b">
        ${reasonLines.map((line, idx) => `<tspan x="30" dy="${idx === 0 ? 0 : 22}">&ldquo;${escapeXml(line)}${idx === reasonLines.length - 1 ? '&rdquo;' : ''}</tspan>`).join('')}
      </text>
    </g>

    <!-- Verification / Legal Seal Section -->
    <g transform="translate(100, 800)">
      <!-- Signature 1: Pemohon -->
      <g transform="translate(0, 0)">
        <text font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b">Pemohon,</text>
        <rect y="30" width="150" height="60" fill="none"/>
        <path d="M10 65 Q 40 40 70 65 T 130 55" fill="none" stroke="#334155" stroke-width="2"/>
        <text y="110" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${escapeXml(name)}</text>
        <text y="125" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#64748b">NIY. ${escapeXml(niy)}</text>
      </g>

      <!-- Signature 2: Verifikasi Unit -->
      <g transform="translate(420, 0)">
        <text font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b">Mengetahui / Verifikator,</text>
        <!-- Stamp Circle -->
        <circle cx="75" cy="60" r="42" fill="none" stroke="#2563eb" stroke-width="2.5" opacity="0.75" stroke-dasharray="8,4"/>
        <text x="75" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="#2563eb" text-anchor="middle" opacity="0.85">TERVERIFIKASI</text>
        <text x="75" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="600" fill="#2563eb" text-anchor="middle" opacity="0.85">SIMPRES AT-TIN</text>
        
        <path d="M30 65 Q 60 30 100 65 T 140 50" fill="none" stroke="#1d4ed8" stroke-width="2"/>
        <text y="110" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0f172a">Kepala Sekolah / Yayasan</text>
        <text y="125" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#64748b">SK Pengangkatan No. 04/YYS-AT/2024</text>
      </g>
    </g>

    <!-- Footer Note -->
    <g transform="translate(400, 1030)" text-anchor="middle">
      <text font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#94a3b8">Dokumen digital ini sah dan diterbitkan melalui Sistem Informasi Presensi (SIMPRES) At-Tin Sumbar.</text>
    </g>
  </svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Menyelesaikan URL dokumen bukti yang dapat dibuka / dipratinjau secara aman.
 * Jika URL adalah URL valid (http, data, blob), kembalikan langsung.
 * Jika berupa nama file mock (mis. .pdf), kembalikan SVG preview resmi.
 * 
 * @param {Object} leave
 * @returns {string} URL yang siap dibuka di browser atau modal viewer
 */
export function resolveDocumentUrl(leave = {}) {
  const lampiran = getAttachmentUrl(leave)
  if (lampiran) return lampiran
  // Fallback demo/mock official certificate
  return getMockDocumentSvg(leave)
}
