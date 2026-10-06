/**
 * Renders the Bloop mark to every Android launcher density and the iOS 1024 icon.
 * Usage: node scripts/make-icons.js   (needs `sharp`; install it temporarily: npm i --no-save sharp)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FOREST = '#1E4D2B';
const LIME = '#E3F988';
const BUTTER = '#E4D96F';

// Same artwork as src/components/Logo.tsx: the monoline popper, drawn around the cone's mouth at (0, 0).
const VB = { x: -71.7, y: -69.25, size: 136 };
const STREAMER = 'M5 1C15 -4 18 -12 28 -8C37 -4.5 38 5 47 3.5C52 2.6 55 -1.5 57 -6';
const SPARK = 'M0 -7C.9 -1.4 1.4 -.9 7 0C1.4 .9 .9 1.4 0 7C-.9 1.4 -1.4 .9 -7 0C-1.4 -.9 -.9 -1.4 0 -7Z';
const mark = ({ color = LIME, accent = BUTTER, halo = FOREST } = {}) => {
  const line = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const w = sw => `stroke-width="${sw}"`;
  return `
<g transform="rotate(45)">
  <path d="M-23 0L0 60L23 0" stroke="${color}" ${line} ${w(6)}/>
  <ellipse rx="23" ry="7.5" stroke="${color}" ${line} ${w(6)}/>
  <path d="M-14.57 22A14.57 4.75 0 0 0 14.57 22" stroke="${color}" ${line} ${w(6)}/>
  <path d="M-7.67 40A7.67 2.5 0 0 0 7.67 40" stroke="${color}" ${line} ${w(6)}/>
</g>
<g transform="rotate(-45)">
  ${halo ? `<path d="${STREAMER}" stroke="${halo}" ${line} ${w(9.5)}/>` : ''}
  <path d="${STREAMER}" stroke="${accent}" ${line} ${w(6)}/>
</g>
<path d="M2.61 -29.89L3.49 -39.85" stroke="${accent}" ${line} ${w(6)}/>
<path d="M29.89 -2.61L39.85 -3.49" stroke="${accent}" ${line} ${w(6)}/>
<circle cx="22.37" cy="-50.25" r="4" fill="${accent}"/>
<circle cx="47.29" cy="-19.1" r="4" fill="${accent}"/>
<path d="${SPARK}" fill="${color}" transform="translate(-6.82 -55.58) scale(0.8)"/>`;
};

/** Mark scaled to `scale` of the canvas, centred, optionally on a forest background. */
const svg = (size, scale, { bg, round, art = mark() } = {}) => {
  const k = (size * scale) / VB.size;
  const off = (size * (1 - scale)) / 2;
  const back = bg
    ? round
      ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${FOREST}"/>`
      : `<rect width="${size}" height="${size}" fill="${FOREST}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${back}
  <g transform="translate(${off} ${off}) scale(${k}) translate(${-VB.x} ${-VB.y})">${art}</g></svg>`;
};

const res = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const adaptive = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

async function png(file, markup) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(markup)).png().toFile(file);
}

(async () => {
  for (const [d, px] of Object.entries(legacy)) {
    await png(path.join(res, `mipmap-${d}`, 'ic_launcher.png'), svg(px, 0.8, { bg: true }));
    await png(path.join(res, `mipmap-${d}`, 'ic_launcher_round.png'), svg(px, 0.76, { bg: true, round: true }));
  }
  for (const [d, px] of Object.entries(adaptive)) {
    // Adaptive layers: keep the mark inside the 66dp safe zone of the 108dp canvas.
    await png(path.join(res, `mipmap-${d}`, 'ic_launcher_foreground.png'), svg(px, 0.62));
    // Themed icons tint every opaque pixel, so the monochrome layer drops the streamer's halo.
    await png(
      path.join(res, `mipmap-${d}`, 'ic_launcher_monochrome.png'),
      svg(px, 0.62, { art: mark({ color: '#FFFFFF', accent: '#FFFFFF', halo: null }) }),
    );
  }
  const any = path.join(res, 'mipmap-anydpi-v26');
  fs.mkdirSync(any, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/bloop_forest"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(any, 'ic_launcher.xml'), xml);
  fs.writeFileSync(path.join(any, 'ic_launcher_round.xml'), xml);

  const ios = path.join(__dirname, '..', 'ios', 'Bloop', 'Images.xcassets', 'AppIcon.appiconset');
  await png(path.join(ios, 'icon-1024.png'), svg(1024, 0.7, { bg: true }));
  fs.writeFileSync(
    path.join(ios, 'Contents.json'),
    JSON.stringify(
      {
        images: [{ filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    ) + '\n',
  );
  console.log('icons written');
})();
