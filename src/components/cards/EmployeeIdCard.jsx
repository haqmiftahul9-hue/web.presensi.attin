import QRCodeSvg from './QRCodeSvg.jsx'
import BarcodeSvg from './BarcodeSvg.jsx'
import { YayasanLogo, UnitLogo } from './CardLogos.jsx'
import { cardStatusStyle, cardPhotoOf, formatDateID, CARD_QR_PREFIX_LABEL } from '../../data/employeeCard.js'

/**
 * Wajah kartu ID PVC (CR80 85.60 x 53.98 mm).
 *
 * Seluruh ukuran memakai satuan `em` yang skalanya berasal dari lebar kartu
 * (lihat .sp-idcard di index.css + CARD_GEOMETRY di data/employeeCard.js).
 * Konsekuensinya komponen yang sama bisa dipakai dua kali tanpa prop berbeda:
 *   - di layar : bungkusnya mengikuti lebar kolom grid,
 *   - di cetak : bungkusnya dikunci 85.6mm x 53.98mm (skala 1:1 ke kertas).
 *
 * Tata letak (tinggi kartu 53.98 mm):
 *   header  8.9 mm  navy: logo + nama yayasan (kiri), logo + unit (kanan)
 *   body   29.9 mm  foto + status | nama, jabatan, NIY/NIP, masa berlaku | QR 22 mm
 *   footer 15.0 mm  barcode NIY 43 mm x 7.2 mm + nomor, masa berlaku & ID kartu
 *
 * Tidak ada data dummy: foto, nama, jabatan, NIY/NIP, unit, dan masa berlaku
 * semuanya berasal dari data pegawai + tabel employee_card.
 */
function CardFace({ row, settings, unit, className = '' }) {
  const { staff, card, qr, barcode } = row
  const photo = cardPhotoOf(staff)
  const initials = row.initials || staff.name
  const statusGroup = row.statusGroup
  const namaYayasan = settings?.namaYayasan || 'Yayasan Pendidikan'

  return (
    <div
      className={`sp-idcard relative flex h-full w-full flex-col overflow-hidden bg-white text-on-surface ${className}`}
    >
      {/* Header: identitas yayasan & unit */}
      <div className="flex shrink-0 items-center justify-between bg-primary-container pl-[0.7em] pr-[0.7em] text-on-primary" style={{ height: 'var(--sp-header)' }}>
        <div className="flex min-w-0 items-center gap-[0.4em]">
          <YayasanLogo settings={settings} className="h-[var(--sp-logo)] w-[var(--sp-logo)] shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[length:var(--sp-header-label)] font-semibold uppercase tracking-[0.1em] text-on-primary-container">
              Kartu Identitas Pegawai
            </span>
            <span className="truncate text-[length:var(--sp-header-title)] font-semibold leading-tight text-white" title={namaYayasan}>
              {namaYayasan}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-[0.4em]">
          <UnitLogo unit={unit} className="h-[var(--sp-logo)] w-[var(--sp-logo)] shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col items-end leading-tight">
            <span className="truncate text-[length:var(--sp-header-label)] font-semibold uppercase tracking-[0.1em] text-on-primary-container">
              Unit Sekolah
            </span>
            <span className="max-w-[11em] truncate text-[length:var(--sp-header-unit)] font-semibold leading-tight text-white" title={row.unit}>
              {row.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Body: foto + identitas | QR 22 mm */}
      <div className="flex min-h-0 flex-1 items-center gap-[var(--sp-gap)] px-[var(--sp-pad-x)] py-[var(--sp-body-pad-y)]">
        <div className="flex shrink-0 flex-col items-center gap-[var(--sp-badge-gap)]">
          <div
            className="relative shrink-0 overflow-hidden border border-outline/25 bg-surface-container"
            style={{ width: 'var(--sp-photo-w)', height: 'var(--sp-photo-h)', borderRadius: '0.35em' }}
          >
            {photo ? (
              <img
                src={photo}
                alt={`Foto ${staff.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              // Pegawai tanpa foto: monogram inisial + siluet, sama dengan
              // avatar tabel Data Guru/Pegawai supaya konsisten dengan
              // halaman lain. SVG inline (bukan icon font) agar ikut tercetak.
              <div className="flex h-full w-full flex-col items-center justify-center gap-[0.3em] bg-primary-fixed text-on-primary-fixed">
                <svg
                  className="h-[2.4em] w-[2.4em]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.7-8 6v2h16v-2c0-3.3-3.6-6-8-6Z" />
                </svg>
                <span className="text-[1.1em] font-semibold leading-none tracking-[0.04em]">
                  {initials.slice(0, 2)}
                </span>
              </div>
            )}
          </div>
          <span
            className={`rounded-[0.25em] border px-[0.35em] text-[length:var(--sp-badge)] font-semibold uppercase leading-[1.3] tracking-[0.04em] ${cardStatusStyle(staff.statusPegawai)}`}
          >
            {statusGroup}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h3
            className="truncate text-[length:var(--sp-name)] font-bold leading-[1.15] tracking-[-0.01em] text-on-surface"
            title={staff.name}
          >
            {staff.name}
          </h3>
          <p
            className="truncate text-[length:var(--sp-role)] font-semibold leading-[1.2] text-secondary"
            title={staff.role}
          >
            {staff.role || '-'}
          </p>
          <dl className="mt-[0.35em] space-y-[0.08em] leading-[1.25] text-on-surface-variant">
            <div className="flex gap-[0.3em]">
              <dt className="w-[3.2em] shrink-0 text-[length:var(--sp-niy)] font-semibold uppercase tracking-[0.04em] text-outline">NIY</dt>
              <dd className="truncate font-mono text-[length:var(--sp-niy)] font-medium text-on-surface">{staff.niy || '-'}</dd>
            </div>
            {staff.nip ? (
              <div className="flex gap-[0.3em]">
                <dt className="w-[3.2em] shrink-0 text-[length:var(--sp-nip)] font-semibold uppercase tracking-[0.04em] text-outline">NIP</dt>
                <dd className="truncate font-mono text-[length:var(--sp-nip)] text-on-surface">{staff.nip}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-[0.3em] truncate text-[length:var(--sp-meta)] font-semibold text-amber-700">
            Berlaku s/d {formatDateID(card.expired_date)}
          </p>
        </div>

        {/* QR integrasi kiosk — 22 mm, sudah termasuk quiet zone 4 modul */}
        <div className="flex shrink-0 flex-col items-center">
          <QRCodeSvg
            value={qr}
            title={`QR ${staff.name}`}
            className="h-[var(--sp-qr)] w-[var(--sp-qr)]"
          />
          <span className="mt-[var(--sp-qr-label-gap)] text-[length:var(--sp-qr-label)] font-semibold uppercase leading-none tracking-[0.08em] text-outline">
            {CARD_QR_PREFIX_LABEL}
          </span>
        </div>
      </div>

      {/* Footer: barcode NIY (tinggi 7.2 mm) + tanggal terbit.
          Latar putih (bukan abu-abu) supaya quiet zone barcode menyatu dengan
          kartu dan tidak terlihat seperti kotak ditempel. */}
      <div
        className="flex shrink-0 items-center justify-between gap-[0.6em] border-t border-outline/20 bg-white px-[var(--sp-pad-x)]"
        style={{ height: 'var(--sp-footer)' }}
      >
        <div className="flex min-w-0 flex-col justify-center">
          <BarcodeSvg
            value={barcode}
            className="h-[var(--sp-barcode-h)] w-[var(--sp-barcode-w)] text-primary"
          />
          <span className="mt-[0.08em] font-mono text-[length:var(--sp-barcode-text)] font-medium tracking-[0.1em] text-on-surface">
            {barcode}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center text-right">
          <span className="text-[length:var(--sp-meta)] uppercase tracking-[0.06em] text-outline">
            Terbit {formatDateID(card.issued_date)}
          </span>
          <span className="font-mono text-[length:calc(var(--sp-meta)*0.86)] text-outline">{card.id}</span>
        </div>
      </div>
    </div>
  )
}

/** Kartu untuk ditampilkan di layar (dibungkus checkbox selectable). */
export function EmployeeIdCard({ row, settings, units, selected, onToggle, selectable = true }) {
  const unit = units.find((u) => u.id === row.staff.unitId)
  const cardId = `id-card-${row.staff.id}`

  return (
    <div className="flex flex-col gap-space-xs">
      <div
        className={`sp-card-frame mx-auto w-full max-w-[460px] rounded-xl transition-all duration-200 ${
          selected ? 'ring-2 ring-secondary ring-offset-2 ring-offset-surface' : ''
        }`}
      >
        <div className="aspect-[85.6/53.98] w-full">
          <CardFace row={row} settings={settings} unit={unit} />
        </div>
      </div>

      {selectable && (
        <div className="mx-auto flex w-full max-w-[460px] items-center justify-between gap-2 px-0.5">
          <label className="flex cursor-pointer select-none items-center gap-2 text-on-surface-variant">
            <input
              id={cardId}
              type="checkbox"
              checked={Boolean(selected)}
              onChange={() => onToggle?.(row.staff.id)}
              className="w-4 h-4 rounded border-outline/40 text-secondary focus:ring-2 focus:ring-secondary/40 cursor-pointer"
            />
            <span className="font-body-sm-medium text-body-sm-medium text-on-surface-variant">
              Pilih kartu
            </span>
          </label>
          <span className="font-mono text-[11px] text-outline">{row.card.id}</span>
        </div>
      )}
    </div>
  )
}

/** Kartu untuk area cetak: dikunci 85.6 x 53.98 mm, tanpa kontrol UI. */
export function EmployeeIdCardPrint({ row, settings, units }) {
  const unit = units.find((u) => u.id === row.staff.unitId)
  return (
    <div
      className="sp-card-frame shrink-0 overflow-hidden"
      style={{ width: '85.6mm', height: '53.98mm' }}
    >
      <CardFace row={row} settings={settings} unit={unit} />
    </div>
  )
}

export { CardFace }
