import { useEffect, useRef } from 'react'
import {
  useSimPres, selectCanSwitchUnit, selectActiveUnitId, selectUnitOptionsById, ALL_UNITS,
} from '../../store/simPresStore.jsx'
import { PRINT_LAYOUTS, VALIDITY_YEAR_OPTIONS } from '../../data/employeeCard.js'

const STATUS_KEPEGAWAAN_OPTIONS = [
  { value: 'all', label: 'Semua Status Kepegawaian' },
  { value: 'Tetap', label: 'Tetap (PNS / GTT)' },
  { value: 'Kontrak', label: 'Kontrak' },
  { value: 'Honorer', label: 'Honorer' },
]

const STATUS_AKTIF_OPTIONS = [
  { value: 'all', label: 'Aktif & Nonaktif' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Nonaktif', label: 'Nonaktif' },
]

// Semua kontrol sengaja memakai tinggi (h-10) dan jarak (gap-3) yang sama
// agar ketiga baris toolbar terlihat rata dan tidak ada ruang kosong berlebihan.
const ROW = 'flex flex-wrap items-center gap-3'
const FIELD_BASE =
  'h-10 w-full bg-surface-container-low hover:bg-surface-container text-on-surface font-body-md text-body-md rounded-lg focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-secondary/30'
const SELECT_CLASS = `${FIELD_BASE} pl-9 pr-8 appearance-none cursor-pointer truncate`
const SEARCH_CLASS = `${FIELD_BASE} pl-9 pr-3`
const ICON_LEFT =
  'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none leading-none'
const ICON_RIGHT =
  'material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none leading-none'
const BTN_BASE =
  'h-10 inline-flex items-center justify-center gap-2 rounded-lg font-body-md-medium text-body-md-medium transition-colors shadow-sm cursor-pointer whitespace-nowrap'

/**
 * Toolbox Cetak Kartu ID, disusun tiga baris agar mudah dipindai:
 *   Baris 1 -> Pilih Semua, Reset Filter, Unduh PDF, Cetak Terpilih
 *   Baris 2 -> Filter Unit, Status Kepegawaian, Aktif/Nonaktif, Search
 *   Baris 3 -> Format kartu, Masa berlaku, Terapkan
 *
 * Setiap kontrol benar-benar mengubah hasil: pencarian & status menyaring daftar
 * kartu, format menentukan ukuran halaman cetak/PDF, dan masa berlaku menulis
 * ulang issued_date/expired_date pada kartu terpilih.
 */
function CardToolbar({
  onUnitFilterChange,
  searchTerm, onSearchTermChange,
  statusPegawai, onStatusPegawaiChange,
  status, onStatusChange,
  layout, onLayoutChange,
  validityYears, onValidityYearsChange,
  onApplyValidity,
  allSelected, onToggleSelectAll,
  filteredCount, selectedCount,
  onReset,
  onPrint, onDownload,
  busy,
}) {
  const { state } = useSimPres()
  const canSwitchUnit = selectCanSwitchUnit(state)
  const activeUnitId = selectActiveUnitId(state)
  const unitOptions = selectUnitOptionsById(state)
  const masterRef = useRef(null)

  // Checkbox "Pilih Semua" menunjukkan keadaan sebagian (indeterminate) saat
  // hanya sebagian hasil filter yang terpilih.
  useEffect(() => {
    const el = masterRef.current
    if (!el) return
    el.indeterminate = selectedCount > 0 && !allSelected
  }, [selectedCount, allSelected])

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-3">
      {/* ===== Baris 1: aksi utama ===== */}
      <div className={ROW}>
        <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-surface-container-low hover:bg-surface-container px-3 transition-colors">
          <input
            ref={masterRef}
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded border-outline/40 text-secondary focus:ring-2 focus:ring-secondary/40 cursor-pointer"
          />
          <span className="font-body-md-medium text-body-md-medium text-on-surface whitespace-nowrap">
            Pilih Semua ({filteredCount})
          </span>
        </label>

        <button
          type="button"
          onClick={onReset}
          className={`${BTN_BASE} flex-1 sm:flex-none shrink-0 px-4 bg-surface-container-lowest hover:bg-surface-container text-on-surface`}
        >
          <span className="material-symbols-outlined text-[18px] leading-none">restore</span>
          <span>Reset Filter</span>
        </button>

        {/* Spacer hanya di layar lebar agar aksi utama terdorong ke kanan,
            tanpa menyisakan jarak kosong di mobile. */}
        <div className="hidden flex-1 sm:block" />

        <button
          type="button"
          onClick={onDownload}
          disabled={selectedCount === 0 || Boolean(busy)}
          className={`${BTN_BASE} flex-1 sm:flex-none px-4 bg-surface-container-low hover:bg-surface-container text-on-surface disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-container-low`}
        >
          <span className="material-symbols-outlined text-[18px] leading-none text-on-surface-variant">download</span>
          <span>{busy === 'pdf' ? 'Menyusun PDF...' : 'Unduh PDF'}</span>
        </button>

        <button
          type="button"
          onClick={onPrint}
          disabled={selectedCount === 0 || Boolean(busy)}
          className={`${BTN_BASE} flex-1 sm:flex-none px-5 bg-primary hover:bg-primary-container text-on-primary disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="material-symbols-outlined text-[20px] leading-none">print</span>
          <span>{busy === 'print' ? 'Menyiapkan...' : `Cetak Terpilih (${selectedCount})`}</span>
        </button>
      </div>

      {/* ===== Baris 2: filter & pencarian (grid responsif) ===== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canSwitchUnit ? (
          <div className="relative">
            <span className={ICON_LEFT}>domain</span>
            <select
              className={SELECT_CLASS}
              value={activeUnitId}
              onChange={(e) => onUnitFilterChange(e.target.value)}
              aria-label="Filter unit sekolah"
            >
              <option value={ALL_UNITS}>Semua Unit ({state.units.length} Unit)</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.nama}</option>
              ))}
            </select>
            <span className={ICON_RIGHT}>expand_more</span>
          </div>
        ) : (
          // Role selain Superadmin terkunci ke unitnya: filter unit disembunyikan
          // dan hanya ditampilkan sebagai informasi (tidak bisa diklik).
          <div className="relative">
            <span className={ICON_LEFT}>domain</span>
            <div
              className="h-10 w-full pl-9 pr-8 bg-surface-container flex items-center text-on-surface-variant font-body-md text-body-md rounded-lg truncate cursor-not-allowed"
              title="Unit mengikuti akun Anda"
              aria-label={`Unit terkunci: ${unitOptions[0]?.nama || 'Semua Unit'}`}
            >
              {unitOptions[0]?.nama || 'Semua Unit'}
            </div>
            <span className={`${ICON_RIGHT} opacity-40`}>lock</span>
          </div>
        )}

        <div className="relative">
          <span className={ICON_LEFT}>badge</span>
          <select
            className={SELECT_CLASS}
            value={statusPegawai}
            onChange={(e) => onStatusPegawaiChange(e.target.value)}
            aria-label="Filter status kepegawaian"
          >
            {STATUS_KEPEGAWAAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span className={ICON_RIGHT}>expand_more</span>
        </div>

        <div className="relative">
          <span className={ICON_LEFT}>how_to_reg</span>
          <select
            className={SELECT_CLASS}
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter status aktif pegawai"
          >
            {STATUS_AKTIF_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span className={ICON_RIGHT}>expand_more</span>
        </div>

        <div className="relative">
          <span className={ICON_LEFT}>search</span>
          <input
            type="search"
            className={SEARCH_CLASS}
            placeholder="Cari nama, NIY/NIP, jabatan..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            aria-label="Cari pegawai"
          />
        </div>
      </div>

      {/* ===== Baris 3: format cetak & masa berlaku ===== */}
      <div className={ROW}>
        <div className="relative w-full sm:w-auto sm:flex-1">
          <span className={ICON_LEFT}>style</span>
          <select
            className={SELECT_CLASS}
            value={layout}
            onChange={(e) => onLayoutChange(e.target.value)}
            aria-label="Format dan ukuran kartu cetak"
          >
            {PRINT_LAYOUTS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span className={ICON_RIGHT}>expand_more</span>
        </div>

        <div className="relative flex-1 sm:flex-none sm:w-40">
          <span className={ICON_LEFT}>event_available</span>
          <select
            className={SELECT_CLASS}
            value={validityYears}
            onChange={(e) => onValidityYearsChange(Number(e.target.value))}
            aria-label="Masa berlaku kartu"
          >
            {VALIDITY_YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>{year} Tahun</option>
            ))}
          </select>
          <span className={ICON_RIGHT}>expand_more</span>
        </div>

        <button
          type="button"
          onClick={onApplyValidity}
          disabled={selectedCount === 0}
          className={`${BTN_BASE} flex-1 sm:flex-none px-3 bg-surface-container-low hover:bg-surface-container text-on-surface disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-container-low`}
          title="Terapkan masa berlaku ke kartu yang sedang dipilih"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">published_with_changes</span>
          <span>Terapkan</span>
        </button>
      </div>
    </div>
  )
}

export default CardToolbar
