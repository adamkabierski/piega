/**
 * Piega Backend — server.js
 * Express API server providing area intelligence for property listings.
 *
 * Single endpoint:
 *   POST /api/area-intelligence
 *   Body: { postcode, latitude, longitude }
 *
 * Returns combined JSON:
 *   { imd, floodRisk, crime, boundary }
 */

import express from 'express';
import cors    from 'cors';
import { getIMD }      from './sources/imd.js';
import { getFloodRisk } from './sources/floodRisk.js';
import { getCrime }    from './sources/crime.js';
import { getBoundary } from './sources/boundary.js';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/* ─────────────────────────────────────────────────────────────
 * POST /api/area-intelligence
 * ───────────────────────────────────────────────────────────── */
app.post('/api/area-intelligence', async (req, res) => {
  const { postcode, latitude, longitude } = req.body ?? {};

  if (!postcode && (!latitude || !longitude)) {
    return res.status(400).json({
      error: 'Provide at least postcode or latitude+longitude'
    });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const pc  = (postcode ?? '').replace(/\s+/g, ' ').trim().toUpperCase();

  console.log(`[PIEGA BACKEND] area-intelligence request: postcode=${pc} lat=${lat} lng=${lng}`);

  // Run all four sources in parallel — failures are caught per-source
  const [imd, floodRisk, crime, boundary] = await Promise.all([
    getIMD(pc).catch(e => {
      console.error('[PIEGA BACKEND] IMD error:', e.message);
      return { error: e.message };
    }),
    getFloodRisk(lat, lng).catch(e => {
      console.error('[PIEGA BACKEND] FloodRisk error:', e.message);
      return { error: e.message };
    }),
    getCrime(lat, lng).catch(e => {
      console.error('[PIEGA BACKEND] Crime error:', e.message);
      return { error: e.message };
    }),
    getBoundary(lat, lng).catch(e => {
      console.error('[PIEGA BACKEND] Boundary error:', e.message);
      return { error: e.message };
    }),
  ]);

  const result = { imd, floodRisk, crime, boundary };
  console.log('[PIEGA BACKEND] response:', JSON.stringify(result, null, 2));
  res.json(result);
});

/* ─────────────────────────────────────────────────────────────
 * Health check
 * ───────────────────────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`[PIEGA BACKEND] Listening on http://localhost:${PORT}`);
});
