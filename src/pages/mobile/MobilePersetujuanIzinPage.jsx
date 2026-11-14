import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import {
  useSimPresOptional, selectLeavesEnriched, selectSelfStaff,
  addActivityLog, hasPermission, selectCurrentUserRole, ROLE_SUPERADMIN,
} from '../../store/simPresStore.jsx'
import { EmptyState, LoadingState } from '../../components/mobile/Feedback.jsx'

function BarisStatus({ status }) {
  const warna = status === 'Menunggu' ? 'bg-amber-100 text-amber-700' : status === 'Disetujui' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
  return <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm ${warna}`}>{status}</span>
}

function MobilePersetujuanIzinPage() {
  const ctx = useSimPresOptional()
  const state = ctx?.state ?? null
  const dispatch = ctx?.dispatch ?? null
  const [pesan, setPesan] = useState('')

  const selfStaff = state ? selectSelfStaff(state) : null
  const userUnitId = selfStaff?.unitId || state?.currentUser?.unitId
  const currentRole = state ? selectCurrentUserRole(state) : ''
  const isSuperadmin = currentRole === ROLE_SUPERADMIN

  const canApprove = state ? hasPermission(state, currentRole, 'pengajuanIzinCuti', 'edit') : false

  const daftar = useMemo(() => {
    if (!state) return []
    let list = selectLeavesEnriched(state).filter((l) => l.status === 'Menunggu')
    if (!isSuperadmin && userUnitId) {
      list = list.filter((l) => l.unitId === userUnitId)
    }
    return list
  }, [state, isSuperadmin, userUnitId])

  if (!state) {
    return (
      <div className="sp-page sp-page-container py-6">
        <LoadingState judul="Loading Persetujuan" detail="Mengambil data pengajuan…" />
      </div>
    )
  }

  const handleApprove = (id) => {
    const leave = state.leaves.find((l) => l.id === id)
    const staff = leave ? state.staff.find((s) => s.id === leave.staffId) : null
    dispatch({ type: 'UPDATE_LEAVE_STATUS', id, status: 'Disetujui' })
    if (leave && staff) {
      addActivityLog(dispatch, state, 'Persetujuan', `Cuti/Izin • ${staff.name}`, `Menyetujui pengajuan ${leave.jenis} (${leave.durasi}) untuk ${staff.name}`, null, null, staff.unitId)
    }
    setPesan('Pengajuan disetujui.')
    setTimeout(() => setPesan(''), 3000)
  }

  const handleReject = (id) => {
    const leave = state.leaves.find((l) => l.id === id)
    const staff = leave ? state.staff.find((s) => s.id === leave.staffId) : null
    dispatch({ type: 'UPDATE_LEAVE_STATUS', id, status: 'Ditolak' })
    if (leave && staff) {
      addActivityLog(dispatch, state, 'Penolakan', `Cuti/Izin • ${staff.name}`, `Menolak pengajuan ${leave.jenis} (${leave.durasi}) untuk ${staff.name}`, null, null, staff.unitId)
    }
    setPesan('Pengajuan ditolak.')
    setTimeout(() => setPesan(''), 3000)
  }

  return (
    <div className="sp-page pb-8">
      <section className="sp-hero sp-page-container pt-3.5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/mobile/home"
            className="w-8 h-8 rounded-xl bg-white border border-[#e0e6f2] flex items-center justify-center text-[#323d8f] shadow-2xs active:scale-95"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </Link>
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="font-headline-sm text-headline-sm text-[#20243a] font-bold tracking-tight">
              Persetujuan Izin &amp; Cuti
            </h1>
            <span className="font-label-sm text-label-sm text-[#77819a]">
              {daftar.length} pengajuan menunggu verifikasi
            </span>
          </div>
        </div>
      </section>

      <div className="px-4 relative z-[2] flex flex-col gap-3 pb-2">
        {pesan && (
          <p className="rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-3 font-body-sm text-body-sm">{pesan}</p>
        )}

        {daftar.length ? (
          <ul className="flex flex-col gap-2.5">
            {daftar.map((item) => (
              <li key={item.id} className="sp-list-card flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{item.name}</span>
                  <BarisStatus status={item.status} />
                </div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">{item.niy} • {item.unitName}</div>
                <div className="font-body-sm text-body-sm text-on-surface">{item.jenis} • {item.periode} • {item.durasi}</div>
                {(item.keterangan || item.alasan) && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">{item.keterangan || item.alasan}</p>
                )}
                {canApprove ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(item.id)}
                      className="flex-1 h-9 rounded-xl bg-emerald-600 text-white font-label-md text-label-md px-4 py-2 shadow-2xs active:scale-95 transition-all"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(item.id)}
                      className="flex-1 h-9 rounded-xl bg-rose-600 text-white font-label-md text-label-md px-4 py-2 shadow-2xs active:scale-95 transition-all"
                    >
                      Tolak
                    </button>
                  </div>
                ) : (
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Menunggu persetujuan kepala sekolah / admin.</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="sp-card p-4">
            <EmptyState ikon="task_alt" judul="Tidak ada pengajuan menunggu" detail="Semua pengajuan izin/cuti unit Anda sudah diproses." />
          </div>
        )}
      </div>
    </div>
  )
}

export default MobilePersetujuanIzinPage
