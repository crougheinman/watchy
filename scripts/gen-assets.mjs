import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('assets', { recursive: true });

const GRAD = `
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0"    stop-color="#bef264"/>
    <stop offset="0.55" stop-color="#4ade80"/>
    <stop offset="1"    stop-color="#22c55e"/>
  </linearGradient>`;

// Right-pointing rounded play triangle, centered at (cx,cy), half-size s.
const play = (cx, cy, s, fill) =>
  `<polygon points="${cx - s * 0.62},${cy - s} ${cx - s * 0.62},${cy + s} ${cx + s * 0.95},${cy}"
     fill="${fill}" stroke="${fill}" stroke-width="${s * 0.22}" stroke-linejoin="round"/>`;

const svgs = {
  // Adaptive background — full-bleed lime/emerald gradient
  'icon-background.png': {
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>${GRAD}</defs><rect width="1024" height="1024" fill="url(#g)"/></svg>`,
  },
  // Adaptive foreground — dark play glyph inside the safe zone (transparent bg)
  'icon-foreground.png': {
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      ${play(520, 512, 150, '#0a140a')}</svg>`,
  },
  // Full legacy / store icon — glyph on gradient, rounded
  'icon-only.png': {
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>${GRAD}</defs>
      <rect width="1024" height="1024" rx="220" fill="url(#g)"/>
      ${play(520, 512, 200, '#0a140a')}</svg>`,
  },
  // Splash — gradient glyph centered on the dark app background
  'splash.png': {
    size: 2732,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
      <defs>${GRAD}</defs>
      <rect width="2732" height="2732" fill="#0b0f0b"/>
      ${play(1390, 1366, 300, 'url(#g)')}</svg>`,
  },
};
// Dark-mode splash is identical (our UI is dark)
svgs['splash-dark.png'] = svgs['splash.png'];

for (const [name, { size, svg }] of Object.entries(svgs)) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`assets/${name}`);
  console.log('wrote assets/' + name);
}
