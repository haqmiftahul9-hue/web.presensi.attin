const fs = require('fs');
const p = 'src/pages/RekapLaporanPage.jsx';
const c = fs.readFileSync(p, 'utf8');
const i = c.indexOf('p-4 md:p-5 border-t border-border bg-muted/30 flex gap-2.5 justify-end');
console.log(JSON.stringify(c.slice(i-120, i+40)));
