import { useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import {
  useSimPresOptional, selectSelfStaff, selectSelfPresensi, selectUnitById,
  selectRiwayatPresensiSaya, selectSelfLeaves,
} from '../../store/simPresStore.jsx'
import {
  BULAN_ID, isoHariIni, jamPendek, hariPendekISO, tanggalLengkapISO,
  isoKeTanggalID, tanggalIDKeISO, hitungRentangHari,
  izinPerTanggal, statusHari, metodePresensi, rekapRentang,
  filterRiwayatPeriode, rentangDariPeriode, labelPeriode, MODE_BULANAN, MODE_RENTANG,
} from '../../data/presensiMobile.js'
import { jamKerjaRules } from '../../data/jamKerja.js'
import StaffAvatar from '../../components/mobile/StaffAvatar.jsx'
import { SectionTitle } from '../../components/mobile/AppShell.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/mobile/Feedback.jsx'

const FILTER_BULAN = BULAN_ID.map((nama, i) => ({ nilai: i + 1, nama }))
const HARI_INI = isoHariIni()
const TAHUN_BERJALAN = new Date().getFullYear()

function ChipFilter({ label, aktif, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={`shrink-0 px-3.5 py-2 rounded-full font-label-md text-label-md transition-all ${
        aktif
          ? 'bg-[#323d8f] text-white shadow-xs font-semibold'
          : 'bg-[#f3f5fc] border border-[#e0e6f2] text-[#20243a] hover:bg-[#eef0fc]'
      }`}
    >
      {label}
    </button>
  )
}

/**
 * Kartu satu hari. Ringkasan (tanggal, masuk, pulang, status, keterlambatan)
 * selalu terlihat; detail presensi — metode, lokasi titik, koordinat, radius,
 * dan catatan izin — dibuka lewat tombol agar daftar tetap ringan di 390px.
 */
function KartuHari({ tanggal, masuk, pulang, lateMinutes, status, metode, titikLokasi, koordinatTeks, radius, catatanIzin, zonaWaktu, jamKerja }) {
  const [terbuka, setTerbuka] = useState(false)
  const detail = metodePresensi(metode)

  // Padding kartu ini dimiliki `.sp-list-card` (16px vertikal, 14-20px
  // horizontal). Karena itu blok di dalamnya tidak menambah padding lagi —
  // isi dan divider sama-sama berjarak aman dari sisi kartu.
  return (
    <li className="sp-list-card flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center shrink-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{hariPendekISO(tanggal)}</span>
              <span className="font-body-md-medium text-body-md-medium text-on-surface leading-none">
                {tanggal.split('-')[2]}
              </span>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-body-md-medium text-body-md-medium text-on-surface truncate">
                {tanggalLengkapISO(tanggal)}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                {catatanIzin ? `${catatanIzin.jenis} • ${catatanIzin.durasi}` : `Jam kerja ${jamKerja || '-'}`}
              </span>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shrink-0 ${status.kelas}`}>
            <Icon name={status.ikon} className="text-[13px] shrink-0" />
            {status.label}
          </span>
        </div>

        {/* Tiga kotak angka. Di 320px tiap kotak hanya ~57px setelah padding,
            dan "Keterlambatan" adalah satu kata yang tidak bisa dipatah baris
            sendiri — karena itu label memakai `break-words`: kalau tidak, teksnya
            keluar dari kotaknya dan menabrak kotak sebelah. */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#f3f5fc] border border-[#e0e6f2] px-3 py-2.5 flex flex-col gap-1 min-w-0">
            <span className="font-label-sm text-label-sm text-[#77819a] font-medium break-words">Masuk</span>
            <span className="font-body-md-medium text-body-md-medium text-[#20243a] font-semibold tabular-nums">
              {masuk ? jamPendek(masuk) : '--:--'}
            </span>
          </div>
          <div className="rounded-xl bg-[#f3f5fc] border border-[#e0e6f2] px-3 py-2.5 flex flex-col gap-1 min-w-0">
            <span className="font-label-sm text-label-sm text-[#77819a] font-medium break-words">Pulang</span>
            <span className="font-body-md-medium text-body-md-medium text-[#20243a] font-semibold tabular-nums">
              {pulang ? jamPendek(pulang) : '--:--'}
            </span>
          </div>
          <div className="rounded-xl bg-[#f3f5fc] border border-[#e0e6f2] px-3 py-2.5 flex flex-col gap-1 min-w-0">
            <span className="font-label-sm text-label-sm text-[#77819a] font-medium break-words">Keterlambatan</span>
            <span className={`font-body-md-medium text-body-md-medium font-semibold tabular-nums truncate ${lateMinutes > 0 ? 'text-amber-700' : 'text-[#20243a]'}`}>
              {lateMinutes} menit
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2.5">
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 min-w-0">
            <Icon name={detail.ikon} className="text-[14px] shrink-0" />
            <span className="truncate">{detail.label} · {zonaWaktu}</span>
          </span>
          <button
            type="button"
            onClick={() => setTerbuka((v) => !v)}
            aria-expanded={terbuka}
            className="font-label-sm text-label-sm text-[#323d8f] hover:text-[#242d6b] font-medium flex items-center gap-1 shrink-0 px-3 py-2 -mr-1.5 rounded-lg"
          >
            Detail presensi
            <Icon name={terbuka ? 'expand_less' : 'expand_more'} className="text-[14px]" />
          </button>
        </div>
      </div>

      {terbuka && (
        <div className="pt-3 border-t border-slate-100 animate-sp-rise">
          <div className="divide-y divide-slate-100">
            <BarisDetail label="Tanggal" nilai={tanggalLengkapISO(tanggal)} />
            <BarisDetail label="Status" nilai={status.label} />
            <BarisDetail label="Jam masuk" nilai={masuk ? `${jamPendek(masuk)} ${zonaWaktu}` : 'Tidak ada presensi'} />
            <BarisDetail label="Jam pulang" nilai={pulang ? `${jamPendek(pulang)} ${zonaWaktu}` : 'Belum absen pulang'} />
            <BarisDetail label="Keterlambatan" nilai={`${lateMinutes} menit`} />
            <BarisDetail label="Jam kerja hari itu" nilai={jamKerja || '-'} />
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
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{label}</span>
      <span className="font-body-sm text-body-sm text-on-surface text-right min-w-0 break-words">{nilai}</span>
    </div>
  )
}

/**
 * Kartu filter "Periode Presensi". Dua mode: Bulanan (pilih bulan + tahun) dan
 * Rentang Tanggal (dd/mm/yyyy). Isian disimpan di state lokal `form`; daftar
 * baru berubah setelah tombol Tampilkan ditekan, jadi mengetik tidak membuat
 * halaman berkedip dan tidak ada reload sama sekali.
 *
 * Ritme vertikal kartu ini: judul → toggle → blok kontrol → tombol → catatan,
 * semuanya 14px (`gap-3.5`). Di dalam blok kontrol, jarak label → kontrol 8px
 * (`gap-2`). Padding kartu 16px vertikal dan 14-20px horizontal, jadi bulan
 * maupun tahun tidak pernah menempel ke sisi kartu.
 */
function FilterPeriode({ mode, form, daftarTahun, tahunBerjalan, onUbahMode, onUbahForm, onTampilkan, rentangValid, pesanGalat }) {
  return (
    <section className="sp-card p-4 flex flex-col gap-3.5">
      <div className="sp-card-head">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-[#323d8f]/10 border border-[#323d8f]/15 flex items-center justify-center shrink-0">
            <Icon name="calendar_month" className="text-[#323d8f] text-[18px]" />
          </span>
          <span className="font-headline-sm text-headline-sm text-slate-900 font-bold tracking-tight truncate">Periode Presensi</span>
        </div>
      </div>

      {/* Pemilih mode: Bulanan atau Rentang Tanggal. */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#f3f5fc] border border-[#e0e6f2]">
        {[
          { nilai: MODE_BULANAN, label: 'Bulanan', ikon: 'calendar_month' },
          { nilai: MODE_RENTANG, label: 'Rentang Tanggal', ikon: 'date_range' },
        ].map((opsi) => (
          <button
            key={opsi.nilai}
            type="button"
            onClick={() => onUbahMode(opsi.nilai)}
            aria-pressed={mode === opsi.nilai}
            className={`flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2.5 rounded-xl font-label-md text-label-md transition-all ${
              mode === opsi.nilai
                ? 'bg-[#323d8f] text-white shadow-xs font-semibold'
                : 'text-[#77819a] hover:text-[#20243a]'
            }`}
          >
            <Icon name={opsi.ikon} className="text-[16px] shrink-0" />
            <span className="truncate">{opsi.label}</span>
          </button>
        ))}
      </div>

      {mode === MODE_BULANAN ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Bulan</span>
            <div className="sp-x-scroll flex gap-2 pb-1">
              {FILTER_BULAN.map((item) => (
                <ChipFilter
                  key={item.nilai}
                  label={item.nama}
                  aktif={item.nilai === form.bulan}
                  onClick={() => onUbahForm({ bulan: item.nilai })}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Tahun</span>
            <div className="sp-x-scroll flex gap-2 pb-1">
              {daftarTahun.map((t) => (
                <ChipFilter
                  key={t}
                  label={String(t)}
                  aktif={t === form.tahun}
                  onClick={() => onUbahForm({ tahun: t })}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <InputTanggal
            label="Tanggal mulai"
            nilai={form.mulai}
            onUbah={(v) => onUbahForm({ mulai: v })}
          />
          <InputTanggal
            label="Tanggal akhir"
            nilai={form.sampai}
            onUbah={(v) => onUbahForm({ sampai: v })}
          />
        </div>
      )}

      {pesanGalat && (
        <p role="alert" className="font-body-sm text-body-sm text-rose-600 flex items-start gap-2 leading-snug">
          <Icon name="error" className="text-[16px] shrink-0 mt-0.5" />
          {pesanGalat}
        </p>
      )}

      <button
        type="button"
        onClick={onTampilkan}
        disabled={!rentangValid}
        className="sp-btn w-full py-3 bg-[#323d8f] hover:bg-[#252e6d] text-white font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        <Icon name="search" className="text-[18px] shrink-0" />
        Tampilkan
      </button>
      <p className="font-label-sm text-label-sm text-on-surface-variant text-center leading-snug">
        {mode === MODE_BULANAN
          ? `Menampilkan presensi ${BULAN_ID[form.bulan - 1]} ${form.tahun}`
          : 'Menampilkan presensi pada rentang tanggal yang dipilih'}
        {mode === MODE_RENTANG && !rentangValid ? '' : ` · tahun berjalan ${tahunBerjalan}`}
      </p>
    </section>
  )
}

function InputTanggal({ label, nilai, onUbah }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-sm text-label-sm text-on-surface-variant">{label}</label>
      <div className="relative flex items-center">
        {/* Ikon memakai komponen `Icon` (SVG inline) seperti seluruh modul
            mobile. Sebelumnya ini `<span class="material-symbols-outlined">
            calendar_today</span>` — kalau font gagal dimuat (HP offline), nama
            ikonnya bocor jadi tulisan "calendar_today" di dalam input. */}
        <Icon name="event" className="absolute left-3.5 text-outline text-[18px] pointer-events-none" />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          value={nilai}
          onChange={(e) => onUbah(e.target.value)}
          // Padding kiri ditulis langsung (bukan `.sp-field`): `.sp-field`
          // memaksa `padding-inline: 14px`, sedangkan ikon kalender butuh 48px
          // ruang agar tidak menimpa teks yang diketik pengguna.
          className="w-full max-w-full min-h-[48px] box-border pl-12 pr-3.5 rounded-xl bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface tabular-nums placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition"
        />
      </div>
    </div>
  )
}

/**
 * Riwayat Presensi versi mobile: daftar kartu per hari (tanpa tabel desktop),
 * difilter lewat satu periode — bulanan atau rentang tanggal. Sumber datanya
 * riwayat presensi milik pegawai yang sedang login di store, digabung dengan
 * pengajuan izin/cuti yang sudah disetujui; tidak ada akses ke pegawai lain.
 */
function MobileRiwayatPage() {
  // Varian opsional: store yang belum siap berarti "sedang memuat", bukan
  // lemparan error. useSimPres() melempar error bila Provider belum ada, dan
  // halaman ini tidak boleh menggagalkan render hanya karena itu.
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const staff = state ? selectSelfStaff(state) : null
  const presensi = state ? selectSelfPresensi(state) : null
  const unit = staff ? selectUnitById(state, staff.unitId) : null

  // Semua selector dijaga null supaya useMemo di bawah tetap aman dijalankan
  // pada render pertama yang datanya belum ada.
  const riwayat = useMemo(() => (state ? selectRiwayatPresensiSaya(state, 400) : []), [state])
  const izin = useMemo(() => (state ? selectSelfLeaves(state) : []), [state])
  const petaIzin = useMemo(() => izinPerTanggal(izin), [izin])

  const tahunBerjalan = TAHUN_BERJALAN
  const [mode, setMode] = useState(MODE_BULANAN)
  // Isian yang diketik pengguna; `periode` adalah hasil yang benar-benar dipakai
  // daftar, jadi daftar hanya berubah saat tombol Tampilkan ditekan.
  const [form, setForm] = useState(() => ({
    tahun: tahunBerjalan,
    bulan: new Date().getMonth() + 1,
    mulai: isoKeTanggalID(HARI_INI),
    sampai: isoKeTanggalID(HARI_INI),
  }))
  const [periode, setPeriode] = useState(() => ({
    mode: MODE_BULANAN,
    key: `${tahunBerjalan}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    dari: HARI_INI,
    sampai: HARI_INI,
  }))

  // Tahun yang punya data, plus tahun berjalan supaya filter tidak pernah kosong
  // walau pegawai belum punya riwayat di tahun ini.
  const daftarTahun = useMemo(() => {
    const set = new Set(riwayat.map((r) => Number(String(r.date).slice(0, 4))))
    petaIzin.forEach((_, iso) => set.add(Number(String(iso).slice(0, 4))))
    set.add(tahunBerjalan)
    return [...set].filter(Boolean).sort((a, b) => b - a)
  }, [riwayat, petaIzin, tahunBerjalan])

  const isoMulai = mode === MODE_RENTANG ? tanggalIDKeISO(form.mulai) : null
  const isoSampai = mode === MODE_RENTANG ? tanggalIDKeISO(form.sampai) : null
  const rentangValid = mode === MODE_BULANAN || (Boolean(isoMulai) && Boolean(isoSampai) && isoMulai <= isoSampai)

  const pesanGalat = mode === MODE_BULANAN
    ? ''
    : !isoMulai || !isoSampai
      ? 'Isi tanggal mulai dan tanggal akhir dengan format dd/mm/yyyy.'
      : isoMulai > isoSampai
        ? 'Tanggal mulai tidak boleh melewati tanggal akhir.'
        : ''

  function ubahForm(perubahan) {
    setForm((v) => ({ ...v, ...perubahan }))
  }

  function ubahMode(modeBaru) {
    // Beralih ke rentang tanggal: isian diisi otomatis dengan rentang bulan
    // terpilih supaya pengguna tidak perlu mengetik dari kolom kosong.
    if (modeBaru === MODE_RENTANG) {
      const awal = `${form.tahun}-${String(form.bulan).padStart(2, '0')}-01`
      const akhir = `${form.tahun}-${String(form.bulan).padStart(2, '0')}-${new Date(form.tahun, form.bulan, 0).getDate()}`
      setForm((v) => ({ ...v, mulai: isoKeTanggalID(awal), sampai: isoKeTanggalID(akhir) }))
    }
    setMode(modeBaru)
  }

  function tampilkan() {
    if (mode === MODE_BULANAN) {
      setPeriode((v) => ({ ...v, mode: MODE_BULANAN, key: `${form.tahun}-${String(form.bulan).padStart(2, '0')}` }))
      return
    }
    if (!rentangValid) return
    setPeriode({ mode: MODE_RENTANG, key: null, dari: isoMulai, sampai: isoSampai })
  }

  const zonaWaktu = presensi?.rules?.zonaWaktu || 'WIB'
  const radius = presensi?.rules?.radius ?? unit?.radius ?? 0
  const titikLokasi = `Gerbang Utama — ${unit?.nama || 'Unit'}`

  const koordinatTeks = unit?.latitude
    ? `${Number(unit.latitude).toFixed(5)}, ${Number(unit.longitude).toFixed(5)}`
    : 'Koordinat belum diatur'

  // Satu rentang untuk daftar DAN rekap: keduanya membaca hasil
  // rentangDariPeriode(), jadi angka di header tidak mungkin berbeda dengan isi
  // daftar, termasuk saat berpindah mode bolak-balik.
  const rentang = useMemo(() => rentangDariPeriode(periode), [periode])

  const baris = useMemo(
    () => filterRiwayatPeriode({ riwayat, izinTanggal: petaIzin, periode }),
    [riwayat, petaIzin, periode],
  )

  const rekap = useMemo(
    () => rekapRentang({
      riwayat,
      izinTanggal: petaIzin,
      dari: rentang.dari,
      sampai: rentang.sampai,
      totalHariKerja: hitungRentangHari(rentang.dari, rentang.sampai) || 1,
    }),
    [riwayat, petaIzin, rentang],
  )

  const labelPeriodeAktif = labelPeriode(periode)

  // Data presensi belum tersedia -> tampilkan status memuat, bukan layar
  // kosong. Halaman ini tidak pernah gagal diam-diam.
  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading Riwayat Presensi" detail="Mengambil data presensi Anda…" />
      </div>
    )
  }

  if (!staff || !presensi) {
    return (
      <div className="sp-page-container py-6">
        <ErrorState
          ikon="badge"
          judul="Data pegawai tidak ditemukan"
          detail="Riwayat hanya bisa dibaca untuk akun yang terhubung ke data pegawai."
          onCoba={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="sp-page">
      {/* Hero ringkas: periode aktif + ringkasan angka. Area ringkasan pakai
          permukaan soft blue agar terpisah dari filter putih di bawahnya. */}
      <section className="sp-hero sp-page-container pt-3.5 pb-3">
        <div className="sp-card p-4 flex flex-col gap-3.5 border border-[#323d8f]/20 rounded-2xl" style={{ backgroundColor: '#eef0fc' }}>
          <div className="flex items-center gap-3">
            <StaffAvatar staff={staff} size="w-12 h-12" textClass="font-headline-sm text-headline-sm font-bold text-white" ring="ring-2 ring-white/60" className="shadow-xs" />
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-[#77819a] font-medium">Riwayat Kehadiran</span>
              <h1 className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight truncate">{labelPeriodeAktif}</h1>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2">
            {[
              { label: 'Hadir', nilai: rekap.hadir, tone: 'text-[#323d8f]' },
              { label: 'Tepat', nilai: rekap.tepatWaktu, tone: 'text-emerald-600' },
              { label: 'Terlambat', nilai: rekap.terlambat, tone: 'text-amber-600' },
              { label: 'Izin/Cuti', nilai: rekap.izin + rekap.cuti, tone: 'text-[#323d8f]' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-[#ffffff] border border-[#dfe5f2] p-3 flex flex-col items-center gap-0.5 min-w-0">
                <span className={`font-display-lg-mobile text-[22px] font-bold leading-none ${item.tone}`}>{item.nilai}</span>
                <span className="font-label-sm text-[11px] text-[#77819a] text-center font-medium mt-0.5">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-4 pb-2">
        {/* Filter periode: bulanan atau rentang tanggal, tanpa reload. */}
        <FilterPeriode
          mode={mode}
          form={form}
          daftarTahun={daftarTahun}
          tahunBerjalan={tahunBerjalan}
          onUbahMode={ubahMode}
          onUbahForm={ubahForm}
          onTampilkan={tampilkan}
          rentangValid={rentangValid}
          pesanGalat={pesanGalat}
        />

        {/* Ringkasan periode aktif. Kartu kecil ini tetap memakai padding
            16px, jadi progress bar dan angkanya tidak pernah menyentuh border
            kartu. */}
        <section className="sp-card p-4 flex flex-col gap-3">
          <div className="sp-card-head-plain">
            <span className="font-body-md-medium text-body-md-medium text-on-surface">Periode aktif</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
              {periode.mode === MODE_BULANAN ? 'Bulanan' : 'Rentang tanggal'}
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, rekap.persen)}%` }}
            />
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
            {rekap.hadir} hari hadir · {rekap.izin + rekap.cuti} hari izin/cuti · {rekap.persen}% dari {rekap.totalHariKerja} hari kerja
          </p>
        </section>

        {/* Daftar kartu harian. */}
        <section className="flex flex-col gap-2.5">
          <SectionTitle
            ikon="list_alt"
            judul="Presensi Harian"
            aksi={<span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{baris.length} hari</span>}
          />

          {baris.length ? (
            <ul className="flex flex-col gap-2.5">
              {baris.map((item) => {
                const catatanIzin = item.izin || petaIzin.get(item.date)
                // Jam kerja & status baris ini dihitung dari tanggalnya, jadi
                // hari Sabtu otomatis memakai batas 07:30.
                const hariIniRules = jamKerjaRules(item.date)
                return (
                  <KartuHari
                    key={`${item.date}-${item.id ?? 'izin'}`}
                    tanggal={item.date}
                    masuk={item.masuk}
                    pulang={item.pulang}
                    lateMinutes={item.lateMinutes || 0}
                    status={statusHari({
                      tanggal: item.date,
                      masuk: item.masuk,
                      lateMinutes: item.lateMinutes || 0,
                      izin: catatanIzin,
                    })}
                    jamKerja={hariIniRules.jamKerja}
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
              judul="Belum ada data presensi"
              detail={
                periode.mode === MODE_BULANAN
                  ? `Tidak ada presensi tercatat pada ${labelPeriodeAktif}. Riwayat akan muncul setelah Anda melakukan presensi.`
                  : `Tidak ada presensi antara ${labelPeriodeAktif}. Coba perluas rentang tanggal atau pilih bulan lain.`
              }
              aksi={
                <button
                  type="button"
                  onClick={tampilkan}
                  className="sp-press sp-btn mt-1 px-4 py-2.5 bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5"
                >
                  <Icon name="refresh" className="text-[16px] shrink-0" />
                  Tampilkan ulang
                </button>
              }
            />
          )}
        </section>

        {baris.some((item) => item.date === HARI_INI) && (
          <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
            Hari ini sudah termasuk dalam daftar.
          </p>
        )}
      </div>
    </div>
  )
}

export default MobileRiwayatPage