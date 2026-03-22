/**
 * Crime Rate — Police UK API
 * https://data.police.uk/docs/method/crimes-at-location/
 *
 * Returns total crime count for the latest available month at the
 * given coordinates, plus a breakdown by top 3 categories.
 *
 * Fragility notes:
 *   - The API updates monthly with a ~2 month lag.
 *   - Rate limit: 15 requests / second per IP (generous for our use).
 *   - `date` param accepts YYYY-MM; we try the last 3 months in order
 *     and use the first one that returns data (the API returns [] for
 *     months not yet published).
 *   - Coverage: England, Wales, Northern Ireland. Not Scotland.
 */

import fetch from 'node-fetch';

const POLICE_API = 'https://data.police.uk/api/crimes-at-location';

/** Returns YYYY-MM strings for the last N months (newest first). */
function recentMonths(n = 3) {
  const months = [];
  const d = new Date();
  for (let i = 2; i < 2 + n; i++) {       // start 2 months back (API lag)
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export async function getCrime(lat, lng) {
  if (!lat || !lng) throw new Error('lat/lng required for crime lookup');

  let crimes = [];
  let usedMonth = null;

  for (const month of recentMonths(4)) {
    // Strategy A: crimes-at-location (exact snapping to nearest street)
    crimes = await fetchCrimesAtLocation(lat, lng, month);
    if (crimes.length) { usedMonth = month; break; }

    // Strategy B: crimes-street with a small poly around the point
    crimes = await fetchCrimesStreet(lat, lng, month);
    if (crimes.length) { usedMonth = month; break; }

    console.log(`[PIEGA BACKEND] Crime: no data for ${month}, trying earlier`);
  }

  if (!crimes.length) {
    return {
      month:      null,
      total:      0,
      categories: [],
      note:       'No crime data available for this location/period (rural area or API lag)',
    };
  }

  const tally = {};
  for (const c of crimes) {
    const cat = c.category ?? 'unknown';
    tally[cat] = (tally[cat] ?? 0) + 1;
  }

  const sorted = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ category: formatCategory(category), count }));

  console.log(`[PIEGA BACKEND] Crime: ${crimes.length} incidents in ${usedMonth}`);

  return {
    month:      usedMonth,
    total:      crimes.length,
    categories: sorted,
    note:       'Police UK API',
  };
}

async function fetchCrimesAtLocation(lat, lng, month) {
  const params = new URLSearchParams({ lat, lng, date: month });
  try {
    const res = await fetch(`${POLICE_API}?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (_) { return []; }
}

/** Crimes within a small square polygon (~500 m radius). */
async function fetchCrimesStreet(lat, lng, month) {
  const d = 0.005; // ~550 m
  const poly = [
    [lat - d, lng - d], [lat - d, lng + d],
    [lat + d, lng + d], [lat + d, lng - d],
  ].map(([la, lo]) => `${la},${lo}`).join(':');

  const params = new URLSearchParams({ poly, date: month });
  try {
    const res = await fetch(
      `https://data.police.uk/api/crimes-street/all-crime?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (_) { return []; }
}

/** Convert API slug to human-readable label. */
function formatCategory(slug) {
  const MAP = {
    'anti-social-behaviour':     'Anti-social behaviour',
    'burglary':                  'Burglary',
    'criminal-damage-arson':     'Criminal damage & arson',
    'drugs':                     'Drugs',
    'other-theft':               'Other theft',
    'possession-of-weapons':     'Weapons possession',
    'public-order':              'Public order',
    'robbery':                   'Robbery',
    'shoplifting':                'Shoplifting',
    'theft-from-the-person':     'Theft from person',
    'vehicle-crime':             'Vehicle crime',
    'violent-crime':             'Violent crime',
    'other-crime':               'Other crime',
  };
  return MAP[slug] ?? slug;
}
