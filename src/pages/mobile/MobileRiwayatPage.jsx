import { useMemo, useState } from 'react'
import {
  useSimPres, selectSelfStaff, selectSelfPresensi, selectUnitById,
  selectRiwayatPresensiSaya, selectSelfLeaves,
} from '../../store/simPresStore.jsx'
import {
  BULAN_PENDEK, BULAN_ID, pad, isoHariIni, jamPendek, hariPendekISO, tanggalPanjang,
  izinPerTanggal, statusHari, metodePresensi, rekapHarian,
} from '../../data/presensiMobile.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { EmptyState, ErrorState } from '../../components/mobile/Feedback.jsx'

const FILTER_BULAN = BULAN_PENDEK.map((nama, i) => ({ nilai: i + 1, nama, panjang: BULAN_ID[i] }))

function ChipFilter({ label, nilai, aktif, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={`shrink-0 px-3.5 py-2 rounded-full font-label-md text-label-md transition-colors ${
        aktif ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant'
      }`}
    >
      {label}
      {nilai ? <span className="ml-1 opacity-70">{nilai}</span> : null}
    </button>
  )
}

/**
 * Kartu satu hari. Ringkasan (tanggal, masuk, pulang, status) selalu terlihat;
 * detail presensi — metode, lokasi titik, koordinat, radius, dan catatan izin —
 * dibuka lewat tombol agar daftar tetap ringan di layar 390px.
 */
function KartuHari({ tanggal, masuk, pulang, late, status, metode, titikLokasi, koordinatTeks, radius, catatanIzin, zonaWaktu }) {
  const [terbuka, setTerbuka] = useState(false)
  const detail = metodePresensi(metode)

  return (
    <li className="sp-card overflow-hidden">
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-11 h-11 rounded-xl bg-surface-container flex flex-col items-center justify-center shrink-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{hariPendekISO(tanggal)}</span>
              <span className="font-body-md-medium text-body-md-medium text-on-surface leading-none">
                {tanggal.split('-')[2]}
              </span>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">
                {tanggalPanjang(new Date(`${tanggal}T00:00:00`))}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                {catatanIzin ? `${catatanIzin.jenis} • ${catatanIzin.durasi}` : metode.ket}
              </span>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shrink-0 ${status.kelas}`}>
            <span className="material-symbols-outlined text-[13px]">{status.ikon}</span>
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-container-low px-3 py-2 flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Masuk</span>
            <span className="font-body-md-medium text-body-md-medium text-on-surface tabular-nums">
              {masuk ? `${jamPendek(masuk)} ${zonaWaktu}` : '--:--'}
            </span>
          </div>
          <div className="rounded-xl bg-surface-container-low px-3 py-2 flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Pulang</span>
            <span className="font-body-md-medium text-body-md-medium text-on-surface tabular-nums">
              {pulang ? `${jamPendek(pulang)} ${zonaWaktu}` : '--:--'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">{detail.ikon}</span>
            Metode: {detail.label}
          </span>
          <button
            type="button"
            onClick={() => setTerbuka((v) => !v)}
            aria-expanded={terbuka}
            className="font-label-sm text-label-sm text-secondary flex items-center gap-0.5"
          >
            Detail presensi
            <span className="material-symbols-outlined text-[14px]">{terbuka ? 'expand_less' : 'expand_more'}</span>
          </button>
        </div>
      </div>

      {terbuka && (
        <div className="px-4 pb-4 pt-1 border-t border-surface-container bg-surface-container-lowest animate-sp-rise">
          <div className="divide-y divide-surface-container pt-1">
            <BarisDetail label="Status" nilai={status.label} />
            <BarisDetail label="Jam masuk" nilai={masuk ? `${jamPendek(masuk)} ${zonaWaktu}` : 'Tidak ada presensi'} />
            <BarisDetail label="Jam pulang" nilai={pulang ? `${jamPendek(pulang)} ${zonaWaktu}` : 'Belum absen pulang'} />
            {late > 0 && <BarisDetail label="Keterlambatan" nilai={`${late} menit`} />}
            <BarisDetail label="Metode" nilai={metode || 'Tidak tercatat'} />
            <BarisDetail label="Lokasi" nilai={titikLokasi} />
            <BarisDetail label="Koordinat" nilai={koordinatTeks} />
            <BarisDetail label="Radius geofence" nilai={`${radius} meter`} />
            {catatanIzin && (
              <>
                <BarisDetail label="Jenis pengajuan" nilai={catatanIzin.jenis} />
                <BarisDetail label="Periode" nilai={`${catatanIzin.periode} (${catatanIzin.durasi})`} />
                <BarisDetail label="Status pengajuan" nilai={catatanIzin.status} />
                {catatanIzin.keterangan && <BarisDetail label="Keterangan" nilai={catatanIzin.keterangan} />}
              </>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

function BarisDetail({ label, nilai }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{label}</span>
      <span className="font-body-sm text-body-sm text-on-surface text-right break-words">{nilai}</span>
    </div>
  )
}

/**
 * Riwayat Presensi versi mobile: daftar kartu per hari (tanpa tabel), difilter
 * bulan dan tahun terpisah. Sumber datanya riwayat presensi milik pegawai sendiri
 * di store, digabung dengan pengajuan izin/cuti yang sudah disetujui.
 */
function MobileRiwayatPage() {
  const { state } = useSimPres()
  const staff = selectSelfStaff(state)
  const presensi = selectSelfPresensi(state)
  const unit = staff ? selectUnitById(state, staff.unitId) : null

  const riwayat = useMemo(() => selectRiwayatPresensiSaya(state, 400), [state])
  const izin = useMemo(() => selectSelfLeaves(state), [state])
  const petaIzin = useMemo(() => izinPerTanggal(izin), [izin])

  const [tahun, setTahun] = useState(() => new Date().getFullYear())
  const [bulan, setBulan] = useState(() => new Date().getMonth() + 1)

  // Tahun yang punya data, plus tahun berjalan supaya filter tidak pernah kosong
  // walau pegawai belum punya riwayat di tahun ini.
  const daftarTahun = useMemo(() => {
    const set = new Set(riwayat.map((r) => Number(String(r.date).slice(0, 4))))
    petaIzin.forEach((_, iso) => set.add(Number(String(iso).slice(0, 4))))
    set.add(new Date().getFullYear())
    return [...set].filter(Boolean).sort((a, b) => b - a)
  }, [riwayat, petaIzin])

  const key = `${tahun}-${pad(bulan)}`
  const zonaWaktu = presensi?.rules?.zonaWaktu || 'WIB'
  const radius = presensi?.rules?.radius ?? unit?.radius ?? 0
  const titikLokasi = `Gerbang Utama — ${unit?.nama || 'Unit'}`

  const koordinatTeks = unit?.latitude
    ? `${Number(unit.latitude).toFixed(5)}, ${Number(unit.longitude).toFixed(5)}`
    : 'Koordinat belum diatur'

  const baris = useMemo(() => {
    const byTanggal = new Map(riwayat.filter((r) => String(r.date).startsWith(key)).map((r) => [r.date, r]))
    petaIzin.forEach((value, iso) => {
      if (!String(iso).startsWith(key)) return
      // Hari izin/cuti tetap ditampilkan walau tidak ada baris presensi.
      if (!byTanggal.has(iso)) byTanggal.set(iso, { date: iso, masuk: null, pulang: null, late: 0, izin: value })
    })
    return [...byTanggal.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [riwayat, petaIzin, key])

  const rekap = useMemo(() => rekapHarian({ riwayat, izinTanggal: petaIzin, key }), [riwayat, petaIzin, key])

  if (!staff || !presensi) {
    return (
      <div className="px-4 py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="Riwayat hanya bisa dibaca untuk akun yang terhubung ke data pegawai."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }

  const hariIni = isoHariIni()

  return (
    <div className="sp-page">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-container via-[#12325f] to-[#08182f] text-on-primary px-4 pt-4 pb-8 rounded-b-[28px] shadow-lg">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <StaffAvatar staff={staff} size="w-12 h-12" textClass="font-headline-sm text-headline-sm" />
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-label-sm text-on-primary-container">Riwayat Kehadiran</span>
            <h1 className="font-headline-sm text-headline-sm text-white">{BULAN_ID[bulan - 1]} {tahun}</h1>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex items-center">
          {[
            { label: 'Hadir', nilai: rekap.hadir, tone: 'text-white' },
            { label: 'Tepat', nilai: rekap.tepatWaktu, tone: 'text-emerald-300' },
            { label: 'Terlambat', nilai: rekap.terlambat, tone: 'text-amber-300' },
            { label: 'Izin/Cuti', nilai: rekap.izin + rekap.cuti, tone: 'text-blue-200' },
          ].map((item, i) => (
            <div key={item.label} className={`flex-1 flex flex-col items-center gap-0.5 ${i > 0 ? 'border-l border-white/10' : ''}`}>
              <span className={`font-display-lg-mobile text-display-lg-mobile leading-none ${item.tone}`}>{item.nilai}</span>
              <span className="font-label-sm text-label-sm text-on-primary-container">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="px-4 -mt-6 relative z-20 flex flex-col gap-4 pb-6">
        {/* Filter bulan & tahun terpisah. */}
        <section className="sp-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">calendar_month</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Filter Periode</span>
          </div>

          <div className="sp-x-scroll flex gap-2 pb-1 -mx-1 px-1">
            {daftarTahun.map((t) => (
              <ChipFilter
                key={t}
                label={String(t)}
                nilai={t === tahun ? '•' : ''}
                aktif={t === tahun}
                onClick={() => setTahun(t)}
              />
            ))}
          </div>

          <div className="sp-x-scroll flex gap-2 pb-1 -mx-1 px-1">
            {FILTER_BULAN.map((item) => (
              <ChipFilter
                key={item.nilai}
                label={item.nama}
                nilai={item.nilai === bulan ? '•' : ''}
                aktif={item.nilai === bulan}
                onClick={() => setBulan(item.nilai)}
              />
            ))}
          </div>

          <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, rekap.persen)}%` }}
            />
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {rekap.hadir} hari hadir · {rekap.izin + rekap.cuti} hari izin/cuti · {rekap.persen}% dari {rekap.totalHariKerja} hari kerja
          </p>
        </section>

        {/* Daftar kartu harian. */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="font-headline-sm text-headline-sm text-on-surface">Presensi Harian</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{baris.length} hari</span>
          </div>

          {baris.length ? (
            <ul className="flex flex-col gap-2.5">
              {baris.map((item) => {
                const catatanIzin = item.izin || petaIzin.get(item.date)
                return (
                  <KartuHari
                    key={`${item.date}-${item.id ?? 'izin'}`}
                    tanggal={item.date}
                    masuk={item.masuk}
                    pulang={item.pulang}
                    late={item.late || 0}
                    status={statusHari({ masuk: item.masuk, late: item.late || 0, izin: catatanIzin })}
                    metode={item.method}
                    titikLokasi={titikLokasi}
                    koordinatTeks={koordinatTeks}
                    radius={radius}
                    catatanIzin={catatanIzin}
                    zonaWaktu={zonaWaktu}
                  />
                )
              })}
            </ul>
          ) : (
            <EmptyState
              ikon="event_busy"
              judul={`Belum ada data pada ${BULAN_ID[bulan - 1]} ${tahun}`}
              detail="Riwayat presensi muncul setelah pegawai melakukan presensi pada bulan tersebut."
            />
          )}
        </section>

        {baris.some((item) => item.date === hariIni) && (
          <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
            Hari ini sudah termasuk dalam daftar.
          </p>
        )}
      </div>
    </div>
  )
}

export default MobileRiwayatPage