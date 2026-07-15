/**
 * One-off: generate logo/icon assets from the new brand PNG.
 * Usage: npx --yes -p sharp node scripts/generate-brand-assets.cjs <source.png>
 */
const path = require('path');
const sharp = require('sharp');

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/generate-brand-assets.cjs <source.png>');
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'assets');

async function writeContained(size, filename) {
  await sharp(source)
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .png()
    .toFile(path.join(outDir, filename));
  console.log(`Wrote ${filename} (${size}x${size})`);
}

async function main() {
  await sharp(source).png().toFile(path.join(outDir, 'logo.png'));
  console.log('Wrote logo.png (source resolution)');

  await writeContained(1024, 'icon.png');
  await writeContained(1024, 'adaptive-icon.png');
  await writeContained(1024, 'splash-icon.png');
  await writeContained(48, 'favicon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
