/**
 * Property Boundary Polygon — HM Land Registry INSPIRE Index Polygons
 * https://use-land-property-data.service.gov.uk/datasets/inspire
 *
 * Uses the HMLR INSPIRE Geoserver WFS endpoint hosted at misoportal.com.
 * The server has an invalid SSL certificate, so we bypass SSL verification.
 * This is acceptable for read-only public government data.
 *
 * Fragility notes:
 *   - Not all properties are registered; ~15% of English land is
 *     unregistered — you'll get an empty features array in that case.
 *   - The endpoint only covers England & Wales.
 *   - We use a ±0.001° bbox (~100 m) — tight enough to avoid
 *     returning neighbours, wide enough for large plots.
 *   - The misoportal.com server occasionally returns 503; we catch
 *     that and return a graceful "unavailable" response.
 */

import fetch from 'node-fetch';
import https from 'https';

// Bypass SSL cert verification for this server (bad cert, but it's public gov data)
const SSL_AGENT = new https.Agent({ rejectUnauthorized: false });

const INSPIRE_WFS =
  'https://inspire.misoportal.com/geoserver/hmlr_inspire_index_polygons/ows';

const BBOX_DELTA = 0.001;

export async function getBoundary(lat, lng) {
  if (!lat || !lng) throw new Error('lat/lng required for boundary lookup');

  const minLng = lng - BBOX_DELTA;
  const minLat = lat - BBOX_DELTA;
  const maxLng = lng + BBOX_DELTA;
  const maxLat = lat + BBOX_DELTA;

  // WFS 1.0.0 with GeoJSON output and BBOX filter
  const params = new URLSearchParams({
    SERVICE:      'WFS',
    VERSION:      '1.0.0',
    REQUEST:      'GetFeature',
    TYPENAME:     'hmlr_inspire_index_polygons:inspire_polys',
    outputFormat: 'application/json',
    BBOX:         `${minLng},${minLat},${maxLng},${maxLat}`,
  });

  const url = `${INSPIRE_WFS}?${params}`;
  console.log('[PIEGA BACKEND] INSPIRE WFS URL:', url);

  const res = await fetch(url, {
    agent:  SSL_AGENT,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`INSPIRE WFS ${res.status}${body ? ': ' + body.substring(0, 100) : ''}`);
  }

  const geojson  = await res.json();
  const features = geojson?.features ?? [];
  console.log(`[PIEGA BACKEND] INSPIRE: ${features.length} feature(s) found`);

  if (!features.length) {
    return {
      registered: false,
      features:   [],
      note:       'No registered title boundary found at this location (property may be unregistered)',
    };
  }

  const enriched = features.map(f => {
    const coords = f.geometry?.coordinates;
    const area   = coords ? polygonAreaM2(coords) : null;
    return {
      titleNumber: f.properties?.TITLE_NO ?? f.properties?.inspire_id ?? null,
      area_m2:     area ? Math.round(area) : null,
      geometry:    f.geometry,
    };
  });

  const best = enriched.reduce((prev, curr) => {
    if (!prev) return curr;
    const pDist = centroidDistance(prev.geometry?.coordinates, lat, lng);
    const cDist = centroidDistance(curr.geometry?.coordinates, lat, lng);
    return cDist < pDist ? curr : prev;
  }, null);

  return {
    registered:  true,
    titleNumber: best?.titleNumber ?? null,
    area_m2:     best?.area_m2    ?? null,
    geometry:    best?.geometry   ?? null,
    allFeatures: enriched,
    note:        'HM Land Registry INSPIRE Index Polygons',
  };
}

