import { createPortal } from 'react-dom'
import { EmployeeIdCardPrint } from './EmployeeIdCard.jsx'
import { printLayoutByValue, CARD_SIZE_MM } from '../../data/employeeCard.js'

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/**
 * Area cetak. Dirender di DOM tetapi disembunyikan di layar (lihat
 * .sp-print-root di index.css) dan hanya ikut saat pengguna menekan
 * "Cetak Terpilih".
 *
 * Area ini di-portal ke <body> supaya aturan cetak cukup menyembunyikan
 * seluruh anak body lainnya. Kalau tetap di dalam pohon React, konten
 * aplikasi meski di-set visibility:hidden tetap memakan ruang dan
 * menghasilkan halaman kosong setelah kartu.
 *
 * Ukuran halaman mengikuti layout:
 *   - cr80 : 85.60 x 53.98 mm, satu kartu per halaman (printer kartu PVC)
 *   - a4-* : 210 x 297 mm, kartu ditata 2 x 4 atau 2 x 5 per lembar
 */
function CardPrintSheet({ rows, settings, units, layout }) {
  if (!rows || rows.length === 0) return null
  if (typeof document === 'undefined') return null
  const config = printLayoutByValue(layout)
  const isCard = config.pageFormat === 'card'
  const perPage = config.columns * config.rows
  const pages = chunk(rows, perPage)
  const pageSize = isCard
    ? { width: `${CARD_SIZE_MM.width}mm`, height: `${CARD_SIZE_MM.height}mm` }
    : { width: '210mm', height: '297mm' }

  return createPortal(
    <div className="sp-print-root">
      {pages.map((pageRows, index) => (
        <div
          key={index}
          className="sp-print-page"
          style={{ ...pageSize, breakAfter: index === pages.length - 1 ? 'auto' : 'page' }}
        >
          <div
            className="h-full w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${config.columns}, ${CARD_SIZE_MM.width}mm)`,
              gridAutoRows: `${CARD_SIZE_MM.height}mm`,
              justifyContent: 'center',
              alignContent: 'center',
            }}
          >
            {pageRows.map((row) => (
              <EmployeeIdCardPrint
                key={row.staff.id}
                row={row}
                settings={settings}
                units={units}
              />
            ))}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  )
}

export default CardPrintSheet
