import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { buatRefIdPengajuan, formatDurasi, formatPeriode, hitungDurasiHari } from '../data/jenisIzinCuti.js'
import { getAttachmentName, getAttachmentUrl } from './leaveAttachmentService.js'

// ============================================================================
// SINKRONISASI PENGAJUAN IZIN/CUTI KE SUPABASE
//
// Latar belakang: berkas surat izin yang diunggah Guru tersimpan di Supabase
// Storage (bucket `leave-attachments`), tetapi baris pengajuannya sendiri
// hanya hidup di localStorage browser. Akibatnya Kepala Sekolah / Admin Unit /
// Superadmin yang memakai perangkat berbeda TIDAK pernah melihat berkas surat
// tersebut — mereka hanya melihat pratinjau mock.
//
// Modul ini menjembataninya: baris pengajuan (termasuk lampiran_url) ditulis
// ke tabel `public.leaves` dan dibaca kembali oleh perangkat lain. Kunci
// pencocokannya adalah `ref_id` — id pengajuan versi aplikasi yang dibuat
// sekali saat pengajuan dibuat, sehingga approval di perangkat lain
// menunjuk baris yang sama.
//
// Tabel public.leaves sudah punya kolom lampiran_url / lampiran_nama /
// lampiran_tipe / lampiran_ukuran (lihat supabase/schema.sql bagian 19),
// jadi tidak ada kolom baru selain ref_id & staff_niy.
// ============================================================================

export const LEAVE_TABLE = 'leaves'

/** Nilai status yang sah di enum public.leave_status. */
const STATUS_DB = ['Menunggu', 'Menunggu Kepsek', 'Menunggu Superadmin', 'Disetujui', 'Ditolak']

const APPROVAL_KOSONG = {
  status: 'Menunggu',
  approverName: null,
  approverRole: null,
  tanggal: null,
  catatan: null,
}

/**
 * Id pengajuan versi aplikasi (stabil lintas perangkat).
 * Dipakai sebagai kunci pencocokan baris di Supabase.
 *
 * @param {Object} leave
 * @returns {string}
 */
export function refIdLeave(leave = {}) {
  if (leave.refId) return leave.refId
  if (leave.ref_id) return leave.ref_id
  // Pengajuan lama (seed / dibuat sebelum fitur ini) belum punya refId.
  // ID-nya diturunkan dari isi pengajuan supaya hasilnya sama di semua
  // perangkat — tidak ada baris ganda saat dua perangkat mengirim data seed
  // yang sama.
  const bagian = [leave.id, leave.staffId, String(leave.createdAt || '').slice(0, 10), leave.jenis || '']
  return `lama-${bagian.join('-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}`
}

/**
 * Buat refId baru untuk pengajuan yang baru dibuat.
 * @returns {string}
 */
export function buatRefId() {
  return buatRefIdPengajuan()
}

/**
 * Ubah pengajuan aplikasi -> baris tabel public.leaves.
 *
 * @param {Object} leave
 * @param {Object} [opts]
 * @param {Object} [opts.staff] Data pegawai pengaju (dipakai untuk staff_niy).
 * @param {string} [opts.unitId]
 * @returns {Object} payload untuk Supabase.
 */
export function leaveKeBaris(leave = {}, { staff = null, unitId = null } = {}) {
  const sekarang = new Date().toISOString()
  const mulai = leave.mulai || leave.tanggal_mulai || sekarang.slice(0, 10)
  const selesai = leave.selesai || leave.tanggal_selesai || mulai
  const durasiHari = Number(leave.durasiHari || leave.durasi_hari || hitungDurasiHari(mulai, selesai)) || 1
  const status = STATUS_DB.includes(leave.status) ? leave.status : 'Menunggu'

  return {
    ref_id: refIdLeave(leave),
    // staff_id sengaja diisi id aplikasi. Relasi ke public.staff dilepas di
    // schema.sql (bagian 19) karena data pegawai aplikasi adalah sumber
    // kebenaran, sedangkan public.staff hanya berisi data contoh.
    staff_id: Number.isFinite(Number(leave.staffId)) ? Number(leave.staffId) : null,
    staff_niy: staff?.niy || leave.niy || null,
    unit_id: unitId || leave.unitId || null,
    jenis: leave.jenis || 'Izin Pribadi',
    tanggal_mulai: mulai,
    tanggal_selesai: selesai,
    durasi_hari: durasiHari,
    periode: leave.periode || formatPeriode(mulai, selesai),
    alasan: leave.alasan || leave.keterangan || '-',
    lampiran_url: getAttachmentUrl(leave) || null,
    lampiran_nama: getAttachmentName(leave) || null,
    lampiran_tipe: leave.lampiranTipe || leave.lampiran_tipe || null,
    lampiran_ukuran: leave.lampiranUkuran || leave.lampiran_ukuran || null,
    status,
    tahap_approval: leave.tahapApproval || leave.tahap_approval || 1,
    approval_kepsek: leave.approvalKepsek || leave.approval_kepsek || APPROVAL_KOSONG,
    approval_superadmin: leave.approvalSuperadmin || leave.approval_superadmin || APPROVAL_KOSONG,
    rejected_stage: leave.rejectedStage || leave.rejected_stage || null,
    created_at: leave.createdAt || leave.created_at || sekarang,
    updated_at: leave.updatedAt || leave.updated_at || sekarang,
  }
}

/**
 * Ubah baris tabel public.leaves -> pengajuan versi aplikasi.
 *
 * @param {Object} baris
 * @param {Object} [opts]
 * @param {Object} [opts.staffIdByNiy] Peta NIY -> id pegawai di aplikasi.
 * @returns {Object}
 */
export function barisKeLeave(baris = {}, { staffIdByNiy = {} } = {}) {
  const mulai = baris.tanggal_mulai || null
  const selesai = baris.tanggal_selesai || mulai
  const durasiHari = Number(baris.durasi_hari) || hitungDurasiHari(mulai, selesai)
  const niy = baris.staff_niy || null
  const staffId = (niy && staffIdByNiy[niy]) ?? baris.staff_id ?? null
  const lampiranUrl = baris.lampiran_url || ''

  return {
    refId: baris.ref_id || '',
    staffId,
    niy: niy || '',
    unitId: baris.unit_id || null,
    jenis: baris.jenis || '',
    mulai,
    selesai,
    periode: baris.periode || formatPeriode(mulai, selesai),
    durasi: formatDurasi(mulai, selesai),
    durasiHari,
    durasi_hari: durasiHari,
    alasan: baris.alasan || '',
    keterangan: baris.alasan || '',
    lampiran: baris.lampiran_nama || '',
    lampiranNama: baris.lampiran_nama || '',
    lampiranUrl,
    lampiran_url: lampiranUrl,
    lampiranTipe: baris.lampiran_tipe || '',
    lampiran_ukuran: baris.lampiran_ukuran || null,
    lampiranUkuran: baris.lampiran_ukuran || null,
    status: baris.status || 'Menunggu',
    tahapApproval: baris.tahap_approval || 1,
    approvalKepsek: baris.approval_kepsek || { ...APPROVAL_KOSONG, approverRole: 'Kepala Sekolah' },
    approvalSuperadmin: baris.approval_superadmin || { ...APPROVAL_KOSONG, approverRole: 'Superadmin' },
    rejectedStage: baris.rejected_stage || null,
    createdAt: baris.created_at || null,
    updatedAt: baris.updated_at || null,
    dariSupabase: true,
  }
}

/**
 * Tulis satu pengajuan ke Supabase (menambah atau memperbarui).
 * Kunci pencocokan: ref_id.
 *
 * @param {Object} leave
 * @param {Object} [opts]
 * @returns {Promise<boolean>} true bila berhasil tersimpan.
 */
export async function simpanLeaveKeSupabase(leave, { staff = null, unitId = null } = {}) {
  if (!isSupabaseConfigured || !supabase) return false
  if (!leave) return false

  try {
    const baris = leaveKeBaris(leave, { staff, unitId })
    const { error } = await supabase
      .from(LEAVE_TABLE)
      .upsert(baris, { onConflict: 'ref_id' })

    if (error) {
      console.warn('[LeaveService] Gagal menyimpan pengajuan ke Supabase:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[LeaveService] Exception menyimpan pengajuan ke Supabase:', err)
    return false
  }
}

/**
 * Tulis banyak pengajuan sekaligus (mis. saat perangkat pertama kali
 * menyinkronkan data yang belum pernah masuk ke Supabase).
 *
 * @param {Array<Object>} daftarLeave
 * @param {Object} [opts]
 * @returns {Promise<number>} jumlah baris yang berhasil ditulis.
 */
export async function simpanBanyakLeaveKeSupabase(daftarLeave = [], { staffById = {}, unitIdByStaffId = {} } = {}) {
  if (!isSupabaseConfigured || !supabase) return 0
  if (!Array.isArray(daftarLeave) || daftarLeave.length === 0) return 0

  const baris = daftarLeave
    .filter(Boolean)
    .map((leave) => {
      const staff = staffById[leave.staffId] || null
      return leaveKeBaris(leave, {
        staff,
        unitId: leave.unitId || staff?.unitId || unitIdByStaffId[leave.staffId] || null,
      })
    })

  if (baris.length === 0) return 0

  try {
    const { error } = await supabase.from(LEAVE_TABLE).upsert(baris, { onConflict: 'ref_id' })
    if (error) {
      console.warn('[LeaveService] Gagal menyimpan daftar pengajuan ke Supabase:', error.message)
      return 0
    }
    return baris.length
  } catch (err) {
    console.warn('[LeaveService] Exception menyimpan daftar pengajuan ke Supabase:', err)
    return 0
  }
}

/**
 * Ambil seluruh pengajuan dari Supabase.
 *
 * @param {Object} [opts]
 * @param {Object} [opts.staffIdByNiy] Peta NIY -> id pegawai di aplikasi.
 * @param {string[]} [opts.unitIds] Batasi ke unit-unit tertentu.
 * @returns {Promise<Array<Object>>} daftar pengajuan (bentuk aplikasi).
 */
export async function ambilLeaveDariSupabase({ staffIdByNiy = {}, unitIds = null } = {}) {
  if (!isSupabaseConfigured || !supabase) return []

  try {
    let kueri = supabase
      .from(LEAVE_TABLE)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (Array.isArray(unitIds) && unitIds.length > 0) {
      kueri = kueri.in('unit_id', unitIds)
    }

    const { data, error } = await kueri
    if (error) {
      console.warn('[LeaveService] Gagal membaca pengajuan dari Supabase:', error.message)
      return []
    }
    return (data || []).map((baris) => barisKeLeave(baris, { staffIdByNiy }))
  } catch (err) {
    console.warn('[LeaveService] Exception membaca pengajuan dari Supabase:', err)
    return []
  }
}
