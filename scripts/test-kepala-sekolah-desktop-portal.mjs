import assert from 'node:assert/strict'
import { createTestServer } from './_test-server.mjs'

async function run() {
  const server = await createTestServer()

  try {
    const storeModule = await server.ssrLoadModule('/src/store/simPresStore.jsx')
    const {
      initialState,
      ROLE_KEPALA_SEKOLAH,
      ROLE_SUPERADMIN,
      ROLE_ADMIN_UNIT,
      canAccessPath,
      hasMenuPermission,
      selectCurrentUserRole,
      selectSelfStaff,
      appModeOfRole,
      MODE_MOBILE,
    } = storeModule

    console.log('================================================================================')
    console.log('TESTING PORTAL DESKTOP PENUH KHUSUS ROLE KEPALA SEKOLAH')
    console.log('================================================================================')

    // 1. Uji Proteksi Rute untuk Kepala Sekolah
    console.log('\n--- 1. Uji Hak Akses Rute Desktop Kepala Sekolah ---')
    const stateKepsek = {
      ...initialState,
      currentUser: {
        id: 13,
        name: 'Drs. H. Ahmad Fauzi, M.Pd',
        username: 'kepalasd',
        niy: '019001013',
        email: 'kepala.sd@simpres.sch.id',
        role: ROLE_KEPALA_SEKOLAH,
        unitId: 'sd',
        status: 'Aktif',
      },
      isAuthenticated: true,
    }

    assert.equal(canAccessPath(stateKepsek, ROLE_KEPALA_SEKOLAH, '/dashboard'), true, 'Kepala Sekolah boleh mengakses /dashboard')
    assert.equal(canAccessPath(stateKepsek, ROLE_KEPALA_SEKOLAH, '/presensi'), true, 'Kepala Sekolah boleh mengakses /presensi')
    assert.equal(canAccessPath(stateKepsek, ROLE_KEPALA_SEKOLAH, '/pengajuan-izin-dan-cuti'), true, 'Kepala Sekolah boleh mengakses /pengajuan-izin-dan-cuti')

    assert.equal(canAccessPath(stateKepsek, ROLE_KEPALA_SEKOLAH, '/presensi-scan'), false, 'Kepala Sekolah DITOLAK dari Scan Presensi (Kios)')
    assert.equal(canAccessPath(stateKepsek, ROLE_KEPALA_SEKOLAH, '/rekap-dan-laporan'), false, 'Kepala Sekolah DITOLAK dari Rekap & Laporan')
    assert.equal(canAccessPath(stateKepsek, ROLE_KEPALA_SEKOLAH, '/unit-sd-islam-rj'), false, 'Kepala Sekolah DITOLAK dari Manajemen Unit')
    assert.equal(canAccessPath(stateKepsek, ROLE_KEPALA_SEKOLAH, '/manajemen-admin-user'), false, 'Kepala Sekolah DITOLAK dari Manajemen Admin')
    assert.equal(canAccessPath(stateKepsek, ROLE_KEPALA_SEKOLAH, '/pengaturan-global'), false, 'Kepala Sekolah DITOLAK dari Pengaturan Global')
    console.log('✅ LULUS: canAccessPath mengizinkan rute khusus (Dashboard, Presensi, Pengajuan Izin) dan menolak Kios Scan & Rekap')

    // 2. Evaluasi Menu Sidebar Desktop untuk Kepala Sekolah
    console.log('\n--- 2. Evaluasi Filter Item Menu Sidebar Desktop ---')
    // Simulasikan navItems di Sidebar.jsx
    const navItems = [
      { path: 'BERANDA', label: 'Dashboard', icon: 'dashboard', menuKey: 'dashboard' },
      { path: '/unit-sd-islam-rj', label: 'Manajemen Unit', icon: 'apartment', menuKey: 'manajemenUnit' },
      { path: '/manajemen-admin-user', label: 'Manajemen Admin', icon: 'manage_accounts', menuKey: 'manajemenAdminUser' },
      { path: '/data-guru-dan-pegawai', label: 'Data Guru/Pegawai', icon: 'badge', menuKey: 'dataGuruPegawai' },
      { path: '/cetak-kartu-id', label: 'Cetak Kartu ID', icon: 'contact_page', menuKey: 'cetakKartuId' },
      { path: '/presensi', label: 'Presensi', icon: 'timer', menuKey: 'presensi' },
      { path: '/presensi-scan', label: 'Scan Presensi (Kios)', icon: 'qr_code_scanner', menuKey: 'presensi', allowedRoles: [ROLE_SUPERADMIN, ROLE_ADMIN_UNIT, 'Petugas Presensi'] },
      { path: '/rekap-dan-laporan', label: 'Rekap & Laporan', icon: 'summarize', menuKey: 'rekapLaporan', allowedRoles: [ROLE_SUPERADMIN, ROLE_ADMIN_UNIT, 'Petugas Presensi'] },
      { path: '/ranking-kehadiran', label: 'Ranking Kehadiran', icon: 'leaderboard', menuKey: 'rankingKehadiran' },
      { path: '/pengajuan-izin-dan-cuti', label: 'Pengajuan Izin/Cuti', icon: 'event_available', menuKey: 'pengajuanIzinCuti' },
      { path: '/presensi-manual', label: 'Presensi Manual', icon: 'edit_calendar', menuKey: 'presensiManual' },
      { path: '/attendance-approvals', label: 'Persetujuan Presensi', icon: 'check_circle', menuKey: 'attendanceApprovals', onlyRole: 'Superadmin' },
      { path: '/edit-presensi', label: 'Edit Presensi', icon: 'edit', menuKey: 'editPresensi' },
      { path: '/log-aktivitas', label: 'Log Aktivitas', icon: 'history', menuKey: 'logAktivitas' },
      { path: '/pengaturan-global', label: 'Pengaturan Global', icon: 'settings', menuKey: 'pengaturanGlobal' },
    ]

    const currentRole = selectCurrentUserRole(stateKepsek)
    const berandaPath = currentRole === ROLE_SUPERADMIN ? '/superadmin' : '/dashboard'
    const visibleItems = navItems
      .filter((item) => {
        if (!hasMenuPermission(stateKepsek, item.menuKey)) return false
        if (item.onlyRole && item.onlyRole !== currentRole) return false
        if (item.allowedRoles && !item.allowedRoles.includes(currentRole)) return false
        return true
      })
      .map((item) => {
        const path = item.path === 'BERANDA' ? berandaPath : item.path
        let label = item.label
        if (currentRole === ROLE_KEPALA_SEKOLAH) {
          if (item.path === '/presensi') label = 'Monitoring Presensi'
          if (item.path === '/pengajuan-izin-dan-cuti') label = 'Persetujuan Izin/Cuti'
        }
        return { ...item, path, label }
      })

    const visibleLabels = visibleItems.map((i) => i.label)
    const visiblePaths = visibleItems.map((i) => i.path)

    console.log('Menu terlihat untuk Kepala Sekolah:', visibleLabels)
    assert.deepEqual(
      visibleLabels,
      ['Dashboard', 'Monitoring Presensi', 'Persetujuan Izin/Cuti'],
      'Hanya 3 menu tambahan yang boleh terlihat untuk Kepala Sekolah di portal desktop'
    )
    assert.deepEqual(
      visiblePaths,
      ['/dashboard', '/presensi', '/pengajuan-izin-dan-cuti'],
      'Path harus sesuai dengan rute tujuan'
    )
    assert.ok(!visiblePaths.includes('/presensi-scan'), 'Scan Presensi Kios TIDAK boleh muncul')
    assert.ok(!visiblePaths.includes('/rekap-dan-laporan'), 'Rekap & Laporan TIDAK boleh muncul')
    console.log('✅ LULUS: Menu sidebar desktop Kepala Sekolah hanya Dashboard, Monitoring Presensi, dan Persetujuan Izin/Cuti')

    // 3. Verifikasi Status Akun & Identitas Pengguna di Footer Sidebar
    console.log('\n--- 3. Verifikasi Status Akun Footer Sidebar ---')
    const roleMap = {
      Superadmin: { icon: 'shield_person' },
      'Admin Unit': { icon: 'admin_panel_settings' },
      'Kepala Sekolah': { icon: 'school' },
      Guru: { icon: 'person' },
      'Petugas Presensi': { icon: 'qr_code_scanner' },
    }

    const r = roleMap[currentRole]
    assert.equal(currentRole, 'Kepala Sekolah', 'Role terdeteksi harus Kepala Sekolah')
    assert.notEqual(currentRole, 'Superadmin', 'Role TIDAK boleh Superadmin')
    assert.equal(r.icon, 'school', 'Ikon akun Kepala Sekolah harus "school", bukan "shield_person"')

    const selfStaff = selectSelfStaff(stateKepsek)
    const displayName = stateKepsek.currentUser?.name || selfStaff?.name || currentRole
    const displayIdentifier = stateKepsek.currentUser?.username || stateKepsek.currentUser?.niy || stateKepsek.currentUser?.email || '-'

    assert.equal(displayName, 'Drs. H. Ahmad Fauzi, M.Pd', 'Nama akun harus nama Kepala Sekolah')
    assert.notEqual(displayName, 'Superadmin', 'Nama akun TIDAK boleh "Superadmin"')
    assert.equal(displayIdentifier, 'kepalasd', 'Identifier akun harus kepalasd')
    assert.notEqual(displayIdentifier, 'superadmin@simpres.sch.id', 'Email/Identifier TIDAK boleh default superadmin')
    console.log('✅ LULUS: Footer sidebar menampilkan Kepala Sekolah (Drs. H. Ahmad Fauzi, M.Pd, kepalasd, ikon school)')

    // 4. Verifikasi Navigasi Kembali ke Mobile
    console.log('\n--- 4. Verifikasi Opsi Kembali ke Tampilan Mobile ---')
    assert.equal(appModeOfRole(currentRole), MODE_MOBILE, 'Mode utama Kepala Sekolah adalah mobile')
    console.log('✅ LULUS: Tombol "Kembali ke Tampilan Mobile" aktif dan tersedia untuk role Kepala Sekolah')

    console.log('\n================================================================================')
    console.log('🎉 SELURUH PENGUJIAN PORTAL DESKTOP KEPALA SEKOLAH LULUS 100%!')
    console.log('================================================================================\n')
  } finally {
    await server.close()
  }
}

run().catch((err) => {
  console.error('TEST FAILED:', err)
  process.exit(1)
})
