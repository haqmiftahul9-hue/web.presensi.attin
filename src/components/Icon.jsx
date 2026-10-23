/**
 * Ikon SVG inline — tidak bergantung pada font apa pun.
 *
 * Alasan: ikon berbasis font (Material Symbols) memunculkan NAMA ligature-nya
 * sebagai tulisan biasa bila font gagal dimuat, terutama di HP tanpa koneksi.
 * SVG(path) selalu tampil sebagai gambar, online maupun offline, dan warnanya
 * mengikuti `currentColor` sehingga tetap cocok dengan tema navy SimPres.
 *
 * Pemakaian:
 *   <Icon name="home" className="text-[20px]" />
 *
 * Ukuran memakai `1em`, jadi kelas utilitas font-size yang sudah dipakai di
 * codebase (text-[20px], text-[16px], dst.) tetap bekerja tanpa perubahan.
 */

// Glyph digambar dengan stroke 24x24 bergaya garis (seperti Lucide), supaya
// sekilas terlihat mirip ikon garis yang sekarang dipakai.
//
// Dua glyph punya dua nama (dipakai halaman berbeda dengan istilah berbeda),
// jadi bentuknya didefinisikan sekali di sini agar tidak terduplikasi.
const UNDUH = <><path d="M12 3v12" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4 20h16" /></>
const HISTORI = <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></>
const MATA = <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>

const PATHS = {
  // Navigasi & identitas
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  person: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  face: <><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" /></>,
  face_retouch_natural: <><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" /></>,
  fingerprint: <><path d="M12 3a9 9 0 0 0-9 9" /><path d="M12 6a6 6 0 0 0-6 6v3" /><path d="M12 9a3 3 0 0 0-3 3v6" /><path d="M12 9a3 3 0 0 1 3 3v1" /><path d="M15 13a3 3 0 0 1 3 3v2" /><path d="M18 9a6 6 0 0 1 3 6v2" /><path d="M12 18v3" /></>,
  badge: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" /><circle cx="16.5" cy="16" r="1.5" /></>,
  calendar_month: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M7.5 14h3v3h-3z" /></>,
  domain: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-5h6v5" /><path d="M9 11h2M13 11h2" /></>,
  work: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>,
  shield_person: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /><circle cx="12" cy="11" r="2" /><path d="M9 16a3 3 0 0 1 6 0" /></>,
  install_mobile: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  download_for_offline: UNDUH,
  notifications: <><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" /><path d="M10 18a2 2 0 0 0 4 0" /></>,
  chat: <><path d="M4 5h16v10H9l-5 4z" /></>,

  // Aksi
  login: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 8 6 12l4 4" /><path d="M6 12h9" /></>,
  eye: MATA,
  visibility: MATA,
  eye_off: <><path d="M4 4l16 16" /><path d="M9.5 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.3 4" /><path d="M6.2 7.8A16.7 16.7 0 0 0 2.5 12S6 18 12 18a9.7 9.7 0 0 0 3.8-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  lock_reset: <><path d="M8 10.5V8a4 4 0 0 1 7.5-2" /><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M12 14v2.5" /><path d="m10.8 16.2 1.2 1.3 1.2-1.3" /></>,
  logout: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="m15 8 4 4-4 4" /><path d="M19 12H9" /></>,
  print: <><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="7" rx="2" /><path d="M7 14h10v6H7z" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4h-4" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5h.01" /></>,
  error: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16h.01" /></>,
  error_outline: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16h.01" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" /><path d="M12 17h.01" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4.5 4.5" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  inbox: <><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" /></>,
  event_available: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9 15 2 2 4-4" /></>,
  event_busy: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9.5 14.5 5 5M14.5 14.5l-5 5" /></>,
  event: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,

  // Lokasi & presensi
  my_location: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></>,
  location_on: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  gps_off: <><path d="M3 3l18 18" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><path d="M12 7a5 5 0 0 1 5 5" /><circle cx="12" cy="12" r="2.5" /></>,
  gps_fixed: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></>,
  schedule: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  today: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.5" /></>,
  cameraswitch: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><path d="m9.5 12.5 3 2.5 3-2.5" /><path d="M12.5 12.5 9.5 15" /></>,
  qr_code_scanner: <><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M8 8h3v3H8zM13 13h3v3h-3z" /></>,

  // Status & ringkasan
  check_circle: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>,
  cancel: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  task_alt: <><path d="M20 7 9.5 17.5 4 12" /><path d="M4 4h3v3" /></>,
  radio_button_unchecked: <><circle cx="12" cy="12" r="8.5" /></>,
  progress_activity: <><path d="M12 3a9 9 0 1 1 9 9" /><path d="M12 12 21 3" /><path d="M12 21a9 9 0 1 1-9-9" /><path d="M12 12 3 21" /></>,
  history_toggle_off: HISTORI,
  summarize: <><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  receipt_long: <><path d="M5 3v18l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V3z" /><path d="M9 8h6M9 12h6" /></>,
  do_not_disturb_on: <><circle cx="12" cy="12" r="9" /><path d="m8 12 8 0" /></>,
  beach_access: <><path d="M12 21V9" /><path d="M4 13h16l-2 5H6z" /><path d="l1.5-4M12 13V7" /><path d="M16 13 14.5 9" /></>,
  hourglass_empty: <><path d="M7 3h10M7 21h10" /><path d="M8 3v3.5c0 2 4 4 4 5.5s-4 3.5-4 5.5V21" /><path d="M16 3v3.5c0 2-4 4-4 5.5s4 3.5 4 5.5V21" /></>,
  chevron_right: <><path d="m9 5 7 7-7 7" /></>,

  // Aksi dasar & dokumen
  add: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  download: UNDUH,
  history: HISTORI,
  list_alt: <><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeLinecap="round" strokeWidth="2.4" /><path d="M9 6.5h11M9 12h11M9 17.5h11" /></>,
  arrow_back: <><path d="M20 12H4" /><path d="m10 6-6 6 6 6" /></>,
  expand_more: <><path d="m6 9 6 6 6-6" /></>,
  expand_less: <><path d="m6 15 6-6 6 6" /></>,
  date_range: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M7 14h10" /></>,
  attach_file: <><path d="M20 11.5 12 19.5a4.6 4.6 0 0 1-6.5-6.5l8.2-8.2a3.1 3.1 0 1 1 4.4 4.4l-8.2 8.2a1.6 1.6 0 0 1-2.2-2.2l7.4-7.4" /></>,
  credit_card: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" /><path d="M6 15h4" /></>,
  contact_page: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="10.5" r="2" /><path d="M5.5 16.2c.8-1.4 1.9-2.1 3-2.1s2.2.7 3 2.1" /><path d="M14.5 9.5h4M14.5 13.5h4" /></>,
  edit_note: <><path d="M5 4h8l4 4v4" /><path d="M13 4v4h4" /><path d="M5 4v16h8" /><path d="M9 15.5h4" /><path d="m16.2 13.8 2 2-4.2 4.2-2.5.5.5-2.5z" /></>,
  how_to_reg: <><circle cx="9.5" cy="8" r="3.2" /><path d="M3.5 19.5a6 6 0 0 1 12 0" /><path d="m15 17.5 2.2 2.2 4-4.6" /></>,
  password: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H21" /><path d="M17.5 12v3.5" /><path d="M20 12v2.5" /></>,
  photo_camera: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /></>,
  save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8.5 4v4.5h7V4" /><path d="M8.5 20v-6h7v6" /></>,

  // Perangkat & sensor
  sensors: <><circle cx="12" cy="18" r="1.6" /><path d="M8.5 14.5a5 5 0 0 1 7 0" /><path d="M5.5 11.5a9 9 0 0 1 13 0" /></>,
  videocam: <><rect x="3" y="6" width="12" height="12" rx="2.5" /><path d="m15 10.5 6-3.5v10l-6-3.5z" /></>,
  videocam_off: <><rect x="3" y="6" width="12" height="12" rx="2.5" /><path d="m15 10.5 6-3.5v10l-6-3.5z" /><path d="M4 4l16 16" /></>,
  wifi_tethering: <><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="19.5" r="1.2" /></>,
  wifi_off: <><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="19.5" r="1.2" /><path d="M4 4l16 16" /></>,
  no_photography: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /><path d="M4 4l16 16" /></>,
  apps: <><circle cx="6" cy="6" r="1.4" /><circle cx="12" cy="6" r="1.4" /><circle cx="18" cy="6" r="1.4" /><circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" /><circle cx="6" cy="18" r="1.4" /><circle cx="12" cy="18" r="1.4" /><circle cx="18" cy="18" r="1.4" /></>,
  // Sinkronisasi nama ikon Material yang dipakai di codebase (alias ke glyph
  // yang sudah ada) supaya tidak ada ikon yang gagal render jadi kotak putus-putus.
  face_retouching_natural: <><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" /></>,
  camera_alt: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /></>,
  hourglass_top: <><path d="M7 3h10M7 21h10" /><path d="M8 3v3.5c0 2 4 4 4 5.5s-4 3.5-4 5.5V21" /><path d="M16 3v3.5c0 2-4 4-4 5.5s4 3.5 4 5.5V21" /></>,

  // Aksi media & foto
  delete: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  add_a_photo: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /><path d="M19 3v4M17 5h4" /></>,

  // Status & verifikasi biometrik
  center_focus_strong: <><circle cx="12" cy="12" r="3" /><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /></>,
  block: <><circle cx="12" cy="12" r="9" /><path d="M5.5 5.5 18.5 18.5" /></>,
  verified: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>,
  sync: <><path d="M21 12a9 9 0 0 0-9-9 9.5 9.5 0 0 0-5 2.12l3 2M4 12a9 9 0 0 0 9 9 9.5 9.5 0 0 0 5-2.12l-3-2" /></>,
  verified_user: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="m16 1 1.5 3 3.5.5-2.5 2.5.6 3.5-3.1-1.6-3.1 1.6.6-3.5L13 4.5 16.5 4z" /></>,
  user_round_x: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 7-7v4a7 7 0 0 0-7 7" /><path d="M17 17l-4 4M13 17l4 4" /></>,
  user_round_check: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 7-7v4a7 7 0 0 0-7 7" /><path d="m16 11-2 3-4-4" /></>,
  assignment_ind: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="12" cy="10" r="3" /><path d="M7.5 17a4.5 4.5 0 0 1 9 0" /></>,

  // Jenis izin/cuti
  luggage: <><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" /><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M3 12h18" /></>,
  medication: <><path d="M4.5 9h15l-1.5 11H6z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /><path d="M9 14h6" /></>,
  child_care: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /><path d="M17 8a2 2 0 1 0-4 0" /></>,
  travel_explore: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></>,
  priority_high: <><path d="M12 3v12" /><path d="M8 7h8" /><circle cx="12" cy="19" r="1.5" /></>,
  favorite: <><path d="M12 20.5 4.5 13a4.5 4.5 0 0 1 6.4-6.4L12 7.7l1.1-1.1a4.5 4.5 0 0 1 6.4 6.4z" /></>,
  hiking: <><path d="M13 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /><path d="M9 21l3-6 2 2 3-4" /><path d="M6 13l3-3 2 2" /></>,
  event_note: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M7 14h4M7 17h10" /></>,
  scan: <><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M8 12h8" /><path d="M12 8v8" /></>,
  scan_face: <><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><circle cx="12" cy="12" r="3" /><path d="M9 10h.01M15 10h.01" /></>,
}

// Ikon yang secara visual lebih baik digambar penuh.
const PENUH = new Set(['check_circle', 'task_alt', 'radio_button_unchecked', 'cancel', 'progress_activity', 'apps'])

function Icon({ name, className = '', strokeWidth = 1.75, filled, ...rest }) {
  const glyph = PATHS[name]
  if (!glyph) {
    // Ikon tidak dikenal: kotak kosong, bukan teks nama ikon.
    return (
      <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        className={className}
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray="3 3" />
      </svg>
    )
  }
  const isiPenuh = filled ?? PENUH.has(name)
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill={isiPenuh ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={isiPenuh ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {glyph}
    </svg>
  )
}

export { PATHS as ICON_PATHS }
export default Icon