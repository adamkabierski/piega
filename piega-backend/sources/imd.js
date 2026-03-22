/**
 * IMD (Index of Multiple Deprivation) — England 2019
 *
 * Pipeline:
 *   1. Postcode → LSOA code  (postcodes.io — free, no key)
 *   2. LSOA → IMD score/rank/decile from bundled CSV  (0 ms, always available)
 *
 * The CSV is the official DLUHC "File 7" published at:
 *   https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019
 * 32,844 rows, ~9.7 MB, loaded into memory once on first call.
 *
 * CSV column positions (0-indexed):
 *   0  LSOA code (2011)
 *   1  LSOA name (2011)
 *   4  Index of Multiple Deprivation (IMD) Score
 *   5  Index of Multiple Deprivation (IMD) Rank (1 = most deprived)
 *   6  Index of Multiple Deprivation (IMD) Decile (1 = most deprived 10%)
 *
 * Only covers England. Scotland/Wales/NI have separate indices.
 */

import fetch from 'node-fetch';
import fs    from 'fs';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH  = path.join(__dirname, '..', 'data', 'imd2019.csv');

const POSTCODES_IO = 'https://api.postcodes.io/postcodes';

// ── Lazy-loaded in-memory lookup map: LSOA_CODE → row object ──
let _imdMap = null;

function loadIMDMap() {
  if (_imdMap) return _imdMap;

  console.log('[PIEGA BACKEND] IMD: loading CSV into memory…');
  const raw   = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split('\n');
  const map   = new Map();

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split — columns don't contain commas inside quotes
    // except Education column which IS quoted; we only need cols 0,1,4,5,6
    // so we can split naively up to the columns we need.
    const cols = line.split(',');
    const lsoa  = cols[0];
    if (!lsoa) continue;

    map.set(lsoa, {
      lsoaCode: lsoa,
      lsoaName: cols[1],
      score:    parseFloat(cols[4]),
      rank:     parseInt(cols[5], 10),
      decile:   parseInt(cols[6], 10),
    });
  }

  console.log(`[PIEGA BACKEND] IMD: loaded ${map.size} LSOAs`);
  _imdMap = map;
  return map;
}

export async function getIMD(postcode) {
  if (!postcode) throw new Error('postcode required for IMD lookup');

  // ── Step 1: postcode → LSOA ──────────────────────────────
  const pcRes  = await fetch(`${POSTCODES_IO}/${encodeURIComponent(postcode)}`,
    { signal: AbortSignal.timeout(8000) });
  const pcJson = await pcRes.json();

  if (pcJson.status !== 200 || !pcJson.result) {
    throw new Error(`postcodes.io: ${pcJson.error ?? 'invalid postcode'}`);
  }

  const lsoa = pcJson.result.codes?.lsoa11 ?? pcJson.result.lsoa;
  if (!lsoa) throw new Error('No LSOA code in postcodes.io response');

  console.log(`[PIEGA BACKEND] IMD: postcode=${postcode} → LSOA=${lsoa}`);

  // ── Step 2: LSOA → IMD (local CSV lookup) ────────────────
  const map  = loadIMDMap();
  const row  = map.get(lsoa);

  if (!row) {
    throw new Error(
      `No IMD data found for LSOA ${lsoa} — ` +
      'this LSOA may be outside England (Scotland/Wales/NI not covered)'
    );
  }

  return {
    lsoa:     row.lsoaCode,
    lsoaName: row.lsoaName,
    score:    row.score,
    rank:     row.rank,
    decile:   row.decile,   // 1 = most deprived, 10 = least deprived
    outOf:    32844,
    note:     'England IMD 2019 (DLUHC File 7 — local lookup)',
  };
}
