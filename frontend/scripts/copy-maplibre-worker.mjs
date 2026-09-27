import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../node_modules/maplibre-gl/dist');
const destDir = path.resolve(__dirname, '../public/maplibre');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const filesToCopy = [
  'maplibre-gl-worker.mjs',
  'maplibre-gl-shared.mjs',
];

for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[MapLibre] Copied ${file} to public/maplibre/`);
  } else {
    console.warn(`[MapLibre] Warning: Could not find ${src}`);
  }
}
