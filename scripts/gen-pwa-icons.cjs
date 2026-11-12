const sharp = require('sharp');
const dir = 'public/icons';
const NAVY = '#0B1F3D';

async function makePadded(src, out, size, pct) {
  const fit = Math.floor(size * pct);
  const resizedBuf = await sharp(src)
    .ensureAlpha()
    .resize(fit, fit, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const { width: rw, height: rh } = await sharp(resizedBuf).metadata();
  await sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: resizedBuf, top: Math.floor((size - rh) / 2), left: Math.floor((size - rw) / 2) }])
    .png()
    .toFile(out);
  console.log('wrote', out, size + 'x' + size, 'logo', rw + 'x' + rh, 'pct', pct);
}

(async () => {
  const src = 'public/icons/logo-simpeg.png';
  await makePadded(src, 'public/icons/pwa-icon.png', 1024, 0.72);
  await makePadded(src, 'public/icons/icon-512.png', 512, 0.72);
  await makePadded(src, 'public/icons/icon-192.png', 192, 0.72);
  await makePadded(src, 'public/icons/icon-maskable-512.png', 512, 0.55);
  await makePadded(src, 'public/icons/apple-touch-icon.png', 180, 0.72);
  console.log('done');
})();
