/**
 * Pemeriksaan availability font Material Symbols.
 *
 * Modul mobile sudah memakai ikon SVG, jadi tidak lagi bergantung pada font.
 * Halaman portal masih memakainya; bila font itu gagal dimuat (koneksi terputus,
 * cache basi), nama ligature seperti "face_retouch_natural" akan tampil sebagai
 * tulisan. Class `.sp-no-symbols` di <html> membuat ikon tersebut disembunyikan
 * — lebih baik kosong satu ikon daripada layar penuh tulisan.
 */

const KELAS = 'sp-no-symbols'

function fontTersedia() {
  if (typeof document === 'undefined' || !document.fonts?.load) return true
  return document.fonts
    .load('24px "Material Symbols Outlined"', 'face')
    .then((res) => Array.isArray(res) && res.length > 0)
    .catch(() => false)
}

export function watchSymbolFont() {
  if (typeof document === 'undefined') return
  fontTersedia().then((ada) => {
    if (!ada) document.documentElement.classList.add(KELAS)
    // Font bisa selesai dimuat belakangan (mis. setelah regained connection),
    // jadi statusnya ikut dipantau.
    document.fonts?.addEventListener?.('loadingdone', () => {
      fontTersedia().then((ok) => {
        document.documentElement.classList.toggle(KELAS, !ok)
      })
    })
  })
}