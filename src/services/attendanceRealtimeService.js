import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'

export async function fetchAttendanceFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data || []).map((r) => ({
      staffId: r.staff_id,
      unitId: r.unit_id,
      tanggal: r.tanggal,
      hari: r.hari,
      status: r.status,
      lateMinutes: r.late_minutes,
      method: r.method,
      jamMasuk: r.jam_masuk,
      jamPulang: r.jam_pulang,
      faceSnapshotUrl: r.face_snapshot_url,
      faceSnapshotMasukUrl: r.face_snapshot_masuk_url,
      faceSnapshotPulangUrl: r.face_snapshot_pulang_url,
      faceConfidence: r.face_confidence,
      faceConfidenceMasuk: r.face_confidence_masuk,
      faceConfidencePulang: r.face_confidence_pulang,
      photoBucket: r.photo_bucket,
      presensiId: r.presensi_id,
      catatan: r.catatan,
      outsideRadius: r.outside_radius,
      distanceMeters: r.distance_meters,
      updatedAt: r.updated_at,
    }))
  } catch (err) {
    console.warn('[AttendanceSync] fetch gagal:', err?.message)
    return []
  }
}

export function subscribeAttendance(callback) {
  if (!isSupabaseConfigured || !supabase) return () => {}
  const channel = supabase
    .channel('attendance-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
      callback?.()
    })
    .subscribe()
  return () => {
    try { supabase.removeChannel(channel) } catch { /* ignore */ }
  }
}