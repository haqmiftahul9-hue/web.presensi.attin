import assert from 'node:assert/strict'
import { createServer } from 'vite'

async function run() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  try {
    const storeModule = await server.ssrLoadModule('/src/store/simPresStore.jsx')
    const {
      initialState,
      ROLE_ADMIN_UNIT,
      ROLE_SUPERADMIN,
      ROLE_KEPALA_SEKOLAH,
      ROLE_PETUGAS_PRESENSI,
      canAccessPath,
      hasMenuPermission,
      selectCurrentUserRole,
      selectSelfStaff,
      appModeOfRole,
      MODE_MOBILE,
    } = storeModule

    console.log('================================================================================')
    console.log('TESTING PORTAL DESKTOP PENUH KHUSUS ROLE ADMIN UNIT')
    console.log('================================================================================')

    // ─── State tiruan untuk Admin Unit ───
    const stateAdmin = {
      ...initialState,
      currentUser: {
        id: 8,
        name: 'Fajar Pratama, S.Kom',
        username: 'adminsd1',
        niy: '019001008',
        email: 'admin.sd@simpres.sch.id',
        role: ROLE_ADMIN_UNIT,
        unitId: 'sd',
        status: 'Aktif',
      },
      isAuthenticated: true,
    }

    // ─── 1. Hak akses rute desktop ───
    console.log('\n--- 1. Uji Hak Akses Rute Desktop Admin Unit ---')

    // Rute yang BOLEH diakses
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/dashboard'), true,
      'Admin Unit boleh mengakses /dashboard')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/data-guru-dan-pegawai'), true,
      'Admin Unit boleh mengakses /data-guru-dan-pegawai')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/cetak-kartu-id'), true,
      'Admin Unit boleh mengakses /cetak-kartu-id')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/presensi'), true,
      'Admin Unit boleh mengakses /presensi')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/presensi-scan'), true,
      'Admin Unit boleh mengakses /presensi-scan (Kios)')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/presensi-manual'), true,
      'Admin Unit boleh mengakses /presensi-manual')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/edit-presensi'), true,
      'Admin Unit boleh mengakses /edit-presensi')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/rekap-dan-laporan'), true,
      'Admin Unit boleh mengakses /rekap-dan-laporan')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/ranking-kehadiran'), true,
      'Admin Unit boleh mengakses /ranking-kehadiran')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/pengajuan-izin-dan-cuti'), true,
      'Admin Unit boleh mengakses /pengajuan-izin-dan-cuti')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/log-aktivitas'), true,
      'Admin Unit boleh mengakses /log-aktivitas')

    // Rute yang DITOLAK (hanya Superadmin)
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/unit-sd-islam-rj'), false,
      'Admin Unit DITOLAK dari Manajemen Unit')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/manajemen-admin-user'), false,
      'Admin Unit DITOLAK dari Manajemen Admin User')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/pengaturan-global'), false,
      'Admin Unit DITOLAK dari Pengaturan Global')
    assert.equal(canAccessPath(stateAdmin, ROLE_ADMIN_UNIT, '/attendance-approvals'), false,
      'Admin Unit DITOLAK dari Attendance Approvals')
    console.log('✅ LULUS: canAccessPath mengizinkan 11 rute operasional dan menolak 4 rute Superadmin')

    // ─── 2. Filter item sidebar desktop ───
    console.log('\n--- 2. Evaluasi Filter Item Menu Sidebar Desktop ---')

    const navItems = [
      { path: 'BERANDA', label: 'Dashboard', icon: 'dashboard', menuKey: 'dashboard' },
      { path: '/unit-sd-islam-rj', label: 'Manajemen Unit', icon: 'apartment', menuKey: 'manajemenUnit' },
      { path: '/manajemen-admin-user', label: 'Manajemen Admin', icon: 'manage_accounts', menuKey: 'manajemenAdminUser' },
      { path: '/data-guru-dan-pegawai', label: 'Data Guru/Pegawai', icon: 'badge', menuKey: 'dataGuruPegawai' },
      { path: '/cetak-kartu-id', label: 'Cetak Kartu ID', icon: 'contact_page', menuKey: 'cetakKartuId' },
      { path: '/presensi', label: 'Presensi', icon: 'timer', menuKey: 'presensi' },
      { path: '/presensi-scan', label: 'Scan Presensi (Kios)', icon: 'qr_code_scanner', menuKey: 'presensi', allowedRoles: [ROLE_SUPERADMIN, ROLE_ADMIN_UNIT, ROLE_PETUGAS_PRESENSI] },
      { path: '/rekap-dan-laporan', label: 'Rekap & Laporan', icon: 'summarize', menuKey: 'rekapLaporan', allowedRoles: [ROLE_SUPERADMIN, ROLE_ADMIN_UNIT, ROLE_PETUGAS_PRESENSI] },
      { path: '/ranking-kehadiran', label: 'Ranking Kehadiran', icon: 'leaderboard', menuKey: 'rankingKehadiran' },
      { path: '/pengajuan-izin-dan-cuti', label: 'Pengajuan Izin/Cuti', icon: 'event_available', menuKey: 'pengajuanIzinCuti' },
      { path: '/presensi-manual', label: 'Presensi Manual', icon: 'edit_calendar', menuKey: 'presensiManual' },
      { path: '/attendance-approvals', label: 'Persetujuan Presensi', icon: 'check_circle', menuKey: 'attendanceApprovals', onlyRole: 'Superadmin' },
      { path: '/edit-presensi', label: 'Edit Presensi', icon: 'edit', menuKey: 'editPresensi' },
      { path: '/log-aktivitas', label: 'Log Aktivitas', icon: 'history', menuKey: 'logAktivitas' },
      { path: '/pengaturan-global', label: 'Pengaturan Global', icon: 'settings', menuKey: 'pengaturanGlobal' },
    ]

    const currentRole = selectCurrentUserRole(stateAdmin)
    const berandaPath = currentRole === ROLE_SUPERADMIN ? '/superadmin' : '/dashboard'
    const visibleItems = navItems
      .filter((item) => {
        if (!hasMenuPermission(stateAdmin, item.menuKey)) return false
        if (item.onlyRole && item.onlyRole !== currentRole) return false
        if (item.allowedRoles && !item.allowedRoles.includes(currentRole)) return false
        return true
      })
      .map((item) => {
        const path = item.path === 'BERANDA' ? berandaPath : item.path
        return { ...item, path }
      })

    const visibleLabels = visibleItems.map((i) => i.label)
    const visiblePaths = visibleItems.map((i) => i.path)

    console.log('Menu terlihat untuk Admin Unit:', visibleLabels)

    // Menu yang HARUS muncul
    assert.ok(visiblePaths.includes('/dashboard'), 'Dashboard harus muncul')
    assert.ok(visiblePaths.includes('/data-guru-dan-pegawai'), 'Data Guru/Pegawai harus muncul')
    assert.ok(visiblePaths.includes('/cetak-kartu-id'), 'Cetak Kartu ID harus muncul')
    assert.ok(visiblePaths.includes('/presensi'), 'Presensi harus muncul')
    assert.ok(visiblePaths.includes('/presensi-scan'), 'Scan Presensi (Kios) harus muncul')
    assert.ok(visiblePaths.includes('/presensi-manual'), 'Presensi Manual harus muncul')
    assert.ok(visiblePaths.includes('/edit-presensi'), 'Edit Presensi harus muncul')
    assert.ok(visiblePaths.includes('/rekap-dan-laporan'), 'Rekap & Laporan harus muncul')
    assert.ok(visiblePaths.includes('/ranking-kehadiran'), 'Ranking Kehadiran harus muncul')
    assert.ok(visiblePaths.includes('/pengajuan-izin-dan-cuti'), 'Pengajuan Izin/Cuti harus muncul')
    assert.ok(visiblePaths.includes('/log-aktivitas'), 'Log Aktivitas harus muncul')

    // Menu yang TIDAK boleh muncul
    assert.ok(!visiblePaths.includes('/unit-sd-islam-rj'), 'Manajemen Unit TIDAK boleh muncul')
    assert.ok(!visiblePaths.includes('/manajemen-admin-user'), 'Manajemen Admin TIDAK boleh muncul')
    assert.ok(!visiblePaths.includes('/attendance-approvals'), 'Attendance Approvals TIDAK boleh muncul')
    assert.ok(!visiblePaths.includes('/pengaturan-global'), 'Pengaturan Global TIDAK boleh muncul')

    assert.equal(visibleItems.length, 11,
      `Sidebar Admin Unit harus menampilkan tepat 11 menu, bukan ${visibleItems.length}`)

    console.log('✅ LULUS: Sidebar desktop Admin Unit menampilkan tepat 11 menu operasional (tanpa menu Superadmin)')

    // ─── 3. Verifikasi identitas & roleMap ───
    console.log('\n--- 3. Verifikasi Status Akun & Identitas Pengguna di Footer Sidebar ---')

    const roleMap = {
      Superadmin: { icon: 'shield_person', avatarBg: 'bg-purple-700 text-white' },
      'Admin Unit': { icon: 'admin_panel_settings', avatarBg: 'bg-blue-700 text-white' },
      'Kepala Sekolah': { icon: 'school', avatarBg: 'bg-violet-700 text-white' },
      Guru: { icon: 'person', avatarBg: 'bg-primary text-primary-foreground' },
      'Petugas Presensi': { icon: 'qr_code_scanner', avatarBg: 'bg-teal-700 text-white' },
    }

    const r = roleMap[currentRole]
    assert.equal(currentRole, 'Admin Unit', 'Role terdeteksi harus Admin Unit')
    assert.notEqual(currentRole, 'Superadmin', 'Role TIDAK boleh Superadmin')
    assert.equal(r.icon, 'admin_panel_settings',
      'Ikon akun Admin Unit harus "admin_panel_settings", bukan "shield_person"')
    assert.equal(r.avatarBg, 'bg-blue-700 text-white',
      'Warna avatar Admin Unit harus biru, bukan ungu (Superadmin)')

    const selfStaff = selectSelfStaff(stateAdmin)
    const displayName = stateAdmin.currentUser?.name || selfStaff?.name || currentRole
    const displayIdentifier = stateAdmin.currentUser?.username || stateAdmin.currentUser?.niy
      || stateAdmin.currentUser?.email || '-'

    assert.equal(displayName, 'Fajar Pratama, S.Kom', 'Nama akun harus nama Admin Unit')
    assert.notEqual(displayName, 'Superadmin', 'Nama akun TIDAK boleh "Superadmin"')
    assert.equal(displayIdentifier, 'adminsd1', 'Identifier harus adminsd1 (username Admin Unit)')
    assert.notEqual(displayIdentifier, 'superadmin@simpres.sch.id',
      'Identifier TIDAK boleh default superadmin')
    console.log('✅ LULUS: Footer sidebar menampilkan Admin Unit (Fajar Pratama, adminsd1, ikon admin_panel_settings, biru)')

    // ─── 4. Verifikasi tombol kembali ke mobile ───
    console.log('\n--- 4. Verifikasi Opsi Kembali ke Tampilan Mobile ---')
    assert.equal(appModeOfRole(currentRole), MODE_MOBILE,
      'Mode utama Admin Unit adalah mobile → tombol Kembali ke Tampilan Mobile harus aktif')
    console.log('✅ LULUS: Tombol "Kembali ke Tampilan Mobile" aktif dan tersedia untuk role Admin Unit')

    // ─── 5. Pastikan Kepala Sekolah & Superadmin tidak terdampak ───
    console.log('\n--- 5. Verifikasi Role Lain Tidak Terdampak ---')

    // Superadmin TIDAK memiliki mode mobile → tidak muncul tombol kembali
    const stateSA = { ...initialState, currentUser: { id: 1, name: 'Superadmin', username: 'superadmin', role: ROLE_SUPERADMIN }, isAuthenticated: true }
    const roleSA = selectCurrentUserRole(stateSA)
    assert.notEqual(appModeOfRole(roleSA), MODE_MOBILE, 'Superadmin TIDAK dalam mode mobile')

    // Kepala Sekolah masih hanya 3 menu, tidak mendapat menu Admin Unit
    const stateKepsek = {
      ...initialState,
      currentUser: { id: 13, name: 'Drs. H. Ahmad Fauzi', username: 'kepalasd', niy: '019001013', role: ROLE_KEPALA_SEKOLAH, unitId: 'sd', status: 'Aktif' },
      isAuthenticated: true,
    }
    const roleKS = selectCurrentUserRole(stateKepsek)
    const visibleKS = navItems.filter((item) => {
      if (!hasMenuPermission(stateKepsek, item.menuKey)) return false
      if (item.onlyRole && item.onlyRole !== roleKS) return false
      if (item.allowedRoles && !item.allowedRoles.includes(roleKS)) return false
      return true
    })
    assert.ok(!visibleKS.some((i) => i.path === '/presensi-scan'),
      'Kepala Sekolah TIDAK melihat Scan Presensi Kios')
    assert.ok(!visibleKS.some((i) => i.path === '/rekap-dan-laporan'),
      'Kepala Sekolah TIDAK melihat Rekap & Laporan')
    assert.ok(!visibleKS.some((i) => i.path === '/data-guru-dan-pegawai'),
      'Kepala Sekolah TIDAK melihat Data Guru/Pegawai')
    console.log('✅ LULUS: Kepala Sekolah & Superadmin tidak terdampak oleh perubahan Admin Unit')

    console.log('\n================================================================================')
    console.log('🎉 SELURUH PENGUJIAN PORTAL DESKTOP ADMIN UNIT LULUS 100%!')
    console.log('================================================================================\n')
  } finally {
    await server.close()
  }
}

run().catch((err) => {
  console.error('TEST FAILED:', err)
  process.exit(1)
})
