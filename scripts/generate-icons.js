// Generates icon-active-{16,32,48,128}.png and icon-inactive-{16,32,48,128}.png
// Uses jimp (pure JS, no native dependencies)

const { Jimp } = require('jimp');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..');
const SIZES = [16, 32, 48, 128];

const ICONS = [
  { name: 'active', color: 0x1d9bf0ff },   // X blue
  { name: 'inactive', color: 0x8b98a5ff }, // muted gray
];

async function drawCircle(image, size, color) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        image.setPixelColor(color, x, y);
      }
    }
  }
}

async function main() {
  for (const { name, color } of ICONS) {
    for (const size of SIZES) {
      const image = new Jimp({ width: size, height: size, color: 0x00000000 });
      await drawCircle(image, size, color);
      const outPath = path.join(OUT_DIR, `icon-${name}-${size}.png`);
      await image.write(outPath);
      console.log(`  wrote ${path.basename(outPath)}`);
    }
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
