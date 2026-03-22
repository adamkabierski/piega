#!/usr/bin/env node
/**
 * setup-data.mjs
 * Downloads the DLUHC England IMD 2019 CSV (File 7) into data/imd2019.csv.
 * Run once after cloning: `node setup-data.mjs`
 */
import https from 'https';
import fs    from 'fs';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'data', 'imd2019.csv');
const URL = 'https://assets.publishing.service.gov.uk/media/5dc407b440f0b6379a7acc8d/File_7_-_All_IoD2019_Scores__Ranks__Deciles_and_Population_Denominators_3.csv';

if (fs.existsSync(OUT)) {
  console.log('✓ data/imd2019.csv already exists — nothing to do.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
console.log('Downloading IMD 2019 CSV (~9.7 MB)…');

const file = fs.createWriteStream(OUT);
https.get(URL, res => {
  if (res.statusCode !== 200) {
    console.error('HTTP', res.statusCode); process.exit(1);
  }
  let bytes = 0;
  res.on('data', chunk => { bytes += chunk.length; process.stdout.write(`\r  ${(bytes/1e6).toFixed(1)} MB`); });
  res.pipe(file);
  file.on('finish', () => {
    console.log(`\n✓ Saved to data/imd2019.csv (${(bytes/1e6).toFixed(1)} MB)`);
  });
}).on('error', e => { fs.unlinkSync(OUT); console.error(e); process.exit(1); });
