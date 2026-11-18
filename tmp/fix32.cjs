const fs = require('fs');
const p = 'src/pages/RekapLaporanPage.jsx';
let c = fs.readFileSync(p, 'utf8');

// Remove " | Jam Kerja Global: ${ringkasanJamKerja}" from kop rows
c = c.replace(/ \| Jam Kerja Global: \$\{ringkasanJamKerja\}/g, '');

// Remove summary sheet column and data
c = c.replace(
  "'No', 'Nama Pegawai', 'NIY', 'Jabatan / Peran', 'Unit Sekolah', 'Periode Rekap', 'Jam Kerja Global', 'Total Hari Kerja', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Keterlambatan (menit)', 'Izin/Sakit', 'Alpha', 'Persentase Kehadiran', 'Predikat Disiplin'",
  "'No', 'Nama Pegawai', 'NIY', 'Jabatan / Peran', 'Unit Sekolah', 'Periode Rekap', 'Total Hari Kerja', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Keterlambatan (menit)', 'Izin/Sakit', 'Alpha', 'Persentase Kehadiran', 'Predikat Disiplin'"
);
c = c.replace(/        row\.jamKerja \|\| ringkasanJamKerja,\r?\n/g, '');

// PDF info box
c = c.replace(/  doc\.text\('Jam Kerja Global:', 20, infoBoxY \+ 18\)\r?\n/, '');
c = c.replace(/  doc\.setFont\(7\.5\)\r?\n  doc\.text\(doc\.splitTextToSize\(ringkasanJamKerja, 115\), 48, infoBoxY \+ 17\)\r?\n/, '');

// Print HTML info rows
c = c.replace(/            <div class="info-row"><span class="info-label">Jam Kerja Global:<\/span> <span>\$\{ringkasanJamKerja\}<\/span><\/div>\r?\n/g, '');
c = c.replace(/            <div class="info-row"><span class="info-label">Jam Kerja Global:<\/span> <span>\$\{ringkasanJamKerja\}<\/span><\/div>/g, '');
c = c.replace(/        <div class="info-row"><span class="info-label">Jam Kerja Global:<\/span> <span>\$\{ringkasanJamKerja\}<\/span><\/div>\r?\n/g, '');
c = c.replace(/        <div class="info-row"><span class="info-label">Jam Kerja Global:<\/span> <span>\$\{ringkasanJamKerja\}<\/span><\/div>/g, '');

fs.writeFileSync(p, c);
console.log('done');
