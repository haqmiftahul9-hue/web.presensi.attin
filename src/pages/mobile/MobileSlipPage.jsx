import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useSimPres, selectSelfStaff, selectSelfPresensi, selectRiwayatPresensiSaya, selectSelfLeaves,
  selectUnitById,
} from '../../store/simPresStore.jsx'
import {
  bulanKey, namaBulanDariKey, rekapBulanan, rataKeterlambatan,
  tanggalPendekISO, hariPendekISO, jamPendek, BULAN_PENDEK,
} from '../../data/presensiMobile.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { EmptyState, ErrorState } from '../../components/mobile/Feedback.jsx'

function daftarBulan(jumlah = 6) {
  const hasil = []
  const dasar = new Date()
  for (let i = 0; i < jumlah; i++) {
    const d = new Date(dasar.getFullYear(), dasar.getMonth() - i, 1)
    hasil.push(bulanKey(d))
  }
  return hasil
}

function statusBaris(baris) {
  if (!baris.masuk) return { label: 'Alpha', kelas: 'bg-error-container text-on-error-container' }
  if (baris.late > 0) return { label: `Terlambat ${baris.late}′`, kelas: 'bg-amber-50 text-amber-800' }
  return { label: 'Tepat Waktu', kelas: 'bg-emerald-50 text-emerald-700' }
}

/**
 * Slip Kehadiran: bukti kehadiran bulanan milik pegawai sendiri, siap dicetak
 * sebagai tanda tangan Kepala Unit. Data diambil dari riwayat presensi yang
 * sama dengan halaman Riwayat, jadi angka di slip tidak mungkin berbeda dengan
 * rekap di aplikasi.
 */
function MobileSlipPage() {
  const { state } = useSimPres()
  const navigate = useNavigate()
  const staff = selectSelfStaff(state)
  const presensi = selectSelfPresensi(state)
  const unit = staff ? selectUnitById(state, staff.unitId) : null
  const [bulan, setBulan] = useState(() => bulanKey())

  const bulanTersedia = useMemo(() => daftarBulan(), [])
  const riwayat = useMemo(() => selectRiwayatPresensiSaya(state, 200), [state])
  const izin = useMemo(() => selectSelfLeaves(state), [state])

  const rekap = useMemo(() => rekapBulanan(riwayat, bulan), [riwayat, bulan])
  const rataTelat = useMemo(() => rataKeterlambatan(riwayat, bulan), [riwayat, bulan])
  const baris = useMemo(
    () =>
      riwayat
        .filter((r) => String(r.date).startsWith(bulan))
        .slice()
        .sort((a, b) => (a.date > b.date ? 1 : -1)),
    [riwayat, bulan],
  )
  const disetujui = useMemo(() => {
    // Periode pada data pengajuan ditulis "16-18 Sep 2026", jadi pencocokan
    // bulan slip memakai nama bulan singkat + tahun yang sama.
    const penanda = `${BULAN_PENDEK[Number(bulan.split('-')[1]) - 1]} ${bulan.split('-')[0]}`
    return izin.filter((l) => l.status === 'Disetujui' && String(l.periode || '').includes(penanda))
  }, [izin, bulan])

  if (!staff || !presensi) {
    return (
      <div className="px-4 py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="Slip kehadiran hanya bisa dibuat untuk akun yang terhubung ke data pegawai."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }

  const zonaWaktu = presensi.rules.zonaWaktu
  const namaBulan = namaBulanDariKey(bulan)

  return (
    <div className="sp-page">
      <section className="sp-hide-print bg-primary-container text-on-primary px-4 pt-4 pb-6 rounded-b-[28px] shadow-md">
        <span className="font-label-sm text-label-sm text-on-primary-container">Dokumen Kehadiran</span>
        <h1 className="font-headline-sm text-headline-sm text-white">Slip Kehadiran</h1>
      </section>

      <div className="px-4 -mt-4 relative z-20 flex flex-col gap-4 pb-6">
        <div className="sp-hide-print sp-x-scroll flex gap-2 pb-1 -mx-1 px-1">
          {bulanTersedia.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setBulan(key)}
              aria-pressed={key === bulan}
              className={`shrink-0 px-3.5 py-2 rounded-full font-label-md text-label-md transition-colors ${
                key === bulan
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {BULAN_PENDEK[Number(key.split('-')[1]) - 1]} {key.split('-')[0].slice(2)}
            </button>
          ))}
        </div>

        {/* Dokumen slip: satu blok putih yang ikut tercetak apa adanya. */}
        <section className="sp-card p-4 sp-print-slip flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[20px]">fingerprint</span>
              </span>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">SimPres Kepegawaian</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {unit?.nama || '-'}
                </span>
              </div>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Periode {namaBulan} {bulan.split('-')[0]}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <StaffAvatar staff={staff} size="w-14 h-14" textClass="font-headline-sm text-headline-sm" ring="ring-1 ring-outline-variant/40" />
            <div className="flex flex-col min-w-0">
              <span className="font-body-md-medium text-body-md-medium text-on-surface">{staff.name}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">NIY {staff.niy}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                {staff.role} • {unit?.nama}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Hadir', nilai: rekap.hadir, tone: 'text-emerald-600' },
              { label: 'Tepat', nilai: rekap.tepatWaktu, tone: 'text-on-surface' },
              { label: 'Telat', nilai: rekap.terlambat, tone: 'text-amber-600' },
              { label: 'Izin', nilai: disetujui.length, tone: 'text-secondary' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-0.5 rounded-xl bg-surface-container-low py-2.5">
                <span className={`font-display-lg-mobile text-[18px] font-bold leading-none ${item.tone}`}>
                  {item.nilai}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Rincian kehadiran harian</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {rataTelat ? `Rata-rata telat ${rataTelat}′` : 'Tanpa keterlambatan'}
            </span>
          </div>

          {baris.length ? (
              <ul className="divide-y divide-surface-container border-t border-surface-container">
                {baris.map((h) => {
                  const status = statusBaris(h)
                  return (
                    <li key={`${h.date}-${h.id}`} className="flex items-center gap-2 py-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant w-8 shrink-0">
                        {hariPendekISO(h.date)}
                      </span>
                      <span className="font-body-sm-medium text-body-sm-medium text-on-surface w-11 shrink-0">
                        {tanggalPendekISO(h.date)}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant tabular-nums shrink-0">
                        {jamPendek(h.masuk) || '--:--'}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant tabular-nums shrink-0">
                        {jamPendek(h.pulang) || '--:--'}
                      </span>
                      <span className={`ml-auto px-2 py-0.5 rounded-full font-label-sm text-label-sm shrink-0 ${status.kelas}`}>
                        {status.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                ikon="receipt_long"
                judul="Belum ada data kehadiran"
                detail="Slip ini akan terisi otomatis setelah ada presensi pada bulan yang dipilih."
              />
            )}

          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Jam kerja {presensi.rules.jamMasuk} - {presensi.rules.jamPulang} {zonaWaktu}, toleransi{' '}
            {presensi.rules.toleransi} menit. Slip ini dihasilkan langsung dari data presensi SimPres.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Mengetahui,</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Kepala Unit</span>
              <span className="h-10" />
              <span className="font-body-sm-medium text-body-sm-medium text-on-surface underline">
                {state.adminUsers?.find((u) => u.unitId === staff.unitId)?.name || 'Kepala Unit'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{unit?.nama || 'Cilegon'},</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Pegawai concerned</span>
              <span className="h-10" />
              <span className="font-body-sm-medium text-body-sm-medium text-on-surface underline">{staff.name}</span>
            </div>
          </div>
        </section>

        <div className="sp-hide-print flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-2xl bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Cetak Slip
          </button>
          <button
            type="button"
            onClick={() => navigate('/mobile/riwayat')}
            className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Riwayat
          </button>
        </div>
      </div>
    </div>
  )
}

export default MobileSlipPage
