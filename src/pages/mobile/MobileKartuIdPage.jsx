import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import {
  useSimPresOptional, selectSelfStaff, selectSelfPresensi, selectUnitById, selectCardRows,
} from '../../store/simPresStore.jsx'
import { EmployeeIdCardPrint } from '../../components/cards/EmployeeIdCard.jsx'
import { employeeQrInfo, formatDateID } from '../../data/employeeCard.js'
import { exportCardsToPdf } from '../../utils/cardPrint.js'
import { getEmployeeGreeting } from '../../data/sapaanPegawai.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { SectionTitle } from '../../components/mobile/AppShell.jsx'
import { ErrorState, LoadingState, Spinner } from '../../components/mobile/Feedback.jsx'

/**
 * Kartu ID Pegawai versi mobile.
 *
 * Kartu yang ditampilkan BUKAN gambar QR yang disederhanakan, melainkan wajah
 * kartu PVC CR80 yang sama persis dengan halaman Cetak Kartu ID Superadmin:
 * komponen `EmployeeIdCardPrint` dipakai ulang, begitu juga baris datanya
 * (`selectCardRows`) dan utilitas unduhnya (`exportCardsToPdf`). Jadi foto,
 * nama, gelar, jabatan, NIY, unit, logo yayasan, barcode, dan QR di sini
 * dijamin sama dengan yang dicetak Superadmin — bukan tiruan.
 *
 * QR-nya pun sama: kartu ini memakai `employeeQrInfo().value`, yang juga
 * menjadi isi QR pada halaman "QR Presensi".
 */
function MobileKartuIdPage() {
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [sibuk, setSibuk] = useState(false)

  const staff = state ? selectSelfStaff(state) : null
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const presensi = state ? selectSelfPresensi(state) : null
  // Sumber yang sama dengan halaman Cetak Kartu ID Superadmin (state.settings),
  // berisi nama dan logo yayasan.
  const settings = state?.settings ?? null

  // Baris kartu yang sama persis dengan yang dipakai Superadmin: kartu +
  // data pegawai terkini digabung di satu tempat.
  const baris = staff && state ? selectCardRows(state, [staff])[0] : null
  const qr = staff ? employeeQrInfo(staff) : null

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading Kartu ID" detail="Mengambil data kartu Anda…" />
      </div>
    )
  }

  if (!staff || !baris) {
    return (
      <div className="sp-page-container py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="Kartu ID hanya bisa dibuat untuk akun yang terhubung ke data pegawai."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }

  /**
   * Unduh kartu sebagai PDF sized CR80 (85.60 x 53.98 mm). Memakai utilitas
   * yang sama dengan Superadmin, sehingga vektor QR dan barcode tetap tajam
   * dan printer direct-to-card bisa langsung mencetak tanpa penskalaan.
   */
  async function unduhKartu() {
    if (sibuk) return
    setSibuk(true)
    setStatus('Menyiapkan PDF kartu…')
    try {
      const hasil = await exportCardsToPdf([baris], {
        settings,
        units: state.units,
        layout: 'cr80',
        fileName: `Kartu_ID_${(qr.identitas || 'pegawai').replace(/[^\w-]/g, '_')}.pdf`,
      })
      if (hasil.ok) setStatus(`Kartu ID berhasil diunduh (${hasil.fileName}).`)
      else setStatus('Kartu ID tidak dapat dibuat.')
    } catch (error) {
      setStatus(`Gagal membuat PDF: ${error?.message || 'terjadi kesalahan'}.`)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="sp-page">
      <section className="sp-hero sp-page-container pt-4 pb-6">
        <span className="sp-pattern-dots" aria-hidden="true" />
        <span className="sp-blob sp-blob-a" aria-hidden="true" />
        <div className="relative z-[1]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Kembali"
              className="w-10 h-10 rounded-xl bg-white border border-[#E0E6F2] text-[#323D8F] flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-all"
            >
              <Icon name="arrow_back" className="text-[20px]" />
            </button>
            <StaffAvatar staff={staff} size="w-12 h-12" textClass="font-headline-sm text-headline-sm" ring="ring-2 ring-[#323D8F]/20" />
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-[#77819A]">Kartu ID Pegawai</span>
              <h1 className="font-headline-sm text-headline-sm text-[#20243A] font-bold truncate">
                {getEmployeeGreeting(staff, { unit })}
              </h1>
              <span className="font-label-sm text-label-sm text-[#77819A] truncate">{unit?.nama}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4 pb-2">
        {/* Pratinjau kartu digital: kartu CR80 asli (85.60 x 53.98 mm) dengan
            rasio yang persis, duduk di atas bayangan lembut supaya terbaca
            seperti kartu fisik di tangan. */}
        <section className="sp-card p-4 flex flex-col gap-3.5 sp-rise border border-[#E0E6F2] rounded-2xl bg-white shadow-xs">
          <SectionTitle
            ikon="contact_page"
            judul="Pratinjau Kartu"
            aksi={<span className="font-mono font-label-sm text-label-sm text-[#77819A] shrink-0">CR80 85.6 × 53.98 mm</span>}
          />

          <div className="w-full aspect-[85.6/53.98] rounded-xl overflow-hidden shadow-[0_12px_28px_-12px_rgba(50,61,143,0.35)] ring-1 ring-[#E0E6F2]">
            <EmployeeIdCardPrint row={baris} settings={settings} units={state.units} />
          </div>

          <div className="flex flex-col">
            <Baris label="Nomor kartu" nilai={baris.card.id} mono />
            <Baris label="Berlaku s.d." nilai={formatDateID(baris.card.expired_date)} />
            <Baris label="Terbit" nilai={formatDateID(baris.card.issued_date)} />
            <Baris label="Dicetak" nilai={`${baris.card.printed_count ?? 0} kali`} />
            <Baris label="Barcode" nilai={baris.barcode} mono />
            <Baris label="Payload QR" nilai={qr.value} mono />
          </div>
        </section>

        <button
          type="button"
          onClick={unduhKartu}
          disabled={sibuk}
          className="sp-btn w-full min-h-[56px] py-4 bg-[#323D8F] hover:bg-[#283273] text-white border-[2px] border-[#323D8F] shadow-lg shadow-[#323D8F]/20 font-headline-sm text-headline-sm flex items-center justify-center gap-2.5 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
        >
          {sibuk ? <Spinner /> : <Icon name="download" className="text-[24px] shrink-0" />}
          {sibuk ? 'Menyiapkan…' : 'Download Kartu ID'}
        </button>

        <p className="text-center font-label-sm text-label-sm text-[#77819A] leading-snug">
          Berkas PDF sized CR80 — siap dicetak pada printer kartu PVC tanpa penskalaan.
        </p>

        {status && (
          <p
            role="status"
            className="rounded-2xl bg-[#EEF0FC] text-[#323D8F] border border-[#323D8F]/20 px-3.5 py-3 font-body-sm text-body-sm flex items-start gap-2 leading-snug"
          >
            <Icon name="info" className="text-[16px] mt-0.5 shrink-0 text-[#323D8F]" />
            <span>{status}</span>
          </p>
        )}

        {/* QR di kartu ini identik dengan halaman QR Presensi. */}
        <button
          type="button"
          onClick={() => navigate('/mobile/qr')}
          className="sp-card sp-btn p-4 flex items-center gap-3 text-left border border-[#E0E6F2] rounded-2xl bg-white shadow-xs hover:border-[#323D8F]/30 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="w-11 h-11 rounded-xl bg-[#EEF0FC] text-[#323D8F] flex items-center justify-center shrink-0">
            <Icon name="qr_code_scanner" className="text-[22px]" />
          </span>
          <span className="flex flex-col min-w-0 flex-1 gap-0.5">
            <span className="font-body-md-medium text-body-md-medium text-[#20243A] font-semibold">QR Presensi</span>
            <span className="font-label-sm text-label-sm text-[#77819A] leading-snug">
              Kode yang sama dengan pada kartu ini
            </span>
          </span>
          <Icon name="chevron_right" className="text-[20px] text-[#77819A] shrink-0" />
        </button>

        {presensi && (
          <p className="text-center font-label-sm text-label-sm text-[#77819A] leading-snug">
            Unit {presensi.rules.jamKerja ? 'terdaftar' : ''} • QR berlaku selama data pegawai aktif
          </p>
        )}
      </div>
    </div>
  )
}

function Baris({ label, nilai, mono = false }) {
  return (
    <div className="sp-data-row">
      <span className="sp-data-row-label font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      <span className={`sp-data-row-value font-body-sm text-body-sm text-on-surface truncate ${mono ? 'font-mono text-[12px]' : ''}`}>
        {nilai || '-'}
      </span>
    </div>
  )
}

export default MobileKartuIdPage
