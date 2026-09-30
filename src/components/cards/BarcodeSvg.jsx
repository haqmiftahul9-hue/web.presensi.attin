import { useMemo } from 'react'
import { toBarRuns, BARCODE_QUIET_MODULES } from '../../utils/barcode.js'

/**
 * Barcode Code 128 sebagai SVG inline.
 *
 * - Quiet zone 10 modul di kiri dan kanan (termasuk di dalam kotak yang
 *   dirender) supaya simbol pertama dan terakhir tidak terpotong laminasi.
 * - Lebar modul dijaga lewat viewBox + preserveAspectRatio="none": hanya sumbu
 *   Y yang diregangkan, sehingga perbandingan lebar bar tetap persis seperti
 *   hasil encoder (bar tetap dapat dipindai).
 */
function BarcodeSvg({ value, className = '' }) {
  const { runs, totalWidth, ok } = useMemo(() => toBarRuns(value), [value])

  if (!ok || totalWidth === 0) {
    return (
      <div className={`flex items-center justify-center text-outline ${className}`} title="Barcode tidak dapat dibuat">
        <svg className="h-[40%] w-[40%]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M1 21h22v-2H1v2Zm0-4h3v-2H1v2Zm5 0h2V5H6v12Zm4 0h3V5h-3v12Zm5 0h2V5h-2v12Zm4 0h4V5h-4v12Z" />
        </svg>
      </div>
    )
  }

  const quiet = BARCODE_QUIET_MODULES
  const viewWidth = totalWidth + quiet * 2
  const bars = []
  let offset = quiet
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]
    if (run.bar) {
      bars.push(
        <rect key={i} x={offset} y="0" width={run.width} height="10" />,
      )
    }
    offset += run.width
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${viewWidth} 10`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Barcode ${value}`}
      style={{ display: 'block' }}
    >
      <title>{value}</title>
      {/* Latar putih = quiet zone kiri & kanan. */}
      <rect x="0" y="0" width={viewWidth} height="10" fill="#ffffff" />
      <g fill="currentColor">{bars}</g>
    </svg>
  )
}

export default BarcodeSvg
