import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export const AVATAR_BUCKET = 'avatars'

/**
 * Konversi Data URL (base64) ke Blob objek.
 */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(parts[1])
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new Blob([array], { type: mime })
}

/**
 * Pastikan bucket 'avatars' tersedia di Supabase Storage.
 */
export async function ensureAvatarBucket() {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some((b) => b.name === AVATAR_BUCKET || b.id === AVATAR_BUCKET)
    if (!exists) {
      await supabase.storage.createBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      })
    }
    return true
  } catch (err) {
    console.warn('Gagal memeriksa/membuat bucket avatars di Supabase:', err)
    return false
  }
}

/**
 * Unggah foto profil pegawai ke Supabase Storage (bucket 'avatars').
 * Memiliki fallback instan ke base64 Data URL jika Supabase belum terhubung.
 *
 * @param {object} staff
 * @param {File|Blob|string} fileOrDataUrl
 * @returns {Promise<string>} URL foto publik atau data URL fallback
 */
export async function uploadStaffPhoto(staff, fileOrDataUrl) {
  if (!fileOrDataUrl) return ''

  // Jika input berupa data URL base64, siapkan blob
  let blob = fileOrDataUrl
  let ext = 'jpg'
  let mimeType = 'image/jpeg'

  if (typeof fileOrDataUrl === 'string') {
    if (fileOrDataUrl.startsWith('data:')) {
      blob = dataUrlToBlob(fileOrDataUrl)
      mimeType = blob.type
      ext = mimeType.split('/')[1] || 'jpg'
    } else if (fileOrDataUrl.startsWith('http')) {
      // Sudah berupa URL
      return fileOrDataUrl
    }
  } else if (fileOrDataUrl instanceof File) {
    ext = fileOrDataUrl.name.split('.').pop() || 'jpg'
    mimeType = fileOrDataUrl.type || 'image/jpeg'
  }

  // Coba simpan ke Supabase Storage
  if (isSupabaseConfigured && supabase) {
    try {
      await ensureAvatarBucket()

      const staffIdentifier = staff?.niy || staff?.id || 'pegawai'
      const fileName = `avatar-${staffIdentifier}-${Date.now()}.${ext}`
      const filePath = `${fileName}`

      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        })

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(data.path)

        if (urlData?.publicUrl) {
          return urlData.publicUrl
        }
      } else if (error) {
        console.warn('Penyimpanan foto ke Supabase Storage gagal, memakai fallback lokal:', error.message)
      }
    } catch (err) {
      console.warn('Kesalahan saat upload ke Supabase Storage:', err)
    }
  }

  // Fallback: jika berupa string data URL kembalikan langsung
  if (typeof fileOrDataUrl === 'string') {
    return fileOrDataUrl
  }

  // Jika File/Blob, baca ke data URL
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => resolve('')
    reader.readAsDataURL(blob)
  })
}

/**
 * Hapus foto profil pegawai dari Supabase Storage jika tersimpan di sana.
 *
 * @param {object} staff
 * @param {string} photoUrl
 * @returns {Promise<boolean>}
 */
export async function deleteStaffPhoto(staff, photoUrl) {
  if (!photoUrl) return true

  if (isSupabaseConfigured && supabase && typeof photoUrl === 'string' && photoUrl.includes(AVATAR_BUCKET)) {
    try {
      // Ambil nama file dari URL
      const segments = photoUrl.split('/')
      const fileName = segments[segments.length - 1]
      if (fileName) {
        await supabase.storage.from(AVATAR_BUCKET).remove([fileName])
      }
    } catch (err) {
      console.warn('Gagal menghapus file dari Supabase Storage:', err)
    }
  }

  return true
}

