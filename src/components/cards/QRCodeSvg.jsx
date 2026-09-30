import { useMemo } from 'react'
import { encodeQrMatrix, QR_QUIET_ZONE, qrRenderSize } from '../../utils/qrcode.js'

/**
 * QR Code sebagai SVG inline.
 *
 * - Quiet zone 4 modul putih di sekeliling kode (ISO/IEC 18004). Tanpa zona
 *   tenang ini, QR sebesar 22 mm di kartu PVC sering gagal dipindai karena
 *   pemindai butuh jarak putih sebelum menemukan finder pattern.
 * - Baris modul yang berdampingan digabung jadi satu <rect> supaya DOM tetap
 *   ringan untuk ratusan kartu.
 * - Kontur ditulis sebagai vektor murni (tanpa <image>), jadi tetap tajam di
 *   layar maupun di PDF pada skala berapa pun.
 */
function QRCodeSvg({ value, className = '', title = 'QR Code' }) {
  const matrix = useMemo(() => encodeQrMatrix(value), [value])

  if (!matrix) {
    return (
      <div
        className={`flex items-center justify-center bg-white text-outline ${className}`}
        style={{ aspectRatio: '1 / 1' }}
        title="QR tidak dapat dibuat"
      >
        <svg className="h-[22%] w-[22%]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2 1 21h22L12 2Zm0 6 6.5 11h-13L12 8Zm-1 4v3h2v-3h-2Zm0 4v2h2v-2h-2Z" />
        </svg>
      </div>
    )
  }

  const { modules } = matrix
  const total = qrRenderSize(matrix)
  const rects = []
  for (let row = 0; row < matrix.size; row++) {
    let runStart = -1
    for (let col = 0; col <= matrix.size; col++) {
      const dark = col < matrix.size && modules[row][col] === 1
      if (dark && runStart === -1) runStart = col
      if (!dark && runStart !== -1) {
        // +QR_QUIET_ZONE menggeser modul ke dalam zona tenang.
        rects.push(
          <rect
            key={`${row}-${runStart}`}
            x={runStart + QR_QUIET_ZONE}
            y={row + QR_QUIET_ZONE}
            width={col - runStart}
            height="1"
          />,
        )
        runStart = -1
      }
    }
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
      style={{ aspectRatio: '1 / 1', display: 'block' }}
    >
      <title>{value}</title>
      {/* Latar putih = quiet zone. */}
      <rect x="0" y="0" width={total} height={total} fill="#ffffff" />
      <g fill="currentColor">{rects}</g>
    </svg>
  )
}

export default QRCodeSvg
