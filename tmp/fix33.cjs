const fs = require('fs');
const p = 'src/pages/RekapLaporanPage.jsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  "jabatan: penandatangan.petugasPresensi?.yayasan?.jabatan || 'Petugas Presensi Yayasan',",
  "jabatan: 'Tata Usaha',"
);

fs.writeFileSync(p, c);
console.log('done');
