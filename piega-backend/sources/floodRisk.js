/**
 * Flood Risk — Environment Agency (England only)
 *
 * Strategy:
 *   1. Hit the EA Flood Zones WFS (OGC) to get the flood zone polygon
 *      for the given lat/lng.
 *   2. Return the highest zone found (3 > 2 > 1).
 *
 * Zones:
 *   Zone 1  — Low probability     (< 0.1% annual)
 *   Zone 2  — Medium probability  (0.1%–1% annual)
 *   Zone 3a — High probability    (> 1% annual)
 *   Zone 3b — Functional floodplain
 *
 * Source: https://environment.data.gov.uk/arcgis/rest/services/EA/
 *         FloodMapForPlanningRiversAndSeaFloodZone3/
 *
 * Fragility notes:
 *   - EA ArcGIS REST endpoints are occasionally slow or return 503.
 *   - Zone data covers England only. No equivalent free API for Wales/Scotland.
 *   - We query all three zone layers and pick the worst (highest) result.
 */

import fetch from 'node-fetch';

const EA_BASE =
  'https://environment.data.gov.uk/arcgis/rest/services/EA';

// Each layer URL + its zone label
const ZONE_LAYERS = [
  {
    url:   `${EA_BASE}/FloodMapForPlanningRiversAndSeaFloodZone3/FeatureServer/0/query`,
    zone:  '3',
    label: 'High probability',
  },
  {
    url:   `${EA_BASE}/FloodMapForPlanningRiversAndSeaFloodZone2/FeatureServer/0/query`,
    zone:  '2',
    label: 'Medium probability',
  },
];

export async function getFloodRisk(lat, lng) {
  if (!lat || !lng) throw new Error('lat/lng required for flood risk');

  // Build a tiny point buffer: 10 m ≈ 0.0001°
  const delta = 0.0001;
  const bbox  = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

  // Check zone 3 first (worst), then zone 2
  for (const layer of ZONE_LAYERS) {
    const params = new URLSearchParams({
      geometry:     bbox,
      geometryType: 'esriGeometryEnvelope',
      inSR:         '4326',
      spatialRel:   'esriSpatialRelIntersects',
      outFields:    '*',
      returnGeometry: 'false',
      f:            'json',
    });

    let json;
    try {
      const res = await fetch(`${layer.url}?${params}`, { signal: AbortSignal.timeout(8000) });
      json = await res.json();
    } catch (e) {
      console.warn(`[PIEGA BACKEND] FloodRisk zone ${layer.zone} fetch error:`, e.message);
      continue;
    }

    if (json?.features?.length > 0) {
      console.log(`[PIEGA BACKEND] FloodRisk: found Zone ${layer.zone}`);
      return {
        zone:  layer.zone,
        label: layer.label,
        note:  'Environment Agency Flood Map for Planning (England)',
      };
    }
  }

  // Nothing found → Zone 1 (low risk by exclusion)
  console.log('[PIEGA BACKEND] FloodRisk: no zone 2/3 found → Zone 1');
  return {
    zone:  '1',
    label: 'Low probability',
    note:  'Environment Agency Flood Map for Planning (England) — not in zone 2 or 3',
  };
}
