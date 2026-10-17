import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  useSimPres, addActivityLog, selectActiveUnitId, selectUnitName,
  selectFilteredCardStaff, selectCardRows, selectCardSummary, selectScopedStaff,
  selectCurrentUser, selectCanSwitchUnit, markCardsPrinted, setCardsValidity, ALL_UNITS,
  selectSearchTerm,
} from '../store/simPresStore.jsx'
import { DEFAULT_VALIDITY_YEARS, printLayoutByValue, CARD_SIZE_MM } from '../data/employeeCard.js'
import { exportCardsToPdf } from '../utils/cardPrint.js'
import CardBreadcrumbHeader from '../components/cards/CardBreadcrumbHeader.jsx'
import CardToolbar from '../components/cards/CardToolbar.jsx'
import CardPrintSheet from '../components/cards/CardPrintSheet.jsx'
import { EmployeeIdCard } from '../components/cards/EmployeeIdCard.jsx'

const PAGE_SIZE = 12

// Gaya @page ikut layout cetak yang dipilih: CR80 memakai ukuran kartu asli,
// A4 memakai lembar penuh. Disuntikkan runtime supaya @page selalu sinkron
// dengan pilihan pengguna (tidak ada aturan @page yang tertinggal).
const PAGE_STYLE_ID = 'sp-card-page-style'

function pageStyleFor(layout) {
  const config = printLayoutByValue(layout)
  const size = config.pageFormat === 'card'
    ? `${CARD_SIZE_MM.width}mm ${CARD_SIZE_MM.height}mm`
    : 'A4 portrait'
  return `@media print { @page { size: ${size}; margin: 0; } }`
}

function CetakKartuIdPage() {
  const { state, dispatch } = useSimPres()
  const currentUser = selectCurrentUser(state)
  const canSwitchUnit = selectCanSwitchUnit(state)
  // Unit terpilih dibaca dari store utama (sama dengan halaman Data
  // Guru/Pegawai), sehingga sidebar dan toolbox tidak pernah berbeda pendapat.
  const unitFilter = selectActiveUnitId(state)

  const searchTerm = selectSearchTerm(state)
  const [statusPegawai, setStatusPegawai] = useState('all')
  const [status, setStatus] = useState('all')
  const [layout, setLayout] = useState('cr80')
  const [validityYears, setValidityYears] = useState(DEFAULT_VALIDITY_YEARS)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(null)
  const [printSnapshot, setPrintSnapshot] = useState(null)

  // Halaman cetak dirender ulang setiap layout/isi berubah.
  useEffect(() => {
    const style = document.getElementById(PAGE_STYLE_ID)
    const css = pageStyleFor(layout)
    if (style) {
      style.textContent = css
    } else {
      const el = document.createElement('style')
      el.id = PAGE_STYLE_ID
      el.textContent = css
      document.head.appendChild(el)
    }
  }, [layout])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // Daftar kartu hasil filter. Seluruh isi kartu dibaca dari data pegawai
  // terkini, jadi setiap perubahan di Data Guru/Pegawai langsung terlihat.
  const filteredStaff = useMemo(
    () => selectFilteredCardStaff(state, { unitId: unitFilter, searchTerm, statusPegawai, status }),
    [state.staff, state.units, state.employeeCards, state.selectedUnitId, state.currentUser, searchTerm, statusPegawai, status],
  )

  const cardRows = useMemo(
    () => selectCardRows(state, filteredStaff),
    [state.staff, state.units, state.employeeCards, filteredStaff],
  )

  // Ringkasan mengikuti cakupan unit (bukan hasil pencarian) supaya angka
  // header tetap stabil saat pengguna mengetik di kotak pencarian. Dependensi
  // sengaja tidak memakai objek state penuh: presensi yang berubah tiap menit
  // tidak boleh memicu pemetaan ulang seluruh pegawai.
  const scopedStaff = useMemo(() => selectScopedStaff(state), [state.staff, state.units, state.selectedUnitId, state.currentUser])
  const summary = useMemo(() => selectCardSummary(state, scopedStaff), [state.employeeCards, scopedStaff])
  const scopedTotal = scopedStaff.length

  // Seleksi yang menunjuk pegawai yang sudah dihapus dibersihkan otomatis.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const valid = new Set(state.staff.map((s) => s.id))
      const next = new Set([...prev].filter((id) => valid.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [state.staff])

  const totalPages = Math.max(1, Math.ceil(cardRows.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const visibleRows = cardRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const firstShown = cardRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const lastShown = Math.min(safePage * PAGE_SIZE, cardRows.length)

  // Jendela nomor halaman: maksimal 7 slot (halaman pertama, elipsis, jendela
  // sekitar halaman aktif, elipsis, halaman terakhir). 189 kartu = 16 halaman,
  // dan merender semuanya akan memaksa baris paginasi meluber.
  const pageWindow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = [1]
    const start = Math.max(2, safePage - 1)
    const end = Math.min(totalPages - 1, safePage + 1)
    if (start > 2) pages.push('gap')
    for (let p = start; p <= end; p++) pages.push(p)
    if (end < totalPages - 1) pages.push('gap')
    pages.push(totalPages)
    return pages
  }, [totalPages, safePage])

  const resetPage = useCallback((setter) => (value) => {
    setter(value)
    setCurrentPage(1)
  }, [])

  // Reset Filter mengembalikan seluruh kontrol baris 2 ke kondisi awal.
  // Filter unit ikut dikembalikan ke "Semua Unit" hanya bila pengguna punya
  // izin berpindah unit; Admin Unit memang terkunci ke unitnya sendiri.
  const handleResetFilters = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: '' })
    setStatusPegawai('all')
    setStatus('all')
    if (canSwitchUnit && unitFilter !== ALL_UNITS) {
      dispatch({ type: 'SET_SELECTED_UNIT', payload: ALL_UNITS })
    }
    setCurrentPage(1)
  }, [canSwitchUnit, dispatch, unitFilter])

  const handleUnitFilterChange = useCallback((value) => {
    dispatch({ type: 'SET_SELECTED_UNIT', payload: value })
    setCurrentPage(1)
  }, [dispatch])

  const handleToggleCard = useCallback((staffId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(staffId)) next.delete(staffId)
      else next.add(staffId)
      return next
    })
  }, [])

  // "Pilih Semua" bekerja pada seluruh hasil filter, bukan hanya halaman ini.
  const allSelected = cardRows.length > 0 && cardRows.every((row) => selectedIds.has(row.staff.id))

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const row of cardRows) next.delete(row.staff.id)
      } else {
        for (const row of cardRows) next.add(row.staff.id)
      }
      return next
    })
  }, [allSelected, cardRows])

  // Kartu terpilih dihitung dari baris kartu (bukan id mentah), sehingga id
  // milik pegawai di luar cakupan user tidak pernah ikut tercetak.
  const selectedRows = useMemo(
    () => cardRows.filter((row) => selectedIds.has(row.staff.id)),
    [cardRows, selectedIds],
  )

  const selectedIdsList = useMemo(() => selectedRows.map((row) => row.staff.id), [selectedRows])

  const handleApplyValidity = useCallback(() => {
    if (selectedIdsList.length === 0) return
    setCardsValidity(dispatch, selectedIdsList, { validityYears })
    addActivityLog(
      dispatch, state, 'Ubah', 'Kartu ID Pegawai',
      `Perbarui masa berlaku ${validityYears} tahun untuk ${selectedIdsList.length} kartu terpilih`,
      null, null, currentUser?.unitId,
    )
    setToast(`Masa berlaku kartu diperbarui menjadi ${validityYears} tahun.`)
  }, [dispatch, state, currentUser, selectedIdsList, validityYears])

  const handlePrint = useCallback(() => {
    if (selectedRows.length === 0) return
    setBusy('print')
    // Snapshot: yang dicetak persis kartu yang sedang dipilih, bukan kondisi
    // filter yang bisa berubah saat dialog cetak terbuka.
    setPrintSnapshot({ rows: selectedRows, layout })
    markCardsPrinted(dispatch, selectedIdsList)
    addActivityLog(
      dispatch, state, 'Cetak', 'Kartu ID Pegawai',
      `Cetak ${selectedRows.length} kartu ID (${printLayoutByValue(layout).label}) untuk ${selectUnitName(state, unitFilter)}`,
      null, null, currentUser?.unitId,
    )
    setToast(`${selectedRows.length} kartu dikirim ke printer.`)
  }, [dispatch, state, currentUser, layout, selectedIdsList, selectedRows, unitFilter])

  // window.print() dipanggil setelah snapshot selesai dirender. Menunggu satu
  // tick supaya area cetak sudah ada di DOM sebelum dialog printer dibuka.
  useEffect(() => {
    if (!printSnapshot) return undefined
    const timer = setTimeout(() => {
      window.print()
      setBusy(null)
    }, 120)
    return () => clearTimeout(timer)
  }, [printSnapshot])

  // Setelah dialog cetak ditutup, area cetak dikosongkan kembali.
  useEffect(() => {
    if (!printSnapshot) return undefined
    const clear = () => setPrintSnapshot(null)
    window.addEventListener('afterprint', clear)
    return () => window.removeEventListener('afterprint', clear)
  }, [printSnapshot])

  const handleDownload = useCallback(async () => {
    if (selectedRows.length === 0) return
    setBusy('pdf')
    try {
      const result = await exportCardsToPdf(selectedRows, {
        settings: state.settings,
        units: state.units,
        layout,
      })
      if (result.ok) {
        markCardsPrinted(dispatch, selectedIdsList)
        addActivityLog(
          dispatch, state, 'Ekspor', 'Kartu ID Pegawai',
          `Unduh PDF ${result.pages} halaman berisi ${selectedRows.length} kartu ID (${printLayoutByValue(layout).label})`,
          null, null, currentUser?.unitId,
        )
        setToast(`PDF ${result.pages} halaman berhasil diunduh.`)
      } else {
        setToast('PDF tidak dapat dibuat: tidak ada kartu terpilih.')
      }
    } catch (error) {
      setToast(`Gagal membuat PDF: ${error?.message || 'terjadi kesalahan'}.`)
    } finally {
      setBusy(null)
    }
  }, [dispatch, state, currentUser, layout, selectedIdsList, selectedRows])

  const allUnitLabel = canSwitchUnit && unitFilter === ALL_UNITS
    ? 'semua unit'
    : selectUnitName(state, unitFilter)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 w-full min-w-0">
      <CardBreadcrumbHeader summary={summary} selectedCount={selectedIds.size} />

      <CardToolbar
        onUnitFilterChange={handleUnitFilterChange}
        searchTerm={searchTerm}
        onSearchTermChange={(v) => {
          setCurrentPage(1)
          dispatch({ type: 'SET_SEARCH_TERM', payload: v })
        }}
        statusPegawai={statusPegawai}
        onStatusPegawaiChange={resetPage(setStatusPegawai)}
        status={status}
        onStatusChange={resetPage(setStatus)}
        layout={layout}
        onLayoutChange={setLayout}
        validityYears={validityYears}
        onValidityYearsChange={setValidityYears}
        onApplyValidity={handleApplyValidity}
        allSelected={allSelected}
        onToggleSelectAll={handleToggleSelectAll}
        filteredCount={cardRows.length}
        selectedCount={selectedIds.size}
        onReset={handleResetFilters}
        onPrint={handlePrint}
        onDownload={handleDownload}
        busy={busy}
      />

      {toast && (
        <div className="px-4 py-3 bg-card text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 rounded-xl border border-emerald-500/30 shadow-md">
          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">check_circle</span>
          <span className="font-semibold">{toast}</span>
        </div>
      )}

      {/* Kartu yang siap dicetak: grid responsif mengikuti lebar konten. */}
      {visibleRows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {visibleRows.map((row) => (
            <EmployeeIdCard
              key={row.staff.id}
              row={row}
              settings={state.settings}
              units={state.units}
              selected={selectedIds.has(row.staff.id)}
              onToggle={handleToggleCard}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-xs flex flex-col items-center justify-center gap-2 py-14 px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground mb-1">
            <span className="material-symbols-outlined text-[28px]">badge</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {scopedTotal === 0
              ? 'Belum ada pegawai pada cakupan unit ini.'
              : 'Tidak ada kartu yang sesuai dengan filter pencarian.'}
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            {scopedTotal === 0
              ? `Data pegawai unit ${allUnitLabel} belum tersedia. Tambahkan pegawai lewat menu Data Guru/Pegawai.`
              : 'Ubah kata kunci pencarian atau atur ulang filter status kepegawaian.'}
          </p>
          {scopedTotal > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-3 h-9 px-4 rounded-lg bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">restore</span>
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      )}

      {/* Paginasi + ringkasan pilihan */}
      <div className="bg-card rounded-xl border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 p-4 text-xs text-muted-foreground">
        <div>
          Menampilkan <strong className="font-semibold text-foreground">{firstShown}&ndash;{lastShown}</strong>{' '}
          dari <strong className="font-semibold text-primary">{cardRows.length}</strong> kartu
          ({scopedTotal} pegawai pada {allUnitLabel})
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setCurrentPage(safePage - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Halaman sebelumnya"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          {pageWindow.map((page, index) =>
            page === 'gap' ? (
              <span key={`gap-${index}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground text-xs">…</span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                aria-current={safePage === page ? 'page' : undefined}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors cursor-pointer ${
                  safePage === page
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-card border border-border text-foreground hover:bg-muted'
                }`}
              >
                {page}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage(safePage + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Halaman berikutnya"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Petunjuk teknis cetak — sesuai layout CR80 yang dipilih */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[18px]">info</span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-bold text-foreground">Pedoman Percetakan Kartu ID:</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Gunakan kertas PVC Card standar ID-1 (85.60 &times; 53.98 mm) untuk printer kartu direct-to-card. Untuk
            {' '}
            layout lembar A4, atur skala pencetakan ke
            {' '}
            <span className="font-mono text-foreground font-semibold">100% (Actual Size)</span> dengan margin
            {' '}
            <span className="font-mono text-foreground font-semibold">0 mm</span> agar barcode dan QR Code dapat
            dipindai oleh sensor kiosk presensi unit. Cetak dengan orientasi
            {' '}
            <span className="font-mono text-foreground font-semibold">landscape</span> untuk kartu CR80.
          </p>
        </div>
      </div>

      <CardPrintSheet
        rows={printSnapshot ? printSnapshot.rows : []}
        settings={state.settings}
        units={state.units}
        layout={printSnapshot ? printSnapshot.layout : layout}
      />
    </div>
  )
}

export default CetakKartuIdPage
