// Utilitas unduhan file yang andal di semua browser.
//
// Library seperti XLSX.writeFile / jsPDF.save memicu unduhan secara internal
// dan sering diblokir browser bila dipanggil di luar gestur pengguna (setelah
// await). Helper ini membuat blob lalu memicu klik pada <a download> secara
// sinkron, dengan revoke tertunda supaya unduhan tidak dibatalkan.
export function downloadBlob(blob, filename) {
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  a.style.display = 'none'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    try { a.remove() } catch (e) { /* noop */ }
  }, 2000)
}

export function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type: mime }), filename)
}

export function downloadArrayBuffer(buffer, filename, mime = 'application/octet-stream') {
  downloadBlob(new Blob([buffer], { type: mime }), filename)
}
