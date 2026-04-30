// One-shot helper to generate ThreadTalk placeholder icons.
// Run from the repo root with: node threadtalk-extension/icons/generate-icons.js
// Requires the existing project dependency `sharp`.

const path = require('path');
const sharp = require('sharp');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" ry="28" fill="url(#g)"/>
  <circle cx="42" cy="56" r="22" fill="#ffffff" opacity="0.95"/>
  <circle cx="86" cy="56" r="16" fill="#22d3ee" opacity="0.95"/>
  <circle cx="64" cy="92" r="10" fill="#ffffff" opacity="0.85"/>
  <text x="64" y="64" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="#0f172a" text-anchor="middle" dominant-baseline="central">TT</text>
</svg>`;

const sizes = [16, 48, 128];
const outDir = path.resolve(__dirname);

(async () => {
  for (const size of sizes) {
    const file = path.join(outDir, `icon${size}.png`);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(file);
    console.log('Wrote', file);
  }
})();
