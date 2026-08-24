import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
const fontsDir = path.join(assetsDir, 'fonts');

// 1. Ensure directories
fs.mkdirSync(fontsDir, { recursive: true });

// 2. Process Manrope Fonts (400, 500, 600, 700, 800)
const manropeWeights = [400, 500, 600, 700, 800];
const manropeSubsets = ['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext'];
const manropeFilesDir = path.join(rootDir, 'node_modules/@fontsource/manrope/files');

let fontsCssContent = '/* Local font definitions - 100% offline */\n\n';

for (const weight of manropeWeights) {
  for (const subset of manropeSubsets) {
    const filename = `manrope-${subset}-${weight}-normal.woff2`;
    const srcPath = path.join(manropeFilesDir, filename);
    const destPath = path.join(fontsDir, filename);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Unicode ranges for subsets
const unicodeRanges = {
  'cyrillic-ext': 'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F',
  'cyrillic': 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  'latin': 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};

for (const weight of manropeWeights) {
  fontsCssContent += `/* Manrope ${weight} */\n`;
  for (const subset of manropeSubsets) {
    const filename = `manrope-${subset}-${weight}-normal.woff2`;
    const range = unicodeRanges[subset];
    fontsCssContent += `@font-face {\n  font-family: 'Manrope';\n  font-style: normal;\n  font-display: swap;\n  font-weight: ${weight};\n  src: url('./${filename}') format('woff2');\n  unicode-range: ${range};\n}\n\n`;
  }
}

// 3. Process Outfit Fonts (500, 600, 700, 800)
const outfitWeights = [500, 600, 700, 800];
const outfitSubsets = ['latin', 'latin-ext'];
const outfitFilesDir = path.join(rootDir, 'node_modules/@fontsource/outfit/files');

for (const weight of outfitWeights) {
  for (const subset of outfitSubsets) {
    const filename = `outfit-${subset}-${weight}-normal.woff2`;
    const srcPath = path.join(outfitFilesDir, filename);
    const destPath = path.join(fontsDir, filename);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

for (const weight of outfitWeights) {
  fontsCssContent += `/* Outfit ${weight} */\n`;
  for (const subset of outfitSubsets) {
    const filename = `outfit-${subset}-${weight}-normal.woff2`;
    const range = unicodeRanges[subset];
    fontsCssContent += `@font-face {\n  font-family: 'Outfit';\n  font-style: normal;\n  font-display: swap;\n  font-weight: ${weight};\n  src: url('./${filename}') format('woff2');\n  unicode-range: ${range};\n}\n\n`;
  }
}

fs.writeFileSync(path.join(fontsDir, 'fonts.css'), fontsCssContent, 'utf8');
console.log('Clean fonts.css generated.');

// 4. Generate App Icons (PNGs of various sizes + multi-size .ico)
const svgPath = path.join(assetsDir, 'favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

const sizes = [16, 32, 48, 64, 128, 256, 512];
const pngBuffers = [];

for (const size of sizes) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: { mode: 'width', value: size },
    shapeRendering: 2,
    textRendering: 1,
    imageRendering: 0,
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  
  const pngFilename = size === 512 ? 'icon.png' : size === 256 ? 'icon-256.png' : `icon-${size}.png`;
  fs.writeFileSync(path.join(assetsDir, pngFilename), pngBuffer);
  
  if (size <= 256) {
    pngBuffers.push(pngBuffer);
  }
  console.log(`Generated ${pngFilename} (${size}x${size})`);
}

// Generate Windows .ico containing 16, 32, 48, 64, 128, 256
async function generateIco() {
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(assetsDir, 'favicon.ico'), icoBuffer);
  console.log('Generated icon.ico and favicon.ico successfully.');
}

await generateIco();
